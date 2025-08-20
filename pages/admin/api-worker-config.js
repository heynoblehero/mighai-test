import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function APIWorkerConfig() {
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

  const inputTypes = ['text', 'textarea', 'email', 'number', 'select', 'checkbox', 'file'];
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  useEffect(() => {
    fetchConfig();
    fetchOAuthServices();
  }, []);

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
    <AdminLayout title="API Worker Configuration">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">API Worker Configuration</h1>
          <p className="text-slate-400 mt-1">Configure external API endpoints for customer requests</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">API Worker Service Configuration</h3>
          </div>
          <div className="p-6">
          
            {message && (
              <div className={`mb-4 p-4 rounded-xl ${
                message.includes('success') 
                  ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
                  : 'bg-red-900/20 border border-red-600/30 text-red-300'
              }`}>
                {message}
              </div>
            )}

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

        {/* Test Result */}
        {testResult && (
          <div className={`border rounded-xl p-6 ${testResult.success ? 'border-emerald-600/30 bg-emerald-900/20' : 'border-red-600/30 bg-red-900/20'}`}>
            <h4 className={`font-semibold ${testResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
              Test {testResult.success ? 'Successful' : 'Failed'}
            </h4>
            <pre className={`mt-2 text-sm ${testResult.success ? 'text-emerald-200/80' : 'text-red-200/80'} bg-slate-800/50 p-4 rounded-lg overflow-auto`}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Usage Instructions */}
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
        </div>
      </div>
    </AdminLayout>
  );
}