import React from 'react';

export default function Simple() {
  return React.createElement('div', null, 
    React.createElement('h1', null, 'Simple Test'),
    React.createElement('p', null, 'This page uses React.createElement instead of JSX')
  );
}