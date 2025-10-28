import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function LogicPagesIndex() {
  const router = useRouter();
  const [logicPages, setLogicPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    public: 0,
    subscriber: 0,
    totalExecutions: 0
  });

  useEffect(() => {
    loadLogicPages();
  }, []);

  const loadLogicPages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/logic-pages');
      const data = await response.json();
      
      if (data.success) {
        setLogicPages(data.pages || []);
        setStats(data.stats || {});
      } else {
        setError(data.error || 'Failed to load logic pages');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error loading logic pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePageStatus = async (pageId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/logic-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        loadLogicPages(); // Reload the list
      } else {
        setError(data.error || 'Failed to update page status');
      }
    } catch (error) {
      setError('Network error occurred');
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
        loadLogicPages(); // Reload the list
      } else {
        setError(data.error || 'Failed to delete page');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading Logic Pages...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Logic Pages</h1>
            <p className="text-slate-400 mt-1">
              Create dynamic AI-powered pages with custom inputs, processing, and results
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/admin/logic-pages/ai-builder')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg"
            >
              <span className="text-lg">🤖</span>
              <span>AI Builder</span>
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full">NEW</span>
            </button>
            <button
              onClick={() => router.push('/admin/logic-pages/create')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span className="text-lg">⚡</span>
              <span>Create Logic Page</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.total || 0}</div>
            <div className="text-sm text-slate-400">Total Pages</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.active || 0}</div>
            <div className="text-sm text-slate-400">Active</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.public || 0}</div>
            <div className="text-sm text-slate-400">Public</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{stats.subscriber || 0}</div>
            <div className="text-sm text-slate-400">Subscriber Only</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">{stats.totalExecutions || 0}</div>
            <div className="text-sm text-slate-400">Total Executions</div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
            <div className="text-red-400 font-medium">Error</div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Logic Pages List */}
        {logicPages.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Logic Pages Yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first logic page to build dynamic AI-powered functionality
            </p>
            <button
              onClick={() => router.push('/admin/logic-pages/create')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Create Your First Logic Page
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Access
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Executions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {logicPages.map((page) => (
                    <tr key={page.id} className="hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{page.name}</div>
                          <div className="text-sm text-slate-400">/{page.slug}</div>
                          {page.description && (
                            <div className="text-xs text-slate-500 mt-1">{page.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          page.access_level === 'public' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {page.access_level === 'public' ? '🌐 Public' : '👤 Subscriber'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => togglePageStatus(page.id, page.is_active)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            page.is_active 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } transition-colors cursor-pointer`}
                        >
                          {page.is_active ? '✅ Active' : '❌ Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{page.execution_count || 0}</div>
                        <div className="text-xs text-slate-400">
                          {page.store_results ? 'Stored' : 'Not stored'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300">
                          {new Date(page.updated_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(page.updated_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => window.open(`/${page.slug}`, '_blank')}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                            title="Preview"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => router.push(`/admin/logic-pages/${page.id}/analytics`)}
                            className="text-green-400 hover:text-green-300 text-sm"
                            title="Analytics"
                          >
                            📊
                          </button>
                          <button
                            onClick={() => router.push(`/admin/logic-pages/${page.id}/edit`)}
                            className="text-yellow-400 hover:text-yellow-300 text-sm"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deletePage(page.id, page.name)}
                            className="text-red-400 hover:text-red-300 text-sm"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}