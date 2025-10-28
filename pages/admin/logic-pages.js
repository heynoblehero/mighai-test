import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function LogicPagesAdmin() {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit', 'view'
  const [currentStep, setCurrentStep] = useState('build-type'); // 'build-type', 'details', 'describe-logic', 'input-recommendations', 'ui-designer', 'backend-builder', 'api-endpoint-builder', 'test-backend', 'full-preview', 'deploy'
  const [buildType, setBuildType] = useState(''); // 'logic-page' or 'api-endpoint'
  const [editingPageId, setEditingPageId] = useState(null);
  const [viewingPageId, setViewingPageId] = useState(null);

  // Existing logic pages management
  const [existingPages, setExistingPages] = useState([]);
  const [pagesStats, setPagesStats] = useState({});
  const [loadingPages, setLoadingPages] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageData, setPageData] = useState({
    name: '',
    description: '',
    slug: '',
    accessLevel: 'public',
    maxExecutions: 0
  });

  const [frontendConfig, setFrontendConfig] = useState({
    title: '',
    subtitle: '',
    theme: 'modern',
    layout: 'centered',
    fields: [],
    ui_components: [],
    layout_structure: {
      sections: {
        header: { enabled: true, components: [] },
        main: { enabled: true, components: [] },
        sidebar: { enabled: false, components: [] },
        footer: { enabled: false, components: [] }
      },
      responsive_config: {
        mobile: 'stacked',
        tablet: 'flexible',
        desktop: 'grid'
      }
    },
    styling: {
      theme_colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#10b981',
        background: '#f8fafc',
        surface: '#ffffff'
      },
      typography: {
        heading: 'font-bold text-2xl',
        subheading: 'font-semibold text-lg',
        body: 'text-base',
        small: 'text-sm'
      },
      spacing: {
        container: 'max-w-4xl mx-auto p-6',
        section_gap: 'space-y-8',
        field_gap: 'space-y-4'
      }
    },
    interactions: {
      form_submission: {
        method: 'POST',
        validation: 'client_and_server',
        loading_state: 'show_spinner',
        success_behavior: 'show_result_section'
      },
      real_time_features: {
        auto_save: false,
        live_preview: false,
        character_counter: true
      }
    }
  });

  const [backendConfig, setBackendConfig] = useState({
    systemPrompt: '',
    userPromptTemplate: '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1500,
    temperature: 0.7
  });

  const [resultConfig, setResultConfig] = useState({
    displayType: 'text',
    allowDownload: true,
    showMetadata: false
  });

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [frontendChatMessages, setFrontendChatMessages] = useState([]);
  const [frontendChatInput, setFrontendChatInput] = useState('');
  const [frontendChatLoading, setFrontendChatLoading] = useState(false);
  const [backendChatMessages, setBackendChatMessages] = useState([]);
  const [backendChatInput, setBackendChatInput] = useState('');
  const [backendChatLoading, setBackendChatLoading] = useState(false);
  const [testInputs, setTestInputs] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // New state for the updated workflow
  const [recommendedInputs, setRecommendedInputs] = useState([]);
  const [selectedInputs, setSelectedInputs] = useState([]);
  const [livePreview, setLivePreview] = useState('');
  const [uiChatMessages, setUiChatMessages] = useState([]);
  const [uiChatInput, setUiChatInput] = useState('');
  const [uiChatLoading, setUiChatLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [comprehensivePrompt, setComprehensivePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('frontend'); // 'frontend', 'backend', 'result'

  // Enhanced Backend Builder State
  const [backendMode, setBackendMode] = useState('chat'); // 'chat', 'code-view', 'test'
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExecutionResults, setCodeExecutionResults] = useState(null);
  const [codeExecutionLoading, setCodeExecutionLoading] = useState(false);

  // API Endpoint Builder State
  const [endpointConfig, setEndpointConfig] = useState({
    name: '',
    description: '',
    path: '',
    methods: ['GET', 'POST']
  });
  const [endpointChatMessages, setEndpointChatMessages] = useState([]);
  const [endpointChatInput, setEndpointChatInput] = useState('');
  const [endpointChatLoading, setEndpointChatLoading] = useState(false);
  const [generatedEndpointCode, setGeneratedEndpointCode] = useState('');
  const [deployedEndpoint, setDeployedEndpoint] = useState(null);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [endpointTestResults, setEndpointTestResults] = useState(null);
  const [endpointTestLoading, setEndpointTestLoading] = useState(false);

  const previewRef = useRef(null);

  const getSteps = () => {
    const baseSteps = [
      { id: 'build-type', title: 'Build Type', description: 'Choose what to build: Logic Page or API Endpoint' },
      { id: 'details', title: 'Basic Details', description: 'Page/endpoint information and settings' }
    ];

    if (buildType === 'logic-page') {
      return [
        ...baseSteps,
        { id: 'describe-logic', title: 'Describe Logic', description: 'Explain what your page should do' },
        { id: 'input-recommendations', title: 'Input Fields', description: 'AI recommends input fields to add/edit' },
        { id: 'ui-designer', title: 'UI Designer', description: 'Design interface with AI chat + live preview' },
        { id: 'backend-builder', title: 'Backend Builder', description: 'Build logic with AI chat + testing' },
        { id: 'test-backend', title: 'Test Your Backend', description: 'Test backend with sample inputs' },
        { id: 'full-preview', title: 'Full Preview', description: 'Complete page preview with live logic' },
        { id: 'deploy', title: 'Deploy Page', description: 'Create and deploy your logic page' }
      ];
    } else if (buildType === 'api-endpoint') {
      return [
        ...baseSteps,
        { id: 'api-endpoint-builder', title: 'API Endpoint Builder', description: 'Build API endpoint with AI conversation' },
        { id: 'test-endpoint', title: 'Test API Endpoint', description: 'Test your deployed API endpoint' },
        { id: 'deploy', title: 'Deploy Endpoint', description: 'Deploy your API endpoint' }
      ];
    }

    return baseSteps;
  };

  const steps = getSteps();

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  useEffect(() => {
    if (currentView === 'list') {
      fetchExistingPages();
    }
  }, [currentView, filterStatus, searchTerm]);

  useEffect(() => {
    if (pageData.name && !frontendConfig.title) {
      setFrontendConfig(prev => ({
        ...prev,
        title: pageData.name
      }));
    }
  }, [pageData.name]);

  const generateSlug = (name) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const handlePageDataChange = (field, value) => {
    const newData = { ...pageData, [field]: value };
    if (field === 'name' && !pageData.slug) {
      newData.slug = generateSlug(value);
    }
    setPageData(newData);
  };

  const proceedToPrompt = () => {
    if (!pageData.name || !pageData.description) {
      setMessage('Please fill in all required fields');
      return;
    }
    setCurrentStep('describe-logic');
    setMessage('');
  };

  const generateInputRecommendations = async () => {
    if (!comprehensivePrompt.trim()) {
      setMessage('Please describe what your logic page should do');
      return;
    }

    setGenerating(true);
    setMessage('');

    try {
      const response = await fetch('/api/ai-builder/recommend-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageData,
          comprehensivePrompt
        })
      });

      const data = await response.json();

      if (data.success) {
        setRecommendedInputs(data.recommendedInputs || []);
        setSelectedInputs([...data.recommendedInputs || []]);
        setMessage('✅ Input recommendations generated successfully!');
        setCurrentStep('input-recommendations');
      } else {
        setMessage('❌ Failed to generate input recommendations: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Generation error: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const proceedToPreview = () => {
    if (!backendConfig.systemPrompt) {
      setMessage('Please configure the backend logic before previewing');
      return;
    }
    setCurrentStep('preview');
    generatePreview();
  };

  const generatePreview = () => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${frontendConfig.title || pageData.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            ${frontendConfig.customCSS || ''}
        </style>
    </head>
    <body class="${getThemeClasses(frontendConfig.theme)}">
        <div class="min-h-screen p-6">
            <div class="${getLayoutClasses(frontendConfig.layout)}">
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold mb-4">${frontendConfig.title || pageData.name}</h1>
                    ${frontendConfig.subtitle ? `<p class="text-xl opacity-80">${frontendConfig.subtitle}</p>` : ''}
                    ${pageData.description ? `<p class="mt-4 opacity-70">${pageData.description}</p>` : ''}
                </div>

                <div class="bg-white rounded-lg shadow-lg p-8">
                    <form class="space-y-6">
                        ${selectedInputs.map(field => generateFieldHTML(field)).join('')}

                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                            Generate Result
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </body>
    </html>`;

    setPreviewHtml(html);
  };

  const getThemeClasses = (theme) => {
    const themes = {
      modern: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800',
      minimal: 'bg-white text-gray-800',
      gradient: 'bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 text-white',
      dark: 'bg-gray-900 text-white'
    };
    return themes[theme] || themes.modern;
  };

  const getLayoutClasses = (layout) => {
    const layouts = {
      centered: 'max-w-2xl mx-auto',
      sidebar: 'max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8',
      fullwidth: 'max-w-full mx-auto',
      cards: 'max-w-4xl mx-auto'
    };
    return layouts[layout] || layouts.centered;
  };

  const generateFieldHTML = (field) => {
    const commonClasses = "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors";

    let fieldHTML = '';

    switch (field.field_type) {
      case 'textarea':
        fieldHTML = `<textarea rows="4" placeholder="${field.placeholder || ''}" class="${commonClasses}"></textarea>`;
        break;
      case 'select':
        const options = field.field_options?.options || [];
        fieldHTML = `<select class="${commonClasses}">
          <option value="">Select an option...</option>
          ${options.map(opt => `<option value="${opt.value || opt}">${opt.label || opt}</option>`).join('')}
        </select>`;
        break;
      case 'checkbox':
        return `<div class="flex items-center">
          <input type="checkbox" class="text-blue-600 focus:ring-blue-500" />
          <label class="ml-2 text-gray-700">${field.field_label}</label>
        </div>`;
      case 'file':
        fieldHTML = `<input type="file" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />`;
        break;
      default:
        fieldHTML = `<input type="${field.field_type}" placeholder="${field.placeholder || ''}" class="${commonClasses}" />`;
    }

    return `
    <div>
      ${field.field_type !== 'checkbox' ? `<label class="block text-sm font-medium text-gray-700 mb-2">
        ${field.field_label}
        ${field.is_required ? '<span class="text-red-500 ml-1">*</span>' : ''}
      </label>` : ''}
      ${fieldHTML}
      ${field.help_text ? `<p class="text-xs text-gray-500 mt-1">${field.help_text}</p>` : ''}
    </div>`;
  };


  const addField = () => {
    const newField = {
      field_name: `field_${(frontendConfig.fields || []).length + 1}`,
      field_type: 'text',
      field_label: 'New Field',
      is_required: false,
      placeholder: '',
      help_text: ''
    };
    setFrontendConfig(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (index, updates) => {
    setFrontendConfig(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => i === index ? { ...field, ...updates } : field)
    }));
  };

  const removeField = (index) => {
    setFrontendConfig(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const saveLogicPage = async () => {
    setSaving(true);
    try {
      const logicPageData = {
        ...pageData,
        frontend_config: {
          title: pageData.name,
          subtitle: pageData.description,
          theme: 'modern',
          layout: 'centered',
          ai_customized_html: livePreview, // Save the AI-generated HTML
          fields: selectedInputs.map(input => ({
            field_name: input.field_name,
            field_type: input.field_type,
            field_label: input.field_label,
            is_required: input.is_required,
            placeholder: input.placeholder,
            help_text: input.help_text,
            field_options: input.field_options,
            order_index: input.order_index || 0
          }))
        },
        backend_config: {
          ...backendConfig,
          generated_code: generatedCode, // Save AI-generated code
          ai_enhanced: !!generatedCode // Flag to indicate AI-enhanced backend
        },
        result_config: resultConfig,
        is_active: true
      };

      const response = await fetch('/api/admin/logic-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logicPageData)
      });

      if (response.ok) {
        setMessage('✅ Logic page deployed successfully!');
        setCurrentStep('deploy');
      } else {
        const error = await response.text();
        setMessage('❌ Failed to save: ' + error);
      }
    } catch (error) {
      setMessage('❌ Save error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldTypes = ['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'file'];

  const sendFrontendChat = async () => {
    if (!frontendChatInput.trim()) return;

    const userMessage = { type: 'user', content: frontendChatInput };
    setFrontendChatMessages(prev => [...prev, userMessage]);
    setFrontendChatInput('');
    setFrontendChatLoading(true);

    try {
      const response = await fetch('/api/ai-builder/frontend-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageData,
          currentFrontendConfig: frontendConfig,
          message: frontendChatInput,
          chatHistory: frontendChatMessages
        })
      });

      const data = await response.json();

      if (data.success) {
        setFrontendChatMessages(prev => [...prev, { type: 'ai', content: data.response }]);
        if (data.updatedConfig) {
          setFrontendConfig(data.updatedConfig);
        }
      } else {
        setFrontendChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I had trouble understanding that. Can you please rephrase your request?' }]);
      }
    } catch (error) {
      setFrontendChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setFrontendChatLoading(false);
    }
  };

  const sendBackendChat = async () => {
    if (!backendChatInput.trim()) return;

    const userMessage = { type: 'user', content: backendChatInput };
    setBackendChatMessages(prev => [...prev, userMessage]);
    setBackendChatInput('');
    setBackendChatLoading(true);

    try {
      const response = await fetch('/api/ai-builder/backend-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageData,
          currentBackendConfig: backendConfig,
          selectedInputs,
          message: backendChatInput,
          chatHistory: backendChatMessages
        })
      });

      const data = await response.json();

      if (data.success) {
        setBackendChatMessages(prev => [...prev, { type: 'ai', content: data.response }]);
        if (data.updatedConfig) {
          setBackendConfig(data.updatedConfig);
          setResultConfig(prev => ({ ...prev, ...data.updatedResultConfig }));
        }
      } else {
        setBackendChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I had trouble understanding that. Can you please rephrase your request?' }]);
      }
    } catch (error) {
      setBackendChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setBackendChatLoading(false);
    }
  };

  const testBackendWithSampleInputs = async () => {
    if (!generatedCode) {
      setMessage('Please generate backend code first using the AI Chat mode');
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch('/api/ai-builder/test-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backendConfig,
          testInputs,
          selectedInputs
        })
      });

      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      setTestResults({ success: false, error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const proceedToBackend = () => {
    if (selectedInputs.length === 0) {
      setMessage('Please add at least one input field before proceeding');
      return;
    }
    setMessage('');
    setCurrentStep('backend-builder');

    // Initialize backend chat with AI recommendation
    setBackendChatMessages([{
      type: 'ai',
      content: `Now let's build the backend logic for your "${pageData.name}" page. Based on your selected input fields, I need to create the system prompt and logic to process these inputs:\n\n${selectedInputs.map(f => `• ${f.field_label} (${f.field_type})`).join('\n')}\n\nWhat kind of processing or analysis should happen with these inputs? For example:\n- Text analysis or summarization\n- Calculations or computations\n- Data transformation\n- Creative generation\n\nDescribe what the backend should do with the user inputs.`
    }]);
  };

  const proceedToTesting = () => {
    if (!generatedCode) {
      setMessage('Please generate backend code first using the AI Chat mode');
      return;
    }
    setMessage('');
    setCurrentStep('test-backend');

    // Initialize test inputs with empty values based on selected inputs
    const initialInputs = {};
    selectedInputs.forEach(field => {
      initialInputs[field.field_name] = '';
    });
    setTestInputs(initialInputs);
    generatePreview();
  };

  const proceedToFullPreview = () => {
    setCurrentStep('full-preview');
    // Use the AI-customized preview from UI Designer
    // No need to generate new preview - use livePreview
  };

  // Helper functions for input recommendations
  const removeSelectedInput = (index) => {
    setSelectedInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateSelectedInput = (index, updates) => {
    setSelectedInputs(prev => prev.map((input, i) => i === index ? { ...input, ...updates } : input));
  };

  const addCustomInput = () => {
    const newInput = {
      field_id: `custom_${Date.now()}`,
      field_name: `custom_field_${selectedInputs.length + 1}`,
      field_label: 'New Custom Field',
      field_type: 'text',
      is_required: false,
      placeholder: 'Enter placeholder...',
      help_text: 'Custom field description',
      reasoning: 'Custom field added by user',
      priority: 'medium',
      field_options: null,
      validation: {}
    };
    setSelectedInputs(prev => [...prev, newInput]);
  };

  // Enhanced Backend Builder Functions
  const sendBackendCodeChat = async () => {
    if (!backendChatInput.trim() || backendChatLoading) return;

    const userMessage = backendChatInput.trim();
    setBackendChatInput('');
    setBackendChatLoading(true);

    // Add user message to chat
    setBackendChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/ai-builder/backend-code-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageData,
          selectedInputs,
          currentCode: generatedCode,
          message: userMessage,
          chatHistory: backendChatMessages
        })
      });

      const data = await response.json();

      if (data.success) {
        setBackendChatMessages(prev => [...prev, { type: 'ai', content: data.response }]);
        if (data.generatedCode) {
          setGeneratedCode(data.generatedCode);
          console.log('Code updated by AI');
        }
        if (data.backendConfig) {
          setBackendConfig(prev => ({ ...prev, ...data.backendConfig }));
        }
      } else {
        setBackendChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I had trouble processing that request.' }]);
      }
    } catch (error) {
      setBackendChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, there was an error. Please try again.' }]);
    } finally {
      setBackendChatLoading(false);
    }
  };

  const testGeneratedCode = async () => {
    if (!generatedCode || codeExecutionLoading) return;

    setCodeExecutionLoading(true);
    setCodeExecutionResults(null);

    try {
      const response = await fetch('/api/ai-builder/test-generated-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: generatedCode,
          testInputs,
          selectedInputs
        })
      });

      const data = await response.json();
      setCodeExecutionResults(data);
    } catch (error) {
      setCodeExecutionResults({
        success: false,
        error: 'Failed to execute code test'
      });
    } finally {
      setCodeExecutionLoading(false);
    }
  };

  const initializeBackendChat = () => {
    setBackendChatMessages([{
      type: 'ai',
      content: `Welcome to the Enhanced Backend Builder! 🚀\n\nI can help you create sophisticated backend logic with actual code generation. Here's what I can do:\n\n• Generate complete Node.js/JavaScript functions\n• Create data processing and validation logic\n• Build API integrations and external service calls\n• Implement complex algorithms and business logic\n• Add error handling and security measures\n\nYour page "${pageData.name}" has these input fields:\n${selectedInputs.map(f => `• ${f.field_label} (${f.field_type})`).join('\n')}\n\nWhat kind of backend functionality would you like me to create? For example:\n- "Create a function that analyzes the user's input and generates insights"\n- "Build logic to validate and process form data with external API calls"\n- "Generate code that performs calculations and returns formatted results"`
    }]);
  };

  const proceedToUIDesigner = () => {
    if (selectedInputs.length === 0) {
      setMessage('Please select at least one input field');
      return;
    }
    setMessage('');
    setCurrentStep('ui-designer');

    // Initialize UI chat with welcome message
    setUiChatMessages([{
      type: 'ai',
      content: `Welcome to the UI Designer! 🎨\n\nI can help you create a beautiful interface for your "${pageData.name}" page using these ${selectedInputs.length} input fields:\n\n${selectedInputs.map(f => `• ${f.field_label} (${f.field_type})`).join('\n')}\n\nI can:\n• Generate different UI layouts and themes\n• Create live previews you can see in real-time\n• Update the preview instantly with every change\n• Customize colors, spacing, and responsive behavior\n\nI've created an initial preview on the right. What would you like to change? I'll update the preview with every modification! (e.g., "make it more modern", "add a dark theme", "improve the layout")`
    }]);

    // Generate initial preview
    generateLivePreview();
  };

  const generateLivePreview = () => {
    // Generate initial HTML preview based on selected inputs
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${pageData.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <div class="max-w-4xl mx-auto p-6">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">${pageData.name}</h1>
                <p class="text-gray-600">${pageData.description}</p>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-8">
                <form class="space-y-6">
                    ${selectedInputs.map(field => generateFieldPreviewHTML(field)).join('')}

                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                        Generate Result
                    </button>
                </form>
            </div>
        </div>
    </body>
    </html>`;

    setLivePreview(html);
  };

  const generateFieldPreviewHTML = (field) => {
    const commonClasses = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors";

    switch (field.field_type) {
      case 'textarea':
        return `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ${field.field_label}${field.is_required ? ' *' : ''}
          </label>
          <textarea rows="4" placeholder="${field.placeholder || ''}" class="${commonClasses}"></textarea>
          ${field.help_text ? `<p class="text-xs text-gray-500 mt-1">${field.help_text}</p>` : ''}
        </div>`;

      case 'select':
        const options = field.field_options?.options || [];
        return `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ${field.field_label}${field.is_required ? ' *' : ''}
          </label>
          <select class="${commonClasses}">
            <option value="">Select an option...</option>
            ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
          ${field.help_text ? `<p class="text-xs text-gray-500 mt-1">${field.help_text}</p>` : ''}
        </div>`;

      case 'checkbox':
        return `
        <div class="flex items-center">
          <input type="checkbox" class="text-blue-600 focus:ring-blue-500" />
          <label class="ml-2 text-gray-700">${field.field_label}</label>
          ${field.help_text ? `<p class="text-xs text-gray-500 ml-2">${field.help_text}</p>` : ''}
        </div>`;

      case 'file':
        return `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ${field.field_label}${field.is_required ? ' *' : ''}
          </label>
          <input type="file" class="w-full px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          ${field.help_text ? `<p class="text-xs text-gray-500 mt-1">${field.help_text}</p>` : ''}
        </div>`;

      default: // text, email, number, etc.
        return `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ${field.field_label}${field.is_required ? ' *' : ''}
          </label>
          <input type="${field.field_type}" placeholder="${field.placeholder || ''}" class="${commonClasses}" />
          ${field.help_text ? `<p class="text-xs text-gray-500 mt-1">${field.help_text}</p>` : ''}
        </div>`;
    }
  };

  const sendUiChat = async () => {
    if (!uiChatInput.trim()) return;

    const userMessage = { type: 'user', content: uiChatInput };
    setUiChatMessages(prev => [...prev, userMessage]);
    setUiChatInput('');
    setUiChatLoading(true);

    try {
      const response = await fetch('/api/ai-builder/ui-designer-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageData,
          selectedInputs,
          currentPreview: livePreview,
          message: uiChatInput,
          chatHistory: uiChatMessages
        })
      });

      const data = await response.json();

      if (data.success) {
        setUiChatMessages(prev => [...prev, { type: 'ai', content: data.response }]);
        if (data.updatedPreview) {
          console.log('Updating preview with new HTML');
          setLivePreview(data.updatedPreview);
        } else {
          console.log('No preview update in AI response');
        }
      } else {
        setUiChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I had trouble processing that request. Can you please try rephrasing?' }]);
      }
    } catch (error) {
      setUiChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, there was an error. Please try again.' }]);
    } finally {
      setUiChatLoading(false);
    }
  };

  const saveCurrentUIDesign = () => {
    // Save the current UI design state
    setMessage('✅ UI Design saved successfully!');

    // You could also save to localStorage or send to API here
    localStorage.setItem('logicPageUIDesign', JSON.stringify({
      pageData,
      selectedInputs,
      livePreview,
      timestamp: new Date().toISOString()
    }));
  };

  const proceedToBackendBuilder = () => {
    setCurrentStep('backend-builder');
    setMessage('');
  };

  // API Endpoint Builder Functions
  const sendEndpointChat = async () => {
    if (!endpointChatInput.trim() || endpointChatLoading) return;

    const userMessage = endpointChatInput.trim();
    setEndpointChatInput('');
    setEndpointChatLoading(true);

    // Add user message to chat
    setEndpointChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/ai-builder/create-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          existingCode: generatedEndpointCode,
          chatHistory: endpointChatMessages,
          endpointConfig: endpointConfig,
          action: 'generate'
        })
      });

      const data = await response.json();

      if (data.success) {
        setEndpointChatMessages(prev => [...prev, { type: 'ai', content: data.response }]);
        if (data.generatedCode) {
          setGeneratedEndpointCode(data.generatedCode);
        }
        if (data.endpointConfig) {
          setEndpointConfig(prev => ({ ...prev, ...data.endpointConfig }));
        }
      } else {
        setEndpointChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I had trouble processing that request.' }]);
      }
    } catch (error) {
      setEndpointChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, there was an error. Please try again.' }]);
    } finally {
      setEndpointChatLoading(false);
    }
  };

  const deployEndpoint = async () => {
    if (!generatedEndpointCode || !endpointConfig.name) {
      setMessage('❌ Please generate endpoint code and provide a name before deploying');
      return;
    }

    setDeploymentLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/ai-builder/deploy-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deploy',
          name: endpointConfig.name,
          description: endpointConfig.description,
          path: endpointConfig.path || `/api/${endpointConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          code: generatedEndpointCode,
          methods: endpointConfig.methods
        })
      });

      const data = await response.json();

      if (data.success) {
        setDeployedEndpoint(data);
        setMessage(`✅ ${data.message}`);
        setCurrentStep('deploy');
      } else {
        setMessage(`❌ Deployment failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Deployment error: ${error.message}`);
    } finally {
      setDeploymentLoading(false);
    }
  };

  const testDeployedEndpoint = async () => {
    if (!deployedEndpoint) {
      setMessage('❌ No deployed endpoint to test');
      return;
    }

    setEndpointTestLoading(true);
    setEndpointTestResults(null);

    try {
      const response = await fetch('/api/ai-builder/deploy-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          path: deployedEndpoint.apiPath,
          testData: { message: 'Test from builder', timestamp: new Date().toISOString() }
        })
      });

      const data = await response.json();
      setEndpointTestResults(data);
    } catch (error) {
      setEndpointTestResults({
        success: false,
        error: error.message
      });
    } finally {
      setEndpointTestLoading(false);
    }
  };

  const initializeEndpointChat = () => {
    const initialMessage = {
      type: 'ai',
      content: `🚀 **Welcome to the API Endpoint Builder!**

I can help you create any type of backend API endpoint. Here are some examples:

**🔥 Popular Endpoint Types:**
• **Data APIs** - CRUD operations for your data
• **Integration APIs** - Connect with external services
• **Webhook Handlers** - Process incoming webhooks
• **Authentication APIs** - User login/signup endpoints
• **File Upload APIs** - Handle file uploads/downloads
• **Real-time APIs** - WebSocket or SSE endpoints
• **AI/ML APIs** - Integration with AI services
• **Payment APIs** - Process payments with Stripe/PayPal

**💬 How to get started:**
Just describe what you want your endpoint to do! For example:
- "Create a user registration API that validates email and saves to database"
- "Build a webhook that processes Stripe payment events"
- "Make an endpoint that resizes images and uploads to S3"
- "Create an API that generates blog posts using AI"

**What would you like to build?**`
    };

    setEndpointChatMessages([initialMessage]);

    // Auto-populate endpoint config from page data
    if (pageData.name && !endpointConfig.name) {
      setEndpointConfig(prev => ({
        ...prev,
        name: pageData.name,
        description: pageData.description,
        path: `/api/${pageData.slug || pageData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      }));
    }
  };

  const proceedToBuildType = () => {
    if (!buildType) {
      setMessage('Please select a build type');
      return;
    }
    setCurrentStep('details');
    setMessage('');
  };

  const proceedToAPIBuilder = () => {
    setCurrentStep('api-endpoint-builder');
    initializeEndpointChat();
    setMessage('');
  };

  const proceedToEndpointTest = () => {
    setCurrentStep('test-endpoint');
    setMessage('');
  };

  // Logic Pages Management Functions
  const fetchExistingPages = async () => {
    setLoadingPages(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/logic-pages?${params}`);
      const data = await response.json();

      if (data.success) {
        setExistingPages(data.pages || []);
        setPagesStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch logic pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const startCreating = () => {
    // Reset all state for new creation
    setBuildType('');
    setCurrentStep('build-type');
    setPageData({
      name: '',
      description: '',
      slug: '',
      accessLevel: 'public',
      maxExecutions: 0
    });
    setCurrentView('create');
    setEditingPageId(null);
    setMessage('');
  };

  const startEditing = async (pageId) => {
    try {
      // Fetch the page details for editing
      const response = await fetch(`/api/admin/logic-pages/${pageId}`);
      const data = await response.json();

      if (data.success && data.page) {
        const page = data.page;

        // Populate the form with existing data
        setPageData({
          name: page.name,
          description: page.description,
          slug: page.slug,
          accessLevel: page.access_level,
          maxExecutions: page.max_executions_per_user || 0
        });

        // Parse configurations
        if (page.frontend_config) {
          setFrontendConfig(typeof page.frontend_config === 'string'
            ? JSON.parse(page.frontend_config)
            : page.frontend_config);
        }

        if (page.backend_config) {
          setBackendConfig(typeof page.backend_config === 'string'
            ? JSON.parse(page.backend_config)
            : page.backend_config);
        }

        setBuildType('logic-page'); // Assume logic page for existing pages
        setEditingPageId(pageId);
        setCurrentView('create');
        setCurrentStep('details');
        setMessage('Editing existing logic page');
      }
    } catch (error) {
      console.error('Failed to load page for editing:', error);
      setMessage('Failed to load page for editing');
    }
  };

  const viewPage = async (pageId) => {
    try {
      const response = await fetch(`/api/admin/logic-pages/${pageId}`);
      const data = await response.json();

      if (data.success && data.page) {
        setSelectedPage(data.page);
        setViewingPageId(pageId);
        setCurrentView('view');
      }
    } catch (error) {
      console.error('Failed to load page details:', error);
    }
  };

  const deletePage = async (pageId, pageName) => {
    if (!confirm(`Are you sure you want to delete "${pageName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/logic-pages/${pageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Logic page deleted successfully');
        fetchExistingPages(); // Refresh the list
      } else {
        setMessage(`❌ Failed to delete page: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Delete error: ${error.message}`);
    }
  };

  const togglePageStatus = async (pageId, currentStatus) => {
    try {
      const newStatus = currentStatus ? 0 : 1;
      const response = await fetch(`/api/admin/logic-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        fetchExistingPages(); // Refresh the list
      } else {
        setMessage(`❌ Failed to update status: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Status update error: ${error.message}`);
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-emerald-600' : 'bg-slate-600';
  };

  const filteredPages = existingPages.filter(page => {
    const matchesSearch = !searchTerm ||
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && page.is_active) ||
      (filterStatus === 'inactive' && !page.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Logic Pages Builder">
      <div className="p-6 space-y-6">
        {/* Header with Navigation */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              {currentView === 'list' ? 'Logic Pages & API Endpoints' :
               currentView === 'view' ? 'Page Details' :
               currentView === 'create' ? (editingPageId ? 'Edit Logic Page' : 'Create New') : 'Logic Pages'}
            </h1>
            <p className="text-slate-400">
              {currentView === 'list' ? 'Manage your AI-powered logic pages and endpoints' :
               currentView === 'view' ? 'View page configuration and details' :
               currentView === 'create' ? 'Build with AI assistance' : ''}
            </p>
          </div>
          <div className="flex space-x-3">
            {currentView !== 'list' && (
              <button
                onClick={() => setCurrentView('list')}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← Back to List
              </button>
            )}
            {currentView === 'list' && (
              <button
                onClick={startCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Create New
              </button>
            )}
          </div>
        </div>

        {/* List View */}
        {currentView === 'list' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="text-3xl font-bold text-slate-100">{pagesStats.total || 0}</div>
                <div className="text-slate-400 text-sm">Total Pages</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="text-3xl font-bold text-emerald-400">{pagesStats.active || 0}</div>
                <div className="text-slate-400 text-sm">Active</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="text-3xl font-bold text-blue-400">{pagesStats.public || 0}</div>
                <div className="text-slate-400 text-sm">Public</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="text-3xl font-bold text-purple-400">{pagesStats.subscriber || 0}</div>
                <div className="text-slate-400 text-sm">Subscriber Only</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search logic pages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pages List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-slate-200">Your Logic Pages & Endpoints</h2>
              </div>

              {loadingPages ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-slate-400">Loading pages...</div>
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-2">No logic pages found</h3>
                  <p className="text-slate-400 mb-6">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Create your first AI-powered logic page to get started'}
                  </p>
                  <button
                    onClick={startCreating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Create First Logic Page
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredPages.map((page) => (
                    <div key={page.id} className="p-6 hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-200">{page.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(page.is_active)}`}>
                              {page.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                              {page.access_level}
                            </span>
                          </div>

                          <p className="text-slate-400 text-sm mb-2">{page.description || 'No description'}</p>

                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span>🔗 /logic-page/{page.slug}</span>
                            <span>📊 {page.execution_count || 0} executions</span>
                            <span>🕒 {new Date(page.updated_at).toLocaleDateString()}</span>
                            {page.max_executions_per_user > 0 && (
                              <span>🔢 Max: {page.max_executions_per_user}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewPage(page.id)}
                            className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => startEditing(page.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => window.open(`/logic-page/${page.slug}`, '_blank')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Visit
                          </button>
                          <button
                            onClick={() => togglePageStatus(page.id, page.is_active)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              page.is_active
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {page.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deletePage(page.id, page.name)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Page Details View */}
        {currentView === 'view' && selectedPage && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-slate-200 mb-3">Page Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedPage.name}</p>
                    <p><strong>Slug:</strong> <code className="bg-slate-700 px-2 py-1 rounded">/logic-page/{selectedPage.slug}</code></p>
                    <p><strong>Description:</strong> {selectedPage.description || 'No description'}</p>
                    <p><strong>Access Level:</strong> <span className="capitalize">{selectedPage.access_level}</span></p>
                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-white ${getStatusColor(selectedPage.is_active)}`}>{selectedPage.is_active ? 'Active' : 'Inactive'}</span></p>
                    <p><strong>Max Executions:</strong> {selectedPage.max_executions_per_user || 'Unlimited'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-slate-200 mb-3">Usage Statistics</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Total Executions:</strong> {selectedPage.execution_count || 0}</p>
                    <p><strong>Created:</strong> {new Date(selectedPage.created_at).toLocaleString()}</p>
                    <p><strong>Updated:</strong> {new Date(selectedPage.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Configuration Preview */}
              <div className="mt-6 pt-6 border-t border-slate-600">
                <h3 className="text-lg font-medium text-slate-200 mb-3">Configuration</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Frontend Config</h4>
                    <div className="bg-slate-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-slate-400">
                        {JSON.stringify(selectedPage.frontend_config ? JSON.parse(selectedPage.frontend_config) : {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Backend Config</h4>
                    <div className="bg-slate-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-slate-400">
                        {JSON.stringify(selectedPage.backend_config ? JSON.parse(selectedPage.backend_config) : {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Result Config</h4>
                    <div className="bg-slate-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-slate-400">
                        {JSON.stringify(selectedPage.result_config ? JSON.parse(selectedPage.result_config) : {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-6 border-t border-slate-600 mt-6 space-x-3">
                <button
                  onClick={() => window.open(`/logic-page/${selectedPage.slug}`, '_blank')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Visit Page
                </button>
                <button
                  onClick={() => startEditing(selectedPage.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Edit Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit View */}
        {currentView === 'create' && (
          <>
            {/* Progress Stepper */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-slate-100">Logic Pages Builder</h1>
                <div className="text-sm text-slate-400">
                  Step {currentStepIndex + 1} of {steps.length}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center space-x-2 ${
                      index === currentStepIndex ? 'text-blue-400' :
                      index < currentStepIndex ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === currentStepIndex ? 'bg-blue-600 text-white' :
                        index < currentStepIndex ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-400'
                      }`}>
                        {index < currentStepIndex ? '✓' : index + 1}
                      </div>
                      <div className="hidden md:block">
                        <div className="text-sm font-medium">{step.title}</div>
                        <div className="text-xs opacity-75">{step.description}</div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-0.5 w-8 ml-4 ${index < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

        {message && (
          <div className={`p-4 rounded-xl ${
            message.includes('✅')
              ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
              : 'bg-red-900/20 border border-red-600/30 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Step Content */}
        {currentStep === 'build-type' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">Choose What to Build</h2>
            <p className="text-slate-400 mb-8">Select the type of project you want to create with AI assistance.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logic Page Option */}
              <div
                className={`border-2 rounded-xl p-8 cursor-pointer transition-all ${
                  buildType === 'logic-page'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
                onClick={() => setBuildType('logic-page')}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-3">Logic Page</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Create a complete web page with custom frontend UI and backend logic. Perfect for user-facing tools and applications.
                  </p>
                  <div className="bg-slate-800 rounded-lg p-4 text-left">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Includes:</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• AI-designed frontend interface</li>
                      <li>• Custom input forms and fields</li>
                      <li>• Backend processing logic</li>
                      <li>• Live preview and testing</li>
                      <li>• User-friendly web interface</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* API Endpoint Option */}
              <div
                className={`border-2 rounded-xl p-8 cursor-pointer transition-all ${
                  buildType === 'api-endpoint'
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
                onClick={() => setBuildType('api-endpoint')}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-3">API Endpoint</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Build a backend API endpoint that can be called by other applications. Great for integrations and services.
                  </p>
                  <div className="bg-slate-800 rounded-lg p-4 text-left">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Includes:</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• RESTful API endpoints</li>
                      <li>• Custom business logic</li>
                      <li>• Database integrations</li>
                      <li>• External API connections</li>
                      <li>• Real deployment as callable APIs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-600 mt-8">
              <button
                onClick={proceedToBuildType}
                disabled={!buildType}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Continue with {buildType === 'logic-page' ? 'Logic Page' : buildType === 'api-endpoint' ? 'API Endpoint' : 'Selection'} →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'details' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">
              {buildType === 'api-endpoint' ? 'API Endpoint Details' : 'Basic Page Details'}
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {buildType === 'api-endpoint' ? 'Endpoint Name *' : 'Page Name *'}
                  </label>
                  <input
                    type="text"
                    value={pageData.name}
                    onChange={(e) => handlePageDataChange('name', e.target.value)}
                    placeholder={buildType === 'api-endpoint' ? 'e.g., User Registration API' : 'e.g., AI Text Analyzer'}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {buildType === 'api-endpoint' ? 'API Path *' : 'URL Slug *'}
                  </label>
                  <input
                    type="text"
                    value={pageData.slug}
                    onChange={(e) => handlePageDataChange('slug', e.target.value)}
                    placeholder={buildType === 'api-endpoint' ? 'user-registration' : 'ai-text-analyzer'}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {buildType === 'api-endpoint' ? `API URL: /api/${pageData.slug}` : `URL: /logic-page/${pageData.slug}`}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={pageData.description}
                  onChange={(e) => handlePageDataChange('description', e.target.value)}
                  placeholder="Describe what this page does..."
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Access Level
                  </label>
                  <select
                    value={pageData.accessLevel}
                    onChange={(e) => handlePageDataChange('accessLevel', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="subscriber">Subscriber Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Executions (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    value={pageData.maxExecutions}
                    onChange={(e) => handlePageDataChange('maxExecutions', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-600">
                <button
                  onClick={() => setCurrentStep('build-type')}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ← Back to Build Type
                </button>

                <button
                  onClick={buildType === 'api-endpoint' ? proceedToAPIBuilder : proceedToPrompt}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {buildType === 'api-endpoint' ? 'Next: Build API Endpoint →' : 'Next: Describe Logic Page →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Describe Logic Step */}
        {currentStep === 'describe-logic' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">Describe Your Logic Page</h2>
            <p className="text-slate-400 mb-6">
              Explain in detail what your logic page should do. Include what inputs you need, what processing should happen, and what results should be displayed.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Comprehensive Description *
                </label>
                <textarea
                  value={comprehensivePrompt}
                  onChange={(e) => setComprehensivePrompt(e.target.value)}
                  placeholder="Example: Create a calculator tool that allows users to input two numbers and select an operation (add, subtract, multiply, divide). The interface should have number inputs for the first and second number, a dropdown for the operation, and display the calculated result with the full equation. Include validation to prevent division by zero and show clear error messages."
                  rows="8"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Be specific about inputs, processing logic, and output format. The AI will generate the complete frontend, backend, and result configuration based on this description.
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <h4 className="text-blue-300 font-medium mb-2">💡 Tips for a great description:</h4>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Describe what inputs users should provide</li>
                  <li>• Explain what processing/analysis should happen</li>
                  <li>• Specify how results should be displayed</li>
                  <li>• Mention any validation or error handling needed</li>
                  <li>• Include desired themes or styling preferences</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-600">
                <button
                  onClick={() => setCurrentStep('details')}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ← Back
                </button>

                <button
                  onClick={generateInputRecommendations}
                  disabled={!comprehensivePrompt.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  🧠 Get AI Input Recommendations →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Recommendations Step */}
        {currentStep === 'input-recommendations' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">AI Input Field Recommendations</h2>
            <p className="text-slate-400 mb-6">
              Based on your description, AI has recommended these input fields. You can add, remove, or edit them before designing the UI.
            </p>

            <div className="space-y-4">
              {selectedInputs.map((input, index) => (
                <div key={input.field_id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-slate-200 font-medium">{input.field_label}</h3>
                      <p className="text-sm text-slate-400 mt-1">{input.reasoning}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        input.priority === 'high' ? 'bg-red-600 text-white' :
                        input.priority === 'medium' ? 'bg-yellow-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {input.priority}
                      </span>
                      <button
                        onClick={() => removeSelectedInput(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Type:</span>
                      <select
                        value={input.field_type}
                        onChange={(e) => updateSelectedInput(index, { field_type: e.target.value })}
                        className="ml-2 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-slate-200"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="file">File</option>
                        <option value="date">Date</option>
                        <option value="url">URL</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-slate-400">Required:</span>
                      <input
                        type="checkbox"
                        checked={input.is_required}
                        onChange={(e) => updateSelectedInput(index, { is_required: e.target.checked })}
                        className="ml-2 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Field Name:</span>
                      <input
                        type="text"
                        value={input.field_name}
                        onChange={(e) => updateSelectedInput(index, { field_name: e.target.value })}
                        className="ml-2 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-slate-400 text-sm">Placeholder:</label>
                    <input
                      type="text"
                      value={input.placeholder}
                      onChange={(e) => updateSelectedInput(index, { placeholder: e.target.value })}
                      className="mt-1 w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-slate-200 text-sm"
                    />
                  </div>

                  {input.field_type === 'select' && (
                    <div className="mt-3">
                      <label className="text-slate-400 text-sm">Options (comma-separated):</label>
                      <input
                        type="text"
                        value={input.field_options?.options?.join(', ') || ''}
                        onChange={(e) => updateSelectedInput(index, {
                          field_options: { options: e.target.value.split(',').map(opt => opt.trim()) }
                        })}
                        className="mt-1 w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-slate-200 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addCustomInput}
                className="w-full border-2 border-dashed border-slate-600 rounded-lg p-4 text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-colors"
              >
                + Add Custom Input Field
              </button>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-600">
              <button
                onClick={() => setCurrentStep('describe-logic')}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ← Back to Description
              </button>

              <button
                onClick={proceedToUIDesigner}
                disabled={selectedInputs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Next: Design UI →
              </button>
            </div>
          </div>
        )}

        {/* UI Designer Step - Split Screen */}
        {currentStep === 'ui-designer' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">UI Designer - Design with AI</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
              {/* Left Side: AI Chat */}
              <div className="bg-slate-700/30 rounded-lg p-4 flex flex-col">
                <h3 className="text-lg font-medium text-slate-200 mb-4">🤖 AI Design Assistant</h3>

                <div className="flex-1 bg-slate-800 rounded-lg p-4 overflow-y-auto mb-4">
                  {uiChatMessages.map((msg, index) => (
                    <div key={index} className={`mb-4 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[80%] p-3 rounded-lg text-sm ${
                        msg.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600 text-slate-100'
                      }`}>
                        {msg.content.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {uiChatLoading && (
                    <div className="text-slate-400 text-sm">AI is designing...</div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={uiChatInput}
                    onChange={(e) => setUiChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendUiChat()}
                    placeholder="Describe your design ideas..."
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={sendUiChat}
                    disabled={uiChatLoading || !uiChatInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    Send
                  </button>
                </div>

                <div className="mt-3">
                  <button
                    onClick={saveCurrentUIDesign}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    💾 Save UI Design
                  </button>
                </div>
              </div>

              {/* Right Side: Live Preview */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-gray-600 text-sm font-medium">Live Preview</span>
                  <button
                    onClick={generateLivePreview}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {livePreview ? (
                  <iframe
                    srcDoc={livePreview}
                    className="w-full h-full border-0"
                    title="Live Preview"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    Generating preview...
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-600">
              <button
                onClick={() => setCurrentStep('input-recommendations')}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ← Back to Input Fields
              </button>

              <button
                onClick={proceedToBackendBuilder}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Next: Build Backend →
              </button>
            </div>
          </div>
        )}

        {/* Frontend Design Step */}
        {currentStep === 'frontend-design' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-6"></div>
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Generating Your Logic Page</h2>
              <p className="text-slate-400 mb-6">
                AI is creating the complete frontend interface, backend logic, and result configuration based on your description...
              </p>
              <div className="bg-slate-700/50 rounded-lg p-4 max-w-2xl mx-auto">
                <p className="text-sm text-slate-300">
                  <strong>Your Description:</strong><br />
                  {comprehensivePrompt}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Frontend Customize Step */}
        {currentStep === 'frontend-customize' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-200 mb-6">Customize Your Frontend Design</h2>

              {/* Frontend Configuration Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Configuration */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Page Title</label>
                      <input
                        type="text"
                        value={frontendConfig.title}
                        onChange={(e) => setFrontendConfig(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Theme</label>
                      <select
                        value={frontendConfig.theme}
                        onChange={(e) => setFrontendConfig(prev => ({ ...prev, theme: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="modern">Modern</option>
                        <option value="minimal">Minimal</option>
                        <option value="gradient">Gradient</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Subtitle</label>
                    <input
                      type="text"
                      value={frontendConfig.subtitle}
                      onChange={(e) => setFrontendConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-300">Form Fields</label>
                      <button
                        onClick={addField}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Add Field
                      </button>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {(frontendConfig.fields || []).map((field, index) => (
                        <div key={index} className="bg-slate-700/50 border border-slate-600 rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-medium text-slate-200">Field {index + 1}</h4>
                            <button
                              onClick={() => removeField(index)}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <input
                              type="text"
                              value={field.field_label}
                              onChange={(e) => updateField(index, { field_label: e.target.value })}
                              placeholder="Label"
                              className="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-slate-200"
                            />
                            <select
                              value={field.field_type}
                              onChange={(e) => updateField(index, { field_type: e.target.value })}
                              className="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-slate-200"
                            >
                              {fieldTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: AI Chat */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-slate-200 mb-4">🤖 Design Assistant</h3>

                  <div className="bg-slate-800 rounded-lg p-4 h-64 overflow-y-auto mb-4">
                    {frontendChatMessages.map((msg, index) => (
                      <div key={index} className={`mb-3 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block max-w-xs p-3 rounded-lg text-sm ${
                          msg.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-600 text-slate-100'
                        }`}>
                          {msg.content.split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {frontendChatLoading && (
                      <div className="text-slate-400 text-sm">AI is thinking...</div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={frontendChatInput}
                      onChange={(e) => setFrontendChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendFrontendChat()}
                      placeholder="Ask to modify design, add fields, change theme..."
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={sendFrontendChat}
                      disabled={frontendChatLoading || !frontendChatInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-600">
                <button
                  onClick={() => setCurrentStep('prompt')}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ← Back to Description
                </button>

                <button
                  onClick={proceedToBackend}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Next: Build Backend →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Backend Builder Step */}
        {currentStep === 'backend-builder' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-200 mb-6">🚀 Enhanced Backend Builder</h2>
              <p className="text-slate-400 mb-6">Create full-fledged backend logic with AI-generated code. Chat with AI, view generated code, and test your endpoints.</p>

              {/* Mode Tabs */}
              <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg mb-6">
                {[
                  { id: 'chat', label: '💬 AI Chat', desc: 'Talk with AI to build logic' },
                  { id: 'code-view', label: '👁️ Code View', desc: 'See generated code' },
                  { id: 'test', label: '🧪 Test', desc: 'Test your endpoint' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setBackendMode(mode.id)}
                    className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                      backendMode === mode.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-600'
                    }`}
                    title={mode.desc}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* AI Chat Mode */}
              {backendMode === 'chat' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Chat Interface */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">🤖 AI Backend Developer</h3>

                    {/* Chat Messages */}
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 max-h-64 overflow-y-auto mb-4">
                      {backendChatMessages.length === 0 ? (
                        <div className="text-slate-400 text-center py-8">
                          <p>💬 Start chatting with AI to build your backend logic!</p>
                          <button
                            onClick={initializeBackendChat}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                          >
                            Initialize AI Chat
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {backendChatMessages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                                msg.type === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-600 text-slate-200'
                              }`}>
                                {msg.content.split('\n').map((line, i) => (
                                  <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={backendChatInput}
                        onChange={(e) => setBackendChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendBackendCodeChat()}
                        placeholder="Describe the backend logic you need..."
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        onClick={sendBackendCodeChat}
                        disabled={backendChatLoading || !backendChatInput.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors"
                      >
                        {backendChatLoading ? '...' : 'Send'}
                      </button>
                    </div>
                  </div>

                  {/* Right: Code Preview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-200 mb-4">🔧 Generated Code Preview</h3>
                    <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {generatedCode ? (
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                          <code>{generatedCode}</code>
                        </pre>
                      ) : (
                        <div className="text-slate-400 text-center py-8">
                          <p>No code generated yet.</p>
                          <p className="text-sm mt-2">Chat with AI to generate backend code!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Code View Mode */}
              {backendMode === 'code-view' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-slate-200">📄 Complete Backend Code</h3>
                    {generatedCode && (
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedCode)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm transition-colors"
                      >
                        📋 Copy Code
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-900 border border-slate-600 rounded-lg p-6">
                    {generatedCode ? (
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap overflow-x-auto">
                        <code>{generatedCode}</code>
                      </pre>
                    ) : (
                      <div className="text-slate-400 text-center py-12">
                        <p className="text-lg mb-2">No code generated yet</p>
                        <p>Switch to AI Chat mode to generate backend code</p>
                        <button
                          onClick={() => setBackendMode('chat')}
                          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                        >
                          Go to AI Chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Test Mode */}
              {backendMode === 'test' && (
                <div className="text-slate-300">
                  <h3 className="text-lg font-medium text-slate-200 mb-4">🧪 Test Your Generated Code</h3>
                  <p className="text-slate-400 mb-4">Test functionality will be available in the dedicated Test Backend step.</p>
                  <button
                    onClick={() => setCurrentStep('test-backend')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Go to Test Backend Step →
                  </button>
                </div>
              )}

            </div>

            <div className="flex justify-between pt-6 border-t border-slate-600">
              <button
                onClick={() => setCurrentStep('ui-designer')}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ← Back to UI Designer
              </button>

              <button
                onClick={proceedToTesting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Next: Test Backend →
              </button>
            </div>
          </div>
        )}

        {/* Test Backend Step */}
        {currentStep === 'test-backend' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">Test Your Backend</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Test Inputs */}
              <div>
                <h3 className="text-lg font-medium text-slate-300 mb-4">Sample Inputs</h3>
                <div className="space-y-4">
                  {selectedInputs.map((field) => (
                    <div key={field.field_name}>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {field.field_label}
                      </label>
                      {field.field_type === 'textarea' ? (
                        <textarea
                          value={testInputs[field.field_name] || ''}
                          onChange={(e) => setTestInputs(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                          placeholder={field.placeholder || `Enter sample ${field.field_label.toLowerCase()}`}
                          rows="3"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : field.field_type === 'select' ? (
                        <select
                          value={testInputs[field.field_name] || ''}
                          onChange={(e) => setTestInputs(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">Select an option...</option>
                          {field.field_options?.options?.map((option, i) => (
                            <option key={i} value={option.value || option}>{option.label || option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.field_type}
                          value={testInputs[field.field_name] || ''}
                          onChange={(e) => setTestInputs(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                          placeholder={field.placeholder || `Enter sample ${field.field_label.toLowerCase()}`}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    onClick={testGeneratedCode}
                    disabled={codeExecutionLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {codeExecutionLoading ? '🔄 Testing...' : '🧪 Test Generated Code'}
                  </button>
                </div>
              </div>

              {/* Right: Test Results */}
              <div>
                <h3 className="text-lg font-medium text-slate-300 mb-4">Test Results</h3>
                <div className="bg-slate-700/30 rounded-lg p-4 min-h-64">
                  {codeExecutionResults ? (
                    <div>
                      {codeExecutionResults.success ? (
                        <div className="space-y-4">
                          <div className="text-emerald-400 text-sm font-medium">✅ Code execution successful!</div>
                          <div className="bg-slate-800 rounded p-4">
                            <h4 className="text-slate-300 text-sm font-medium mb-2">Result:</h4>
                            <div className="text-slate-200 text-sm whitespace-pre-wrap">
                              {JSON.stringify(codeExecutionResults.result, null, 2)}
                            </div>
                          </div>
                          {codeExecutionResults.logs && (
                            <div className="bg-slate-800 rounded p-4">
                              <h4 className="text-slate-300 text-sm font-medium mb-2">Logs:</h4>
                              <div className="text-slate-200 text-sm whitespace-pre-wrap">
                                {codeExecutionResults.logs}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-red-400 text-sm">
                          ❌ Execution failed: {codeExecutionResults.error}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-8">
                      Fill in the sample inputs and click "Test Generated Code" to see results
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-600">
              <button
                onClick={() => setCurrentStep('backend-builder')}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ← Back to Backend Builder
              </button>

              <button
                onClick={() => setCurrentStep('full-preview')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Next: Full Preview →
              </button>
            </div>
          </div>
        )}

        {/* Full Preview Step - AI-Customized Frontend & Backend */}
        {currentStep === 'full-preview' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Your AI-Built Logic Page</h2>
              <p className="text-slate-400 mb-6">This is your complete logic page with the frontend designed by AI and backend logic you created.</p>

              <div className="bg-white rounded-lg border overflow-hidden">
                {livePreview ? (
                  <iframe
                    srcDoc={livePreview}
                    className="w-full h-96 border-0"
                    title="Live Preview"
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center text-slate-400">
                    No preview available. Please go back and complete the UI Designer step.
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-2">🎨 Frontend</h4>
                  <p className="text-slate-400">AI-customized design with {selectedInputs.length} input fields</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-2">⚙️ Backend</h4>
                  <p className="text-slate-400">{generatedCode ? 'AI-generated code ready' : 'Custom logic configured'}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-2">🚀 Status</h4>
                  <p className="text-slate-400">Ready to deploy</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-600">
              <button
                onClick={() => setCurrentStep('test-backend')}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ← Back to Test
              </button>

              <button
                onClick={saveLogicPage}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {saving ? '💾 Saving...' : '💾 Save & Deploy'}
              </button>
            </div>
          </div>
        )}

        {/* API Endpoint Builder Step */}
        {currentStep === 'api-endpoint-builder' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-200 mb-6">🚀 API Endpoint Builder</h2>
              <p className="text-slate-400 mb-6">Build your API endpoint through conversation with AI. Describe what you want and I'll create the complete backend code.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Chat Interface */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-200 mb-4">🤖 AI Endpoint Developer</h3>

                  {/* Endpoint Configuration */}
                  <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Endpoint Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                        <input
                          type="text"
                          value={endpointConfig.name}
                          onChange={(e) => setEndpointConfig(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="My API Endpoint"
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">API Path</label>
                        <input
                          type="text"
                          value={endpointConfig.path}
                          onChange={(e) => setEndpointConfig(prev => ({ ...prev, path: e.target.value }))}
                          placeholder="/api/my-endpoint"
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 max-h-96 overflow-y-auto mb-4">
                    {endpointChatMessages.length === 0 ? (
                      <div className="text-slate-400 text-center py-8">
                        <p>💬 Start chatting with AI to build your endpoint!</p>
                        <button
                          onClick={initializeEndpointChat}
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                          Initialize AI Chat
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {endpointChatMessages.map((msg, index) => (
                          <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                              msg.type === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-600 text-slate-200'
                            }`}>
                              {msg.content.split('\n').map((line, i) => (
                                <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {endpointChatLoading && (
                      <div className="text-slate-400 text-sm">AI is generating...</div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={endpointChatInput}
                      onChange={(e) => setEndpointChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendEndpointChat()}
                      placeholder="Describe your endpoint requirements..."
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={sendEndpointChat}
                      disabled={endpointChatLoading || !endpointChatInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      {endpointChatLoading ? '...' : 'Send'}
                    </button>
                  </div>
                </div>

                {/* Right: Code Preview & Actions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-200 mb-4">🔧 Generated Endpoint Code</h3>

                  <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {generatedEndpointCode ? (
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                        <code>{generatedEndpointCode}</code>
                      </pre>
                    ) : (
                      <div className="text-slate-400 text-center py-8">
                        <p>No code generated yet.</p>
                        <p className="text-sm mt-2">Chat with AI to generate endpoint code!</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={deployEndpoint}
                      disabled={!generatedEndpointCode || deploymentLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white px-4 py-3 rounded font-medium transition-colors"
                    >
                      {deploymentLoading ? '🚀 Deploying...' : '🚀 Deploy Endpoint'}
                    </button>

                    {deployedEndpoint && (
                      <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4">
                        <h4 className="text-emerald-300 font-medium mb-2">✅ Endpoint Deployed!</h4>
                        <p className="text-sm text-emerald-200 mb-2">
                          <strong>URL:</strong> <code className="bg-slate-700 px-2 py-1 rounded">{deployedEndpoint.apiPath}</code>
                        </p>
                        <button
                          onClick={proceedToEndpointTest}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                          Test Endpoint →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-600">
                <button
                  onClick={() => setCurrentStep('details')}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ← Back to Details
                </button>

                {deployedEndpoint && (
                  <button
                    onClick={proceedToEndpointTest}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Next: Test Endpoint →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Endpoint Step */}
        {currentStep === 'test-endpoint' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">Test Your API Endpoint</h2>

            {deployedEndpoint && (
              <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4 mb-6">
                <h3 className="text-emerald-300 font-medium mb-2">Deployed Endpoint</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {endpointConfig.name}</p>
                  <p><strong>Path:</strong> <code className="bg-slate-700 px-2 py-1 rounded">{deployedEndpoint.apiPath}</code></p>
                  <p><strong>Methods:</strong> {endpointConfig.methods.join(', ')}</p>
                  <p><strong>Status:</strong> <span className="text-emerald-400">✅ Active</span></p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Controls */}
              <div>
                <h3 className="text-lg font-medium text-slate-300 mb-4">Test Your Endpoint</h3>
                <div className="space-y-4">
                  <button
                    onClick={testDeployedEndpoint}
                    disabled={endpointTestLoading || !deployedEndpoint}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {endpointTestLoading ? '🔄 Testing...' : '🧪 Test Endpoint'}
                  </button>

                  {deployedEndpoint && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="text-slate-300 text-sm font-medium mb-2">Quick Test URLs:</h4>
                      <div className="space-y-2 text-xs">
                        <p>
                          <span className="text-slate-400">GET:</span>
                          <code className="text-blue-300 ml-2">{deployedEndpoint.apiPath}</code>
                        </p>
                        <p>
                          <span className="text-slate-400">POST:</span>
                          <code className="text-blue-300 ml-2">{deployedEndpoint.apiPath}</code>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Results */}
              <div>
                <h3 className="text-lg font-medium text-slate-300 mb-4">Test Results</h3>
                <div className="bg-slate-700/30 rounded-lg p-4 min-h-64">
                  {endpointTestResults ? (
                    <div>
                      {endpointTestResults.success ? (
                        <div className="space-y-4">
                          <div className="text-emerald-400 text-sm font-medium">✅ Endpoint tests successful!</div>
                          {Object.entries(endpointTestResults.results || {}).map(([method, result]) => (
                            <div key={method} className="bg-slate-800 rounded p-4">
                              <h4 className="text-slate-300 text-sm font-medium mb-2">
                                {method} {result.status} {result.statusText}
                              </h4>
                              <pre className="text-slate-200 text-sm whitespace-pre-wrap">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-red-400 text-sm">
                          ❌ Test failed: {endpointTestResults.error}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-8">
                      Click "Test Endpoint" to run tests
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-600">
              <button
                onClick={() => setCurrentStep('api-endpoint-builder')}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ← Back to Builder
              </button>

              <button
                onClick={() => setCurrentStep('deploy')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Complete Deployment →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'deploy' && (
          <div className="space-y-6">
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-emerald-300 mb-4">
                {buildType === 'api-endpoint'
                  ? 'API Endpoint Deployed Successfully!'
                  : 'Logic Page Created Successfully!'}
              </h3>
              <p className="text-emerald-200 mb-6">Your AI-powered logic page is now live and ready for users.</p>

              <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-slate-200 mb-4">Page Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Name:</strong> {pageData.name}</p>
                      <p className="text-sm"><strong>Slug:</strong> /{pageData.slug}</p>
                      <p className="text-sm"><strong>Description:</strong> {pageData.description}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-slate-300 mb-3">Input Fields:</h4>
                    <div className="space-y-1 text-sm">
                      {selectedInputs.map((field, index) => (
                        <div key={index} className="flex items-center space-x-2 text-slate-400">
                          <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                          <span>{field.field_label} ({field.field_type})</span>
                          {field.is_required && <span className="text-red-400">*</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
