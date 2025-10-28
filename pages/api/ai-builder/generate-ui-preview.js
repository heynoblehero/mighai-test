// UI Preview Generator for External Tools (Lovable, etc.)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frontendConfig, pageData, previewType = 'react' } = req.body;

  if (!frontendConfig || !pageData) {
    return res.status(400).json({ error: 'Frontend config and page data are required' });
  }

  try {
    let previewCode = '';
    let previewInstructions = '';

    switch (previewType) {
      case 'react':
        previewCode = generateReactPreview(frontendConfig, pageData);
        previewInstructions = generateReactInstructions(frontendConfig, pageData);
        break;
      case 'html':
        previewCode = generateHTMLPreview(frontendConfig, pageData);
        previewInstructions = generateHTMLInstructions(frontendConfig, pageData);
        break;
      case 'lovable':
        previewCode = generateLovablePreview(frontendConfig, pageData);
        previewInstructions = generateLovableInstructions(frontendConfig, pageData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid preview type' });
    }

    return res.status(200).json({
      success: true,
      previewCode,
      previewInstructions,
      previewType,
      componentCount: frontendConfig.ui_components?.length || 0,
      metadata: {
        title: frontendConfig.title || pageData.name,
        theme: frontendConfig.theme || 'modern',
        layout: frontendConfig.layout || 'centered',
        responsiveConfig: frontendConfig.layout_structure?.responsive_config
      }
    });

  } catch (error) {
    console.error('UI Preview generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate UI preview',
      details: error.message
    });
  }
}

