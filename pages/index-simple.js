import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>🚀 Mighai SaaS Platform</h1>
      <p>Welcome to your Next.js SaaS application!</p>
      <div style={{ marginTop: '30px' }}>
        <a href="/login" style={{ margin: '0 10px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Login
        </a>
        <a href="/admin" style={{ margin: '0 10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Admin
        </a>
      </div>
      <div style={{ marginTop: '40px' }}>
        <h2>Features</h2>
        <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
          <li>User Authentication</li>
          <li>Admin Dashboard</li>
          <li>Payment Integration</li>
          <li>Content Management</li>
          <li>Analytics & Monitoring</li>
        </ul>
      </div>
    </div>
  );
}