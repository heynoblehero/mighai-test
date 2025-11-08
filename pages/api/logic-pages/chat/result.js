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

    // System prompt for result page generation
    const systemPrompt = `You are an expert UI/UX developer assistant helping to build a result page for displaying execution results.

**Context:**
- Page Title: ${pageContext?.title || 'Unknown'}
- Page Description: ${pageContext?.description || 'No description'}
- Backend Function: ${pageContext?.hasBackendFunction ? 'Implemented' : 'Not yet implemented'}
- Expected Output Structure: ${pageContext?.expectedOutput || 'User will describe'}

**Your Task:**
Help the user design and implement a beautiful result page that:
1. Displays the execution results in an attractive format
2. Shows success/error states clearly
3. Handles different types of data (text, numbers, objects, arrays)
4. Provides a good user experience

**Guidelines:**
- Write clean, modern HTML5
- Use CSS for styling (Tailwind or custom CSS)
- Use vanilla JavaScript for dynamic rendering
- Make it responsive and visually appealing
- Handle both success and error states
- Display data in a user-friendly format (tables, cards, lists, etc.)
- Always wrap code in markdown code blocks with language identifiers
- Provide separate blocks for HTML, CSS, and JavaScript
- Be conversational and helpful

**Expected Data Format from Backend:**
The backend function returns data in this format:
\`\`\`javascript
{
  success: true/false,
  data: { /* result data */ },
  message: 'Status message'
}
\`\`\`

**Example Structure:**

HTML Block:
\`\`\`html
<div class="result-container">
  <div id="successState" style="display: none;">
    <h2>Success!</h2>
    <div id="resultData"></div>
  </div>
  <div id="errorState" style="display: none;">
    <h2>Error</h2>
    <p id="errorMessage"></p>
  </div>
</div>
\`\`\`

CSS Block:
\`\`\`css
.result-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.success-state {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 20px;
  border-radius: 8px;
}
.error-state {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 20px;
  border-radius: 8px;
}
\`\`\`

JavaScript Block:
\`\`\`javascript
// This function will be called from the frontend with the result data
function displayResult(result) {
  if (result.success) {
    document.getElementById('successState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('resultData').innerHTML = formatData(result.data);
  } else {
    document.getElementById('successState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = result.message;
  }
}

function formatData(data) {
  // Format the data nicely
  if (typeof data === 'object') {
    return '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  }
  return data;
}
\`\`\`

When the user asks for the final code, provide complete, ready-to-use HTML, CSS, and JavaScript for the result page.`;

    const response = await client.messages.create({
      model: settings.claude_model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Extract code blocks
    const htmlMatch = assistantMessage.match(/```html\n([\s\S]*?)```/);
    const cssMatch = assistantMessage.match(/```css\n([\s\S]*?)```/);
    const jsMatch = assistantMessage.match(/```(?:javascript|js)\n([\s\S]*?)```/);

    res.status(200).json({
      success: true,
      message: assistantMessage,
      code: {
        html: htmlMatch ? htmlMatch[1].trim() : null,
        css: cssMatch ? cssMatch[1].trim() : null,
        js: jsMatch ? jsMatch[1].trim() : null
      },
      tokens_used: response.usage.input_tokens + response.usage.output_tokens
    });

  } catch (error) {
    console.error('❌ Claude API error:', error);
    res.status(500).json({
      error: 'Failed to generate result page code',
      details: error.message
    });
  }
}