function generateReactPreview(frontendConfig, pageData) {
  const components = frontendConfig.ui_components || [];
  const styling = frontendConfig.styling || {};

  return `import React, { useState } from 'react';

const ${pageData.name?.replace(/\s+/g, '')}Page = () => {
  // State for form inputs
  ${components.filter(c => c.properties?.field_name).map(c =>
    `const [${c.properties.field_name}, set${capitalize(c.properties.field_name)}] = useState('');`
  ).join('\n  ')}

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/logic-pages/${pageData.slug}/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ${components.filter(c => c.properties?.field_name).map(c =>
            `${c.properties.field_name}`
          ).join(',\n          ')}
        })
      });

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="${styling.spacing?.container || 'max-w-4xl mx-auto p-6'}"
         style={{ backgroundColor: '${styling.theme_colors?.background || '#f8fafc'}' }}>

      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="${styling.typography?.heading || 'font-bold text-2xl'}"
            style={{ color: '${styling.theme_colors?.primary || '#3b82f6'}' }}>
          ${frontendConfig.title || pageData.name}
        </h1>
        ${frontendConfig.subtitle ? `
        <p className="${styling.typography?.subheading || 'font-semibold text-lg'}"
           style={{ color: '${styling.theme_colors?.secondary || '#64748b'}' }}>
          ${frontendConfig.subtitle}
        </p>` : ''}
        ${pageData.description ? `
        <p className="${styling.typography?.body || 'text-base'} mt-4 opacity-80">
          ${pageData.description}
        </p>` : ''}
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <form onSubmit={handleSubmit} className="${styling.spacing?.field_gap || 'space-y-4'}">
          ${generateReactComponents(components, styling)}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors
                     ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}"
            style={{
              backgroundColor: loading ? '#94a3b8' : '${styling.theme_colors?.primary || '#3b82f6'}'
            }}
          >
            {loading ? 'Processing...' : 'Generate Result'}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="${styling.typography?.subheading || 'font-semibold text-lg'} mb-4">
            Result:
          </h3>
          <div className="bg-gray-50 rounded p-4">
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ${pageData.name?.replace(/\s+/g, '')}Page;`;
}

function generateReactComponents(components, styling) {
  return components.map(component => {
    const props = component.properties || {};
    const fieldName = props.field_name;
    const setterName = `set${capitalize(fieldName)}`;

    switch (props.field_type) {
      case 'textarea':
        return `
          <div>
            <label className="${props.styling?.label_classes || 'block text-sm font-medium mb-2'}">
              ${props.field_label}${props.is_required ? ' *' : ''}
            </label>
            <textarea
              value={${fieldName}}
              onChange={(e) => ${setterName}(e.target.value)}
              placeholder="${props.placeholder || ''}"
              rows={4}
              className="${props.styling?.input_classes || 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}"
              ${props.is_required ? 'required' : ''}
            />
            ${props.help_text ? `<p className="text-sm text-gray-500 mt-1">${props.help_text}</p>` : ''}
          </div>`;

      case 'select':
        return `
          <div>
            <label className="${props.styling?.label_classes || 'block text-sm font-medium mb-2'}">
              ${props.field_label}${props.is_required ? ' *' : ''}
            </label>
            <select
              value={${fieldName}}
              onChange={(e) => ${setterName}(e.target.value)}
              className="${props.styling?.input_classes || 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}"
              ${props.is_required ? 'required' : ''}
            >
              <option value="">Select an option...</option>
              ${props.field_options?.options?.map(opt =>
                `<option value="${opt.value || opt}">${opt.label || opt}</option>`
              ).join('\n              ') || ''}
            </select>
            ${props.help_text ? `<p className="text-sm text-gray-500 mt-1">${props.help_text}</p>` : ''}
          </div>`;

      case 'file':
        return `
          <div>
            <label className="${props.styling?.label_classes || 'block text-sm font-medium mb-2'}">
              ${props.field_label}${props.is_required ? ' *' : ''}
            </label>
            <input
              type="file"
              onChange={(e) => ${setterName}(e.target.files[0])}
              className="${props.styling?.input_classes || 'w-full px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}"
              ${props.is_required ? 'required' : ''}
            />
            ${props.help_text ? `<p className="text-sm text-gray-500 mt-1">${props.help_text}</p>` : ''}
          </div>`;

      default: // text, email, number, etc.
        return `
          <div>
            <label className="${props.styling?.label_classes || 'block text-sm font-medium mb-2'}">
              ${props.field_label}${props.is_required ? ' *' : ''}
            </label>
            <input
              type="${props.field_type || 'text'}"
              value={${fieldName}}
              onChange={(e) => ${setterName}(e.target.value)}
              placeholder="${props.placeholder || ''}"
              className="${props.styling?.input_classes || 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}"
              ${props.is_required ? 'required' : ''}
              ${props.validation?.min_length ? `minLength={${props.validation.min_length}}` : ''}
              ${props.validation?.max_length ? `maxLength={${props.validation.max_length}}` : ''}
            />
            ${props.help_text ? `<p className="text-sm text-gray-500 mt-1">${props.help_text}</p>` : ''}
          </div>`;
    }
  }).join('\n          ');
}

function generateLovablePreview(frontendConfig, pageData) {
  return `// Lovable AI Prompt for ${pageData.name}

Create a ${frontendConfig.theme || 'modern'} React component for "${frontendConfig.title || pageData.name}" with the following specifications:

LAYOUT & DESIGN:
- Theme: ${frontendConfig.theme || 'modern'} with ${frontendConfig.layout || 'centered'} layout
- Primary color: ${frontendConfig.styling?.theme_colors?.primary || '#3b82f6'}
- Background: ${frontendConfig.styling?.theme_colors?.background || '#f8fafc'}
- Container: ${frontendConfig.styling?.spacing?.container || 'max-w-4xl mx-auto p-6'}

TITLE SECTION:
- Main title: "${frontendConfig.title || pageData.name}"
${frontendConfig.subtitle ? `- Subtitle: "${frontendConfig.subtitle}"` : ''}
${pageData.description ? `- Description: "${pageData.description}"` : ''}

FORM COMPONENTS:
${(frontendConfig.ui_components || []).map((component, index) => {
  const props = component.properties || {};
  return `${index + 1}. ${props.field_label || component.name}:
   - Type: ${props.field_type || 'text'}
   - Required: ${props.is_required ? 'Yes' : 'No'}
   - Placeholder: "${props.placeholder || ''}"
   ${props.help_text ? `- Help text: "${props.help_text}"` : ''}
   ${props.field_options?.options ? `- Options: ${JSON.stringify(props.field_options.options)}` : ''}`;
}).join('\n')}

INTERACTIONS:
- Form validation: ${frontendConfig.interactions?.form_submission?.validation || 'client_and_server'}
- Loading state: ${frontendConfig.interactions?.form_submission?.loading_state || 'show_spinner'}
- Success behavior: ${frontendConfig.interactions?.form_submission?.success_behavior || 'show_result_section'}
${frontendConfig.interactions?.real_time_features?.character_counter ? '- Include character counter for text fields' : ''}

RESPONSIVE BEHAVIOR:
- Mobile: ${frontendConfig.layout_structure?.responsive_config?.mobile || 'stacked'}
- Tablet: ${frontendConfig.layout_structure?.responsive_config?.tablet || 'flexible'}
- Desktop: ${frontendConfig.layout_structure?.responsive_config?.desktop || 'grid'}

Please create a fully functional React component with proper state management, form handling, and the specified styling.`;
}

function generateHTMLPreview(frontendConfig, pageData) {
  const components = frontendConfig.ui_components || [];
  const styling = frontendConfig.styling || {};

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${frontendConfig.title || pageData.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --primary-color: ${styling.theme_colors?.primary || '#3b82f6'};
            --secondary-color: ${styling.theme_colors?.secondary || '#64748b'};
            --background-color: ${styling.theme_colors?.background || '#f8fafc'};
        }
        body {
            background-color: var(--background-color);
        }
    </style>
</head>
<body class="min-h-screen">
    <div class="${styling.spacing?.container || 'max-w-4xl mx-auto p-6'}">

        <!-- Header Section -->
        <div class="text-center mb-8">
            <h1 class="${styling.typography?.heading || 'font-bold text-2xl'}"
                style="color: var(--primary-color)">
                ${frontendConfig.title || pageData.name}
            </h1>
            ${frontendConfig.subtitle ? `
            <p class="${styling.typography?.subheading || 'font-semibold text-lg'}"
               style="color: var(--secondary-color)">
                ${frontendConfig.subtitle}
            </p>` : ''}
            ${pageData.description ? `
            <p class="${styling.typography?.body || 'text-base'} mt-4 opacity-80">
                ${pageData.description}
            </p>` : ''}
        </div>

        <!-- Main Form -->
        <div class="bg-white rounded-lg shadow-lg p-8 mb-6">
            <form id="logicPageForm" class="${styling.spacing?.field_gap || 'space-y-4'}">
                ${generateHTMLComponents(components, styling)}

                <button
                    type="submit"
                    class="w-full px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    style="background-color: var(--primary-color)"
                >
                    Generate Result
                </button>
            </form>
        </div>

        <!-- Results Section -->
        <div id="resultsSection" class="bg-white rounded-lg shadow-lg p-8 hidden">
            <h3 class="${styling.typography?.subheading || 'font-semibold text-lg'} mb-4">Result:</h3>
            <div id="resultContent" class="bg-gray-50 rounded p-4">
                <!-- Results will be displayed here -->
            </div>
        </div>
    </div>

    <script>
        document.getElementById('logicPageForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect form data
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;

            try {
                // Make API call
                const response = await fetch('/api/logic-pages/${pageData.slug}/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                // Show results
                document.getElementById('resultContent').textContent = result.result || 'No result';
                document.getElementById('resultsSection').classList.remove('hidden');

            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while processing your request.');
            } finally {
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    </script>
</body>
</html>`;
}

function generateHTMLComponents(components, styling) {
  return components.map(component => {
    const props = component.properties || {};

    switch (props.field_type) {
      case 'textarea':
        return `
                <div>
                    <label class="${props.styling?.label_classes || 'block text-sm font-medium mb-2'}">
                        ${props.field_label}${props.is_required ? ' *' : ''}
                    </label>
                    <textarea
                        name="${props.field_name}"
                        placeholder="${props.placeholder || ''}"
                        rows="4"
                        class="${props.styling?.input_classes || 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}"
                        ${props.is_required ? 'required' : ''}
                    ></textarea>
                    ${props.help_text ? `<p class="text-sm text-gray-500 mt-1">${props.help_text}</p>` : ''}
                </div>`;

      case 'select':
        return `
                <div>
                    <label class="${props.styling?.label_classes || 'block text-sm font-medium mb-2'}">
                        ${props.field_label}${props.is_required ? ' *' : ''}
                    </label>
                    <select
                        name="${props.field_name}"
                        class="${props.styling?.input_classes || 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}"
                        ${props.is_required ? 'required' : ''}
                    >
                        <option value="">Select an option...</option>
                        ${props.field_options?.options?.map(opt =>
                          `<option value="${opt.value || opt}">${opt.label || opt}</option>`
                        ).join('\n                        ') || ''}
                    </select>
                    ${props.help_text ? `<p class="text-sm text-gray-500 mt-1">${props.help_text}</p>` : ''}
                </div>`;

      default: // text, email, number, etc.
        return `
                <div>
                    <label class="${props.styling?.label_classes || 'block text-sm font-medium mb-2'}">
                        ${props.field_label}${props.is_required ? ' *' : ''}
                    </label>
                    <input
                        type="${props.field_type || 'text'}"
                        name="${props.field_name}"
                        placeholder="${props.placeholder || ''}"
                        class="${props.styling?.input_classes || 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}"
                        ${props.is_required ? 'required' : ''}
                        ${props.validation?.min_length ? `minlength="${props.validation.min_length}"` : ''}
                        ${props.validation?.max_length ? `maxlength="${props.validation.max_length}"` : ''}
                    />
                    ${props.help_text ? `<p class="text-sm text-gray-500 mt-1">${props.help_text}</p>` : ''}
                </div>`;
    }
  }).join('\n');
}

function generateReactInstructions(frontendConfig, pageData) {
  return `Instructions for implementing ${pageData.name} in your React application:

1. COMPONENT SETUP:
   - Create a new React component file: ${pageData.name?.replace(/\s+/g, '')}.jsx
   - Install required dependencies: react, tailwindcss

2. STATE MANAGEMENT:
   - Set up state for each form field
   - Implement loading and result states
   - Add form validation as needed

3. STYLING:
   - The component uses Tailwind CSS classes
   - Primary color: ${frontendConfig.styling?.theme_colors?.primary || '#3b82f6'}
   - Customize colors by updating the style prop values

4. API INTEGRATION:
   - Update the API endpoint: /api/logic-pages/${pageData.slug}/execute
   - Ensure your backend can handle the form data structure
   - Implement proper error handling

5. RESPONSIVE DESIGN:
   - The layout is responsive using Tailwind classes
   - Test on mobile, tablet, and desktop screen sizes

6. ACCESSIBILITY:
   - All form fields have proper labels
   - Form validation provides user feedback
   - Focus states are included for keyboard navigation`;
}

function generateHTMLInstructions(frontendConfig, pageData) {
  return `Instructions for implementing ${pageData.name} as a standalone HTML page:

1. FILE SETUP:
   - Save the HTML code as: ${pageData.slug || pageData.name?.toLowerCase().replace(/\s+/g, '-')}.html
   - Ensure you have internet connection for Tailwind CDN

2. CUSTOMIZATION:
   - Update CSS variables in the <style> section for theme colors
   - Modify Tailwind classes for layout adjustments
   - Add custom CSS as needed in the style section

3. BACKEND INTEGRATION:
   - Update the fetch URL to match your API endpoint
   - Ensure CORS is properly configured on your server
   - Handle authentication if required

4. JAVASCRIPT FUNCTIONALITY:
   - Form submission is handled via vanilla JavaScript
   - Results are displayed dynamically
   - Error handling is basic - enhance as needed

5. DEPLOYMENT:
   - Can be deployed as a static file
   - Works with any web server
   - No build process required`;
}

function generateLovableInstructions(frontendConfig, pageData) {
  return `Instructions for using this prompt with Lovable AI:

1. COPY THE PROMPT:
   - Copy the generated Lovable prompt above
   - Paste it into Lovable's AI interface

2. CUSTOMIZATION OPTIONS:
   - Ask Lovable to adjust colors, spacing, or layout
   - Request additional features like animations
   - Modify component behavior as needed

3. INTEGRATION:
   - Export the generated React component
   - Integrate with your existing project
   - Add any necessary API endpoints

4. TESTING:
   - Test all form interactions
   - Verify responsive behavior
   - Check accessibility features

5. DEPLOYMENT:
   - Use Lovable's deployment features
   - Or export and deploy with your preferred method
   - Ensure backend API is accessible`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}