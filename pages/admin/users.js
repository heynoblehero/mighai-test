import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Generate sample user data
  const generateUsers = () => {
    const roles = ['admin', 'user', 'subscriber', 'moderator'];
    const statuses = ['active', 'inactive', 'pending'];
    const plans = ['Free', 'Basic', 'Pro', 'Enterprise'];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: roles[Math.floor(Math.random() * roles.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      plan: plans[Math.floor(Math.random() * plans.length)],
      lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      usage: Math.floor(Math.random() * 100),
      revenue: Math.floor(Math.random() * 500)
    }));
  };

  useEffect(() => {
    setTimeout(() => {
      setUsers(generateUsers());
      setLoading(false);
    }, 800);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getStatusBadge = (status) => {
    const classes = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${classes[status]}`;
  };

  const getRoleBadge = (role) => {
    const classes = {
      admin: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
      subscriber: 'bg-green-100 text-green-800',
      moderator: 'bg-orange-100 text-orange-800'
    };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${classes[role]}`;
  };

  if (loading) {
    return (
      <AdminLayout title="Users">
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="text-subdued">Loading users...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users">
      <div className="shopify-dashboard">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="text-display-medium">Users</h1>
              <p className="text-subdued">
                Manage your platform users and their permissions
              </p>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stats-grid-shopify">
            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Total Users</span>
              </div>
              <div className="stat-value">{users.length}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 20 + 5)}% this month</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-value">{users.filter(u => u.status === 'active').length}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 15 + 8)}% this week</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Subscribers</span>
              </div>
              <div className="stat-value">{users.filter(u => u.plan !== 'Free').length}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 25 + 10)}% this month</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Total Revenue</span>
              </div>
              <div className="stat-value">${users.reduce((sum, u) => sum + u.revenue, 0).toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 18 + 12)}% this month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="chart-card mb-6">
          <div className="chart-header">
            <h3 className="text-heading">User Management</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="timeframe-select w-64"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="timeframe-select"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="subscriber">Subscriber</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>
          </div>
          
          {/* Users Table */}
          <div className="chart-container">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">User</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Role</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Plan</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Last Login</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Usage</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Revenue</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={getRoleBadge(user.role)}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={getStatusBadge(user.status)}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-900">{user.plan}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-500">{user.lastLogin}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${user.usage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{user.usage}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-900">${user.revenue}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                          <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">No users found matching your criteria.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}