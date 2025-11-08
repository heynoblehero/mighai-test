import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function NewLogicPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: AI Suggested Inputs
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

  const [logicPageId, setLogicPageId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [backendChat, frontendChat]);

  // Auto-generate slug from title
  const handleTitleChange = (value) => {
    setTitle(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

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

  // ==================== STEP 1: CREATE & SUGGEST INPUTS ====================
  const handleStep1Submit = async () => {
    if (!title || !slug || !description) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create logic page
      const createRes = await fetch('/api/logic-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, description, status: 'draft' })
      });

      const createData = await createRes.json();
      if (!createData.success) {
        setError(createData.error || 'Failed to create logic page');
        setLoading(false);
        return;
      }

      setLogicPageId(createData.logic_page.id);
      setBackendRoute(createData.logic_page.backend_route);

      // Get AI suggestions for inputs
      const suggestRes = await fetch('/api/logic-pages/suggest-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, description })
      });

      const suggestData = await suggestRes.json();
      if (suggestData.success && suggestData.suggestions?.inputs) {
        setInputs(suggestData.suggestions.inputs);
        setAiReasoning(suggestData.suggestions.reasoning || '');
        setSuccess('AI has analyzed your description and suggested inputs!');
      }

      setStep(2);
    } catch (err) {
      setError('Failed to create logic page: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 2: CONFIGURE INPUTS ====================
  const handleStep2Submit = async () => {
    if (inputs.length === 0) {
      setError('Please add at least one input field');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs_json: inputs,
          status: 'building'
        })
      });

      setSuccess('Inputs saved successfully!');
      setStep(3);
    } catch (err) {
      setError('Failed to save inputs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addInput = () => {
    setInputs([...inputs, {
      name: '',
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
      default: ''
    }]);
  };

  const removeInput = (index) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const updateInput = (index, field, value) => {
    const updated = [...inputs];
    updated[index][field] = value;
    setInputs(updated);
  };

  // ==================== STEP 3: BUILD BACKEND ====================
  const sendBackendMessage = async () => {
    if (!backendMessage.trim()) return;

    const userMsg = { role: 'user', message: backendMessage };
    setBackendChat([...backendChat, userMsg]);
    setBackendMessage('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/logic-pages/generate-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          inputs,
          chatHistory: backendChat,
          userMessage: backendMessage
        })
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg = { role: 'assistant', message: data.message };
        setBackendChat([...backendChat, userMsg, assistantMsg]);

        if (data.code) {
          setBackendFunction(data.code);
          setSuccess('Backend function code generated!');
        }
      } else {
        setError(data.error || 'Failed to generate backend');
      }
    } catch (err) {
      setError('Error communicating with AI: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveBackendAndContinue = async () => {
    if (!backendFunction) {
      setError('Please generate backend function code first');
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backend_function: backendFunction })
      });

      setSuccess('Backend function saved!');
      setStep(4);
    } catch (err) {
      setError('Failed to save backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 4: TEST FUNCTION ====================
  const testBackendFunction = async () => {
    setLoading(true);
    setTestResult(null);
    setTestError('');

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
        setTestResult(data.result);
        setSuccess(`Test successful! Executed in ${data.execution_time}ms`);
      } else {
        setTestError(data.error || 'Test failed');
      }
    } catch (err) {
      setTestError('Test error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 5: BUILD FRONTEND ====================
  const sendFrontendMessage = async () => {
    if (!frontendMessage.trim()) return;

    const userMsg = { role: 'user', message: frontendMessage };
    setFrontendChat([...frontendChat, userMsg]);
    setFrontendMessage('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/logic-pages/generate-frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          inputs,
          backendRoute,
          chatHistory: frontendChat,
          userMessage: frontendMessage
        })
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg = { role: 'assistant', message: data.message };
        setFrontendChat([...frontendChat, userMsg, assistantMsg]);

        if (data.code) {
          setFrontendHtml(data.code.html || '');
          setFrontendCss(data.code.css || '');
          setFrontendJs(data.code.js || '');
          setSuccess('Frontend code generated!');
        }
      } else {
        setError(data.error || 'Failed to generate frontend');
      }
    } catch (err) {
      setError('Error communicating with AI: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveFrontendAndContinue = async () => {
    if (!frontendHtml) {
      setError('Please generate frontend code first');
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontend_html: frontendHtml,
          frontend_css: frontendCss,
          frontend_js: frontendJs,
          status: 'testing'
        })
      });

      setSuccess('Frontend code saved!');
      setStep(6);
    } catch (err) {
      setError('Failed to save frontend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 6: PUBLISH ====================
  const publishLogicPage = async () => {
    setLoading(true);
    try {
      await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      });

      setSuccess('Logic page published successfully!');
      setTimeout(() => {
        router.push('/admin/logic-pages');
      }, 2000);
    } catch (err) {
      setError('Failed to publish: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Logic Page</h1>
          <p className="text-gray-400">Build custom functionality with AI assistance</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {[
              { num: 1, label: 'Basic Info' },
              { num: 2, label: 'Inputs' },
              { num: 3, label: 'Backend' },
              { num: 4, label: 'Test' },
              { num: 5, label: 'Frontend' },
              { num: 6, label: 'Publish' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      step >= s.num
                        ? 'bg-primary text-white shadow-lg shadow-primary/50'
                        : 'bg-surface-neutral text-gray-500'
                    }`}
                  >
                    {s.num}
                  </div>
                  <div className="text-xs mt-2 text-gray-400">{s.label}</div>
                </div>
                {idx < 5 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      step > s.num ? 'bg-primary' : 'bg-surface-neutral'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">{error}</div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400 flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div className="flex-1">{success}</div>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">✕</button>
          </div>
        )}

        {/* STEP 1: BASIC INFO */}
        {step === 1 && (
          <div className="bg-surface-neutral border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">📝 Basic Information</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2 font-medium">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., Email Validator, Price Calculator, Data Transformer"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-white focus:border-primary outline-none"
                />
                <p className="text-sm text-gray-400 mt-1">A clear, descriptive title</p>
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Slug *</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">/api/logic/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="email-validator"
                    className="flex-1 px-4 py-3 bg-surface border border-border rounded-lg text-white font-mono focus:border-primary outline-none"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">URL-friendly identifier (lowercase, hyphens only)</p>
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this logic page does. Be detailed! Example: 'This page validates email addresses, checks for disposable domains, and verifies MX records. Users input an email and get a detailed validation report.'"
                  rows={6}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-white focus:border-primary outline-none"
                />
                <p className="text-sm text-gray-400 mt-1">
                  💡 The more detail you provide, the better AI can help build your logic
                </p>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <button
                  onClick={() => router.push('/admin/logic-pages')}
                  className="px-6 py-3 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStep1Submit}
                  disabled={loading || !title || !slug || !description}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  )}
                  Continue to Inputs →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIGURE INPUTS */}
        {step === 2 && (
          <div className="bg-surface-neutral border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">⚙️ Configure Inputs</h2>
            <p className="text-gray-400 mb-6">
              AI analyzed your description and suggested these inputs. Review and modify as needed.
            </p>

            {aiReasoning && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>AI Reasoning:</strong> {aiReasoning}
                </p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              {inputs.map((input, idx) => (
                <div key={idx} className="bg-surface border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm mb-1 font-medium">Field Name</label>
                      <input
                        type="text"
                        value={input.name}
                        onChange={(e) => updateInput(idx, 'name', e.target.value)}
                        placeholder="field_name"
                        className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm mb-1 font-medium">Label</label>
                      <input
                        type="text"
                        value={input.label}
                        onChange={(e) => updateInput(idx, 'label', e.target.value)}
                        placeholder="Field Label"
                        className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm mb-1 font-medium">Type</label>
                      <select
                        value={input.type}
                        onChange={(e) => updateInput(idx, 'type', e.target.value)}
                        className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="url">URL</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white text-sm mb-1 font-medium">Placeholder</label>
                      <input
                        type="text"
                        value={input.placeholder}
                        onChange={(e) => updateInput(idx, 'placeholder', e.target.value)}
                        placeholder="Enter placeholder..."
                        className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-white text-sm">
                        <input
                          type="checkbox"
                          checked={input.required}
                          onChange={(e) => updateInput(idx, 'required', e.target.checked)}
                          className="rounded"
                        />
                        Required field
                      </label>
                      <button
                        onClick={() => removeInput(idx)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {inputs.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <p className="text-gray-400 mb-4">No inputs yet. Add your first input field!</p>
                </div>
              )}
            </div>

            <button
              onClick={addInput}
              className="px-4 py-2 bg-surface border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors mb-6"
            >
              + Add Input Field
            </button>

            <div className="flex gap-4 pt-4 border-t border-border">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
              >
                ← Back
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={loading || inputs.length === 0}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                Continue to Backend →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BUILD BACKEND */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-6">
            {/* AI Chat Panel */}
            <div className="bg-surface-neutral border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">🤖 AI Assistant</h3>

              <div className="bg-surface border border-border rounded-lg p-4 h-96 overflow-y-auto mb-4">
                {backendChat.length === 0 && (
                  <div className="text-center text-gray-400 mt-20">
                    <p className="mb-2">👋 Hi! I'll help you build the backend function.</p>
                    <p className="text-sm">Ask me to generate the function or describe what it should do!</p>
                  </div>
                )}

                {backendChat.map((msg, idx) => (
                  <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block px-4 py-2 rounded-lg max-w-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-surface-hovered text-white'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={backendMessage}
                  onChange={(e) => setBackendMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && sendBackendMessage()}
                  placeholder="Ask AI to generate the backend function..."
                  className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-white"
                  disabled={loading}
                />
                <button
                  onClick={sendBackendMessage}
                  disabled={loading || !backendMessage.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {loading ? '...' : 'Send'}
                </button>
              </div>

              <div className="mt-4 text-sm text-gray-400">
                <p>💡 Try asking:</p>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• "Generate the backend function"</li>
                  <li>• "Add error handling"</li>
                  <li>• "Modify the validation logic"</li>
                </ul>
              </div>
            </div>

            {/* Code Editor Panel */}
            <div className="bg-surface-neutral border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">💻 Backend Function</h3>

              <textarea
                value={backendFunction}
                onChange={(e) => setBackendFunction(e.target.value)}
                placeholder="async function executeLogic(inputs) {
  // Your backend logic here
  // inputs contains: { field_name: value, ... }

  return {
    success: true,
    data: { result: 'your result' },
    message: 'Success message'
  };
}"
                rows={18}
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-white font-mono text-sm"
              />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
                >
                  ← Back
                </button>
                <button
                  onClick={saveBackendAndContinue}
                  disabled={loading || !backendFunction}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  Save & Continue to Testing →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: TEST FUNCTION */}
        {step === 4 && (
          <div className="bg-surface-neutral border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">🧪 Test Backend Function</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Test Inputs */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Test Inputs</h3>
                <div className="space-y-4">
                  {inputs.map((input, idx) => (
                    <div key={idx}>
                      <label className="block text-white text-sm mb-1">{input.label}</label>
                      <input
                        type={input.type === 'number' ? 'number' : 'text'}
                        value={testInputs[input.name] || ''}
                        onChange={(e) => setTestInputs({ ...testInputs, [input.name]: e.target.value })}
                        placeholder={input.placeholder}
                        className="w-full px-3 py-2 bg-surface border border-border rounded text-white"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={testBackendFunction}
                  disabled={loading}
                  className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  🧪 Run Test
                </button>
              </div>

              {/* Test Results */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Test Results</h3>

                {!testResult && !testError && (
                  <div className="text-center text-gray-400 py-12 border-2 border-dashed border-border rounded-lg">
                    <p>Run a test to see results</p>
                  </div>
                )}

                {testError && (
                  <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
                    <p className="text-red-400 font-mono text-sm whitespace-pre-wrap">{testError}</p>
                  </div>
                )}

                {testResult && (
                  <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg">
                    <p className="text-green-400 font-semibold mb-2">✅ Success!</p>
                    <pre className="text-white font-mono text-sm whitespace-pre-wrap bg-surface p-3 rounded overflow-x-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-border mt-6">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
              >
                ← Back to Backend
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Continue to Frontend →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: BUILD FRONTEND */}
        {step === 5 && (
          <div className="space-y-6">
            {/* AI Chat */}
            <div className="bg-surface-neutral border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">🤖 AI Frontend Builder</h3>

              <div className="bg-surface border border-border rounded-lg p-4 h-64 overflow-y-auto mb-4">
                {frontendChat.length === 0 && (
                  <div className="text-center text-gray-400 mt-16">
                    <p className="mb-2">👋 I'll help you build a beautiful frontend!</p>
                    <p className="text-sm">Ask me to generate the HTML, CSS, and JavaScript!</p>
                  </div>
                )}

                {frontendChat.map((msg, idx) => (
                  <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block px-4 py-2 rounded-lg max-w-3xl ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-surface-hovered text-white'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={frontendMessage}
                  onChange={(e) => setFrontendMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && sendFrontendMessage()}
                  placeholder="Ask AI to generate the frontend..."
                  className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-white"
                  disabled={loading}
                />
                <button
                  onClick={sendFrontendMessage}
                  disabled={loading || !frontendMessage.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {loading ? '...' : 'Send'}
                </button>
              </div>
            </div>

            {/* Code Editors */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-neutral border border-border rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2">HTML</h4>
                <textarea
                  value={frontendHtml}
                  onChange={(e) => setFrontendHtml(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-white font-mono text-xs"
                />
              </div>

              <div className="bg-surface-neutral border border-border rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2">CSS</h4>
                <textarea
                  value={frontendCss}
                  onChange={(e) => setFrontendCss(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-white font-mono text-xs"
                />
              </div>

              <div className="bg-surface-neutral border border-border rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2">JavaScript</h4>
                <textarea
                  value={frontendJs}
                  onChange={(e) => setFrontendJs(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(4)}
                className="px-6 py-3 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
              >
                ← Back
              </button>
              <button
                onClick={saveFrontendAndContinue}
                disabled={loading || !frontendHtml}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                Save & Preview →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: PREVIEW & PUBLISH */}
        {step === 6 && (
          <div className="bg-surface-neutral border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">🚀 Preview & Publish</h2>

            {/* Preview Mode Selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`px-4 py-2 rounded-lg ${previewMode === 'desktop' ? 'bg-primary text-white' : 'bg-surface text-gray-400'}`}
              >
                💻 Desktop
              </button>
              <button
                onClick={() => setPreviewMode('tablet')}
                className={`px-4 py-2 rounded-lg ${previewMode === 'tablet' ? 'bg-primary text-white' : 'bg-surface text-gray-400'}`}
              >
                📱 Tablet
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`px-4 py-2 rounded-lg ${previewMode === 'mobile' ? 'bg-primary text-white' : 'bg-surface text-gray-400'}`}
              >
                📱 Mobile
              </button>
            </div>

            {/* Preview */}
            <div className="bg-surface border border-border rounded-lg p-4 mb-6">
              <div
                className={`mx-auto bg-white transition-all ${
                  previewMode === 'mobile' ? 'max-w-sm' : previewMode === 'tablet' ? 'max-w-2xl' : 'max-w-full'
                }`}
                style={{ minHeight: '500px' }}
              >
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>${frontendCss}</style>
                      </head>
                      <body>
                        ${frontendHtml}
                        <script>${frontendJs}</script>
                      </body>
                    </html>
                  `}
                  className="w-full h-full border-0"
                  style={{ minHeight: '500px' }}
                  title="Preview"
                />
              </div>
            </div>

            {/* Publish Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
              <h3 className="text-white font-semibold mb-3">📍 Your Logic Page Will Be Available At:</h3>
              <div className="space-y-2">
                <p className="text-blue-300 font-mono">
                  <strong>Frontend:</strong> /logic/{slug}
                </p>
                <p className="text-blue-300 font-mono">
                  <strong>API Endpoint:</strong> {backendRoute}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(5)}
                className="px-6 py-3 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
              >
                ← Back to Frontend
              </button>
              <button
                onClick={publishLogicPage}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                🚀 Publish Logic Page
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
