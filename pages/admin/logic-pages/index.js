import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function LogicPagesIndex() {
  const router = useRouter();
  const [logicPages, setLogicPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogicPages();
  }, [filter]);

  const fetchLogicPages = async () => {
    setLoading(true);
    try {
      let url = '/api/logic-pages';
      const params = new URLSearchParams();

      if (filter !== 'all') params.append('status', filter);
      if (search) params.append('search', search);

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogicPages(data.logic_pages);
      }
    } catch (error) {
      console.error('Failed to fetch logic pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLogicPage = async (id) => {
    if (!confirm('Are you sure you want to delete this logic page?')) return;

    try {
      const res = await fetch(`/api/logic-pages/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchLogicPages();
      }
    } catch (error) {
      console.error('Failed to delete logic page:', error);
      alert('Failed to delete logic page');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-500',
      building: 'bg-blue-500',
      testing: 'bg-yellow-500',
      published: 'bg-green-500',
      archived: 'bg-gray-700'
    };
    return (
      <span className={`px-3 py-1 text-xs rounded-full text-white ${badges[status] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Logic Pages</h1>
          <p className="text-gray-400">Build custom logic and functionality with AI assistance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {['all', 'draft', 'building', 'testing', 'published'].map((status) => (
            <div
              key={status}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                filter === status
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-surface-neutral border border-border hover:bg-surface-hovered'
              }`}
              onClick={() => setFilter(status)}
            >
              <div className="text-2xl font-bold text-white mb-1">
                {status === 'all' ? logicPages.length : logicPages.filter(p => p.status === status).length}
              </div>
              <div className="text-sm text-gray-400 capitalize">{status}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search logic pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchLogicPages()}
              className="px-4 py-2 bg-surface-neutral border border-border rounded-lg text-white w-80"
            />
            <button
              onClick={fetchLogicPages}
              className="px-6 py-2 bg-surface-neutral border border-border rounded-lg text-white hover:bg-surface-hovered"
            >
              Search
            </button>
          </div>
          <button
            onClick={() => router.push('/admin/logic-pages/new')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            New Logic Page
          </button>
        </div>

        {/* Logic Pages List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading logic pages...</p>
          </div>
        ) : logicPages.length === 0 ? (
          <div className="text-center py-12 bg-surface-neutral rounded-xl border border-border">
            <div className="text-6xl mb-4">🔧</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Logic Pages Yet</h3>
            <p className="text-gray-400 mb-6">Create your first logic page to add custom functionality</p>
            <button
              onClick={() => router.push('/admin/logic-pages/new')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Create First Logic Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {logicPages.map((page) => (
              <div
                key={page.id}
                className="bg-surface-neutral border border-border rounded-xl p-6 hover:bg-surface-hovered transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{page.title}</h3>
                      {getStatusBadge(page.status)}
                    </div>
                    <p className="text-gray-400 mb-3">{page.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>🔗 Slug: {page.slug}</span>
                      <span>📍 Route: {page.backend_route}</span>
                      <span>📅 {new Date(page.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/logic-pages/edit/${page.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    {page.status === 'published' && (
                      <button
                        onClick={() => window.open(`/logic/${page.slug}`, '_blank')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() => deleteLogicPage(page.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
    </AdminLayout>
  );
}
