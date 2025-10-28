const fs = require('fs').promises;
const path = require('path');

// AI-Powered Endpoint Generator
async function processWithClaude(endpointDescription, existingCode, chatHistory, endpointConfig) {
  const claudeApiKey = process.env.CLAUDE_API_KEY;

  if (!claudeApiKey) {
    throw new Error('Claude API key not configured');
  }

  const systemPrompt = `You are an expert Full-Stack API Developer AI specializing in creating production-ready Node.js/Next.js API endpoints. You help users build any type of backend endpoint through conversation.

CURRENT ENDPOINT: ${endpointConfig?.name || 'New Endpoint'}
DESCRIPTION: ${endpointConfig?.description || 'Not specified'}
PATH: ${endpointConfig?.path || '/api/new-endpoint'}
METHOD: ${endpointConfig?.methods?.join(', ') || 'GET, POST'}

EXISTING CODE:
${existingCode || 'No existing code yet'}

Your role is to:
1. Create complete, production-ready Next.js API route handlers
2. Support any HTTP method (GET, POST, PUT, DELETE, PATCH)
3. Build data processing, validation, and business logic
4. Integrate with databases, external APIs, and services
5. Implement authentication, authorization, and security
6. Add proper error handling and response formatting
7. Support real-time features, webhooks, and integrations

ENDPOINT TYPES YOU CAN CREATE:
- REST APIs for CRUD operations
- Data processors and transformers
- External API integrators
- Webhook handlers and event processors
- File upload/download handlers
- Authentication endpoints
- Real-time chat/messaging APIs
- Payment processing endpoints
- Email/SMS notification services
- Analytics and reporting APIs
- AI/ML service integrators
- Social media integrators
- Database query endpoints
- Caching and optimization layers

CODE GENERATION RULES:
1. Always wrap your complete endpoint code in: ---ENDPOINT-CODE--- ... ---END-CODE---
2. Include proper Next.js API route structure
3. Handle all HTTP methods as requested
4. Add comprehensive error handling
5. Include request validation and sanitization
6. Use modern JavaScript/TypeScript features
7. Add detailed comments explaining functionality
8. Return consistent JSON response format
9. Include proper HTTP status codes
10. Add security measures and input validation

EXAMPLE ENDPOINT STRUCTURE:
---ENDPOINT-CODE---
// API Endpoint: [Description]
// Methods: GET, POST
// Path: /api/example

export default async function handler(req, res) {
  // Set CORS headers if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: \`Method \${req.method} not allowed\`
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function handleGet(req, res) {
  // GET logic here
  return res.status(200).json({
    success: true,
    data: { message: 'GET request successful' }
  });
}

async function handlePost(req, res) {
  // POST logic here
  const { body } = req;

  // Validate input
  if (!body) {
    return res.status(400).json({
      success: false,
      error: 'Request body required'
    });
  }

  return res.status(200).json({
    success: true,
    data: { message: 'POST request successful', received: body }
  });
}
---END-CODE---

LIBRARIES AVAILABLE:
- Node.js built-in modules (fs, path, crypto, http, https, etc.)
- Database: sqlite3, postgresql, mongodb clients
- HTTP requests: fetch, axios
- Authentication: jsonwebtoken, bcrypt, passport
- File handling: multer, formidable
- Validation: joi, yup, zod
- Utilities: lodash, moment, uuid
- Payment: stripe, paypal
- Email: nodemailer, sendgrid
- External APIs: Any REST/GraphQL API

When generating endpoints:
1. Ask clarifying questions if requirements are unclear
2. Suggest best practices and security measures
3. Provide complete, ready-to-deploy code
4. Explain what the endpoint does and how to use it
5. Include example requests/responses
6. Suggest testing approaches

Response format: First explain what you're building, then provide the complete endpoint code.`;

  const messages = [
    ...chatHistory.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    {
      role: 'user',
      content: endpointDescription
    }
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

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
          max_tokens: 4000,
          system: systemPrompt,
          messages: messages
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Claude API request timed out after 45 seconds');
      }
      throw error;
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Extract generated endpoint code
    let generatedCode = null;
    const codeMatch = responseText.match(/---ENDPOINT-CODE---([\s\S]*?)---END-CODE---/);
    if (codeMatch && codeMatch[1]) {
      generatedCode = codeMatch[1].trim();
      console.log('Endpoint code extracted successfully');
    }

    // Remove the code section from the response text for clean explanation
    const cleanResponse = responseText.replace(/---ENDPOINT-CODE---[\s\S]*?---END-CODE---/, '').trim();

    return {
      response: cleanResponse,
      generatedCode: generatedCode,
      metadata: {
        model: 'claude-3-5-sonnet-20241022',
        tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}

// Endpoint configuration parser
function parseEndpointConfig(userMessage, existingConfig = {}) {
  const config = { ...existingConfig };

  // Extract endpoint name
  const nameMatch = userMessage.match(/(?:endpoint|api|service)?\s*(?:called|named)\s+["']?([^"'\s]+)["']?/i);
  if (nameMatch) {
    config.name = nameMatch[1];
  }

  // Extract path
  const pathMatch = userMessage.match(/(?:path|route|url)\s+(?:is\s+)?["']?([^"'\s]+)["']?/i);
  if (pathMatch) {
    config.path = pathMatch[1].startsWith('/') ? pathMatch[1] : `/${pathMatch[1]}`;
  }

  // Extract HTTP methods
  const methods = [];
  if (/\bGET\b/i.test(userMessage)) methods.push('GET');
  if (/\bPOST\b/i.test(userMessage)) methods.push('POST');
  if (/\bPUT\b/i.test(userMessage)) methods.push('PUT');
  if (/\bDELETE\b/i.test(userMessage)) methods.push('DELETE');
  if (/\bPATCH\b/i.test(userMessage)) methods.push('PATCH');

  if (methods.length > 0) {
    config.methods = methods;
  } else if (!config.methods) {
    config.methods = ['GET', 'POST']; // Default methods
  }

  return config;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    message,
    existingCode,
    chatHistory = [],
    endpointConfig = {},
    action = 'generate' // 'generate', 'update', 'deploy'
  } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Parse endpoint configuration from user message
    const updatedConfig = parseEndpointConfig(message, endpointConfig);

    // Generate/update endpoint code with AI
    const result = await processWithClaude(message, existingCode, chatHistory, updatedConfig);

    const response = {
      success: true,
      response: result.response,
      generatedCode: result.generatedCode,
      endpointConfig: updatedConfig,
      metadata: result.metadata
    };

    // If user wants to deploy, we'll add deployment info
    if (action === 'deploy' && result.generatedCode) {
      response.deploymentReady = true;
      response.suggestedPath = updatedConfig.path || '/api/generated-endpoint';
      response.supportedMethods = updatedConfig.methods || ['GET', 'POST'];
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Endpoint creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create endpoint',
      details: error.message
    });
  }
}