import React from 'react';

export default function Home() {
  return React.createElement('div', { style: { padding: '50px', textAlign: 'center' } },
    React.createElement('h1', null, '🚀 Mighai SaaS Platform'),
    React.createElement('p', null, 'Welcome to your Next.js SaaS application!'),
    React.createElement('div', { style: { marginTop: '30px' } },
      React.createElement('a', { 
        href: '/login', 
        style: { margin: '0 10px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px' }
      }, 'Login'),
      React.createElement('a', { 
        href: '/admin', 
        style: { margin: '0 10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }
      }, 'Admin')
    )
  );
}