export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Use Claude API to suggest inputs
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Based on this logic page description, suggest appropriate input fields:

Page Name: ${name}
Description: ${description}

Please suggest 2-6 input fields that would be needed for this functionality. For each field, provide:
- name (camelCase variable name)
- label (user-friendly display name)
- type (text, textarea, number, email, select, checkbox)
- description (what this field is for)
- required (true/false)
- placeholder (example text if applicable)

Return the response as a JSON object with an "inputs" array. Each input should be an object with the above properties.

Example format:
{
  "inputs": [
    {
      "name": "userEmail",
      "label": "Email Address",
      "type": "email",
      "description": "The email address to send the notification to",
      "required": true,
      "placeholder": "user@example.com"
    }
  ]
}

Focus on the essential inputs needed for the described functionality. Make the field names descriptive and the types appropriate for the data expected.`
        }]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return res.status(500).json({ error: 'Failed to get AI suggestions' });
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Extract JSON from the response
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestedInputs = JSON.parse(jsonMatch[0]);

        // Validate the response format
        if (suggestedInputs.inputs && Array.isArray(suggestedInputs.inputs)) {
          res.json(suggestedInputs);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);

      // Fallback: provide default inputs based on common patterns
      const fallbackInputs = [];

      if (description.toLowerCase().includes('email')) {
        fallbackInputs.push({
          name: 'email',
          label: 'Email Address',
          type: 'email',
          description: 'Email address input',
          required: true,
          placeholder: 'user@example.com'
        });
      }

      if (description.toLowerCase().includes('text') || description.toLowerCase().includes('content')) {
        fallbackInputs.push({
          name: 'content',
          label: 'Content',
          type: 'textarea',
          description: 'Text content input',
          required: true,
          placeholder: 'Enter your content here...'
        });
      }

      if (description.toLowerCase().includes('name')) {
        fallbackInputs.push({
          name: 'name',
          label: 'Name',
          type: 'text',
          description: 'Name input',
          required: true,
          placeholder: 'Enter name'
        });
      }

      // Always include at least one input
      if (fallbackInputs.length === 0) {
        fallbackInputs.push({
          name: 'input',
          label: 'Input',
          type: 'text',
          description: 'Primary input field',
          required: true,
          placeholder: 'Enter value'
        });
      }

      res.json({ inputs: fallbackInputs });
    }
  } catch (error) {
    console.error('Error in suggest-inputs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}