import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function BackendDesign() {
  const [approach, setApproach] = useState('api-workers'); // 'api-workers' or 'ai-endpoint-creator'
  const [mode, setMode] = useState('manual'); // 'manual' or 'ai' (for API Workers)
  const [config, setConfig] = useState({
    api_endpoint: '',
    request_method: 'POST',
    request_headers: {},
    request_body_template: '{}',
    input_fields: [],
    required_oauth_services: [],
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [message, setMessage] = useState('');
  const [oauthServices, setOauthServices] = useState([]);
  
  // AI Mode specific states
  const [aiWorkers, setAiWorkers] = useState([]);
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [configurationStep, setConfigurationStep] = useState('prompt'); // 'prompt', 'inputs', 'oauth'
  const [workerConfig, setWorkerConfig] = useState({
    customInputs: [],
    oauthServices: [],
    routeSettings: {}
  });

  const inputTypes = ['text', 'textarea', 'email', 'number', 'select', 'checkbox', 'file'];
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  useEffect(() => {
    fetchConfig();
    fetchOAuthServices();
    if (mode === 'ai') {
      fetchAiWorkers();
    }
  }, [mode]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/api-worker-config');
      if (response.ok) {
        const data = await response.json();
        setConfig({
          api_endpoint: data.api_endpoint || '',
          request_method: data.request_method || 'POST',
          request_headers: data.request_headers || {},
          request_body_template: data.request_body_template || '{}',
          input_fields: Array.isArray(data.input_fields) ? data.input_fields : [],
          required_oauth_services: Array.isArray(data.required_oauth_services) ? data.required_oauth_services : [],
          is_active: data.is_active !== false
        });
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOAuthServices = async () => {
    try {
      const response = await fetch('/api/oauth-services');
      if (response.ok) {
        const data = await response.json();
        setOauthServices(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch OAuth services:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/api-worker-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage('Configuration saved successfully!');
      } else {
        const error = await response.text();
        setMessage('Failed to save configuration: ' + error);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testEndpoint = async () => {
    if (!config.api_endpoint) {
      setMessage('Please enter an API endpoint first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/api-worker-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          test_data: { prompt: 'Test from admin panel' }
        })
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const addInputField = () => {
    const newField = { 
      name: '', 
      type: 'text', 
      label: '', 
      required: true, 
      placeholder: '',
      options: [] 
    };
    setConfig(prev => ({
      ...prev,
      input_fields: [...prev.input_fields, newField]
    }));
  };

  const updateInputField = (index, field, value) => {
    setConfig(prev => {
      const newFields = [...prev.input_fields];
      if (newFields[index]) {
        newFields[index] = { ...newFields[index], [field]: value };
      }
      return { ...prev, input_fields: newFields };
    });
  };

  const removeInputField = (index) => {
    setConfig(prev => ({
      ...prev,
      input_fields: prev.input_fields.filter((_, i) => i !== index)
    }));
  };

  const addSelectOption = (fieldIndex) => {
    setConfig(prev => {
      const newFields = [...prev.input_fields];
      if (newFields[fieldIndex]) {
        const field = { ...newFields[fieldIndex] };
        if (!Array.isArray(field.options)) field.options = [];
        field.options = [...field.options, ''];
        newFields[fieldIndex] = field;
      }
      return { ...prev, input_fields: newFields };
    });
  };

  const updateSelectOption = (fieldIndex, optionIndex, value) => {
    setConfig(prev => {
      const newFields = [...prev.input_fields];
      if (newFields[fieldIndex] && Array.isArray(newFields[fieldIndex].options)) {
        const field = { ...newFields[fieldIndex] };
        field.options = [...field.options];
        field.options[optionIndex] = value;
        newFields[fieldIndex] = field;
      }
      return { ...prev, input_fields: newFields };
    });
  };

  const removeSelectOption = (fieldIndex, optionIndex) => {
    setConfig(prev => {
      const newFields = [...prev.input_fields];
      if (newFields[fieldIndex] && Array.isArray(newFields[fieldIndex].options)) {
        const field = { ...newFields[fieldIndex] };
        field.options = field.options.filter((_, i) => i !== optionIndex);
        newFields[fieldIndex] = field;
      }
      return { ...prev, input_fields: newFields };
    });
  };

  const addHeader = () => {
    setConfig(prev => ({
      ...prev,
      request_headers: { ...prev.request_headers, '': '' }
    }));
  };

  const updateHeader = (oldKey, newKey, value) => {
    setConfig(prev => {
      const newHeaders = { ...prev.request_headers };
      if (oldKey !== newKey) {
        delete newHeaders[oldKey];
      }
      newHeaders[newKey] = value;
      return { ...prev, request_headers: newHeaders };
    });
  };

  const removeHeader = (key) => {
    setConfig(prev => {
      const newHeaders = { ...prev.request_headers };
      delete newHeaders[key];
      return { ...prev, request_headers: newHeaders };
    });
  };

  const fetchAiWorkers = async () => {
    try {
      const response = await fetch('/api/ai-workers/list');
      if (response.ok) {
        const data = await response.json();
        setAiWorkers(data.workers || []);
      }
    } catch (error) {
      console.error('Failed to fetch AI workers:', error);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    setChatLoading(true);
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    try {
      if (configurationStep === 'prompt') {
        // Step 1: Generate AI worker code
        const conversation = [...chatMessages, userMessage];
        const lastUserMessage = conversation.filter(m => m.role === 'user').pop()?.content || '';
        
        // Generate worker name and route path
        let workerName = `api_worker_${Date.now()}`;
        let routePath = `/api/worker/${workerName}`;
        let httpMethod = 'POST';
        
        // Smart parsing for common patterns
        if (lastUserMessage.toLowerCase().includes('get') || lastUserMessage.toLowerCase().includes('fetch')) {
          httpMethod = 'GET';
        }
        
        // Store worker configuration for next steps
        setWorkerConfig(prev => ({
          ...prev,
          workerName,
          routePath,
          httpMethod,
          description: `AI-generated API worker: ${lastUserMessage.slice(0, 100)}`,
          prompt: lastUserMessage,
          context: conversation.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')
        }));

        // Generate the AI worker code first
        const response = await fetch('/api/ai-workers/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerName: workerName,
            routePath: routePath,
            httpMethod: httpMethod,
            description: `AI-generated API worker: ${lastUserMessage.slice(0, 100)}`,
            prompt: lastUserMessage,
            context: conversation.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n'),
            requireAuth: true,
            accessLevel: 'subscriber',
            workerType: 'ai-api-worker',
            customInputs: workerConfig.customInputs,
            oauthServices: workerConfig.oauthServices
          })
        });

        if (response.ok) {
          const data = await response.json();
          setWorkerConfig(prev => ({ ...prev, createdWorker: data.worker }));
          setAiWorkers([data.worker, ...aiWorkers]);
          
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ **Step 1 Complete!** Created AI worker "${data.worker.routePath}" successfully!\n\n**Method:** ${data.worker.httpMethod}\n**Description:** ${data.worker.description}\n**Tokens used:** ${data.tokens_used}\n**Cost:** $${data.estimated_cost.toFixed(4)}\n\n🔧 **Step 2: Custom Inputs**\nWould you like to configure custom input fields for users? This allows you to define what data users need to provide when using this API worker.\n\nType "yes" to configure inputs, or "skip" to use default settings.`
          }]);
          
          setConfigurationStep('inputs');
          await fetchAiWorkers(); // Refresh list
        } else {
          const error = await response.json();
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `❌ Failed to create worker: ${error.error}`
          }]);
        }
      } else if (configurationStep === 'inputs') {
        // Step 2: Configure custom inputs
        const userResponse = chatInput.toLowerCase().trim();
        
        if (userResponse === 'skip' || userResponse === 'no') {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `⏭️ **Skipped input configuration.**\n\n🔐 **Step 3: OAuth Services**\nDoes this worker need access to external services like Google, GitHub, Slack, etc.? This allows your AI worker to access user's connected accounts.\n\nType the service names (e.g., "google, slack") or "skip" to use no OAuth services.`
          }]);
          setConfigurationStep('oauth');
        } else if (userResponse === 'yes') {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🔧 **Configuring Custom Inputs**\n\nI'll help you set up input fields. Describe the inputs your API worker needs from users.\n\nFor example:\n• "A text field for product description and a dropdown for category"\n• "Email field for customer email and a number field for quantity"\n• "A file upload for images and a checkbox for privacy agreement"\n\nDescribe the input fields you need:`
          }]);
          setConfigurationStep('input_details');
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `Please respond with "yes" to configure custom inputs or "skip" to use default settings.`
          }]);
        }
      } else if (configurationStep === 'input_details') {
        // Process input field descriptions and generate input configuration
        const inputDescription = chatInput;
        const generatedInputs = parseInputDescription(inputDescription);
        
        setWorkerConfig(prev => ({ ...prev, customInputs: generatedInputs }));
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ **Generated ${generatedInputs.length} input fields:**\n\n${generatedInputs.map((input, i) => 
            `${i + 1}. **${input.label}** (${input.type}) ${input.required ? '- Required' : ''}`
          ).join('\n')}\n\n🔐 **Step 3: OAuth Services**\nDoes this worker need access to external services? Type service names (e.g., "google, slack") or "skip":`
        }]);
        
        setConfigurationStep('oauth');
      } else if (configurationStep === 'oauth') {
        // Step 3: Configure OAuth services
        const userResponse = chatInput.toLowerCase().trim();
        
        if (userResponse === 'skip' || userResponse === 'none') {
          setWorkerConfig(prev => ({ ...prev, oauthServices: [] }));
        } else {
          const services = userResponse.split(',').map(s => s.trim()).filter(s => s);
          setWorkerConfig(prev => ({ ...prev, oauthServices: services }));
        }
        
        // Final step - update the worker with configuration
        await updateWorkerConfiguration();
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 **All Done!** Your AI worker "${workerConfig.createdWorker?.routePath}" has been fully configured!\n\n**Summary:**\n• Custom inputs: ${workerConfig.customInputs.length} fields\n• OAuth services: ${workerConfig.oauthServices.length} services\n• Route: ${workerConfig.createdWorker?.httpMethod} ${workerConfig.createdWorker?.routePath}\n\n✅ **The worker is now ready for your customers to use!**`
        }]);
        
        // Reset configuration
        setConfigurationStep('prompt');
        setWorkerConfig({ customInputs: [], oauthServices: [], routeSettings: {} });
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${error.message}`
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper function to parse input descriptions into structured input fields
  const parseInputDescription = (description) => {
    const inputs = [];
    const lowercaseDesc = description.toLowerCase();
    
    // Common input patterns
    const patterns = [
      { pattern: /text field|text input|text box/g, type: 'text' },
      { pattern: /email field|email input|email address/g, type: 'email' },
      { pattern: /number field|number input|quantity|amount|price/g, type: 'number' },
      { pattern: /dropdown|select|menu|choice/g, type: 'select' },
      { pattern: /textarea|large text|description field|long text/g, type: 'textarea' },
      { pattern: /checkbox|check box|agreement|accept/g, type: 'checkbox' },
      { pattern: /file upload|file input|upload|attachment/g, type: 'file' }
    ];
    
    patterns.forEach((pattern, index) => {
      const matches = lowercaseDesc.match(pattern.pattern);
      if (matches) {
        const fieldName = `field_${inputs.length + 1}`;
        const label = extractLabel(description, pattern.pattern) || `Field ${inputs.length + 1}`;
        
        inputs.push({
          name: fieldName,
          label: label,
          type: pattern.type,
          required: true,
          placeholder: `Enter ${label.toLowerCase()}...`,
          options: pattern.type === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : []
        });
      }
    });
    
    // If no specific patterns found, create a default text field
    if (inputs.length === 0) {
      inputs.push({
        name: 'input_data',
        label: 'Input Data',
        type: 'textarea',
        required: true,
        placeholder: 'Enter your data...',
        options: []
      });
    }
    
    return inputs;
  };

  // Helper function to extract field labels from description
  const extractLabel = (description, pattern) => {
    const words = description.split(' ');
    const patternIndex = words.findIndex(word => pattern.test(word.toLowerCase()));
    
    if (patternIndex > 0) {
      return words.slice(Math.max(0, patternIndex - 2), patternIndex).join(' ');
    }
    
    return null;
  };

  // Update worker configuration in the database
  const updateWorkerConfiguration = async () => {
    if (!workerConfig.createdWorker) return;
    
    try {
      const response = await fetch(`/api/ai-workers/update/${workerConfig.createdWorker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customInputs: workerConfig.customInputs,
          oauthServices: workerConfig.oauthServices
        })
      });
      
      if (response.ok) {
        await fetchAiWorkers(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update worker configuration:', error);
    }
  };

  const deleteAiWorker = async (workerId, workerName) => {
    if (!confirm(`Are you sure you want to delete "${workerName}"?`)) return;

    try {
      const response = await fetch('/api/ai-workers/list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId })
      });

      if (response.ok) {
        setAiWorkers(aiWorkers.filter(w => w.id !== workerId));
        setMessage('AI worker deleted successfully');
      } else {
        const error = await response.json();
        setMessage('Failed to delete worker: ' + error.error);
      }
    } catch (error) {
      setMessage('Failed to delete worker: ' + error.message);
    }
  };

  const activateAiRoutes = async () => {
    try {
      const response = await fetch('/api/ai-workers/reload-server', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setMessage(`Server reloaded! ${data.routes_loaded} AI routes activated.`);
      }
    } catch (error) {
      setMessage('Failed to reload server: ' + error.message);
    }
  };

  const toggleOAuthService = (serviceId) => {
    setConfig(prev => {
      const currentServices = prev.required_oauth_services || [];
      const isSelected = currentServices.includes(serviceId);
      
      if (isSelected) {
        return {
          ...prev,
          required_oauth_services: currentServices.filter(id => id !== serviceId)
        };
      } else {
        return {
          ...prev,
          required_oauth_services: [...currentServices, serviceId]
        };
      }
    });
  };

  if (loading) {
    return (
      <AdminLayout title="API Worker Configuration">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading configuration...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Backend Design">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              🏗️ Backend Design Studio
              <span className="text-sm bg-purple-600 text-white px-2 py-1 rounded-full font-normal">
                New
              </span>
            </h1>
            <p className="text-slate-400 mt-1 text-lg">
              Dual-mode architecture: Configure workers manually OR let AI create endpoints through conversation
            </p>
            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <div>🔧 <strong>Backend Workers:</strong> Configure external APIs + manual/AI-assisted worker creation</div>
              <div>🤖 <strong>AI Endpoint Creator:</strong> Pure conversational endpoint design (no configuration)</div>
            </div>
          </div>
          
          {/* Approach Switcher */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex bg-slate-700 rounded-lg p-1 shadow-lg">
              <button
                onClick={() => setApproach('api-workers')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  approach === 'api-workers'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600'
                }`}
                title="Configure backend workers for external endpoints and AI integration"
              >
                🔧 Backend Workers
              </button>
              <button
                onClick={() => setApproach('ai-endpoint-creator')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  approach === 'ai-endpoint-creator'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600'
                }`}
                title="AI-powered endpoint creation through conversation"
              >
                🤖 AI Endpoint Creator
              </button>
            </div>
            <p className="text-xs text-slate-500 italic">
              {approach === 'api-workers' ? 'Manual & AI-assisted backend workers' : 'Conversational endpoint creation'}
            </p>
          </div>
        </div>

        {approach === 'api-workers' ? (
          // Backend Workers Section
          <div className="space-y-6">
            {/* Backend Workers Header */}
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-emerald-300">🔧 Backend Workers</h2>
                {/* Mode Switcher for Backend Workers */}
                <div className="flex bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setMode('manual')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      mode === 'manual'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🔗 Manual
                  </button>
                  <button
                    onClick={() => setMode('ai')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      mode === 'ai'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🤖 AI
                  </button>
                </div>
              </div>
              <p className="text-emerald-200 text-sm">
                {mode === 'manual' ? 
                  'Configure external API endpoints and request templates for your customers' : 
                  'Use AI to generate backend routes with custom logic and integrations'}
              </p>
            </div>

        {message && (
          <div className={`mb-4 p-4 rounded-xl ${
            message.includes('success') 
              ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
              : 'bg-red-900/20 border border-red-600/30 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {mode === 'manual' ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">Manual Backend Worker Configuration</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
            {/* API Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Endpoint URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={config.api_endpoint}
                  onChange={(e) => setConfig(prev => ({ ...prev, api_endpoint: e.target.value }))}
                  placeholder="https://api.example.com/process"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  The API endpoint that will process customer requests
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  HTTP Method
                </label>
                <select
                  value={config.request_method}
                  onChange={(e) => setConfig(prev => ({ ...prev, request_method: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {httpMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Request Headers */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-slate-300">
                  Request Headers
                </label>
                <button
                  type="button"
                  onClick={addHeader}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  Add Header
                </button>
              </div>

              <div className="space-y-2 border border-slate-600 rounded-lg p-4 bg-slate-700/50">
                {Object.entries(config.request_headers).length === 0 ? (
                  <p className="text-slate-400 text-center">No headers defined. Add headers like Authorization, Content-Type, etc.</p>
                ) : (
                  Object.entries(config.request_headers).map(([key, value], index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => updateHeader(key, e.target.value, value)}
                        placeholder="Header name"
                        className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateHeader(key, key, e.target.value)}
                        placeholder="Header value"
                        className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => removeHeader(key)}
                        className="text-red-400 hover:text-red-300 text-sm px-2 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Request Body Template */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Request Body Template <span className="text-red-400">*</span>
              </label>
              <textarea
                value={config.request_body_template}
                onChange={(e) => setConfig(prev => ({ ...prev, request_body_template: e.target.value }))}
                placeholder={'{"prompt": "{{prompt}}", "temperature": 0.7}'}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm transition-colors"
                rows="6"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                JSON template with variables in {'{{'} variable_name {'}}'} format. Variables will be replaced with user input.
              </p>
            </div>

            {/* Input Fields Configuration */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-slate-300">
                  Customer Input Fields
                </label>
                <button
                  type="button"
                  onClick={addInputField}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Add Input Field
                </button>
              </div>

              <div className="space-y-4 border border-slate-600 rounded-lg p-4 bg-slate-700/50">
                {!Array.isArray(config.input_fields) || config.input_fields.length === 0 ? (
                  <p className="text-slate-400 text-center">No input fields defined. Add fields that customers need to fill.</p>
                ) : (
                  config.input_fields.map((field, index) => (
                    <div key={index} className="border border-slate-600 rounded-lg p-4 bg-slate-700">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-slate-200">Field {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeInputField(index)}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Field Name <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            value={field.name || ''}
                            onChange={(e) => updateInputField(index, 'name', e.target.value)}
                            placeholder="prompt"
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Label <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            value={field.label || ''}
                            onChange={(e) => updateInputField(index, 'label', e.target.value)}
                            placeholder="Your Prompt"
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                          <select
                            value={field.type || 'text'}
                            onChange={(e) => updateInputField(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                          >
                            {inputTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Placeholder</label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateInputField(index, 'placeholder', e.target.value)}
                            placeholder="Enter your text..."
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                          />
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-medium text-slate-300">Options</label>
                            <button
                              type="button"
                              onClick={() => addSelectOption(index)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded-lg text-xs transition-colors"
                            >
                              Add Option
                            </button>
                          </div>
                          <div className="space-y-2">
                            {Array.isArray(field.options) && field.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option || ''}
                                  onChange={(e) => updateSelectOption(index, optionIndex, e.target.value)}
                                  placeholder="Option value"
                                  className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSelectOption(index, optionIndex)}
                                  className="text-red-400 hover:text-red-300 text-xs px-2 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.required !== false}
                            onChange={(e) => updateInputField(index, 'required', e.target.checked)}
                            className="w-4 h-4 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-emerald-500 focus:ring-2"
                          />
                          <span className="text-xs font-medium text-slate-300">Required</span>
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* OAuth Requirements */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-4">
                Required OAuth Connections
              </label>
              <div className="border border-slate-600 rounded-lg p-4 bg-slate-700/50">
                {oauthServices.length === 0 ? (
                  <p className="text-slate-400 text-center">
                    No OAuth services available. <a href="/admin/oauth-services" className="text-emerald-400 hover:text-emerald-300">Set up OAuth services</a> first.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400 mb-3">
                      Select which OAuth connections subscribers must have before using this API worker:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {oauthServices.filter(service => service.is_active).map((service) => {
                        const isSelected = (config.required_oauth_services || []).includes(service.id);
                        
                        return (
                          <label key={service.id} className="flex items-center space-x-3 p-3 bg-slate-600 hover:bg-slate-600/80 border border-slate-500 rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOAuthService(service.id)}
                              className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-500 rounded focus:ring-emerald-500 focus:ring-2"
                            />
                            <div className="flex items-center space-x-2 flex-1">
                              {service.icon_url && (
                                <img src={service.icon_url} alt={service.display_name} className="w-5 h-5 rounded" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-slate-200">{service.display_name}</div>
                                <div className="text-xs text-slate-400 capitalize">{service.category}</div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {(config.required_oauth_services || []).length > 0 && (
                      <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg">
                        <p className="text-sm text-emerald-300">
                          <strong>Selected:</strong> Subscribers must connect to {(config.required_oauth_services || []).length} service(s) before using this API worker.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                When OAuth services are required, subscribers must connect their accounts before they can create tasks using this API worker.
              </p>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.is_active}
                  onChange={(e) => setConfig(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-slate-300">Service Active</span>
              </label>
              <p className="text-xs text-slate-400 mt-1">
                When active, customers can create new tasks using this configuration
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              
              <button
                type="button"
                onClick={testEndpoint}
                disabled={testing || !config.api_endpoint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 font-medium transition-colors"
              >
                {testing ? 'Testing...' : 'Test Endpoint'}
              </button>
            </div>
          </form>
        </div>
      </div>
        ) : (
          // AI Mode Interface
          <div className="space-y-6">
            {/* AI Workers Grid */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-200">AI Workers</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAiChat(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    🤖 Create AI Worker
                  </button>
                  <button
                    onClick={activateAiRoutes}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    🔄 Reload Routes
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {aiWorkers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🤖</div>
                    <h4 className="text-xl font-medium text-slate-300 mb-2">No AI Workers Created</h4>
                    <p className="text-slate-400 mb-6">Create your first AI-powered backend route by chatting with our AI assistant</p>
                    <button
                      onClick={() => setShowAiChat(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      🤖 Start Creating
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiWorkers.map((worker) => (
                      <div key={worker.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-slate-200 truncate">{worker.routePath || worker.workerName}</h5>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                              worker.httpMethod === 'GET' ? 'bg-blue-900/50 text-blue-300' :
                              worker.httpMethod === 'POST' ? 'bg-green-900/50 text-green-300' :
                              worker.httpMethod === 'PUT' ? 'bg-yellow-900/50 text-yellow-300' :
                              worker.httpMethod === 'DELETE' ? 'bg-red-900/50 text-red-300' :
                              'bg-slate-900/50 text-slate-300'
                            }`}>
                              {worker.httpMethod}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteAiWorker(worker.id, worker.workerName)}
                            className="text-red-400 hover:text-red-300 text-sm transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{worker.description}</p>
                        
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>{new Date(worker.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-2">
                            {worker.requireAuth && <span className="bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded-full">🔐 Auth</span>}
                            {worker.isActive ? (
                              <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded-full">✅ Active</span>
                            ) : (
                              <span className="bg-red-900/50 text-red-300 px-2 py-1 rounded-full">⏸️ Inactive</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Modal */}
        {showAiChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-slate-200">🤖 AI Worker Creator</h3>
                <button
                  onClick={() => {
                    setShowAiChat(false);
                    setChatMessages([]);
                    setChatInput('');
                  }}
                  className="text-slate-400 hover:text-slate-200 text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🤖✨</div>
                      <h4 className="text-2xl font-bold text-slate-200 mb-2">AI Worker Creator</h4>
                      <p className="text-slate-300 mb-6 text-lg">Describe your backend needs and I'll create a complete API worker for you!</p>
                      
                      <div className="bg-slate-700/50 rounded-xl p-6 max-w-3xl mx-auto mb-6">
                        <h5 className="text-lg font-semibold text-emerald-300 mb-4">🚀 What can you create?</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-400 mt-1">📝</span>
                              <span className="text-sm text-slate-300">Content generation APIs (captions, summaries, translations)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-green-400 mt-1">📊</span>
                              <span className="text-sm text-slate-300">Data processing endpoints (analysis, formatting, validation)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">🔗</span>
                              <span className="text-sm text-slate-300">Integration APIs (Slack, email, webhooks)</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-yellow-400 mt-1">🎯</span>
                              <span className="text-sm text-slate-300">Business logic routes (calculations, workflows)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-red-400 mt-1">🛡️</span>
                              <span className="text-sm text-slate-300">Secure authenticated endpoints with OAuth</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-indigo-400 mt-1">⚡</span>
                              <span className="text-sm text-slate-300">Custom input validation and processing</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left max-w-2xl mx-auto space-y-3 text-sm text-slate-400">
                        <p className="font-semibold text-slate-300">💡 Try these examples:</p>
                        <div className="space-y-2 pl-4">
                          <p>• <span className="text-slate-300">"Create an API that generates social media captions from product descriptions"</span></p>
                          <p>• <span className="text-slate-300">"Build a route that processes customer feedback and extracts key insights"</span></p>
                          <p>• <span className="text-slate-300">"Make an endpoint that validates and formats user data submissions"</span></p>
                          <p>• <span className="text-slate-300">"Create a worker that sends automated Slack notifications"</span></p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-3xl rounded-lg px-4 py-3 ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-700 text-slate-200'
                        }`}>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-700 text-slate-200 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span>Creating your AI worker...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chat Input */}
                <div className="border-t border-slate-700 p-6">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                      placeholder="Describe the backend functionality you want to create..."
                      className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleChatSubmit}
                      disabled={!chatInput.trim() || chatLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      {chatLoading ? '🔄' : '🚀'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Press Enter to send • Be specific about inputs, outputs, and OAuth requirements
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Result - Only show in manual mode */}
        {mode === 'manual' && testResult && (
          <div className={`border rounded-xl p-6 ${testResult.success ? 'border-emerald-600/30 bg-emerald-900/20' : 'border-red-600/30 bg-red-900/20'}`}>
            <h4 className={`font-semibold ${testResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
              Test {testResult.success ? 'Successful' : 'Failed'}
            </h4>
            <pre className={`mt-2 text-sm ${testResult.success ? 'text-emerald-200/80' : 'text-red-200/80'} bg-slate-800/50 p-4 rounded-lg overflow-auto`}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Usage Instructions - Only show in manual mode */}
        {mode === 'manual' && (
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-emerald-300 mb-4">How It Works</h4>
          <div className="space-y-3 text-sm text-emerald-200/80">
            <p><strong>1. Configure Endpoint:</strong> Set your API URL and HTTP method</p>
            <p><strong>2. Set Headers:</strong> Add any required headers like Authorization, Content-Type, etc.</p>
            <p><strong>3. Design Request Body:</strong> Create JSON template with variables like {'{"prompt": "{{prompt}}}"'}</p>
            <p><strong>4. Define Inputs:</strong> Create input fields that customers will fill out</p>
            <p><strong>5. Customer Experience:</strong> Customers see a form with your defined inputs in their dashboard</p>
            <p><strong>6. Processing:</strong> When customers submit, we call your API with processed request body</p>
            <p><strong>7. Results:</strong> Customers can view the raw JSON response from your API</p>
            <p><strong>Example:</strong> For OpenAI API, set endpoint to https://api.openai.com/v1/chat/completions with Authorization header and request body template</p>
          </div>
        </div>
        )}
          </div>
        ) : (
          // AI Endpoint Creator Section - Dual Mode Architecture Option 2
          <div className="space-y-6">
            {/* AI Endpoint Creator Header */}
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4">
              <h2 className="text-xl font-semibold text-blue-300 mb-2">🤖 AI Endpoint Creator</h2>
              <p className="text-blue-200 text-sm">
                Talk to AI in natural language to create complete backend endpoints - no configuration needed, just describe what you want
              </p>
            </div>

            {/* AI Endpoint Creator Interface */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  💬 Conversational Endpoint Designer
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </h3>
              </div>
              
              <div className="p-6">
                <div className="text-center py-16">
                  <div className="text-6xl mb-6">🚀✨</div>
                  <h4 className="text-2xl font-bold text-slate-200 mb-4">Revolutionary Endpoint Creation</h4>
                  <p className="text-slate-300 text-lg mb-4 max-w-2xl mx-auto">
                    Talk naturally with our AI to design complex backend endpoints. No technical knowledge required - just describe what you want your API to do!
                  </p>
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-4 mb-8 max-w-3xl mx-auto text-left">
                    <h5 className="text-sm font-semibold text-purple-300 mb-2">🔄 How This Differs From Backend Workers:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                      <div>
                        <div className="text-emerald-300 font-medium mb-1">🔧 Backend Workers:</div>
                        <ul className="space-y-1 text-slate-400">
                          <li>• Configure external API endpoints</li>
                          <li>• Define request/response templates</li>
                          <li>• Set up input fields & OAuth</li>
                          <li>• Manual or AI-assisted creation</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-blue-300 font-medium mb-1">🤖 AI Endpoint Creator:</div>
                        <ul className="space-y-1 text-slate-400">
                          <li>• Describe functionality in plain English</li>
                          <li>• AI generates complete endpoints</li>
                          <li>• No configuration or setup required</li>
                          <li>• Pure conversational interface</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left max-w-4xl mx-auto">
                    <div className="bg-slate-700/50 rounded-xl p-6">
                      <div className="text-3xl mb-3">🎯</div>
                      <h5 className="text-lg font-semibold text-white mb-2">Smart Conversations</h5>
                      <p className="text-slate-300 text-sm">
                        Describe your needs in plain English. The AI asks clarifying questions to understand exactly what you want.
                      </p>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-xl p-6">
                      <div className="text-3xl mb-3">⚡</div>
                      <h5 className="text-lg font-semibold text-white mb-2">Auto-Generated Code</h5>
                      <p className="text-slate-300 text-sm">
                        Watch as the AI writes complete endpoint code with validation, error handling, and best practices.
                      </p>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-xl p-6">
                      <div className="text-3xl mb-3">🔐</div>
                      <h5 className="text-lg font-semibold text-white mb-2">Enterprise Ready</h5>
                      <p className="text-slate-300 text-sm">
                        Built-in security, authentication, rate limiting, and monitoring for production use.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6 max-w-2xl mx-auto">
                    <h5 className="text-lg font-semibold mb-2">🚀 Coming Very Soon!</h5>
                    <p className="text-sm opacity-90">
                      We're putting the finishing touches on this revolutionary feature. 
                      It will allow you to create sophisticated backend endpoints through natural conversation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  🎨 Design Features
                </h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Natural language endpoint design
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Automatic input/output schema generation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Built-in validation and error handling
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Custom business logic implementation
                  </li>
                </ul>
              </div>
              
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  🛡️ Security Features
                </h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">✓</span>
                    Automatic authentication integration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">✓</span>
                    Rate limiting and abuse prevention
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">✓</span>
                    Input sanitization and validation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">✓</span>
                    Comprehensive logging and monitoring
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}