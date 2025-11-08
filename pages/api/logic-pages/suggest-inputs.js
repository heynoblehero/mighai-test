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
  console.log('🤖 AI Suggest Inputs API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, slug } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  // Get AI settings
  const settings = getSettings();
  if (!settings || !settings.claude_api_key) {
    return res.status(400).json({ error: 'Claude API not configured' });
  }

  try {
    const prompt = `You are an expert at analyzing requirements and designing data structures.

TASK: Analyze the following logic page description and suggest the input fields/variables needed.

LOGIC PAGE DETAILS:
Title: ${title}
Slug: ${slug || 'not-set'}
Description: ${description}

INSTRUCTIONS:
1. Analyze what inputs/variables this logic would need from users
2. Suggest appropriate input types (text, number, email, url, textarea, select, checkbox, radio, file, date, datetime)
3. Provide meaningful field names (lowercase, underscores, no spaces)
4. Suggest labels, placeholders, and whether fields are required
5. For select/radio fields, suggest options
6. Think about validation rules if needed

OUTPUT FORMAT (JSON only, no markdown):
{
  "inputs": [
    {
      "name": "user_email",
      "label": "User Email",
      "type": "email",
      "placeholder": "Enter your email",
      "required": true,
      "validation": { "pattern": "email" },
      "default": ""
    },
    {
      "name": "category",
      "label": "Category",
      "type": "select",
      "placeholder": "Select a category",
      "required": true,
      "options": ["Option 1", "Option 2", "Option 3"],
      "default": ""
    }
  ],
  "reasoning": "Brief explanation of why these inputs are needed"
}

Generate ONLY valid JSON. No markdown, no explanations outside JSON.`;

    console.log('🤖 Calling Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: settings.claude_model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Claude API error:', data);
      return res.status(400).json({ error: data.error?.message || 'Failed to generate suggestions' });
    }

    const generatedText = data.content?.[0]?.text || '';
    console.log('🤖 Generated text:', generatedText);

    // Parse JSON response
    try {
      // Remove markdown code blocks if present
      let jsonText = generatedText.trim();
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const suggestions = JSON.parse(jsonText);

      res.status(200).json({
        success: true,
        suggestions: suggestions,
        tokens_used: data.usage?.output_tokens || 0
      });
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.error('Raw text:', generatedText);

      return res.status(500).json({
        error: 'Failed to parse AI response',
        raw_response: generatedText
      });
    }
  } catch (error) {
    console.error('❌ Error suggesting inputs:', error);
    res.status(500).json({ error: 'Failed to suggest inputs: ' + error.message });
  }
}
