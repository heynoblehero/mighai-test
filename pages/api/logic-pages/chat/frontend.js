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

    // System prompt for frontend generation
    const systemPrompt = `You are an expert frontend developer assistant helping to build a user interface for a logic page.

**Context:**
- Page Title: ${pageContext?.title || 'Unknown'}
- Page Description: ${pageContext?.description || 'No description'}
- Input Fields: ${pageContext?.inputs ? JSON.stringify(pageContext.inputs.map(i => ({ name: i.input_name, type: i.input_type, label: i.input_label }))) : 'None'}
- Backend Route: ${pageContext?.backend_route || '/api/logic/unknown'}
- Backend Function Exists: ${pageContext?.hasBackendFunction ? 'Yes' : 'No'}

**Your Task:**
Help the user design and implement a beautiful, functional frontend that:
1. Collects all the required input fields
2. Validates user input
3. Submits data to the backend route
4. Displays results or errors appropriately

**Guidelines:**
- Write clean, modern HTML5
- Use CSS for styling (you can use Tailwind classes or custom CSS)
- Use vanilla JavaScript for functionality (no frameworks needed)
- Make it responsive and user-friendly
- Include proper form validation
- Handle loading states during submission
- Display errors gracefully
- Always wrap code in markdown code blocks with language identifiers (html, css, javascript)
- Provide separate blocks for HTML, CSS, and JavaScript
- Be conversational and helpful

**Example Structure:**

HTML Block:
\`\`\`html
<div class="container">
  <h1>Page Title</h1>
  <form id="logicForm">
    <!-- Form fields here -->
    <button type="submit">Submit</button>
  </form>
  <div id="result"></div>
</div>
\`\`\`

CSS Block:
\`\`\`css
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
\`\`\`

JavaScript Block:
\`\`\`javascript
document.getElementById('logicForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  // Handle form submission
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch('${pageContext?.backend_route || '/api/logic/unknown'}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    document.getElementById('result').innerHTML = JSON.stringify(result, null, 2);
  } catch (error) {
    console.error(error);
  }
});
\`\`\`

When the user asks for the final code, provide complete, ready-to-use HTML, CSS, and JavaScript.`;

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
      error: 'Failed to generate frontend code',
      details: error.message
    });
  }
}
