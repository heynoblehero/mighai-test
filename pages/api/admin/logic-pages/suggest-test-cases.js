export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, pageData, inputs } = req.body;

    if (!code || !pageData || !inputs) {
      return res.status(400).json({ error: 'Code, pageData, and inputs are required' });
    }

    // Build prompt for AI to suggest test cases
    const prompt = `Given this backend function code for "${pageData.name}":

\`\`\`javascript
${code}
\`\`\`

Input fields:
${inputs.map(input => `- ${input.name} (${input.type}): ${input.description}${input.required ? ' [Required]' : ''}`).join('\n')}

Generate 2-3 test cases with sample input data and expected results. For each test case, provide:
1. A descriptive name
2. Input values for all fields
3. Expected result/output
4. Why this test case is important

Return ONLY a JSON object in this exact format:
{
  "testCases": [
    {
      "name": "Test case name",
      "description": "Why this test is important",
      "inputs": {
        "fieldName1": "value1",
        "fieldName2": value2
      },
      "expectedResult": {
        "success": true,
        "data": "expected data description"
      }
    }
  ]
}

IMPORTANT:
- For checkbox fields, use boolean values (true/false), NOT strings
- For number fields, use actual numbers, NOT strings
- Make realistic test cases that exercise different scenarios
- Include at least one edge case`;

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
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return res.status(500).json({ error: 'Failed to get AI suggestions' });
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Extract JSON from response
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const testCases = JSON.parse(jsonMatch[0]);

        // Validate format
        if (testCases.testCases && Array.isArray(testCases.testCases)) {
          res.json(testCases);
        } else {
          throw new Error('Invalid test cases format');
        }
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);

      // Fallback: create basic test case
      const fallbackTestCase = {
        testCases: [{
          name: 'Basic functionality test',
          description: 'Tests the basic functionality with sample inputs',
          inputs: {},
          expectedResult: {
            success: true,
            data: 'Function should return a successful result'
          }
        }]
      };

      // Generate sample inputs
      inputs.forEach(input => {
        switch (input.type) {
          case 'text':
          case 'textarea':
            fallbackTestCase.testCases[0].inputs[input.name] = input.placeholder || 'Sample text';
            break;
          case 'number':
            fallbackTestCase.testCases[0].inputs[input.name] = parseInt(input.placeholder) || 10;
            break;
          case 'email':
            fallbackTestCase.testCases[0].inputs[input.name] = 'test@example.com';
            break;
          case 'checkbox':
            fallbackTestCase.testCases[0].inputs[input.name] = true;
            break;
          default:
            fallbackTestCase.testCases[0].inputs[input.name] = 'sample value';
        }
      });

      res.json(fallbackTestCase);
    }

  } catch (error) {
    console.error('Error in suggest-test-cases:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
