export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, pageData, inputs } = req.body;

    if (!messages || !pageData || !inputs) {
      return res.status(400).json({ error: 'Messages, pageData, and inputs are required' });
    }

    // Build context for the AI
    const context = `You are helping to build a backend function for a logic page.

Page Details:
- Name: ${pageData.name}
- Description: ${pageData.description}
- Route: /api/logic-pages/${pageData.slug}/execute

Input Fields:
${inputs.map(input => `- ${input.name} (${input.type}): ${input.description}`).join('\n')}

The function should:
1. Receive these inputs from a POST request
2. Process them according to the page description
3. Return a result that will be displayed to the user
4. Handle errors gracefully

When you provide code, format it as a complete JavaScript function that can be executed in a Node.js environment. The function should be ready to use in an API endpoint.

If the user asks for specific functionality or modifications, provide the complete updated function code.

IMPORTANT: You MUST export the function using module.exports. This is required for the code to work.

Example function structure:
\`\`\`javascript
module.exports = async function processLogicPage(inputs) {
  try {
    // Your logic here
    const result = {
      success: true,
      data: "processed result",
      message: "Processing completed successfully"
    };
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
\`\`\``;

    // Prepare messages for Claude
    const systemMessage = {
      role: 'user',
      content: context
    };

    const allMessages = [systemMessage, ...messages];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: allMessages
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return res.status(500).json({ error: 'Failed to get AI response' });
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Extract code from the response
    let extractedCode = '';
    const codeMatch = aiResponse.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      extractedCode = codeMatch[1].trim();
    }

    res.json({
      response: aiResponse,
      code: extractedCode
    });

  } catch (error) {
    console.error('Error in chat-backend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}