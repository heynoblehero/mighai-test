import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, chatHistory = [], pageContext } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Read AI settings
    const settingsPath = path.join(process.cwd(), 'data', 'ai-settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    if (!settings.claude_api_key) {
      return res.status(400).json({ error: 'Claude API key not configured' });
    }

    const client = new Anthropic({
      apiKey: settings.claude_api_key,
    });

    // Build conversation history
    const messages = [
      ...chatHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // System prompt for backend function generation
    const systemPrompt = `You are an expert Node.js backend developer assistant helping to build a backend function for a logic page.

**Context:**
- Page Title: ${pageContext?.title || 'Unknown'}
- Page Description: ${pageContext?.description || 'No description'}
- Input Variables: ${pageContext?.inputs ? JSON.stringify(pageContext.inputs.map(i => ({ name: i.input_name, type: i.input_type }))) : 'None'}
- Backend Route: ${pageContext?.backend_route || '/api/logic/unknown'}

**Your Task:**
Help the user design and implement a backend function that:
1. Takes the input variables as parameters
2. Implements the business logic described
3. Returns a structured result object

**Guidelines:**
- Write clean, maintainable Node.js code
- Use modern JavaScript (ES6+)
- Include error handling
- Return results in this format: { success: true/false, data: {...}, message: '...' }
- The function should be async if it performs async operations
- Always wrap code in markdown code blocks with language identifier
- Be conversational and helpful
- Ask clarifying questions if the requirements are unclear

**Example Function Structure:**
\`\`\`javascript
async function executeLogic(inputs) {
  try {
    // Validate inputs
    if (!inputs.someField) {
      return {
        success: false,
        message: 'someField is required'
      };
    }

    // Your logic here
    const result = await someOperation(inputs);

    return {
      success: true,
      data: result,
      message: 'Operation completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}
\`\`\`

When the user asks you to provide the final code, give them a complete, ready-to-use function.`;

    const response = await client.messages.create({
      model: settings.claude_model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Extract code from markdown blocks if present
    const codeBlockRegex = /```(?:javascript|js)?\n([\s\S]*?)```/g;
    const codeMatches = [...assistantMessage.matchAll(codeBlockRegex)];
    const extractedCode = codeMatches.length > 0 ? codeMatches[codeMatches.length - 1][1].trim() : null;

    res.status(200).json({
      success: true,
      message: assistantMessage,
      code: extractedCode,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens
    });

  } catch (error) {
    console.error('❌ Claude API error:', error);
    res.status(500).json({
      error: 'Failed to generate backend code',
      details: error.message
    });
  }
}
