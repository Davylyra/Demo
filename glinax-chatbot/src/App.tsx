/**
 * Main App Component
 * 
 * This is the root component of the Glinax Chatbot application.
 * It sets up the global providers and context for the entire app.
 * 
 * Architecture:
 * - ErrorBoundary: Catches and handles React errors gracefully
 * - ConfigProvider: Manages app configuration and settings
 * - ThemeProvider: Handles light/dark theme switching
 * - AuthProvider: Manages user authentication state
 * - AppContent: The main app content with accessibility features
 * 
 * Integration Notes:
 * - All providers are ready for backend integration
 * - Theme system supports dynamic switching
 * - Authentication context is prepared for real user data
 */

import { memo } from 'react';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ConfigProvider } from './contexts/ConfigContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import { useAccessibility } from './hooks/useAccessibility';
import { useToast } from './hooks/useToast';

/**
 * AppContent Component
 * 
 * Contains the main application content with accessibility features.
 * This component is memoized for performance optimization.
 * 
 * UNIFIED BLUR SYSTEM:
 * This component implements a seamless glassmorphism background system that eliminates
 * visible separation lines when scrolling. The system consists of three layers:
 * 
 * 1. Global Background Layer: Provides the base gradient background
 * 2. Global Blur Layer: Single unified backdrop blur for the entire app
 * 3. Content Layer: All app content with relative z-index positioning
 * 
 * This approach ensures:
 * - No visible horizontal/vertical lines during scrolling
 * - Consistent blur effects across all pages
 * - Optimal performance with single blur layer
 * - Seamless theme transitions
 * 
 * For child components, use the unified glass classes:
 * - .glass-unified (light theme)
 * - .glass-unified-dark (dark theme)
 * - .glass-card-unified (for cards)
 * - .glass-card-unified-dark (for cards in dark theme)
 */
const AppContent = memo(() => {
  const { theme } = useTheme();
  const { toasts, removeToast } = useToast();

  // Initialize accessibility features for better user experience
  useAccessibility({
    enableKeyboardNavigation: true,
    enableFocusManagement: true,
    enableScreenReader: true
  });
  
  return (
    <div 
      id="main-content"
      className="relative min-h-screen w-full overflow-hidden scrollbar-hide"
      role="main"
      aria-label="Glinax Chatbot Application"
    >
      {/* Global Background Layer - Unified blur system */}
      <div 
        className={`absolute inset-0 transition-colors duration-200 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
            : 'bg-gradient-to-br from-white via-[#e0f2ff] to-[#d6ecff]'
        }`}
      />
      
      {/* Global Blur Layer - Single unified backdrop blur */}
      <div 
        className="absolute inset-0 backdrop-blur-xl pointer-events-none"
        style={{
          background: theme === 'dark' 
            ? 'rgba(0, 0, 0, 0.1)' 
            : 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)'
        }}
      />
      
      {/* Content Layer - All app content goes here */}
      <main className="relative z-10">
        <AppRoutes />
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
});

AppContent.displayName = 'AppContent';

/**
 * Main App Component
 * 
 * Root component that wraps the entire application with necessary providers.
 * This component is memoized to prevent unnecessary re-renders.
 */
const App = memo(() => {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
});

App.displayName = 'App';

export default App;
