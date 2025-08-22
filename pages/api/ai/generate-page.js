import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');
const USAGE_FILE = path.join(process.cwd(), 'data', 'ai-usage.json');

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return null;
  }
}

function trackUsage(tokensUsed, estimatedCost) {
  try {
    const usageData = {
      timestamp: new Date().toISOString(),
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      month: new Date().toISOString().slice(0, 7) // YYYY-MM format
    };

    let allUsage = [];
    if (fs.existsSync(USAGE_FILE)) {
      const existingData = fs.readFileSync(USAGE_FILE, 'utf8');
      allUsage = JSON.parse(existingData);
    }

    allUsage.push(usageData);

    // Keep only last 1000 entries
    if (allUsage.length > 1000) {
      allUsage = allUsage.slice(-1000);
    }

    fs.writeFileSync(USAGE_FILE, JSON.stringify(allUsage, null, 2));
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

const PAGE_GENERATION_PROMPT = `You are an expert web developer. Create a complete, modern, responsive web page based on the user's description.

IMPORTANT REQUIREMENTS:
1. Generate a complete HTML structure with proper semantic elements
2. Include comprehensive CSS styling (can be internal <style> or inline)
3. Add JavaScript functionality if needed (internal <script> tags)
4. Make it fully responsive and mobile-friendly
5. Use modern design principles and best practices
6. Include proper accessibility attributes
7. Make it visually appealing with good typography and spacing

STYLE GUIDELINES:
- Use a modern, clean design aesthetic
- Implement proper spacing and typography hierarchy  
- Use tasteful colors and gradients
- Add subtle animations and transitions
- Ensure excellent mobile responsiveness
- Include interactive elements where appropriate

USER REQUEST: {userPrompt}

ADDITIONAL CONTEXT: {context}

Generate ONLY the complete HTML code. Do not include markdown code blocks or explanations - just the raw HTML that can be directly rendered in a browser.

The HTML should be production-ready and include all necessary CSS and JavaScript inline.`;

export default async function handler(req, res) {
  console.log('🤖 AI Generate Page API called');
  console.log('🤖 Method:', req.method);
  console.log('🤖 Request body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, context = '', iteration_type = 'new' } = req.body;
  console.log('🤖 Extracted params:');
  console.log('  - prompt:', prompt);
  console.log('  - context length:', context?.length || 0);
  console.log('  - iteration_type:', iteration_type);

  if (!prompt) {
    console.log('❌ Missing prompt');
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Get AI settings
  console.log('🤖 Loading AI settings from:', SETTINGS_FILE);
  const settings = getSettings();
  console.log('🤖 Settings loaded:', settings ? 'SUCCESS' : 'FAILED');
  
  if (!settings || !settings.claude_api_key) {
    console.log('❌ AI settings not configured properly');
    console.log('  - settings exists:', !!settings);
    console.log('  - has API key:', !!settings?.claude_api_key);
    return res.status(400).json({ error: 'Claude API not configured. Please set up your API key in settings.' });
  }
  
  console.log('🤖 Using model:', settings.claude_model);
  console.log('🤖 Max tokens:', settings.max_tokens);
  console.log('🤖 Temperature:', settings.temperature);

  try {
    // Check cost limits
    const currentMonth = new Date().toISOString().slice(0, 7);
    console.log('🤖 Cost check:');
    console.log('  - Current month:', currentMonth);
    console.log('  - Monthly usage: $', settings.current_month_usage);
    console.log('  - Cost limit: $', settings.cost_limit_monthly);
    
    if (settings.current_month_usage >= settings.cost_limit_monthly) {
      console.log('❌ Monthly cost limit exceeded');
      return res.status(400).json({ 
        error: `Monthly cost limit of $${settings.cost_limit_monthly} reached. Current usage: $${settings.current_month_usage}` 
      });
    }

    // Prepare the prompt based on iteration type
    console.log('🤖 Preparing prompt for iteration type:', iteration_type);
    
    let finalPrompt = PAGE_GENERATION_PROMPT
      .replace('{userPrompt}', prompt)
      .replace('{context}', context);

    if (iteration_type === 'modify' && context) {
      console.log('🤖 Using modification prompt with existing context');
      finalPrompt = `You are modifying an existing web page. Here is the current HTML code:

${context}

USER MODIFICATION REQUEST: ${prompt}

Please modify the existing code according to the user's request. Maintain the overall structure but make the requested changes. Return the complete modified HTML code.

Generate ONLY the complete HTML code. Do not include markdown code blocks or explanations.`;
    }
    
    console.log('🤖 Final prompt length:', finalPrompt.length);

    // Call Claude API
    console.log('🤖 Making API call to Claude...');
    const apiPayload = {
      model: settings.claude_model,
      max_tokens: settings.max_tokens,
      temperature: settings.temperature,
      messages: [
        {
          role: 'user',
          content: finalPrompt
        }
      ]
    };
    console.log('🤖 API payload:', JSON.stringify(apiPayload, null, 2));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(apiPayload)
    });

    console.log('🤖 API response status:', response.status);
    const data = await response.json();
    console.log('🤖 API response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Claude API error:', data);
      console.error('❌ Response status:', response.status);
      console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
      return res.status(400).json({ 
        error: data.error?.message || 'Failed to generate page',
        details: data
      });
    }

    const generatedCode = data.content?.[0]?.text || '';
    const tokensUsed = data.usage?.output_tokens || 0;
    
    console.log('🤖 Generation results:');
    console.log('  - Generated code length:', generatedCode.length);
    console.log('  - Tokens used:', tokensUsed);
    
    // Estimate cost (approximate pricing for Claude 3.5 Sonnet)
    const estimatedCost = (tokensUsed / 1000) * 0.015; // $15 per million tokens (output)
    console.log('  - Estimated cost: $', estimatedCost);

    // Track usage
    console.log('🤖 Tracking usage...');
    trackUsage(tokensUsed, estimatedCost);

    // Update monthly usage in settings
    const newMonthlyUsage = (settings.current_month_usage || 0) + estimatedCost;
    settings.current_month_usage = newMonthlyUsage;
    console.log('🤖 Updated monthly usage to: $', newMonthlyUsage);
    
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
      console.log('✅ Settings file updated successfully');
    } catch (error) {
      console.error('❌ Failed to update settings file:', error);
    }

    const responseData = {
      success: true,
      html_code: generatedCode,
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      monthly_usage: settings.current_month_usage,
      iteration_type
    };
    
    console.log('✅ Sending successful response:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Page generation failed:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate page: ' + error.message 
    });
  }
}