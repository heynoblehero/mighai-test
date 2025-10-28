import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function CreateLogicPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    slug: '',
    description: '',
    access_level: 'public'
  });

  const [fields, setFields] = useState([]);
  const [frontendConfig, setFrontendConfig] = useState({
    title: '',
    subtitle: '',
    theme: 'modern',
    layout: 'centered',
    showProgress: false,
    customCSS: ''
  });

  const [backendConfig, setBackendConfig] = useState({
    aiModel: 'gpt-3.5-turbo',
    systemPrompt: '',
    userPromptTemplate: '',
    temperature: 0.7,
    maxTokens: 1000,
    timeout: 30000,
    retries: 2
  });

  const [resultConfig, setResultConfig] = useState({
    displayType: 'text',
    showMetadata: true,
    allowDownload: false,
    shareResults: false,
    customHTML: ''
  });

  const [settings, setSettings] = useState({
    store_results: true,
    store_analytics: true,
    max_executions_per_user: 10,
    is_active: true
  });

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    setBasicInfo(prev => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }));
  };

  // Field management
  const addField = () => {
    const newField = {
      id: Date.now(),
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      placeholder: '',
      help_text: '',
      field_options: {},
      order_index: fields.length
    };
    setFields([...fields, newField]);
  };

  const updateField = (id, updates) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const moveField = (id, direction) => {
    const index = fields.findIndex(field => field.id === id);
    if (index === -1) return;

    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < fields.length) {
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      // Update order_index
      newFields.forEach((field, i) => {
        field.order_index = i;
      });
      setFields(newFields);
    }
  };

  // Save logic page
  const saveLogicPage = async () => {
    if (!basicInfo.name || !basicInfo.slug) {
      setError('Name and slug are required');
      return;
    }

    if (fields.length === 0) {
      setError('At least one input field is required');
      return;
    }

    if (!backendConfig.systemPrompt) {
      setError('System prompt is required for AI processing');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const pageData = {
        ...basicInfo,
        frontend_config: {
          ...frontendConfig,
          fields: fields.map(({id, ...field}) => field) // Remove temp id
        },
        backend_config: backendConfig,
        result_config: resultConfig,
        ...settings
      };

      const response = await fetch('/api/admin/logic-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageData })
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/logic-pages');
      } else {
        setError(data.error || 'Failed to create logic page');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error creating logic page:', error);
    } finally {
      setSaving(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const steps = [
    'Basic Info',
    'Input Fields', 
    'Frontend Design',
    'AI Processing',
    'Result Display'
  ];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Create Logic Page</h1>
            <p className="text-slate-400 mt-1">
              Build dynamic AI-powered pages with custom functionality
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/logic-pages')}
            className="text-slate-400 hover:text-white"
          >
            ← Back to Logic Pages
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index + 1 === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : index + 1 < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-600 text-slate-300'
                }`}>
                  {index + 1 < currentStep ? '✓' : index + 1}
                </div>
                <div className={`ml-2 text-sm ${
                  index + 1 === currentStep ? 'text-white font-medium' : 'text-slate-400'
                }`}>
                  {step}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ml-4 ${
                    index + 1 < currentStep ? 'bg-green-600' : 'bg-slate-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
            <div className="text-red-400 font-medium">Error</div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Page Name *
                  </label>
                  <input
                    type="text"
                    value={basicInfo.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Text Translator, Meme Generator"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    value={basicInfo.slug}
                    onChange={(e) => setBasicInfo(prev => ({...prev, slug: e.target.value}))}
                    placeholder="text-translator"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Will be accessible at: /{basicInfo.slug}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo(prev => ({...prev, description: e.target.value}))}
                  placeholder="Describe what this page does..."
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Access Level
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="public"
                      checked={basicInfo.access_level === 'public'}
                      onChange={(e) => setBasicInfo(prev => ({...prev, access_level: e.target.value}))}
                      className="text-blue-600"
                    />
                    <span className="ml-2 text-white">🌐 Public (Anyone can access)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="subscriber"
                      checked={basicInfo.access_level === 'subscriber'}
                      onChange={(e) => setBasicInfo(prev => ({...prev, access_level: e.target.value}))}
                      className="text-blue-600"
                    />
                    <span className="ml-2 text-white">👤 Subscribers Only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Input Fields */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Input Fields</h3>
                <button
                  onClick={addField}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  + Add Field
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📝</div>
                  <h4 className="text-lg font-medium text-white mb-2">No Input Fields Yet</h4>
                  <p className="text-slate-400 mb-4">Add input fields that users will fill out</p>
                  <button
                    onClick={addField}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Add Your First Field
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-medium">Field #{index + 1}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => moveField(field.id, 'up')}
                            disabled={index === 0}
                            className="text-slate-400 hover:text-white disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveField(field.id, 'down')}
                            disabled={index === fields.length - 1}
                            className="text-slate-400 hover:text-white disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeField(field.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Field Name (internal)</label>
                          <input
                            type="text"
                            value={field.field_name || ''}
                            onChange={(e) => updateField(field.id, { field_name: e.target.value })}
                            placeholder="user_input"
                            className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Display Label</label>
                          <input
                            type="text"
                            value={field.field_label || ''}
                            onChange={(e) => updateField(field.id, { field_label: e.target.value })}
                            placeholder="Enter your text"
                            className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Field Type</label>
                          <select
                            value={field.field_type || 'text'}
                            onChange={(e) => updateField(field.id, { field_type: e.target.value })}
                            className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="email">Email</option>
                            <option value="number">Number</option>
                            <option value="select">Select</option>
                            <option value="file">File</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Placeholder</label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="Placeholder text..."
                            className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={field.is_required || false}
                            onChange={(e) => updateField(field.id, { is_required: e.target.checked })}
                            className="text-blue-600"
                          />
                          <span className="ml-2 text-sm text-white">Required field</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Frontend Design */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Frontend Design</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Page Title</label>
                  <input
                    type="text"
                    value={frontendConfig.title}
                    onChange={(e) => setFrontendConfig(prev => ({...prev, title: e.target.value}))}
                    placeholder="Welcome to our AI tool"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={frontendConfig.subtitle}
                    onChange={(e) => setFrontendConfig(prev => ({...prev, subtitle: e.target.value}))}
                    placeholder="Get instant results powered by AI"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Theme</label>
                  <select
                    value={frontendConfig.theme}
                    onChange={(e) => setFrontendConfig(prev => ({...prev, theme: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  >
                    <option value="modern">Modern</option>
                    <option value="minimal">Minimal</option>
                    <option value="gradient">Gradient</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Layout</label>
                  <select
                    value={frontendConfig.layout}
                    onChange={(e) => setFrontendConfig(prev => ({...prev, layout: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  >
                    <option value="centered">Centered</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="fullwidth">Full Width</option>
                    <option value="cards">Card Layout</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={frontendConfig.showProgress}
                    onChange={(e) => setFrontendConfig(prev => ({...prev, showProgress: e.target.checked}))}
                    className="text-blue-600"
                  />
                  <span className="ml-2 text-white">Show progress indicator during processing</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Custom CSS (Optional)</label>
                <textarea
                  value={frontendConfig.customCSS}
                  onChange={(e) => setFrontendConfig(prev => ({...prev, customCSS: e.target.value}))}
                  placeholder="/* Add custom styles here */"
                  rows={6}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 4: AI Processing */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">AI Processing Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">AI Model</label>
                  <select
                    value={backendConfig.aiModel}
                    onChange={(e) => setBackendConfig(prev => ({...prev, aiModel: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Efficient)</option>
                    <option value="gpt-4">GPT-4 (Most Capable)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo (Best Balance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={backendConfig.maxTokens}
                    onChange={(e) => setBackendConfig(prev => ({...prev, maxTokens: parseInt(e.target.value)}))}
                    min="100"
                    max="4000"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">System Prompt *</label>
                <textarea
                  value={backendConfig.systemPrompt}
                  onChange={(e) => setBackendConfig(prev => ({...prev, systemPrompt: e.target.value}))}
                  placeholder="You are a helpful AI assistant that..."
                  rows={4}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Define the AI's role and behavior
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">User Prompt Template</label>
                <textarea
                  value={backendConfig.userPromptTemplate}
                  onChange={(e) => setBackendConfig(prev => ({...prev, userPromptTemplate: e.target.value}))}
                  placeholder="Process this text: {{user_input}}"
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {"{{field_name}}"} to insert user inputs. Available fields: {fields.map(f => f.field_name || 'unnamed').filter(name => name !== 'unnamed').join(', ')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Temperature ({backendConfig.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={backendConfig.temperature}
                    onChange={(e) => setBackendConfig(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={backendConfig.timeout / 1000}
                    onChange={(e) => setBackendConfig(prev => ({...prev, timeout: parseInt(e.target.value) * 1000}))}
                    min="10"
                    max="120"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Result Display */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Result Display & Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Display Type</label>
                  <select
                    value={resultConfig.displayType}
                    onChange={(e) => setResultConfig(prev => ({...prev, displayType: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  >
                    <option value="text">Plain Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Executions per User</label>
                  <input
                    type="number"
                    value={settings.max_executions_per_user}
                    onChange={(e) => setSettings(prev => ({...prev, max_executions_per_user: parseInt(e.target.value)}))}
                    min="1"
                    max="100"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={resultConfig.showMetadata}
                    onChange={(e) => setResultConfig(prev => ({...prev, showMetadata: e.target.checked}))}
                    className="text-blue-600"
                  />
                  <span className="ml-2 text-white">Show processing metadata (tokens, time, cost)</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={resultConfig.allowDownload}
                    onChange={(e) => setResultConfig(prev => ({...prev, allowDownload: e.target.checked}))}
                    className="text-blue-600"
                  />
                  <span className="ml-2 text-white">Allow users to download results</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.store_results}
                    onChange={(e) => setSettings(prev => ({...prev, store_results: e.target.checked}))}
                    className="text-blue-600"
                  />
                  <span className="ml-2 text-white">Store execution results in database</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.store_analytics}
                    onChange={(e) => setSettings(prev => ({...prev, store_analytics: e.target.checked}))}
                    className="text-blue-600"
                  />
                  <span className="ml-2 text-white">Track analytics and usage statistics</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Custom Result HTML (Optional)</label>
                <textarea
                  value={resultConfig.customHTML}
                  onChange={(e) => setResultConfig(prev => ({...prev, customHTML: e.target.value}))}
                  placeholder="<div class='result'>{{result}}</div>"
                  rows={4}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {"{{result}}"} to display the AI output
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          <div className="text-sm text-slate-400">
            Step {currentStep} of {steps.length}
          </div>

          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={saveLogicPage}
              disabled={saving}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{saving ? 'Creating...' : 'Create Logic Page'}</span>
            </button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}