import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');

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

export default async function handler(req, res) {
  console.log('🤖 AI Generate Frontend API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, inputs, backendRoute, chatHistory = [], userMessage } = req.body;

  if (!title || !description || !inputs || !backendRoute) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get AI settings
  const settings = getSettings();
  if (!settings || !settings.claude_api_key) {
    return res.status(400).json({ error: 'Claude API not configured' });
  }

  try {
    const systemPrompt = `You are an expert frontend developer specializing in modern, beautiful web interfaces.

TASK: Help build a frontend form page with SEPARATED HTML, CSS, and JavaScript.

LOGIC PAGE DETAILS:
Title: ${title}
Description: ${description}
Backend Route: ${backendRoute} (POST request)

FORM INPUTS:
${JSON.stringify(inputs, null, 2)}

CRITICAL OUTPUT FORMAT:

===HTML===
[Your HTML code - form with all input fields]
===CSS===
[Your CSS code - modern, beautiful styling]
===JS===
[Your JavaScript code - form submission, validation, result display]

REQUIREMENTS:
1. Create a beautiful, modern form with all specified inputs
2. Include proper labels, placeholders, and validation
3. Style it beautifully with modern CSS (gradients, shadows, animations)
4. Handle form submission via fetch() POST to ${backendRoute}
5. Show loading state during submission
6. Display results beautifully (success or error)
7. Make it fully responsive
8. Add smooth animations and transitions
9. Use semantic HTML5

JAVASCRIPT MUST:
- Submit form data to ${backendRoute} via POST
- Send data as JSON: { input_name: value, ... }
- Handle response: { success: boolean, data: any, message: string }
- Display results in a nice card/section
- Show loading spinner during request
- Handle errors gracefully

Be creative and helpful! Ask questions if needed, iterate on design based on feedback.

When ready to provide code, use the EXACT format with ===HTML===, ===CSS===, ===JS=== markers.`;

    // Build messages array
    const messages = [];

    // Add chat history
    chatHistory.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.message
        });
      }
    });

    // Add current user message
    if (userMessage) {
      messages.push({
        role: 'user',
        content: userMessage
      });
    }

    // If first message, add context
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        content: 'Help me build a beautiful frontend form for this logic page. Generate the HTML, CSS, and JavaScript.'
      });
    }

    console.log('🤖 Calling Claude API with', messages.length, 'messages...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: settings.claude_model || 'claude-3-5-sonnet-20241022',
        max_tokens: 8000,
        temperature: 0.7,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Claude API error:', data);
      return res.status(400).json({ error: data.error?.message || 'Failed to generate frontend code' });
    }

    const assistantMessage = data.content?.[0]?.text || '';

    // Extract code sections
    const htmlMatch = assistantMessage.match(/===HTML===\s*([\s\S]*?)(?====CSS===|$)/);
    const cssMatch = assistantMessage.match(/===CSS===\s*([\s\S]*?)(?====JS===|$)/);
    const jsMatch = assistantMessage.match(/===JS===\s*([\s\S]*?)$/);

    const html = htmlMatch ? htmlMatch[1].trim() : null;
    const css = cssMatch ? cssMatch[1].trim() : null;
    const js = jsMatch ? jsMatch[1].trim() : null;

    res.status(200).json({
      success: true,
      message: assistantMessage,
      code: {
        html: html,
        css: css,
        js: js
      },
      tokens_used: data.usage?.output_tokens || 0
    });
  } catch (error) {
    console.error('❌ Error generating frontend:', error);
    res.status(500).json({ error: 'Failed to generate frontend: ' + error.message });
  }
}
