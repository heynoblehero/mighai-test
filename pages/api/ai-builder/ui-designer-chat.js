// UI Designer Chat API - Real-time UI design with AI
async function processWithClaude(pageData, selectedInputs, currentPreview, message, chatHistory) {
  const claudeApiKey = process.env.CLAUDE_API_KEY;

  const systemPrompt = `You are an expert UI/UX Designer AI helping users create beautiful interfaces for logic pages. You're working on "${pageData.name}" - ${pageData.description}.

Current Input Fields Available:
${selectedInputs.map(field => `- ${field.field_label} (${field.field_type}): ${field.help_text || 'No description'}`).join('\n')}

Your role is to:
1. Help modify the UI design based on user requests
2. Generate updated HTML previews when changes are made
3. Provide design recommendations and best practices
4. Explain your design choices clearly

IMPORTANT: When you need to update the preview, you MUST include the complete HTML code in this EXACT format:

---UPDATE-PREVIEW---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageData.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom styles here */
    </style>
</head>
<body>
    <!-- Updated UI here -->
</body>
</html>
---END-PREVIEW---

DO NOT include any text, explanations, or code blocks between the markers. Only raw HTML.

Guidelines:
- Use Tailwind CSS for styling
- Make designs responsive and accessible
- Keep the same input fields but improve their presentation
- Focus on user experience and visual appeal
- ALWAYS include an updated preview when making any visual changes
- If you're making design suggestions, provide the updated HTML
- Explain your design decisions
- Be conversational and helpful

Available field types: ${[...new Set(selectedInputs.map(f => f.field_type))].join(', ')}
Current theme: Modern and clean
Layout preference: Centered, responsive design

Current Preview HTML:
${currentPreview || 'No preview yet'}`;

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

    // Check if there's a preview update
    let updatedPreview = null;
    const previewMatch = responseText.match(/---UPDATE-PREVIEW---([\s\S]*?)---END-PREVIEW---/);
    if (previewMatch) {
      try {
        let extractedHtml = previewMatch[1].trim();

        // Clean up any markdown code blocks or extra formatting
        extractedHtml = extractedHtml.replace(/^```html\s*/, '').replace(/\s*```$/, '');
        extractedHtml = extractedHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');

        // Ensure it starts with valid HTML
        if (extractedHtml && (extractedHtml.startsWith('<!DOCTYPE') || extractedHtml.startsWith('<html'))) {
          updatedPreview = extractedHtml;
          console.log('Updated preview found and cleaned');
        } else {
          console.log('No valid HTML found in preview section, raw content:', extractedHtml.substring(0, 200));
        }
      } catch (e) {
        console.error('Failed to extract preview update:', e);
      }
    } else {
      console.log('No preview update markers found in response');
    }

    // Remove the preview section from the response text
    const cleanResponse = responseText.replace(/---UPDATE-PREVIEW---[\s\S]*?---END-PREVIEW---/, '').trim();

    return {
      response: cleanResponse,
      updatedPreview: updatedPreview
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

  const { pageData, selectedInputs, currentPreview, message, chatHistory } = req.body;

  if (!pageData || !selectedInputs || !message) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const result = await processWithClaude(pageData, selectedInputs, currentPreview, message, chatHistory || []);

    return res.status(200).json({
      success: true,
      response: result.response,
      updatedPreview: result.updatedPreview
    });

  } catch (error) {
    console.error('UI Designer chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process UI design request',
      details: error.message
    });
  }
}