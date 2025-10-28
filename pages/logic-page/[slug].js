import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LogicPageDisplay() {
  const router = useRouter();
  const { slug } = router.query;

  // States
  const [pageData, setPageData] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load page data
  useEffect(() => {
    if (!slug) return;

    const fetchPageData = async () => {
      try {
        const response = await fetch(`/api/logic-pages/${slug}`);
        const data = await response.json();

        if (response.ok) {
          setPageData(data.page);
          setFields(data.fields || []);

          // Initialize form data
          const initialFormData = {};
          data.fields?.forEach(field => {
            initialFormData[field.name] = '';
          });
          setFormData(initialFormData);
        } else {
          setError(data.error || 'Page not found');
        }
      } catch (err) {
        console.error('Error loading page:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [slug]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/logic-pages/${slug}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Processing failed');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Render field based on type
  const renderField = (field) => {
    const commonProps = {
      id: field.name,
      value: formData[field.name] || '',
      onChange: (e) => handleInputChange(field.name, e.target.value),
      required: field.required,
      placeholder: field.placeholder || '',
      className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
          />
        );

      case 'email':
        return (
          <input
            {...commonProps}
            type="email"
          />
        );

      case 'select':
        const options = field.options ? JSON.parse(field.options) : {};
        return (
          <select
            {...commonProps}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
          >
            <option value="">Choose an option</option>
            {options.choices?.map((choice, index) => (
              <option key={index} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              checked={formData[field.name] === 'true' || formData[field.name] === true}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={field.name} className="ml-2 text-sm text-gray-700">
              {field.description || 'Check this box'}
            </label>
          </div>
        );

      default:
        return (
          <input
            {...commonProps}
            type="text"
          />
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{pageData?.name || 'Logic Page'}</title>
        <meta name="description" content={pageData?.description || 'Interactive logic page'} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {pageData?.name}
            </h1>
            {pageData?.description && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {pageData.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Input</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {fields.map((field) => (
                  <div key={field.name}>
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {field.label || field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {renderField(field)}

                    {field.description && field.type !== 'checkbox' && (
                      <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    {submitting ? 'Processing...' : 'Submit'}
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <div className="text-red-600 text-sm">
                      <strong>Error:</strong> {error}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Result</h2>

              {!result && !submitting && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p>Submit the form to see results here</p>
                </div>
              )}

              {submitting && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Processing your request...</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Success Message */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-800">
                      <strong>Success!</strong> {result.message}
                    </div>
                  </div>

                  {/* Result Data */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Output:</h3>
                    <div className="bg-white rounded border p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {typeof result.data === 'string'
                          ? result.data
                          : JSON.stringify(result.data, null, 2)
                        }
                      </pre>
                    </div>
                  </div>

                  {/* Metadata */}
                  {result.metadata && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Details:</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Processing Time:</strong> {result.processingTime}ms</p>
                        <p><strong>Executed At:</strong> {new Date(result.metadata.executedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* Download Option */}
                  {pageData?.result_config?.allowDownload && (
                    <button
                      onClick={() => {
                        const blob = new Blob([typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)], {
                          type: 'text/plain'
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${pageData.name}-result.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Download Result
                    </button>
                  )}

                  {/* Reset Button */}
                  <button
                    onClick={() => {
                      setResult(null);
                      setError(null);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Run Again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Powered by Logic Pages</p>
          </div>
        </div>
      </div>
    </>
  );
}