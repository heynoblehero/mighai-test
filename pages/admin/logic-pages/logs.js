import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function LogicPageLogs() {
  const router = useRouter();
  const [executions, setExecutions] = useState([]);
  const [logicPages, setLogicPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState(null);

  // Filters
  const [filterLogicPage, setFilterLogicPage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);

  useEffect(() => {
    fetchLogicPages();
    fetchExecutions();
  }, [filterLogicPage, filterStatus, filterStartDate, filterEndDate, offset]);

  const fetchLogicPages = async () => {
    try {
      const res = await fetch('/api/logic-pages');
      const data = await res.json();
      if (data.success) {
        setLogicPages(data.logic_pages);
      }
    } catch (error) {
      console.error('Failed to fetch logic pages:', error);
    }
  };

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLogicPage) params.append('logic_page_id', filterLogicPage);
      if (filterStatus) params.append('status', filterStatus);
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);
      params.append('limit', limit);
      params.append('offset', offset);

      const res = await fetch(`/api/logic-pages/executions?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setExecutions(data.executions);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilterLogicPage('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setOffset(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    return status === 'success' ? (
      <span className="px-3 py-1 text-xs rounded-full text-white bg-green-500">Success</span>
    ) : (
      <span className="px-3 py-1 text-xs rounded-full text-white bg-red-500">Error</span>
    );
  };

  const viewDetails = (execution) => {
    setSelectedExecution(execution);
  };

  const closeDetails = () => {
    setSelectedExecution(null);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Execution Logs</h1>
          <p className="text-gray-400">Monitor and analyze all logic page executions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-surface-neutral border border-border">
            <div className="text-2xl font-bold text-white mb-1">{total}</div>
            <div className="text-sm text-gray-400">Total Executions</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-neutral border border-border">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {executions.filter(e => e.status === 'success').length}
            </div>
            <div className="text-sm text-gray-400">Successful</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-neutral border border-border">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {executions.filter(e => e.status === 'error').length}
            </div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-neutral border border-border">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {executions.length > 0
                ? Math.round(executions.reduce((sum, e) => sum + e.execution_time_ms, 0) / executions.length)
                : 0}ms
            </div>
            <div className="text-sm text-gray-400">Avg Execution Time</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface-neutral border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Logic Page</label>
              <select
                value={filterLogicPage}
                onChange={(e) => { setFilterLogicPage(e.target.value); setOffset(0); }}
                className="w-full px-4 py-2 bg-surface-hovered border border-border rounded-lg text-white"
              >
                <option value="">All Pages</option>
                {logicPages.map(page => (
                  <option key={page.id} value={page.id}>{page.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setOffset(0); }}
                className="w-full px-4 py-2 bg-surface-hovered border border-border rounded-lg text-white"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="datetime-local"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setOffset(0); }}
                className="w-full px-4 py-2 bg-surface-hovered border border-border rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="datetime-local"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setOffset(0); }}
                className="w-full px-4 py-2 bg-surface-hovered border border-border rounded-lg text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-surface-hovered border border-border rounded-lg text-white hover:bg-surface-neutral"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Executions Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading executions...</p>
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-12 bg-surface-neutral rounded-xl border border-border">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Executions Found</h3>
            <p className="text-gray-400">No logic page executions match your filters</p>
          </div>
        ) : (
          <>
            <div className="bg-surface-neutral border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-hovered">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Time</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Logic Page</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Exec Time</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">IP Address</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((execution, index) => (
                    <tr
                      key={execution.id}
                      className={`${
                        index % 2 === 0 ? 'bg-surface-neutral' : 'bg-surface-hovered'
                      } hover:bg-surface-hovered transition-colors`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {formatDate(execution.executed_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <div className="font-semibold">{execution.logic_page_title}</div>
                        <div className="text-xs text-gray-500">/{execution.logic_page_slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(execution.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {execution.execution_time_ms}ms
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {execution.ip_address || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewDetails(execution)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} executions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 bg-surface-neutral border border-border rounded-lg text-white hover:bg-surface-hovered disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 bg-surface-neutral border border-border rounded-lg text-white hover:bg-surface-hovered disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-neutral border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Execution Details</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {selectedExecution.logic_page_title} - {formatDate(selectedExecution.executed_at)}
                </p>
              </div>
              <button
                onClick={closeDetails}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status and Performance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Status</label>
                  <div>{getStatusBadge(selectedExecution.status)}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Execution Time</label>
                  <div className="text-white">{selectedExecution.execution_time_ms}ms</div>
                </div>
              </div>

              {/* Request Info */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Request Information</label>
                <div className="bg-surface-hovered border border-border rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">IP Address:</span>
                    <span className="text-white">{selectedExecution.ip_address || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">User Agent:</span>
                    <span className="text-white text-right max-w-md truncate">
                      {selectedExecution.user_agent || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Executed At:</span>
                    <span className="text-white">{formatDate(selectedExecution.executed_at)}</span>
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Input Data</label>
                <pre className="bg-surface-hovered border border-border rounded-lg p-4 text-sm text-gray-300 overflow-auto">
                  {JSON.stringify(selectedExecution.inputs_data, null, 2)}
                </pre>
              </div>

              {/* Outputs or Error */}
              {selectedExecution.status === 'success' ? (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Output Data</label>
                  <pre className="bg-surface-hovered border border-border rounded-lg p-4 text-sm text-green-300 overflow-auto">
                    {JSON.stringify(selectedExecution.output_data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Error Details</label>
                  <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 space-y-2">
                    <div>
                      <div className="text-xs text-red-400 font-semibold mb-1">Error Message:</div>
                      <div className="text-red-300 text-sm">{selectedExecution.error_message}</div>
                    </div>
                    {selectedExecution.error_stack && (
                      <div>
                        <div className="text-xs text-red-400 font-semibold mb-1">Stack Trace:</div>
                        <pre className="text-red-300 text-xs overflow-auto">
                          {selectedExecution.error_stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
