export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, pageData, inputs, backendRoute } = req.body;

    if (!messages || !pageData || !inputs) {
      return res.status(400).json({ error: 'Messages, pageData, and inputs are required' });
    }

    // Build context for the AI
    const context = `You are helping to build a React frontend component for a logic page.

Page Details:
- Name: ${pageData.name}
- Description: ${pageData.description}
- Backend Route: ${backendRoute || `/api/logic-pages/${pageData.slug}/execute`}

Input Fields to Display:
${inputs.map(input => `- ${input.name} (${input.type}): ${input.description}`).join('\n')}

Requirements:
1. Create a React functional component
2. Include form fields for all the specified inputs
3. Handle form submission to the backend route
4. Display loading state during processing
5. Show results after successful submission
6. Handle errors gracefully
7. Use modern React hooks (useState, useEffect)
8. Include basic styling with Tailwind CSS classes
9. Make the UI responsive and user-friendly

The component should:
- Validate inputs before submission
- Make a POST request to the backend route with the form data
- Display the response in a user-friendly format
- Allow users to submit multiple times

When providing code, give the complete React component that can be used directly. Include all necessary imports and ensure the component is properly structured.

Example structure:
\`\`\`jsx
import { useState } from 'react';

export default function LogicPageComponent() {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Component logic here

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Your UI here */}
    </div>
  );
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
        max_tokens: 2500,
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
    const codeMatch = aiResponse.match(/```(?:jsx|js|javascript)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      extractedCode = codeMatch[1].trim();
    }

    res.json({
      response: aiResponse,
      code: extractedCode
    });

  } catch (error) {
    console.error('Error in chat-frontend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}