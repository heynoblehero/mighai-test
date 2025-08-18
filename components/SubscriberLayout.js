import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function SubscriberLayout({ children, title = 'Subscriber Dashboard' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/subscribe/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/subscribe/login');
      }
    } catch (error) {
      router.push('/subscribe/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/subscribe/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="subscriber-sidebar w-64 min-h-screen bg-indigo-800 text-white p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Subscriber Portal</h1>
            <p className="text-sm text-indigo-200">Welcome, {user.username}</p>
          </div>
          
          <nav className="space-y-2">
            <Link href="/dashboard" className="block px-4 py-2 text-indigo-100 hover:bg-indigo-700 rounded">
              Dashboard
            </Link>
            <Link href="/dashboard/profile" className="block px-4 py-2 text-indigo-100 hover:bg-indigo-700 rounded">
              My Profile
            </Link>
            <Link href="/dashboard/upgrade" className="block px-4 py-2 text-indigo-100 hover:bg-indigo-700 rounded">
              Upgrade Plan
            </Link>
            <Link href="/" className="block px-4 py-2 text-indigo-100 hover:bg-indigo-700 rounded">
              Back to Site
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-indigo-100 hover:bg-indigo-700 rounded"
            >
              Logout
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="subscriber-content bg-white rounded-lg shadow p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{title}</h2>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}