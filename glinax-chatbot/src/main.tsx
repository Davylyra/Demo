/**
 * Application Entry Point
 * 
 * This is the main entry point for the Glinax Chatbot React application.
 * It initializes the React app and renders it to the DOM.
 * 
 * Features:
 * - StrictMode for development warnings and checks
 * - Modern React 18 createRoot API
 * - Global CSS imports
 * 
 * Integration Notes:
 * - Ready for production deployment
 * - Optimized for performance
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Get the root element and create React root
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Please ensure there is a div with id="root" in your HTML.');
}

const root = createRoot(rootElement);

// Render the app with StrictMode for development checks
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
