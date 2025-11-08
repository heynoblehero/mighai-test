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

  // Step 2: AI Context Description
  const [description, setDescription] = useState('');

  // Step 3: AI Suggested Inputs
  const [inputs, setInputs] = useState([]);
  const [aiReasoning, setAiReasoning] = useState('');

  // Step 4: Backend Function
  const [backendFunction, setBackendFunction] = useState('');
  const [backendChat, setBackendChat] = useState([]);
  const [backendMessage, setBackendMessage] = useState('');
  const [backendRoute, setBackendRoute] = useState('');

  // Step 5: Frontend Code
  const [frontendHtml, setFrontendHtml] = useState('');
  const [frontendCss, setFrontendCss] = useState('');
  const [frontendJs, setFrontendJs] = useState('');
  const [frontendChat, setFrontendChat] = useState([]);
  const [frontendMessage, setFrontendMessage] = useState('');

  // Step 6: Result Page
  const [resultHtml, setResultHtml] = useState('');
  const [resultCss, setResultCss] = useState('');
  const [resultJs, setResultJs] = useState('');
  const [resultChat, setResultChat] = useState([]);
  const [resultMessage, setResultMessage] = useState('');

  // Step 7: Preview & Publish
  const [previewMode, setPreviewMode] = useState('desktop');
  const [testInputs, setTestInputs] = useState({});
  const [testResult, setTestResult] = useState(null);

  const [logicPageId, setLogicPageId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [backendChat, frontendChat, resultChat]);

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [title]);

  // Auto-generate backend route from slug
  useEffect(() => {
    if (slug) {
      setBackendRoute(`/api/logic/${slug}`);
    }
  }, [slug]);

  // ==================== STEP 1: Basic Info ====================
  const handleStep1Next = async () => {
    if (!title.trim() || !slug.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    setError('');
    setStep(2);
  };

  // ==================== STEP 2: AI Context Description ====================
  const handleStep2Next = async () => {
    if (!description.trim()) {
      setError('Please provide a detailed description for AI context');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Create the logic page first
      const createResponse = await fetch('/api/logic-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          description,
          status: 'draft'
        })
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Failed to create logic page');
      }

      setLogicPageId(createData.logic_page.id);
      setSuccess('Logic page created! Now getting AI input suggestions...');

      // Get AI input suggestions
      const suggestResponse = await fetch('/api/logic-pages/suggest-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const suggestData = await suggestResponse.json();

      if (!suggestResponse.ok) {
        throw new Error(suggestData.error || 'Failed to get AI suggestions');
      }

      setInputs(suggestData.inputs || []);
      setAiReasoning(suggestData.reasoning || '');
      setStep(3);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 3: Input Configuration ====================
  const handleInputChange = (index, field, value) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setInputs(newInputs);
  };

  const handleAddInput = () => {
    setInputs([...inputs, {
      input_name: '',
      input_label: '',
      input_type: 'text',
      input_placeholder: '',
      is_required: false
    }]);
  };

  const handleRemoveInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setInputs(newInputs);
  };

  const handleStep3Next = async () => {
    if (inputs.length === 0) {
      setError('Please add at least one input field');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Save inputs to logic page
      const response = await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs_json: inputs
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save inputs');
      }

      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 4: Backend Builder ====================
  const handleBackendChat = async () => {
    if (!backendMessage.trim()) return;

    setLoading(true);
    setError('');

    const userMessage = backendMessage;
    setBackendMessage('');

    const newChat = [...backendChat, { role: 'user', content: userMessage }];
    setBackendChat(newChat);

    try {
      const response = await fetch('/api/logic-pages/chat/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: backendChat,
          pageContext: {
            title,
            description,
            inputs,
            backend_route: backendRoute
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to chat with AI');
      }

      const assistantMessage = { role: 'assistant', content: data.message };
      setBackendChat([...newChat, assistantMessage]);

      // If AI provided code, update the backend function
      if (data.code) {
        setBackendFunction(data.code);
      }

    } catch (err) {
      setError(err.message);
      setBackendChat(newChat);
    } finally {
      setLoading(false);
    }
  };

  const handleStep4Next = async () => {
    if (!backendFunction.trim()) {
      setError('Please generate or write a backend function');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend_function: backendFunction,
          backend_chat_history: backendChat,
          status: 'building'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save backend function');
      }

      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test backend function
  const handleTestFunction = async () => {
    setLoading(true);
    setError('');
    setTestResult(null);

    try {
      const response = await fetch('/api/logic-pages/test-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function_code: backendFunction,
          test_inputs: testInputs
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setTestResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 5: Frontend Builder ====================
  const handleFrontendChat = async () => {
    if (!frontendMessage.trim()) return;

    setLoading(true);
    setError('');

    const userMessage = frontendMessage;
    setFrontendMessage('');

    const newChat = [...frontendChat, { role: 'user', content: userMessage }];
    setFrontendChat(newChat);

    try {
      const response = await fetch('/api/logic-pages/chat/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: frontendChat,
          pageContext: {
            title,
            description,
            inputs,
            backend_route: backendRoute,
            hasBackendFunction: !!backendFunction
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to chat with AI');
      }

      const assistantMessage = { role: 'assistant', content: data.message };
      setFrontendChat([...newChat, assistantMessage]);

      // If AI provided code, update the frontend
      if (data.code) {
        if (data.code.html) setFrontendHtml(data.code.html);
        if (data.code.css) setFrontendCss(data.code.css);
        if (data.code.js) setFrontendJs(data.code.js);
      }

    } catch (err) {
      setError(err.message);
      setFrontendChat(newChat);
    } finally {
      setLoading(false);
    }
  };

  const handleStep5Next = async () => {
    if (!frontendHtml.trim()) {
      setError('Please generate or write frontend HTML');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontend_html: frontendHtml,
          frontend_css: frontendCss,
          frontend_js: frontendJs,
          frontend_chat_history: frontendChat
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save frontend code');
      }

      setStep(6);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 6: Result Page Builder ====================
  const handleResultChat = async () => {
    if (!resultMessage.trim()) return;

    setLoading(true);
    setError('');

    const userMessage = resultMessage;
    setResultMessage('');

    const newChat = [...resultChat, { role: 'user', content: userMessage }];
    setResultChat(newChat);

    try {
      const response = await fetch('/api/logic-pages/chat/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: resultChat,
          pageContext: {
            title,
            description,
            hasBackendFunction: !!backendFunction,
            expectedOutput: 'Result will be in { success, data, message } format'
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to chat with AI');
      }

      const assistantMessage = { role: 'assistant', content: data.message };
      setResultChat([...newChat, assistantMessage]);

      // If AI provided code, update the result page
      if (data.code) {
        if (data.code.html) setResultHtml(data.code.html);
        if (data.code.css) setResultCss(data.code.css);
        if (data.code.js) setResultJs(data.code.js);
      }

    } catch (err) {
      setError(err.message);
      setResultChat(newChat);
    } finally {
      setLoading(false);
    }
  };

  const handleStep6Next = async () => {
    if (!resultHtml.trim()) {
      setError('Please generate or write result page HTML');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_page_html: resultHtml,
          result_page_css: resultCss,
          result_page_js: resultJs,
          result_chat_history: resultChat,
          status: 'testing'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save result page');
      }

      setStep(7);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STEP 7: Preview & Publish ====================
  const handlePublish = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      setSuccess('Logic page published successfully!');
      setTimeout(() => {
        router.push('/admin/logic-pages');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER ====================
  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Logic Page</h1>
          <p className="text-gray-600 mt-2">Build a complete logic page with AI assistance</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['Basic Info', 'Description', 'Inputs', 'Backend', 'Frontend', 'Result Page', 'Publish'].map((label, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step > index + 1 ? 'bg-green-500 text-white' :
                  step === index + 1 ? 'bg-blue-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <div className="ml-2 text-sm font-medium">{label}</div>
                {index < 6 && <div className="w-12 h-1 bg-gray-300 mx-2"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Step 1: Basic Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Email Validator"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Slug *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., email-validator"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    URL: /logic/{slug}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => router.push('/admin/logic-pages')}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStep1Next}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Description */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Step 2: Describe Your Logic Page</h2>
              <p className="text-gray-600 mb-6">
                Provide a detailed description of what this logic page should do. The AI will use this context to suggest input fields and help build your backend function.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe in detail what this logic page should do. For example:&#10;&#10;This page should validate email addresses. It should check if the email format is correct, verify the domain exists, and optionally check if it's a disposable email address. The user should input an email address and get back whether it's valid or not, along with details about why it might be invalid."
                />
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Get AI Suggestions'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Configure Inputs */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Step 3: Configure Input Fields</h2>

              {aiReasoning && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-semibold text-blue-900 mb-2">AI Reasoning:</h3>
                  <p className="text-blue-800 text-sm">{aiReasoning}</p>
                </div>
              )}

              <div className="space-y-4">
                {inputs.map((input, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field Name
                        </label>
                        <input
                          type="text"
                          value={input.input_name}
                          onChange={(e) => handleInputChange(index, 'input_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={input.input_label}
                          onChange={(e) => handleInputChange(index, 'input_label', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={input.input_type}
                          onChange={(e) => handleInputChange(index, 'input_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={input.input_placeholder || ''}
                          onChange={(e) => handleInputChange(index, 'input_placeholder', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={input.is_required}
                          onChange={(e) => handleInputChange(index, 'is_required', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                      <button
                        onClick={() => handleRemoveInput(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddInput}
                className="mt-4 px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
              >
                + Add Input Field
              </button>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep3Next}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Next: Build Backend'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Backend Builder */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Step 4: Build Backend Function</h2>

              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Route:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{backendRoute}</code>
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Method:</strong> POST
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Input Variables:</strong> {inputs.map(i => i.input_name).join(', ')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* AI Chat */}
                <div>
                  <h3 className="font-semibold mb-4">Chat with AI</h3>
                  <div className="border border-gray-300 rounded p-4 h-96 overflow-y-auto mb-4 bg-gray-50">
                    {backendChat.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        Start chatting with AI to design your backend function.
                        Example: "Create a function that validates an email address"
                      </p>
                    )}
                    {backendChat.map((msg, idx) => (
                      <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-3 rounded-lg ${
                          msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'
                        }`}>
                          <pre className="whitespace-pre-wrap text-sm">{msg.content}</pre>
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
                      onKeyPress={(e) => e.key === 'Enter' && handleBackendChat()}
                      placeholder="Ask AI to help build your function..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleBackendChat}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Code Editor */}
                <div>
                  <h3 className="font-semibold mb-4">Backend Function Code</h3>
                  <textarea
                    value={backendFunction}
                    onChange={(e) => setBackendFunction(e.target.value)}
                    rows={15}
                    className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm"
                    placeholder="async function executeLogic(inputs) { ... }"
                  />

                  {/* Test Panel */}
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Test Function</h4>
                    {inputs.map((input, idx) => (
                      <div key={idx} className="mb-2">
                        <label className="block text-sm text-gray-700">{input.input_label}</label>
                        <input
                          type={input.input_type}
                          onChange={(e) => setTestInputs({...testInputs, [input.input_name]: e.target.value})}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleTestFunction}
                      disabled={loading}
                      className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm disabled:opacity-50"
                    >
                      Run Test
                    </button>
                    {testResult && (
                      <div className="mt-3 p-3 bg-gray-100 rounded">
                        <pre className="text-xs">{JSON.stringify(testResult, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep4Next}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Next: Build Frontend'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Frontend Builder */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Step 5: Build Frontend Interface</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* AI Chat */}
                <div>
                  <h3 className="font-semibold mb-4">Chat with AI</h3>
                  <div className="border border-gray-300 rounded p-4 h-96 overflow-y-auto mb-4 bg-gray-50">
                    {frontendChat.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        Start chatting with AI to design your frontend.
                        Example: "Create a clean form with all input fields and a submit button"
                      </p>
                    )}
                    {frontendChat.map((msg, idx) => (
                      <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-3 rounded-lg ${
                          msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'
                        }`}>
                          <pre className="whitespace-pre-wrap text-sm">{msg.content}</pre>
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
                      onKeyPress={(e) => e.key === 'Enter' && handleFrontendChat()}
                      placeholder="Ask AI to help build your frontend..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleFrontendChat}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Code Editors */}
                <div>
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">HTML</h3>
                    <textarea
                      value={frontendHtml}
                      onChange={(e) => setFrontendHtml(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm"
                    />
                  </div>
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">CSS</h3>
                    <textarea
                      value={frontendCss}
                      onChange={(e) => setFrontendCss(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">JavaScript</h3>
                    <textarea
                      value={frontendJs}
                      onChange={(e) => setFrontendJs(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep5Next}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Next: Build Result Page'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Result Page Builder */}
          {step === 6 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Step 6: Build Result Page</h2>
              <p className="text-gray-600 mb-6">
                Design how the results should be displayed after the backend function executes.
              </p>

              <div className="grid grid-cols-2 gap-6">
                {/* AI Chat */}
                <div>
                  <h3 className="font-semibold mb-4">Chat with AI</h3>
                  <div className="border border-gray-300 rounded p-4 h-96 overflow-y-auto mb-4 bg-gray-50">
                    {resultChat.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        Start chatting with AI to design your result page.
                        Example: "Create a result page that shows success/error states and displays the data nicely"
                      </p>
                    )}
                    {resultChat.map((msg, idx) => (
                      <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-3 rounded-lg ${
                          msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'
                        }`}>
                          <pre className="whitespace-pre-wrap text-sm">{msg.content}</pre>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resultMessage}
                      onChange={(e) => setResultMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleResultChat()}
                      placeholder="Ask AI to help build your result page..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleResultChat}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Code Editors */}
                <div>
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">HTML</h3>
                    <textarea
                      value={resultHtml}
                      onChange={(e) => setResultHtml(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm"
                    />
                  </div>
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">CSS</h3>
                    <textarea
                      value={resultCss}
                      onChange={(e) => setResultCss(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">JavaScript</h3>
                    <textarea
                      value={resultJs}
                      onChange={(e) => setResultJs(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(5)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep6Next}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Next: Preview & Publish'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Preview & Publish */}
          {step === 7 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Step 7: Preview & Publish</h2>

              <div className="mb-6">
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-4 py-2 rounded ${previewMode === 'desktop' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode('tablet')}
                    className={`px-4 py-2 rounded ${previewMode === 'tablet' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Tablet
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-4 py-2 rounded ${previewMode === 'mobile' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Mobile
                  </button>
                </div>

                <div className={`border border-gray-300 rounded p-4 mx-auto ${
                  previewMode === 'mobile' ? 'max-w-sm' :
                  previewMode === 'tablet' ? 'max-w-2xl' :
                  'max-w-full'
                }`}>
                  <h3 className="font-semibold mb-4">Frontend Preview</h3>
                  <div className="border border-gray-200 rounded p-4 bg-white">
                    <style dangerouslySetInnerHTML={{ __html: frontendCss }} />
                    <div dangerouslySetInnerHTML={{ __html: frontendHtml }} />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded border border-gray-200">
                <h3 className="font-semibold mb-4">Summary</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Title:</strong> {title}</p>
                  <p><strong>Slug:</strong> {slug}</p>
                  <p><strong>Route:</strong> {backendRoute}</p>
                  <p><strong>Input Fields:</strong> {inputs.length}</p>
                  <p><strong>Backend Function:</strong> {backendFunction ? '✓ Configured' : '✗ Missing'}</p>
                  <p><strong>Frontend:</strong> {frontendHtml ? '✓ Configured' : '✗ Missing'}</p>
                  <p><strong>Result Page:</strong> {resultHtml ? '✓ Configured' : '✗ Missing'}</p>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(6)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Publishing...' : 'Publish Logic Page'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
