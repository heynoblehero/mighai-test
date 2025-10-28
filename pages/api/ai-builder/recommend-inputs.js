// AI Input Field Recommendations
async function processWithClaude(pageData, comprehensivePrompt) {
  const claudeApiKey = process.env.CLAUDE_API_KEY;

  const systemPrompt = `You are an expert UX/UI analyst. Your job is to analyze a user's logic page description and recommend the optimal input fields they would need.

Based on the description, suggest input fields that would be necessary for the functionality described. Focus ONLY on the input fields - don't design the full UI yet.

IMPORTANT: Respond with a JSON object in this exact format:

{
  "recommendedInputs": [
    {
      "field_id": "unique_field_id",
      "field_name": "field_name_for_backend",
      "field_label": "User-visible Label",
      "field_type": "text|textarea|email|number|select|checkbox|file|date|url",
      "is_required": true|false,
      "placeholder": "Example placeholder text",
      "help_text": "Brief explanation of what this field does",
      "reasoning": "Why this field is needed for the described functionality",
      "priority": "high|medium|low",
      "field_options": {
        "options": ["Option 1", "Option 2"]
      },
      "validation": {
        "min_length": 0,
        "max_length": 5000,
        "pattern": ""
      }
    }
  ]
}

Guidelines:
- Recommend 3-8 input fields based on the complexity
- Think about what data the user would realistically need to collect
- Include validation requirements where appropriate
- For select fields, provide realistic options
- Prioritize fields (high = essential, medium = useful, low = nice-to-have)
- Provide clear reasoning for each field recommendation
- Keep field names simple (e.g., "user_input", "file_upload", "analysis_type")

IMPORTANT: Only use regular double quotes for strings. Do NOT use template literals (backticks).

Page Details:
- Name: ${pageData.name}
- Description: ${pageData.description}
- Access Level: ${pageData.accessLevel}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{
          role: 'user',
          content: `Analyze this logic page description and recommend appropriate input fields:\n\n${comprehensivePrompt}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    // Try to find and parse the JSON more carefully
    let config;
    try {
      // First try to parse as-is
      config = JSON.parse(jsonMatch[0]);
    } catch (e) {
      // If that fails, try to clean the JSON
      console.log('Initial JSON parse failed, attempting to clean...');
      console.log('Raw response:', responseText);

      let cleanJson = jsonMatch[0]
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters but preserve spaces and newlines we want
        .replace(/\n\s*/g, ' ') // Replace newlines with spaces
        .replace(/\t/g, ' ') // Replace tabs with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/`([^`]*)`/g, '"$1"') // Replace template literals with regular strings
        .trim();

      console.log('Cleaned JSON:', cleanJson);
      config = JSON.parse(cleanJson);
    }

    // Validate required properties
    if (!config.recommendedInputs || !Array.isArray(config.recommendedInputs)) {
      throw new Error('Invalid input recommendations structure');
    }

    return config;

  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageData, comprehensivePrompt } = req.body;

  if (!pageData || !comprehensivePrompt) {
    return res.status(400).json({ error: 'Page data and comprehensive prompt are required' });
  }

  try {
    // Get AI-generated input recommendations
    const config = await processWithClaude(pageData, comprehensivePrompt);

    // Ensure all fields have proper structure
    const recommendedInputs = config.recommendedInputs.map((field, index) => ({
      field_id: field.field_id || `field_${index + 1}`,
      field_name: field.field_name || `field_${index + 1}`,
      field_label: field.field_label || `Field ${index + 1}`,
      field_type: field.field_type || 'text',
      is_required: field.is_required !== undefined ? field.is_required : true,
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      reasoning: field.reasoning || 'Recommended based on page functionality',
      priority: field.priority || 'medium',
      field_options: field.field_options || null,
      validation: field.validation || {},
      order_index: index
    }));

    return res.status(200).json({
      success: true,
      recommendedInputs,
      totalRecommendations: recommendedInputs.length,
      message: 'Input field recommendations generated successfully'
    });

  } catch (error) {
    console.error('Input recommendations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate input recommendations',
      details: error.message
    });
  }
}