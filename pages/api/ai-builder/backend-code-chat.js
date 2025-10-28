// Enhanced Backend Builder - AI Code Generation Chat
async function processWithClaude(pageData, selectedInputs, currentCode, message, chatHistory) {
  const claudeApiKey = process.env.CLAUDE_API_KEY;

  const systemPrompt = `You are an expert Backend Developer AI specializing in Node.js/JavaScript code generation. You're helping build backend logic for a logic page called "${pageData.name}" - ${pageData.description}.

Available Input Fields:
${selectedInputs.map(f => `- ${f.field_label} (${f.field_type}): ${f.help_text || 'No description'}`).join('\n')}

Current Generated Code:
${currentCode || 'No code generated yet'}

Your role is to:
1. Generate complete, production-ready JavaScript/Node.js functions
2. Create data processing, validation, and business logic
3. Build API integrations and external service calls
4. Implement algorithms, calculations, and data transformations
5. Add proper error handling and security measures
6. Update and refine existing code based on user requests

When you generate or update code, include it in your response using this format:
---GENERATED-CODE---
// Complete JavaScript function code here
function processUserInput(inputs) {
  try {
    // Debug: Log received inputs
    console.log('Received inputs:', inputs);

    // Validate inputs here

    // Your processing logic here

    // Return structured result
    return {
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
---END-CODE---

CRITICAL Code Requirements:
- ALWAYS name your main function 'processUserInput' - this is required for testing
- The function MUST accept an 'inputs' parameter containing all form field data
- ALWAYS include console.log('Received inputs:', inputs) at the start for debugging
- Handle all input fields by their exact field_name (not field_label)
- Include proper error handling with try/catch
- Add input validation and sanitization
- Return structured results with success/error format shown above
- Add helpful comments explaining the logic
- Use modern JavaScript (ES6+) features

Available Libraries/APIs you can use (BROWSER-COMPATIBLE ONLY):
- Built-in JavaScript objects (Math, Date, JSON, String, Array, Object, RegExp)
- HTTP requests with fetch() (built-in)
- Crypto functions via crypto.randomUUID(), crypto.createHash(), crypto.randomBytes()
- JSON processing and manipulation
- String manipulation and regex
- Mathematical operations
- Date/time handling
- URL encoding/decoding with encodeURIComponent(), decodeURIComponent()

CRITICAL RESTRICTIONS FOR LOGIC PAGE BACKEND CODE:
- DO NOT use require() - it's not available in the testing environment
- DO NOT use Node.js modules like 'fs', 'path', 'express', 'http', etc.
- DO NOT use any server-side only modules
- Use only browser-compatible JavaScript APIs
- Use fetch() for HTTP requests, not axios or other libraries
- Use built-in crypto functions, not require('crypto')

Example response format:
"I'll create a function that processes the user's input and performs [description]. Here's the generated code:

---GENERATED-CODE---
function processUserInput(inputs) {
  try {
    // Debug: Log received inputs
    console.log('Received inputs:', inputs);

    // Validate inputs
    if (!inputs.user_input || inputs.user_input.trim() === '') {
      throw new Error('User input is required');
    }

    // Process the input using browser-compatible APIs
    const processedData = inputs.user_input.toUpperCase();

    // Generate unique ID using crypto API
    const uniqueId = crypto.randomUUID();

    // Process with other built-in functions
    const wordCount = inputs.user_input.split(/\s+/).length;

    const result = {
      processed_data: processedData,
      word_count: wordCount,
      unique_id: uniqueId,
      timestamp: new Date().toISOString(),
      success: true
    };

    return {
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        processing_time: Date.now() - Date.now() // Example timing
      }
    };
  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
---END-CODE---

This function uses only browser-compatible APIs, validates inputs, processes data, and returns structured results with proper error handling."

IMPORTANT: Available input fields and their exact field names:
${selectedInputs.map(f => `inputs.${f.field_name} // Field Label: "${f.field_label}" (Type: ${f.field_type})`).join('\n')}

CRITICAL FIELD MAPPING RULES:
- Use EXACT field_name properties shown above (e.g., inputs.password_length, NOT inputs['Password Length'])
- Field names are typically lowercase with underscores (snake_case)
- Field labels are for display only - never use labels in code
- Always validate that required fields exist before processing
- Log the received inputs object to debug field name mismatches

Example field access:
${selectedInputs.slice(0, 3).map(f => `const ${f.field_name} = inputs.${f.field_name}; // Gets the "${f.field_label}" field`).join('\n')}`;

  const messages = [
    ...chatHistory.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    {
      role: 'user',
      content: message
    }
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 3000,
          system: systemPrompt,
          messages: messages
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Claude API request timed out after 30 seconds');
      }
      throw error;
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Extract generated code
    let generatedCode = null;
    const codeMatch = responseText.match(/---GENERATED-CODE---([\s\S]*?)---END-CODE---/);
    if (codeMatch && codeMatch[1]) {
      try {
        generatedCode = codeMatch[1].trim();
        console.log('Generated code extracted successfully');
      } catch (e) {
        console.error('Failed to extract generated code:', e);
      }
    }

    // Remove the code section from the response text
    const cleanResponse = responseText.replace(/---GENERATED-CODE---[\s\S]*?---END-CODE---/, '').trim();

    return {
      response: cleanResponse,
      generatedCode: generatedCode
    };

  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageData, selectedInputs, currentCode, message, chatHistory } = req.body;

  if (!pageData || !selectedInputs || !message) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const result = await processWithClaude(pageData, selectedInputs, currentCode, message, chatHistory || []);

    return res.status(200).json({
      success: true,
      response: result.response,
      generatedCode: result.generatedCode
    });

  } catch (error) {
    console.error('Backend code chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process code generation request',
      details: error.message
    });
  }
}