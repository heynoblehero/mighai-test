import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function LogicPagesNew() {
  // Main navigation states
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'create', 'edit', 'view'
  const [currentStep, setCurrentStep] = useState('basic-info'); // 'basic-info', 'ai-suggestions', 'input-config', 'backend-build', 'frontend-build', 'result-config'

  // Logic pages data
  const [logicPages, setLogicPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);

  // Creation/editing states
  const [pageData, setPageData] = useState({
    name: '',
    slug: '',
    description: '',
    access_level: 'public'
  });

  // AI suggested inputs
  const [suggestedInputs, setSuggestedInputs] = useState([]);
  const [finalInputs, setFinalInputs] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Backend building states
  const [backendCode, setBackendCode] = useState('');
  const [backendChatMessages, setBackendChatMessages] = useState([]);
  const [backendChatInput, setBackendChatInput] = useState('');
  const [backendChatLoading, setBackendChatLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testInputValues, setTestInputValues] = useState({});
  const [packageInstallStatus, setPackageInstallStatus] = useState(null);
  const [autoTestResults, setAutoTestResults] = useState(null);
  const [autoTestLoading, setAutoTestLoading] = useState(false);
  const [suggestedTestCases, setSuggestedTestCases] = useState([]);

  // Frontend building states
  const [frontendCode, setFrontendCode] = useState('');
  const [frontendChatMessages, setFrontendChatMessages] = useState([]);
  const [frontendChatInput, setFrontendChatInput] = useState('');
  const [frontendChatLoading, setFrontendChatLoading] = useState(false);
  const [frontendView, setFrontendView] = useState('code'); // 'code' or 'preview'
  const [codeJustUpdated, setCodeJustUpdated] = useState(false);

  // Result configuration
  const [resultConfig, setResultConfig] = useState({
    displayType: 'text',
    allowDownload: true,
    showMetadata: false
  });

  // Load existing logic pages
  useEffect(() => {
    fetchLogicPages();
  }, []);

  const fetchLogicPages = async () => {
    try {
      setLoadingPages(true);
      const response = await fetch('/api/admin/logic-pages');
      const data = await response.json();
      setLogicPages(data.pages || []);
    } catch (error) {
      console.error('Error fetching logic pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  // Step 1: Basic Info Form
  const handleBasicInfoSubmit = async () => {
    if (!pageData.name || !pageData.slug || !pageData.description) {
      alert('Please fill in all required fields');
      return;
    }

    setLoadingSuggestions(true);

    try {
      const response = await fetch('/api/admin/logic-pages/suggest-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pageData.name,
          description: pageData.description
        })
      });

      const data = await response.json();
      setSuggestedInputs(data.inputs || []);
      setFinalInputs(data.inputs || []);
      setCurrentStep('ai-suggestions');
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      alert('Error getting input suggestions. Please try again.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Step 2: Configure inputs based on AI suggestions
  const handleInputConfigNext = () => {
    if (finalInputs.length === 0) {
      alert('Please configure at least one input field');
      return;
    }
    setCurrentStep('backend-build');

    // Initialize backend chat with context
    setBackendChatMessages([{
      role: 'assistant',
      content: `Let's build the backend function for "${pageData.name}". This function will receive the following inputs: ${finalInputs.map(input => `${input.name} (${input.type})`).join(', ')}.

The function should be designed to handle these inputs and return a result based on your page description: "${pageData.description}".

What would you like this function to do with these inputs?`
    }]);
  };

  // Backend chat functionality
  const sendBackendMessage = async () => {
    if (!backendChatInput.trim()) return;

    const userMessage = { role: 'user', content: backendChatInput };
    setBackendChatMessages(prev => [...prev, userMessage]);
    setBackendChatInput('');
    setBackendChatLoading(true);

    try {
      const response = await fetch('/api/admin/logic-pages/chat-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...backendChatMessages, userMessage],
          pageData,
          inputs: finalInputs
        })
      });

      const data = await response.json();
      setBackendChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

      if (data.code) {
        setBackendCode(data.code);
        // Automatically install packages and run auto-tests when code is generated
        await installPackagesAndAutoTest(data.code);
      }
    } catch (error) {
      console.error('Error in backend chat:', error);
    } finally {
      setBackendChatLoading(false);
    }
  };

  // Install packages and run auto-tests
  const installPackagesAndAutoTest = async (code) => {
    setAutoTestLoading(true);
    setPackageInstallStatus({ status: 'installing', message: 'Detecting and installing required packages...' });

    try {
      // Step 1: Install packages
      const installResponse = await fetch('/api/admin/logic-pages/install-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const installResult = await installResponse.json();
      setPackageInstallStatus({
        status: installResult.success ? 'success' : 'error',
        ...installResult
      });

      if (!installResult.success) {
        setAutoTestLoading(false);
        return;
      }

      // Step 2: Get AI-suggested test cases
      const testCasesResponse = await fetch('/api/admin/logic-pages/suggest-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          pageData,
          inputs: finalInputs
        })
      });

      const testCasesData = await testCasesResponse.json();
      setSuggestedTestCases(testCasesData.testCases || []);

      // Step 3: Run auto-tests with suggested test cases
      const autoTestResults = [];
      for (const testCase of (testCasesData.testCases || [])) {
        const testResponse = await fetch('/api/admin/logic-pages/test-backend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            testData: testCase.inputs,
            inputs: finalInputs
          })
        });

        const testResult = await testResponse.json();
        autoTestResults.push({
          testCase,
          result: testResult
        });
      }

      setAutoTestResults(autoTestResults);

    } catch (error) {
      console.error('Error in auto-test:', error);
      setPackageInstallStatus({
        status: 'error',
        message: 'Failed to run auto-tests: ' + error.message
      });
    } finally {
      setAutoTestLoading(false);
    }
  };

  // Initialize test input values with defaults
  useEffect(() => {
    if (finalInputs.length > 0) {
      const defaultValues = {};
      finalInputs.forEach(input => {
        switch (input.type) {
          case 'text':
          case 'textarea':
            defaultValues[input.name] = input.placeholder || '';
            break;
          case 'number':
            defaultValues[input.name] = input.placeholder || 0;
            break;
          case 'email':
            defaultValues[input.name] = 'test@example.com';
            break;
          case 'checkbox':
            defaultValues[input.name] = false;
            break;
          case 'select':
            defaultValues[input.name] = '';
            break;
          default:
            defaultValues[input.name] = '';
        }
      });
      setTestInputValues(defaultValues);
    }
  }, [finalInputs]);

  // Test backend function
  const testBackendFunction = async () => {
    if (!backendCode) {
      alert('No backend code to test');
      return;
    }

    setTestLoading(true);

    try {
      const response = await fetch('/api/admin/logic-pages/test-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: backendCode,
          testData: testInputValues,
          inputs: finalInputs
        })
      });

      const result = await response.json();
      setTestResults(result);
    } catch (error) {
      console.error('Error testing backend:', error);
      setTestResults({ error: 'Test failed: ' + error.message });
    } finally {
      setTestLoading(false);
    }
  };

  // Move to frontend building
  const handleBackendNext = () => {
    if (!backendCode) {
      alert('Please generate backend code first');
      return;
    }

    setCurrentStep('frontend-build');
    setFrontendView('preview'); // Start with preview view
    setFrontendChatMessages([{
      role: 'assistant',
      content: `🎨 Let's design the frontend for "${pageData.name}"!

Just describe what you want and I'll build it for you. For example:
• "Make it modern with a gradient background"
• "Add a card layout with shadows"
• "Use larger buttons with icons"

Your backend is ready with these inputs: ${finalInputs.map(input => input.label).join(', ')}.

What would you like to change or add?`
    }]);
  };

  // Frontend chat functionality (Lovable-style: auto-apply changes)
  const sendFrontendMessage = async () => {
    if (!frontendChatInput.trim()) return;

    const userMessage = { role: 'user', content: frontendChatInput };
    setFrontendChatMessages(prev => [...prev, userMessage]);
    setFrontendChatInput('');
    setFrontendChatLoading(true);

    try {
      const response = await fetch('/api/admin/logic-pages/chat-frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...frontendChatMessages, userMessage],
          pageData,
          inputs: finalInputs,
          backendRoute: `/api/logic-pages/${pageData.slug}/execute`
        })
      });

      const data = await response.json();

      // Check if response was successful
      if (!data || !data.success) {
        setFrontendChatMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error: ' + (data?.error || 'Unknown error')
        }]);
        setFrontendChatLoading(false);
        return;
      }

      // Extract code blocks from response
      const codeBlockRegex = /```(?:jsx|js|javascript|tsx|ts)?\n([\s\S]*?)\n```/g;
      let cleanResponse = data.response || '';
      let extractedCode = null;

      // Remove code blocks from the message and extract code
      const codeMatch = data.response ? data.response.match(codeBlockRegex) : null;
      if (codeMatch && codeMatch.length > 0) {
        // Remove all code blocks from the response
        cleanResponse = data.response.replace(codeBlockRegex, '').trim();

        // Use the extracted code from the API or extract it ourselves
        extractedCode = data.code || codeMatch[0].replace(/```(?:jsx|js|javascript|tsx|ts)?\n/, '').replace(/\n```$/, '');
      }

      // Add clean message (without code) to chat
      const aiMessage = cleanResponse || 'I\'ve updated the frontend code. Check the preview!';
      setFrontendChatMessages(prev => [...prev, {
        role: 'assistant',
        content: aiMessage
      }]);

      // Auto-apply code changes
      if (extractedCode || data.code) {
        const newCode = extractedCode || data.code;
        setFrontendCode(newCode);
        setCodeJustUpdated(true);

        // Auto-switch to preview to show the changes
        setTimeout(() => {
          setFrontendView('preview');
          // Reset update indicator after animation
          setTimeout(() => setCodeJustUpdated(false), 2000);
        }, 300);
      }
    } catch (error) {
      console.error('Error in frontend chat:', error);
      setFrontendChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setFrontendChatLoading(false);
    }
  };

  // Save the complete logic page
  const saveLogicPage = async () => {
    try {
      const response = await fetch('/api/admin/logic-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pageData,
          inputs: finalInputs,
          backend_config: {
            code: backendCode,
            route: `/api/logic-pages/${pageData.slug}/execute`
          },
          frontend_config: {
            code: frontendCode
          },
          result_config: resultConfig
        })
      });

      if (response.ok) {
        alert('Logic page saved successfully!');
        setCurrentView('dashboard');
        fetchLogicPages();
        resetForm();
      } else {
        const error = await response.json();
        alert('Error saving logic page: ' + error.message);
      }
    } catch (error) {
      console.error('Error saving logic page:', error);
      alert('Error saving logic page');
    }
  };

  const resetForm = () => {
    setPageData({ name: '', slug: '', description: '', access_level: 'public' });
    setSuggestedInputs([]);
    setFinalInputs([]);
    setBackendCode('');
    setFrontendCode('');
    setBackendChatMessages([]);
    setFrontendChatMessages([]);
    setTestResults(null);
    setCurrentStep('basic-info');
  };

  const startNewPage = () => {
    resetForm();
    setCurrentView('create');
  };

  const editPage = (page) => {
    setSelectedPage(page);
    setPageData({
      name: page.name,
      slug: page.slug,
      description: page.description,
      access_level: page.access_level
    });
    // TODO: Load existing configurations
    setCurrentView('edit');
  };

  const deletePage = async (pageId) => {
    if (!confirm('Are you sure you want to delete this logic page?')) return;

    try {
      const response = await fetch(`/api/admin/logic-pages/${pageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchLogicPages();
      } else {
        alert('Error deleting page');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Error deleting page');
    }
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (pageData.name && !pageData.slug) {
      const slug = pageData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setPageData(prev => ({ ...prev, slug }));
    }
  }, [pageData.name]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Logic Pages</h1>
            <p className="text-slate-400 mt-2">Build interactive logic-driven pages with AI assistance</p>
          </div>

          {currentView === 'dashboard' && (
            <button
              onClick={startNewPage}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create New Logic Page
            </button>
          )}

          {currentView !== 'dashboard' && (
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-xl">
                <h3 className="text-lg font-semibold text-slate-200">Total Pages</h3>
                <p className="text-3xl font-bold text-blue-400 mt-2">{logicPages.length}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-xl">
                <h3 className="text-lg font-semibold text-slate-200">Active Pages</h3>
                <p className="text-3xl font-bold text-emerald-400 mt-2">
                  {logicPages.filter(p => p.is_active).length}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-xl">
                <h3 className="text-lg font-semibold text-slate-200">Public Pages</h3>
                <p className="text-3xl font-bold text-purple-400 mt-2">
                  {logicPages.filter(p => p.access_level === 'public').length}
                </p>
              </div>
            </div>

            {/* Pages List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-200">Your Logic Pages</h3>
              </div>

              {loadingPages ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  <p className="mt-2 text-slate-400">Loading pages...</p>
                </div>
              ) : logicPages.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-400">No logic pages yet. Create your first one!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {logicPages.map((page) => (
                    <div key={page.id} className="p-6 hover:bg-slate-700/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-semibold text-slate-100">{page.name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              page.is_active
                                ? 'bg-emerald-900/30 border border-emerald-600/30 text-emerald-300'
                                : 'bg-slate-700 border border-slate-600 text-slate-400'
                            }`}>
                              {page.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              page.access_level === 'public'
                                ? 'bg-blue-900/30 border border-blue-600/30 text-blue-300'
                                : 'bg-purple-900/30 border border-purple-600/30 text-purple-300'
                            }`}>
                              {page.access_level}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-1">{page.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                            <span>Slug: /{page.slug}</span>
                            <span>Created: {new Date(page.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => window.open(`/logic-page/${page.slug}`, '_blank')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => editPage(page)}
                            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePage(page.id)}
                            className="bg-red-600 hover:bg-red-700 transition-colors text-white px-3 py-1 rounded text-sm transition-colors"
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
          </div>
        )}

        {/* Creation/Edit View */}
        {(currentView === 'create' || currentView === 'edit') && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
            {/* Progress Steps */}
            <div className="px-6 py-4 border-b border-slate-700">
              <div className="flex items-center space-x-4">
                {['basic-info', 'ai-suggestions', 'input-config', 'backend-build', 'frontend-build', 'result-config'].map((step, index) => {
                  const stepNames = {
                    'basic-info': 'Basic Info',
                    'ai-suggestions': 'AI Suggestions',
                    'input-config': 'Configure Inputs',
                    'backend-build': 'Build Backend',
                    'frontend-build': 'Build Frontend',
                    'result-config': 'Configure Results'
                  };

                  const isActive = currentStep === step;
                  const isCompleted = ['basic-info', 'ai-suggestions', 'input-config', 'backend-build', 'frontend-build'].indexOf(currentStep) >
                                     ['basic-info', 'ai-suggestions', 'input-config', 'backend-build', 'frontend-build'].indexOf(step);

                  return (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isActive ? 'bg-blue-600 text-white' :
                        isCompleted ? 'bg-emerald-600 text-white' :
                        'bg-slate-600 text-slate-400'
                      }`}>
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span className={`ml-2 text-sm ${isActive ? 'font-semibold text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {stepNames[step]}
                      </span>
                      {index < 5 && <div className={`w-8 h-px mx-2 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6">
              {/* Step 1: Basic Info */}
              {currentStep === 'basic-info' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-slate-200">Basic Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Page Title *
                      </label>
                      <input
                        type="text"
                        value={pageData.name}
                        onChange={(e) => setPageData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        placeholder="e.g., Password Generator"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Page Slug *
                      </label>
                      <input
                        type="text"
                        value={pageData.slug}
                        onChange={(e) => setPageData(prev => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        placeholder="password-generator"
                      />
                      <p className="text-xs text-slate-400 mt-1">Will be accessible at: /logic-page/{pageData.slug}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={pageData.description}
                      onChange={(e) => setPageData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="Describe what this logic page will do in detail. This helps AI suggest appropriate inputs and build the backend function."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Access Level
                    </label>
                    <select
                      value={pageData.access_level}
                      onChange={(e) => setPageData(prev => ({ ...prev, access_level: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="public">Public</option>
                      <option value="subscriber">Subscribers Only</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleBasicInfoSubmit}
                      disabled={loadingSuggestions}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      {loadingSuggestions ? 'Getting AI Suggestions...' : 'Next: Get AI Suggestions'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: AI Suggestions */}
              {currentStep === 'ai-suggestions' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-slate-200">AI Suggested Inputs</h3>
                  <p className="text-slate-400">Based on your description, here are the suggested input fields:</p>

                  {suggestedInputs.length > 0 && (
                    <div className="space-y-4">
                      {suggestedInputs.map((input, index) => (
                        <div key={index} className="border border-blue-600/30 rounded-lg p-4 bg-blue-900/20">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-100">{input.name}</h4>
                              <p className="text-sm text-slate-400 mt-1">{input.description}</p>
                              <div className="flex items-center space-x-4 mt-2 text-sm">
                                <span className="text-blue-400">Type: {input.type}</span>
                                {input.required && <span className="text-red-400">Required</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep('basic-info')}
                      className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleInputConfigNext}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Accept & Configure Inputs
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Input Configuration */}
              {currentStep === 'input-config' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Configure Input Fields</h3>
                  <p className="text-slate-400">Review and modify the input fields as needed:</p>

                  <div className="space-y-4">
                    {finalInputs.map((input, index) => (
                      <div key={index} className="border border-slate-600 rounded-lg p-4 bg-slate-700/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Field Name
                            </label>
                            <input
                              type="text"
                              value={input.name}
                              onChange={(e) => {
                                const updated = [...finalInputs];
                                updated[index].name = e.target.value;
                                setFinalInputs(updated);
                              }}
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Type
                            </label>
                            <select
                              value={input.type}
                              onChange={(e) => {
                                const updated = [...finalInputs];
                                updated[index].type = e.target.value;
                                setFinalInputs(updated);
                              }}
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="number">Number</option>
                              <option value="email">Email</option>
                              <option value="select">Select</option>
                              <option value="checkbox">Checkbox</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => {
                                const updated = finalInputs.filter((_, i) => i !== index);
                                setFinalInputs(updated);
                              }}
                              className="bg-red-600 hover:bg-red-700 transition-colors text-white px-3 py-2 rounded text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={input.description}
                            onChange={(e) => {
                              const updated = [...finalInputs];
                              updated[index].description = e.target.value;
                              setFinalInputs(updated);
                            }}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep('ai-suggestions')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep('backend-build')}
                      className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Next: Build Backend
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Backend Building */}
              {currentStep === 'backend-build' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Build Backend Function</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chat Interface */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Chat with AI to Design Function</h4>

                      <div className="bg-slate-700/30 border border-slate-600 rounded-lg h-64 overflow-y-auto p-4 space-y-3">
                        {backendChatMessages.map((msg, index) => (
                          <div key={index} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block p-3 rounded-lg max-w-xs ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 border border-slate-600'
                            }`}>
                              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                            </div>
                          </div>
                        ))}
                        {backendChatLoading && (
                          <div className="text-left">
                            <div className="inline-block p-3 rounded-lg bg-slate-700 border border-slate-600">
                              <div className="animate-pulse">AI is thinking...</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={backendChatInput}
                          onChange={(e) => setBackendChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendBackendMessage()}
                          placeholder="Describe what the function should do..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={sendBackendMessage}
                          disabled={backendChatLoading}
                          className="bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-blue-400 text-white px-4 py-2 rounded"
                        >
                          Send
                        </button>
                      </div>
                    </div>

                    {/* Generated Code */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Generated Function Code</h4>
                        <button
                          onClick={testBackendFunction}
                          disabled={!backendCode || testLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:bg-green-400 text-white px-3 py-1 rounded text-sm"
                        >
                          {testLoading ? 'Testing...' : 'Test Function'}
                        </button>
                      </div>

                      <textarea
                        value={backendCode}
                        onChange={(e) => setBackendCode(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Backend function code will appear here..."
                      />
                    </div>
                  </div>

                  {/* Package Installation & Auto-Test Status */}
                  {backendCode && (autoTestLoading || packageInstallStatus || autoTestResults) && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold mb-3">🔧 Auto-Testing & Validation</h4>

                      {/* Package Installation Status */}
                      {packageInstallStatus && (
                        <div className={`p-3 rounded mb-3 ${
                          packageInstallStatus.status === 'success' ? 'bg-green-100 text-green-800' :
                          packageInstallStatus.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          <div className="font-medium">
                            {packageInstallStatus.status === 'installing' && '⏳ Installing packages...'}
                            {packageInstallStatus.status === 'success' && '✅ Packages ready'}
                            {packageInstallStatus.status === 'error' && '❌ Package installation failed'}
                          </div>
                          {packageInstallStatus.packages && packageInstallStatus.packages.length > 0 && (
                            <div className="text-sm mt-1">
                              Packages: {packageInstallStatus.packages.join(', ')}
                            </div>
                          )}
                          {packageInstallStatus.newlyInstalled && packageInstallStatus.newlyInstalled.length > 0 && (
                            <div className="text-sm mt-1">
                              ✨ Newly installed: {packageInstallStatus.newlyInstalled.join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Auto-Test Results */}
                      {autoTestLoading && (
                        <div className="p-3 bg-blue-100 text-blue-800 rounded mb-3">
                          ⏳ Running automated tests...
                        </div>
                      )}

                      {autoTestResults && autoTestResults.length > 0 && (
                        <div className="space-y-2">
                          <div className="font-medium text-slate-300">AI-Suggested Test Results:</div>
                          {autoTestResults.map((test, idx) => (
                            <div key={idx} className={`p-3 rounded border ${
                              test.result.success && test.result.result?.success
                                ? 'bg-green-50 border-green-300'
                                : 'bg-red-50 border-red-300'
                            }`}>
                              <div className="font-medium text-sm mb-1">
                                {test.result.success && test.result.result?.success ? '✅' : '❌'} {test.testCase.name}
                              </div>
                              <div className="text-xs text-slate-400 mb-2">{test.testCase.description}</div>
                              <details className="text-xs">
                                <summary className="cursor-pointer font-medium">View Details</summary>
                                <pre className="mt-2 p-2 bg-slate-700 rounded overflow-x-auto">
                                  {JSON.stringify(test.result.result || test.result, null, 2)}
                                </pre>
                              </details>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test Input Form - Like Postman */}
                  {backendCode && !autoTestLoading && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-semibold mb-3">Test Inputs (Postman-style)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {finalInputs.map((input, index) => (
                          <div key={index}>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              {input.label || input.name}
                              {input.required && <span className="text-red-500">*</span>}
                            </label>
                            {input.type === 'textarea' ? (
                              <textarea
                                value={testInputValues[input.name] || ''}
                                onChange={(e) => setTestInputValues(prev => ({ ...prev, [input.name]: e.target.value }))}
                                placeholder={input.placeholder || input.description}
                                rows={3}
                                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                              />
                            ) : input.type === 'checkbox' ? (
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={testInputValues[input.name] || false}
                                  onChange={(e) => setTestInputValues(prev => ({ ...prev, [input.name]: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-400">{input.description}</span>
                              </label>
                            ) : input.type === 'select' ? (
                              <select
                                value={testInputValues[input.name] || ''}
                                onChange={(e) => setTestInputValues(prev => ({ ...prev, [input.name]: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                              >
                                <option value="">Select...</option>
                                {input.options && input.options.map((opt, i) => (
                                  <option key={i} value={typeof opt === 'object' ? opt.value : opt}>
                                    {typeof opt === 'object' ? opt.label : opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={input.type}
                                value={testInputValues[input.name] || ''}
                                onChange={(e) => setTestInputValues(prev => ({
                                  ...prev,
                                  [input.name]: input.type === 'number' ? Number(e.target.value) : e.target.value
                                }))}
                                placeholder={input.placeholder || input.description}
                                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={testBackendFunction}
                        disabled={testLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:bg-green-400 text-white px-4 py-2 rounded font-medium"
                      >
                        {testLoading ? 'Testing...' : '▶ Run Test'}
                      </button>

                      {testResults && (
                        <div className="border rounded-lg p-3 bg-slate-700 mt-4">
                          <h5 className="font-medium mb-2">Test Results:</h5>
                          <pre className="text-sm text-slate-300 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(testResults, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep('input-config')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleBackendNext}
                      className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Next: Build Frontend
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Frontend Building */}
              {currentStep === 'frontend-build' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Build Frontend Interface</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chat Interface */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Chat with AI to Design UI</h4>

                      <div className="bg-slate-700/30 border border-slate-600 rounded-lg h-64 overflow-y-auto p-4 space-y-3">
                        {frontendChatMessages.map((msg, index) => (
                          <div key={index} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block p-3 rounded-lg max-w-xs ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 border border-slate-600'
                            }`}>
                              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                            </div>
                          </div>
                        ))}
                        {frontendChatLoading && (
                          <div className="text-left">
                            <div className="inline-block p-3 rounded-lg bg-slate-700 border border-slate-600">
                              <div className="animate-pulse">AI is thinking...</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={frontendChatInput}
                          onChange={(e) => setFrontendChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendFrontendMessage()}
                          placeholder="Describe how the UI should look..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={sendFrontendMessage}
                          disabled={frontendChatLoading}
                          className="bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-blue-400 text-white px-4 py-2 rounded"
                        >
                          Send
                        </button>
                      </div>
                    </div>

                    {/* Generated Code with Code/Preview Toggle */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Generated Frontend</h4>
                        {frontendCode && (
                          <div className="flex bg-slate-600 rounded-lg p-1">
                            <button
                              onClick={() => setFrontendView('code')}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                frontendView === 'code'
                                  ? 'bg-slate-700 text-blue-600 shadow'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              📝 Code
                            </button>
                            <button
                              onClick={() => setFrontendView('preview')}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                frontendView === 'preview'
                                  ? 'bg-slate-700 text-blue-600 shadow'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              👁️ Preview
                            </button>
                          </div>
                        )}
                      </div>

                      {frontendView === 'code' ? (
                        <textarea
                          value={frontendCode}
                          onChange={(e) => setFrontendCode(e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Frontend React component code will appear here..."
                        />
                      ) : (
                        <div className={`border rounded-lg p-4 bg-slate-700 h-96 overflow-y-auto transition-all ${
                          codeJustUpdated ? 'ring-4 ring-green-400 ring-opacity-50' : ''
                        }`}>
                          {codeJustUpdated && (
                            <div className="bg-green-50 border border-green-300 rounded p-2 text-sm text-green-700 mb-2 animate-pulse">
                              ✨ Preview updated!
                            </div>
                          )}
                          {frontendCode ? (
                            <div className="space-y-2">
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                <strong>💡 Live Preview:</strong> This shows how your component will render with the inputs you defined.
                              </div>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold text-slate-200">{pageData.name}</h3>
                                  <p className="text-sm text-slate-400">{pageData.description}</p>

                                  {/* Simulated Form Fields */}
                                  <div className="space-y-3">
                                    {finalInputs.map((input, idx) => (
                                      <div key={idx}>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                          {input.label || input.name}
                                          {input.required && <span className="text-red-500">*</span>}
                                        </label>
                                        {input.type === 'textarea' ? (
                                          <textarea
                                            placeholder={input.placeholder || input.description}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                                            disabled
                                          />
                                        ) : input.type === 'checkbox' ? (
                                          <label className="flex items-center space-x-2">
                                            <input
                                              type="checkbox"
                                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                              disabled
                                            />
                                            <span className="text-sm text-slate-400">{input.description}</span>
                                          </label>
                                        ) : (
                                          <input
                                            type={input.type}
                                            placeholder={input.placeholder || input.description}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                                            disabled
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  <button className="w-full bg-blue-600 text-white px-4 py-2 rounded font-medium" disabled>
                                    Submit
                                  </button>

                                  <div className="bg-gray-50 border rounded p-3 text-sm text-slate-400">
                                    <strong>Result will appear here...</strong>
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-slate-400 text-center mt-2">
                                This is a static preview. The actual component will be fully interactive.
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                              Generate frontend code to see preview
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep('backend-build')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep('result-config')}
                      className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Next: Configure Results
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Result Configuration */}
              {currentStep === 'result-config' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Configure Result Display</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Result Display Type
                      </label>
                      <select
                        value={resultConfig.displayType}
                        onChange={(e) => setResultConfig(prev => ({ ...prev, displayType: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="text">Plain Text</option>
                        <option value="formatted">Formatted Text</option>
                        <option value="json">JSON</option>
                        <option value="table">Table</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={resultConfig.allowDownload}
                          onChange={(e) => setResultConfig(prev => ({ ...prev, allowDownload: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-slate-300">Allow result download</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={resultConfig.showMetadata}
                          onChange={(e) => setResultConfig(prev => ({ ...prev, showMetadata: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-slate-300">Show processing metadata</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep('frontend-build')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={saveLogicPage}
                      className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Save Logic Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}