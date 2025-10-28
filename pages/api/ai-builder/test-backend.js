// Backend Testing API for AI Builder
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { backendConfig, testInputs, selectedInputs } = req.body;
  const claudeApiKey = process.env.CLAUDE_API_KEY;

  try {
    // Test if the configuration is valid
    if (!backendConfig || !backendConfig.systemPrompt || !backendConfig.userPromptTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Backend configuration with system prompt and user prompt template are required'
      });
    }

    const startTime = Date.now();

    // Process user prompt template with test inputs
    let processedPrompt = backendConfig.userPromptTemplate;

    // Replace placeholders with test input values
    Object.keys(testInputs || {}).forEach(key => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedPrompt = processedPrompt.replace(regex, testInputs[key] || '');
    });

    // Try calling Claude API with the configuration
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: backendConfig.model || 'claude-3-5-sonnet-20241022',
        max_tokens: backendConfig.maxTokens || 1500,
        temperature: backendConfig.temperature || 0.7,
        system: backendConfig.systemPrompt,
        messages: [{
          role: 'user',
          content: processedPrompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const testOutput = data.content[0]?.text || 'No response generated';
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    const duration = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      response: testOutput,
      metadata: {
        tokens: tokensUsed,
        duration: duration,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        processedPrompt: processedPrompt
      }
    });

  } catch (error) {
    console.error('Backend Test Error:', error);
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}