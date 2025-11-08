import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';

export default function EditLogicPage() {
  const router = useRouter();
  const { id } = router.query;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const chatEndRef = useRef(null);

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');

  // Step 2: Inputs
  const [inputs, setInputs] = useState([]);
  const [aiReasoning, setAiReasoning] = useState('');

  // Step 3: Backend Function
  const [backendFunction, setBackendFunction] = useState('');
  const [backendChat, setBackendChat] = useState([]);
  const [backendMessage, setBackendMessage] = useState('');
  const [backendRoute, setBackendRoute] = useState('');

  // Step 4: Test Function
  const [testInputs, setTestInputs] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');

  // Step 5: Frontend Code
  const [frontendHtml, setFrontendHtml] = useState('');
  const [frontendCss, setFrontendCss] = useState('');
  const [frontendJs, setFrontendJs] = useState('');
  const [frontendChat, setFrontendChat] = useState([]);
  const [frontendMessage, setFrontendMessage] = useState('');

  // Step 6: Preview & Publish
  const [previewMode, setPreviewMode] = useState('desktop');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load logic page data
  useEffect(() => {
    if (id) {
      loadLogicPage();
    }
  }, [id]);

  const loadLogicPage = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/logic-pages/${id}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load logic page');
        setLoading(false);
        return;
      }

      const page = data.logic_page;

      // Populate all fields
      setTitle(page.title);
      setSlug(page.slug);
      setDescription(page.description);
      setStatus(page.status);
      setBackendRoute(page.backend_route);
      setBackendFunction(page.backend_function || '');
      setFrontendHtml(page.frontend_html || '');
      setFrontendCss(page.frontend_css || '');
      setFrontendJs(page.frontend_js || '');

      // Parse inputs
      if (page.inputs_json) {
        try {
          const parsedInputs = JSON.parse(page.inputs_json);
          setInputs(parsedInputs);
        } catch (e) {
          console.error('Failed to parse inputs:', e);
        }
      }

      // Parse AI context if available
      if (page.ai_context) {
        try {
          const context = JSON.parse(page.ai_context);
          if (context.backend_chat) setBackendChat(context.backend_chat);
          if (context.frontend_chat) setFrontendChat(context.frontend_chat);
          if (context.ai_reasoning) setAiReasoning(context.ai_reasoning);
        } catch (e) {
          console.error('Failed to parse AI context:', e);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading logic page:', error);
      setError('Failed to load logic page');
      setLoading(false);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [backendChat, frontendChat]);

  // Initialize test inputs from configured inputs
  useEffect(() => {
    if (inputs.length > 0) {
      const initialTestInputs = {};
      inputs.forEach(input => {
        initialTestInputs[input.name] = input.default || '';
      });
      setTestInputs(initialTestInputs);
    }
  }, [inputs]);

  // ==================== UPDATE BASIC INFO ====================
  const updateBasicInfo = async () => {
    if (!title || !description) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/logic-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to update basic info');
        setSaving(false);
        return;
      }

      setSuccess('Basic info updated successfully');
      setSaving(false);
    } catch (error) {
      console.error('Error updating basic info:', error);
      setError('Failed to update basic info');
      setSaving(false);
    }
  };

  // ==================== SUGGEST INPUTS WITH AI ====================
  const suggestInputsWithAI = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/logic-pages/suggest-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to get AI suggestions');
        setSaving(false);
        return;
      }

      setInputs(data.inputs);
      setAiReasoning(data.reasoning);

      // Save inputs
      await updateInputs(data.inputs, data.reasoning);
      setSuccess('AI suggestions loaded');
      setSaving(false);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setError('Failed to get AI suggestions');
      setSaving(false);
    }
  };

  // ==================== UPDATE INPUTS ====================
  const updateInputs = async (inputsToSave = inputs, reasoning = aiReasoning) => {
    setSaving(true);
    setError('');

    try {
      // Build AI context
      const aiContext = {
        backend_chat: backendChat,
        frontend_chat: frontendChat,
        ai_reasoning: reasoning
      };

      const res = await fetch(`/api/logic-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs_json: JSON.stringify(inputsToSave),
          ai_context: JSON.stringify(aiContext)
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to update inputs');
        setSaving(false);
        return;
      }

      setSuccess('Inputs updated successfully');
      setSaving(false);
    } catch (error) {
      console.error('Error updating inputs:', error);
      setError('Failed to update inputs');
      setSaving(false);
    }
  };

  const addInput = () => {
    setInputs([...inputs, {
      name: '',
      label: '',
      type: 'text',
      placeholder: '',
      required: true
    }]);
  };

  const removeInput = (index) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const updateInput = (index, field, value) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  // ==================== BACKEND BUILDER ====================
  const sendBackendMessage = async () => {
    if (!backendMessage.trim()) return;

    setSaving(true);
    setError('');

    const userMsg = { role: 'user', message: backendMessage };
    const newChat = [...backendChat, userMsg];
    setBackendChat(newChat);
    setBackendMessage('');

    try {
      const res = await fetch('/api/logic-pages/generate-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          inputs,
          backendRoute,
          chatHistory: newChat,
          userMessage: backendMessage
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to generate backend');
        setSaving(false);
        return;
      }

      const assistantMsg = { role: 'assistant', message: data.message };
      const updatedChat = [...newChat, assistantMsg];
      setBackendChat(updatedChat);

      if (data.code) {
        setBackendFunction(data.code);
      }

      setSaving(false);
    } catch (error) {
      console.error('Error generating backend:', error);
      setError('Failed to generate backend');
      setSaving(false);
    }
  };

  const saveBackendFunction = async () => {
    if (!backendFunction.trim()) {
      setError('Backend function cannot be empty');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const aiContext = {
        backend_chat: backendChat,
        frontend_chat: frontendChat,
        ai_reasoning: aiReasoning
      };

      const res = await fetch(`/api/logic-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend_function: backendFunction,
          ai_context: JSON.stringify(aiContext),
          status: 'building'
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save backend function');
        setSaving(false);
        return;
      }

      setSuccess('Backend function saved successfully');
      setStatus('building');
      setSaving(false);
    } catch (error) {
      console.error('Error saving backend function:', error);
      setError('Failed to save backend function');
      setSaving(false);
    }
  };

  // ==================== TEST BACKEND ====================
  const testBackendFunction = async () => {
    if (!backendFunction.trim()) {
      setError('No backend function to test');
      return;
    }

    setSaving(true);
    setTestError('');
    setTestResult(null);
    setError('');

    try {
      const res = await fetch('/api/logic-pages/test-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionCode: backendFunction,
          testInputs
        })
      });

      const data = await res.json();

      if (data.success) {
        setTestResult(data);
        setSuccess('Test passed! Backend function working correctly.');
      } else {
        setTestError(data.error || 'Test failed');
        setTestResult(data);
      }

      setSaving(false);
    } catch (error) {
      console.error('Error testing function:', error);
      setTestError('Failed to test function');
      setSaving(false);
    }
  };

  // ==================== FRONTEND BUILDER ====================
  const sendFrontendMessage = async () => {
    if (!frontendMessage.trim()) return;

    setSaving(true);
    setError('');

    const userMsg = { role: 'user', message: frontendMessage };
    const newChat = [...frontendChat, userMsg];
    setFrontendChat(newChat);
    setFrontendMessage('');

    try {
      const res = await fetch('/api/logic-pages/generate-frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          inputs,
          backendRoute,
          chatHistory: newChat,
          userMessage: frontendMessage
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to generate frontend');
        setSaving(false);
        return;
      }

      const assistantMsg = { role: 'assistant', message: data.message };
      const updatedChat = [...newChat, assistantMsg];
      setFrontendChat(updatedChat);

      if (data.code) {
        if (data.code.html) setFrontendHtml(data.code.html);
        if (data.code.css) setFrontendCss(data.code.css);
        if (data.code.js) setFrontendJs(data.code.js);
      }

      setSaving(false);
    } catch (error) {
      console.error('Error generating frontend:', error);
      setError('Failed to generate frontend');
      setSaving(false);
    }
  };

  const saveFrontendCode = async () => {
    setSaving(true);
    setError('');

    try {
      const aiContext = {
        backend_chat: backendChat,
        frontend_chat: frontendChat,
        ai_reasoning: aiReasoning
      };

      const res = await fetch(`/api/logic-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontend_html: frontendHtml,
          frontend_css: frontendCss,
          frontend_js: frontendJs,
          ai_context: JSON.stringify(aiContext),
          status: 'testing'
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save frontend code');
        setSaving(false);
        return;
      }

      setSuccess('Frontend code saved successfully');
      setStatus('testing');
      setSaving(false);
    } catch (error) {
      console.error('Error saving frontend code:', error);
      setError('Failed to save frontend code');
      setSaving(false);
    }
  };

  // ==================== PUBLISH ====================
  const publishLogicPage = async () => {
    if (!backendFunction || !frontendHtml) {
      setError('Please complete backend and frontend before publishing');
      return;
    }

    if (!confirm('Are you sure you want to publish this logic page?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/logic-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to publish');
        setSaving(false);
        return;
      }

      setSuccess('Logic page published successfully!');
      setStatus('published');
      setSaving(false);
    } catch (error) {
      console.error('Error publishing:', error);
      setError('Failed to publish logic page');
      setSaving(false);
    }
  };

  const unpublishLogicPage = async () => {
    if (!confirm('Are you sure you want to unpublish this logic page?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/logic-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'testing' })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to unpublish');
        setSaving(false);
        return;
      }

      setSuccess('Logic page unpublished');
      setStatus('testing');
      setSaving(false);
    } catch (error) {
      console.error('Error unpublishing:', error);
      setError('Failed to unpublish logic page');
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading logic page...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Preview iframe content
  const previewContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
          ${frontendCss}
        </style>
      </head>
      <body>
        ${frontendHtml}
        <script>
          ${frontendJs}
        </script>
      </body>
    </html>
  `;

  const previewSizes = {
    desktop: { width: '100%', height: '600px' },
    tablet: { width: '768px', height: '600px' },
    mobile: { width: '375px', height: '667px' }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Edit Logic Page</h1>
              <p className="text-gray-400">Modify your custom logic and functionality</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                status === 'draft' ? 'bg-gray-500' :
                status === 'building' ? 'bg-blue-500' :
                status === 'testing' ? 'bg-yellow-500' :
                status === 'published' ? 'bg-green-500' :
                'bg-gray-700'
              } text-white`}>
                {status.toUpperCase()}
              </span>
              <button
                onClick={() => router.push('/admin/logic-pages')}
                className="px-6 py-2 bg-surface-neutral border border-border rounded-lg text-white hover:bg-surface-hovered"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Step Navigation */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {['Basic Info', 'Configure Inputs', 'Build Backend', 'Test Function', 'Build Frontend', 'Preview & Publish'].map((label, index) => (
            <button
              key={index}
              onClick={() => setStep(index + 1)}
              className={`px-6 py-3 rounded-lg whitespace-nowrap transition-all ${
                step === index + 1
                  ? 'bg-primary text-white'
                  : 'bg-surface-neutral text-gray-400 hover:bg-surface-hovered'
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-surface-neutral border border-border rounded-xl p-8">
          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-white"
                    placeholder="Enter logic page title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Slug (URL Path)</label>
                  <input
                    type="text"
                    value={slug}
                    disabled
                    className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-gray-500 cursor-not-allowed"
                    placeholder="auto-generated-slug"
                  />
                  <p className="text-sm text-gray-500 mt-1">Slug cannot be changed after creation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-white"
                    placeholder="Describe what this logic page does..."
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    <strong>Backend Route:</strong> {backendRoute}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={updateBasicInfo}
                    disabled={saving}
                    className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Basic Info'}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="px-8 py-3 bg-surface-hovered border border-border text-white rounded-lg hover:bg-surface-neutral"
                  >
                    Next: Configure Inputs →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE INPUTS */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Configure Input Fields</h2>

              {aiReasoning && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
                  <strong className="text-blue-400">AI Reasoning:</strong>
                  <p className="text-gray-300 mt-2">{aiReasoning}</p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                {inputs.map((input, index) => (
                  <div key={index} className="bg-surface-hovered border border-border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Field Name</label>
                        <input
                          type="text"
                          value={input.name}
                          onChange={(e) => updateInput(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                          placeholder="field_name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Label</label>
                        <input
                          type="text"
                          value={input.label}
                          onChange={(e) => updateInput(index, 'label', e.target.value)}
                          className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                          placeholder="Field Label"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Type</label>
                        <select
                          value={input.type}
                          onChange={(e) => updateInput(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="tel">Phone</option>
                          <option value="url">URL</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={input.placeholder}
                          onChange={(e) => updateInput(index, 'placeholder', e.target.value)}
                          className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                          placeholder="Enter placeholder..."
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={input.required}
                            onChange={(e) => updateInput(index, 'required', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">Required</span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => removeInput(index)}
                      className="text-red-400 text-sm hover:text-red-300"
                    >
                      Remove Field
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={addInput}
                  className="px-6 py-2 bg-surface-hovered border border-border text-white rounded-lg hover:bg-surface-neutral"
                >
                  + Add Input Field
                </button>
                <button
                  onClick={suggestInputsWithAI}
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Getting AI Suggestions...' : '🤖 Re-suggest with AI'}
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => updateInputs()}
                  disabled={saving}
                  className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Inputs'}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-8 py-3 bg-surface-hovered border border-border text-white rounded-lg hover:bg-surface-neutral"
                >
                  Next: Build Backend →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BUILD BACKEND */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Build Backend Function</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Left: AI Chat */}
                <div className="bg-surface-hovered border border-border rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">💬 AI Assistant</h3>

                  <div className="h-96 overflow-y-auto mb-4 space-y-3">
                    {backendChat.length === 0 ? (
                      <div className="text-center text-gray-500 py-12">
                        <p>Start chatting with AI to build your backend function</p>
                        <p className="text-sm mt-2">Example: "Create a function that validates email and sends a welcome message"</p>
                      </div>
                    ) : (
                      backendChat.map((msg, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-primary/20 text-white ml-8'
                              : 'bg-surface-neutral text-gray-300 mr-8'
                          }`}
                        >
                          <div className="text-xs font-semibold mb-1">
                            {msg.role === 'user' ? 'You' : '🤖 AI'}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={backendMessage}
                      onChange={(e) => setBackendMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !saving && sendBackendMessage()}
                      placeholder="Ask AI to help build your function..."
                      className="flex-1 px-4 py-2 bg-surface-neutral border border-border rounded-lg text-white"
                      disabled={saving}
                    />
                    <button
                      onClick={sendBackendMessage}
                      disabled={saving || !backendMessage.trim()}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      {saving ? '...' : 'Send'}
                    </button>
                  </div>
                </div>

                {/* Right: Code Editor */}
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Backend Function Code</label>
                    <textarea
                      value={backendFunction}
                      onChange={(e) => setBackendFunction(e.target.value)}
                      rows={16}
                      className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-white font-mono text-sm"
                      placeholder="async function executeLogic(inputs) { ... }"
                    />
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 mb-4 text-sm">
                    <strong className="text-blue-400">Expected Function Signature:</strong>
                    <pre className="text-gray-300 mt-2 text-xs">
{`async function executeLogic(inputs) {
  // inputs = { field_name: value, ... }
  return {
    success: true,
    data: { ... },
    message: "..."
  };
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={saveBackendFunction}
                  disabled={saving}
                  className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Backend Function'}
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-8 py-3 bg-surface-hovered border border-border text-white rounded-lg hover:bg-surface-neutral"
                >
                  Next: Test Function →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: TEST FUNCTION */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Test Backend Function</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Left: Test Inputs */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Test Inputs</h3>
                  <div className="space-y-4 mb-6">
                    {inputs.map((input, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {input.label}
                          {input.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <input
                          type={input.type}
                          value={testInputs[input.name] || ''}
                          onChange={(e) => setTestInputs({ ...testInputs, [input.name]: e.target.value })}
                          placeholder={input.placeholder}
                          className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-white"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={testBackendFunction}
                    disabled={saving}
                    className="w-full px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Testing...' : '▶ Run Test'}
                  </button>
                </div>

                {/* Right: Test Results */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Test Results</h3>
                  {testResult ? (
                    <div className="bg-surface-hovered border border-border rounded-lg p-4">
                      <div className={`text-sm font-semibold mb-3 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {testResult.success ? '✅ Test Passed' : '❌ Test Failed'}
                      </div>

                      {testResult.success ? (
                        <div>
                          <div className="text-gray-400 text-sm mb-2">Result:</div>
                          <pre className="bg-surface-neutral p-3 rounded text-xs text-gray-300 overflow-auto max-h-96">
                            {JSON.stringify(testResult.result, null, 2)}
                          </pre>
                          <div className="text-gray-500 text-xs mt-2">
                            Execution time: {testResult.execution_time}ms
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-red-400 text-sm mb-2">Error:</div>
                          <pre className="bg-surface-neutral p-3 rounded text-xs text-red-300 overflow-auto max-h-96">
                            {testError || testResult.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-surface-hovered border border-border rounded-lg p-12 text-center text-gray-500">
                      No test results yet. Fill in test inputs and click "Run Test".
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(5)}
                  disabled={!testResult || !testResult.success}
                  className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  Next: Build Frontend →
                </button>
                {!testResult?.success && (
                  <p className="text-gray-500 text-sm flex items-center">
                    Please pass the test before continuing
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: BUILD FRONTEND */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Build Frontend Interface</h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Left: AI Chat */}
                <div className="bg-surface-hovered border border-border rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">💬 AI Assistant</h3>

                  <div className="h-80 overflow-y-auto mb-4 space-y-3">
                    {frontendChat.length === 0 ? (
                      <div className="text-center text-gray-500 py-12">
                        <p>Ask AI to help build your frontend interface</p>
                        <p className="text-sm mt-2">Example: "Create a modern form with gradient background"</p>
                      </div>
                    ) : (
                      frontendChat.map((msg, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-primary/20 text-white ml-8'
                              : 'bg-surface-neutral text-gray-300 mr-8'
                          }`}
                        >
                          <div className="text-xs font-semibold mb-1">
                            {msg.role === 'user' ? 'You' : '🤖 AI'}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={frontendMessage}
                      onChange={(e) => setFrontendMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !saving && sendFrontendMessage()}
                      placeholder="Ask AI to help build your frontend..."
                      className="flex-1 px-4 py-2 bg-surface-neutral border border-border rounded-lg text-white"
                      disabled={saving}
                    />
                    <button
                      onClick={sendFrontendMessage}
                      disabled={saving || !frontendMessage.trim()}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      {saving ? '...' : 'Send'}
                    </button>
                  </div>
                </div>

                {/* Right: Code Editors */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">HTML</label>
                    <textarea
                      value={frontendHtml}
                      onChange={(e) => setFrontendHtml(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-white font-mono text-sm"
                      placeholder="<div>...</div>"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">CSS</label>
                    <textarea
                      value={frontendCss}
                      onChange={(e) => setFrontendCss(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-white font-mono text-sm"
                      placeholder=".container { ... }"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">JavaScript</label>
                    <textarea
                      value={frontendJs}
                      onChange={(e) => setFrontendJs(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-surface-hovered border border-border rounded-lg text-white font-mono text-sm"
                      placeholder="document.querySelector(...)"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={saveFrontendCode}
                  disabled={saving}
                  className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Frontend Code'}
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="px-8 py-3 bg-surface-hovered border border-border text-white rounded-lg hover:bg-surface-neutral"
                >
                  Next: Preview & Publish →
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PREVIEW & PUBLISH */}
          {step === 6 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Preview & Publish</h2>

              {/* Preview Mode Selector */}
              <div className="flex gap-2 mb-4">
                {Object.keys(previewSizes).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`px-4 py-2 rounded-lg capitalize ${
                      previewMode === mode
                        ? 'bg-primary text-white'
                        : 'bg-surface-hovered text-gray-400 hover:bg-surface-neutral'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="bg-surface-hovered border border-border rounded-lg p-8 mb-6 flex justify-center">
                {frontendHtml ? (
                  <iframe
                    srcDoc={previewContent}
                    style={{
                      width: previewSizes[previewMode].width,
                      height: previewSizes[previewMode].height,
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      background: 'white'
                    }}
                    title="Preview"
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No frontend code to preview</p>
                    <p className="text-sm mt-2">Complete Step 5 first</p>
                  </div>
                )}
              </div>

              {/* Routes Info */}
              <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 mb-6">
                <h3 className="text-blue-400 font-semibold mb-3">📍 Routes & Access</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Backend API:</strong> {backendRoute} (POST)</p>
                  <p><strong>Frontend Page:</strong> /logic/{slug}</p>
                  {status === 'published' && (
                    <p className="text-green-400">✅ Currently published and accessible</p>
                  )}
                </div>
              </div>

              {/* Publish Controls */}
              <div className="flex gap-4">
                {status !== 'published' ? (
                  <button
                    onClick={publishLogicPage}
                    disabled={saving}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>🚀</span>
                    {saving ? 'Publishing...' : 'Publish Logic Page'}
                  </button>
                ) : (
                  <button
                    onClick={unpublishLogicPage}
                    disabled={saving}
                    className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {saving ? 'Unpublishing...' : 'Unpublish'}
                  </button>
                )}

                {status === 'published' && (
                  <button
                    onClick={() => window.open(`/logic/${slug}`, '_blank')}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View Live Page
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
