// Backend Chat Assistant
async function processWithClaude(pageData, currentBackendConfig, selectedInputs, message, chatHistory) {
  const claudeApiKey = process.env.CLAUDE_API_KEY;

  const systemPrompt = `You are a Backend Logic Assistant helping to build AI-powered backend functionality for a logic page. The user is working on "${pageData.name}" - ${pageData.description}.

Input Fields Available:
${selectedInputs.map(f => `- ${f.field_name}: ${f.field_label} (${f.field_type})`).join('\n')}

Current Backend Configuration:
${JSON.stringify(currentBackendConfig, null, 2)}

Your role is to:
1. Help create system prompts for the AI backend
2. Build user prompt templates that use frontend field values
3. Configure AI parameters (temperature, max tokens, etc.)
4. Provide backend logic recommendations
5. Update the configuration when changes are needed

When you need to update the configuration, include it in your response using this format:
---UPDATE-CONFIG---
{
  "backendConfig": {
    "systemPrompt": "Updated system prompt...",
    "userPromptTemplate": "Template with {{field_name}} placeholders",
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 1500,
    "temperature": 0.7
  },
  "resultConfig": {
    "displayType": "text|markdown|html|json",
    "allowDownload": true,
    "showMetadata": false
  }
}
---END-UPDATE---

Guidelines:
- Use field placeholders like {{field_name}} in userPromptTemplate
- Create specific, detailed system prompts
- Choose appropriate display types for results
- Set reasonable token limits (500-3000 tokens)
- Use temperature 0.1-0.3 for analytical tasks, 0.7-0.9 for creative tasks
- Be conversational and explain your recommendations

Available field placeholders:
${selectedInputs.map(f => `{{${f.field_name}}}`).join(', ')}

Model options: claude-3-5-sonnet-20241022
Display types: text (plain text), markdown (formatted), html (rich), json (structured)`;

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
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
          max_tokens: 2000,
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

    // Check if there's a configuration update
    let updatedConfig = null;
    let updatedResultConfig = null;
    const configMatch = responseText.match(/---UPDATE-CONFIG---([\s\S]*?)---END-UPDATE---/);
    if (configMatch && configMatch[1] && configMatch[1].trim()) {
      try {
        let configJson = configMatch[1].trim();

        // Skip if the JSON is empty or just contains whitespace/comments
        if (!configJson || configJson.length < 10) {
          console.log('Backend config update section is empty, skipping');
        } else {
          let configData;

          try {
            // First try to parse as-is
            configData = JSON.parse(configJson);
          } catch (parseError) {
            // If that fails, clean and try again
            console.log('Initial backend config JSON parse failed, attempting to clean...');
            let cleanJson = configJson
              .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
              .replace(/\n\s*/g, ' ') // Replace newlines with spaces
              .replace(/\t/g, ' ') // Replace tabs with spaces
              .replace(/\s+/g, ' ') // Normalize whitespace
              .replace(/`([^`]*)`/g, '"$1"') // Replace template literals with regular strings
              .trim();
            configData = JSON.parse(cleanJson);
          }

          // Validate that we have a proper structure
          if (configData && typeof configData === 'object') {
            if (configData.backendConfig) {
              updatedConfig = configData.backendConfig;
            }
            if (configData.resultConfig) {
              updatedResultConfig = configData.resultConfig;
            }
          } else {
            console.log('Invalid backend config structure, ignoring update');
          }
        }
      } catch (e) {
        console.error('Failed to parse backend config update:', e);
        console.error('Backend config match content:', configMatch[1]);
        updatedConfig = null;
        updatedResultConfig = null;
      }
    }

    // Remove the config section from the response text
    const cleanResponse = responseText.replace(/---UPDATE-CONFIG---[\s\S]*?---END-UPDATE---/, '').trim();

    return {
      response: cleanResponse,
      updatedConfig: updatedConfig,
      updatedResultConfig: updatedResultConfig
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

  const { pageData, currentBackendConfig, selectedInputs, message, chatHistory } = req.body;

  if (!pageData || !currentBackendConfig || !selectedInputs || !message) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const result = await processWithClaude(pageData, currentBackendConfig, selectedInputs, message, chatHistory || []);

    return res.status(200).json({
      success: true,
      response: result.response,
      updatedConfig: result.updatedConfig,
      updatedResultConfig: result.updatedResultConfig
    });

  } catch (error) {
    console.error('Backend chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: error.message
    });
  }
}