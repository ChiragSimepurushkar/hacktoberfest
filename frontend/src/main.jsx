import React from 'react';
import ReactDOM from 'react-dom/client';
import Router from './app/Router';
import './styles/tokens.css';
import './styles/layout.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
