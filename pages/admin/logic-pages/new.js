import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function NewLogicPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: AI Suggested Inputs
  const [suggestedInputs, setSuggestedInputs] = useState([]);
  const [inputs, setInputs] = useState([]);

  // Step 3: Backend Function
  const [backendFunction, setBackendFunction] = useState('');
  const [backendChat, setBackendChat] = useState([]);

  // Step 4: Frontend Code
  const [frontendHtml, setFrontendHtml] = useState('');
  const [frontendCss, setFrontendCss] = useState('');
  const [frontendJs, setFrontendJs] = useState('');
  const [frontendChat, setFrontendChat] = useState([]);

  const [logicPageId, setLogicPageId] = useState(null);
  const [error, setError] = useState('');

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

  // Step 1: Create Logic Page & Get AI Input Suggestions
  const handleStep1Submit = async () => {
    if (!title || !slug || !description) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

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

      // Get AI suggestions for inputs
      const suggestRes = await fetch('/api/logic-pages/suggest-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, description })
      });

      const suggestData = await suggestRes.json();
      if (suggestData.success && suggestData.suggestions?.inputs) {
        setSuggestedInputs(suggestData.suggestions.inputs);
        setInputs(suggestData.suggestions.inputs);
      }

      setStep(2);
    } catch (err) {
      setError('Failed to create logic page: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Save Inputs & Move to Backend Builder
  const handleStep2Submit = async () => {
    setLoading(true);
    setError('');

    try {
      // Update logic page with inputs
      await fetch(`/api/logic-pages/${logicPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs_json: inputs,
          status: 'building'
        })
      });

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

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Logic Page</h1>
          <p className="text-gray-400">Build custom functionality with AI assistance</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[
              { num: 1, label: 'Basic Info' },
              { num: 2, label: 'Configure Inputs' },
              { num: 3, label: 'Build Backend' },
              { num: 4, label: 'Build Frontend' },
              { num: 5, label: 'Publish' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step >= s.num
                        ? 'bg-primary text-white'
                        : 'bg-surface-neutral text-gray-500'
                    }`}
                  >
                    {s.num}
                  </div>
                  <div className="text-xs mt-2 text-gray-400">{s.label}</div>
                </div>
                {idx < 4 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      step > s.num ? 'bg-primary' : 'bg-surface-neutral'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-surface-neutral border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Step 1: Basic Information</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2 font-medium">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., Email Validator"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-white"
                />
                <p className="text-sm text-gray-400 mt-1">A clear, descriptive title for your logic page</p>
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="email-validator"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-white font-mono"
                />
                <p className="text-sm text-gray-400 mt-1">
                  URL-friendly identifier (lowercase, hyphens only). Your route will be: <span className="text-primary">/api/logic/{slug}</span>
                </p>
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this logic page does in detail. The more context you provide, the better AI can help you build it."
                  rows={6}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-white"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Detailed description of what this page will do. AI will use this to suggest inputs and help build your logic.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
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
                  Continue to Inputs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configure Inputs */}
        {step === 2 && (
          <div className="bg-surface-neutral border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Step 2: Configure Inputs</h2>
            <p className="text-gray-400 mb-6">AI suggested these inputs based on your description. You can modify, add, or remove them.</p>

            <div className="space-y-4 mb-6">
              {inputs.map((input, idx) => (
                <div key={idx} className="bg-surface border border-border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm mb-1">Field Name</label>
                      <input
                        type="text"
                        value={input.name}
                        onChange={(e) => updateInput(idx, 'name', e.target.value)}
                        placeholder="field_name"
                        className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm mb-1">Label</label>
                      <input
                        type="text"
                        value={input.label}
                        onChange={(e) => updateInput(idx, 'label', e.target.value)}
                        placeholder="Field Label"
                        className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm mb-1">Type</label>
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
                      <label className="block text-white text-sm mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={input.placeholder}
                        onChange={(e) => updateInput(idx, 'placeholder', e.target.value)}
                        placeholder="Enter placeholder..."
                        className="w-full px-3 py-2 bg-surface-neutral border border-border rounded text-white text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-white text-sm">
                        <input
                          type="checkbox"
                          checked={input.required}
                          onChange={(e) => updateInput(idx, 'required', e.target.checked)}
                          className="rounded"
                        />
                        Required
                      </label>
                      <button
                        onClick={() => removeInput(idx)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addInput}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered mb-6"
            >
              + Add Input Field
            </button>

            <div className="flex gap-4 pt-4 border-t border-border">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
              >
                Back
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={loading || inputs.length === 0}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                Continue to Backend
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Build Backend - Placeholder */}
        {step === 3 && (
          <div className="bg-surface-neutral border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Step 3: Build Backend Function</h2>
            <p className="text-gray-400 mb-4">
              This is where you'll chat with AI to build your backend function.
            </p>
            <p className="text-yellow-400 mb-6">
              🚧 Full AI chat interface coming next! For now, this is a placeholder.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-surface border border-border rounded-lg text-white hover:bg-surface-hovered"
              >
                Back
              </button>
              <button
                onClick={() => router.push('/admin/logic-pages')}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Save & Exit (Coming Soon)
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
