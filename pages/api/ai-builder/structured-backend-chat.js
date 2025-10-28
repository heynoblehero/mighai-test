// Structured Backend Chat API - Function Calling Approach
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, inputFields, oauthServices, apiKey } = req.body;

  if (!prompt || !apiKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: prompt and apiKey'
    });
  }

  try {
    // Create a function-calling prompt that enforces structured output
    const functionCallingPrompt = `You are a backend code generator. Create a JavaScript function based on the user's requirements.

USER REQUEST: ${prompt}

AVAILABLE INPUT FIELDS:
${inputFields?.map(field => `- ${field.name} (${field.type}): ${field.label || field.name}`).join('\n') || 'None specified'}

AVAILABLE OAUTH SERVICES:
${oauthServices?.map(service => `- ${service}`).join('\n') || 'None specified'}

CRITICAL REQUIREMENTS:
1. Create a function named "processUserInput"
2. The function must take exactly one parameter called "inputs"
3. The function must be async and return a structured response object
4. Always return an object with { success: boolean, data?: any, error?: string }
5. Handle all errors gracefully with try-catch blocks
6. Use the provided input fields and OAuth services if relevant

TEMPLATE STRUCTURE:
async function processUserInput(inputs) {
  try {
    // Validate inputs
    if (!inputs || typeof inputs !== 'object') {
      return { success: false, error: 'Invalid input data' };
    }

    // Your custom logic here based on user requirements
    // Use inputs.fieldName to access specific input fields
    // Implement the functionality described in the user request

    // Example structure:
    const result = {
      message: "Success message",
      data: {
        // Your response data
      }
    };

    return { success: true, data: result };
  } catch (error) {
    console.log('Error in processUserInput:', error.message);
    return { success: false, error: error.message };
  }
}

Generate ONLY the function code without any additional explanation or markdown formatting.`;

    // Call Claude API for structured generation
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: functionCallingPrompt
        }]
      })
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      return res.status(500).json({
        success: false,
        error: 'Claude API error: ' + error
      });
    }

    const claudeData = await claudeResponse.json();
    const generatedCode = claudeData.content[0].text.trim();

    // Clean the code (remove markdown formatting if present)
    let cleanCode = generatedCode;
    if (cleanCode.includes('```javascript')) {
      cleanCode = cleanCode.replace(/```javascript\n?/g, '').replace(/```/g, '');
    }
    if (cleanCode.includes('```js')) {
      cleanCode = cleanCode.replace(/```js\n?/g, '').replace(/```/g, '');
    }
    if (cleanCode.includes('```')) {
      cleanCode = cleanCode.replace(/```\n?/g, '');
    }

    // Validate that the function is properly formatted
    if (!cleanCode.includes('async function processUserInput')) {
      return res.status(500).json({
        success: false,
        error: 'Generated code does not contain the required processUserInput function',
        generated_code: cleanCode
      });
    }

    // Create structured response
    const structuredResponse = {
      functionName: 'processUserInput',
      code: cleanCode,
      description: `Backend function that: ${prompt}`,
      inputSchema: {
        type: 'object',
        properties: inputFields?.reduce((acc, field) => {
          acc[field.name] = {
            type: field.type === 'number' ? 'number' : 'string',
            description: field.label || field.name
          };
          return acc;
        }, {}) || {}
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          error: { type: 'string' }
        },
        required: ['success']
      }
    };

    return res.status(200).json({
      success: true,
      message: `✅ **Function Generated Successfully!**

🎯 **Function Name:** \`processUserInput\`
📝 **Purpose:** ${prompt}
⚙️ **Input Fields:** ${inputFields?.length || 0} configured
🔐 **OAuth Services:** ${oauthServices?.length || 0} available

🧪 **Ready to test!** The function follows the required structure and will work with your testing system.`,
      structuredCode: structuredResponse,
      metadata: {
        tokens_used: claudeData.usage?.input_tokens + claudeData.usage?.output_tokens,
        estimated_cost: ((claudeData.usage?.input_tokens * 0.00025) + (claudeData.usage?.output_tokens * 0.00125)) / 1000
      }
    });

  } catch (error) {
    console.error('Structured backend generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate structured backend function',
      details: error.message
    });
  }
}