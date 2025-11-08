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
  console.log('🤖 AI Generate Backend API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, inputs, chatHistory = [], userMessage } = req.body;

  if (!title || !description || !inputs) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get AI settings
  const settings = getSettings();
  if (!settings || !settings.claude_api_key) {
    return res.status(400).json({ error: 'Claude API not configured' });
  }

  try {
    // Build conversation context
    const systemPrompt = `You are an expert backend developer specializing in Node.js and business logic implementation.

TASK: Help build a backend function for a logic page based on user requirements.

LOGIC PAGE DETAILS:
Title: ${title}
Description: ${description}

INPUTS AVAILABLE:
${JSON.stringify(inputs, null, 2)}

GUIDELINES:
1. The function will be called when the user submits the form
2. Function receives inputs as an object: { input_name: value, ... }
3. Write pure JavaScript/Node.js code
4. Return a result object with: { success: boolean, data: any, message?: string }
5. Handle errors gracefully
6. Add comments explaining the logic
7. Can use common Node.js modules (no need to import, assume available)
8. Focus on business logic, calculations, data processing, API calls, etc.

FUNCTION SIGNATURE:
async function executeLogic(inputs) {
  // inputs = { field_name: value, ... }
  // Your code here
  // return { success: true, data: {...}, message: "..." }
}

When ready, provide the complete function code in this format:

\`\`\`javascript
async function executeLogic(inputs) {
  // Your implementation
}
\`\`\`

Be helpful, ask clarifying questions if needed, and iterate on the code based on user feedback.`;

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
        content: 'Help me build the backend function for this logic page. What should the function do based on the description?'
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
      return res.status(400).json({ error: data.error?.message || 'Failed to generate backend code' });
    }

    const assistantMessage = data.content?.[0]?.text || '';
    console.log('🤖 Assistant response length:', assistantMessage.length);

    // Extract code if present
    const codeMatch = assistantMessage.match(/```javascript\n([\s\S]*?)```/);
    const extractedCode = codeMatch ? codeMatch[1].trim() : null;

    res.status(200).json({
      success: true,
      message: assistantMessage,
      code: extractedCode,
      tokens_used: data.usage?.output_tokens || 0
    });
  } catch (error) {
    console.error('❌ Error generating backend:', error);
    res.status(500).json({ error: 'Failed to generate backend: ' + error.message });
  }
}
