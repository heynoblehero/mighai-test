// Structured Backend Code Generation API
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
    // Create a structured prompt that enforces function format
    const structuredPrompt = `Create a backend endpoint function with the following requirements:

USER REQUEST: ${prompt}

INPUT FIELDS AVAILABLE:
${inputFields?.map(field => `- ${field.name} (${field.type}): ${field.label}`).join('\n') || 'None'}

OAUTH SERVICES AVAILABLE:
${oauthServices?.map(service => `- ${service}`).join('\n') || 'None'}

IMPORTANT: Your response must be a JSON object with this exact structure:
{
  "functionName": "processUserInput",
  "code": "// Your complete function code here",
  "description": "Brief description of what this function does",
  "inputSchema": {
    // JSON schema for expected inputs
  },
  "outputSchema": {
    // JSON schema for expected outputs
  }
}

The "code" field must contain a complete function that:
1. Is named exactly "processUserInput"
2. Takes an "inputs" parameter containing the user's input data
3. Returns a structured response object
4. Handles errors gracefully
5. Uses async/await for any API calls

Example format:
{
  "functionName": "processUserInput",
  "code": "async function processUserInput(inputs) {\\n  try {\\n    // Your logic here\\n    return { success: true, data: result };\\n  } catch (error) {\\n    return { success: false, error: error.message };\\n  }\\n}",
  "description": "Processes user input and returns a response",
  "inputSchema": {"type": "object", "properties": {"message": {"type": "string"}}},
  "outputSchema": {"type": "object", "properties": {"success": {"type": "boolean"}, "data": {"type": "object"}}}
}

Generate ONLY the JSON response, no additional text.`;

    // Call Claude API with structured prompt
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: structuredPrompt
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
    const generatedContent = claudeData.content[0].text;

    // Parse the structured response
    let structuredCode;
    try {
      structuredCode = JSON.parse(generatedContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredCode = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to parse structured response from Claude',
          raw_response: generatedContent
        });
      }
    }

    // Validate the structured response
    if (!structuredCode.functionName || !structuredCode.code || !structuredCode.description) {
      return res.status(500).json({
        success: false,
        error: 'Invalid structured response format',
        received: structuredCode
      });
    }

    // Return the structured backend code
    return res.status(200).json({
      success: true,
      structuredCode,
      metadata: {
        functionName: structuredCode.functionName,
        description: structuredCode.description,
        inputSchema: structuredCode.inputSchema,
        outputSchema: structuredCode.outputSchema,
        tokens_used: claudeData.usage?.input_tokens + claudeData.usage?.output_tokens,
        estimated_cost: ((claudeData.usage?.input_tokens * 0.00025) + (claudeData.usage?.output_tokens * 0.00125)) / 1000
      }
    });

  } catch (error) {
    console.error('Backend generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate structured backend code',
      details: error.message
    });
  }
}