/**
 * ENHANCED CHAT HOOK FOR GLINAX RAG+CAG SYSTEM
 * Built by Kwame Asare - Senior Fullstack Engineer
 * 
 * This hook provides enhanced integration with our hybrid RAG+CAG system
 * Features:
 * - Source attribution and citations
 * - Confidence scoring
 * - Ghana-specific context handling
 * - Error handling with Ghanaian English
 */

import { useToast } from './useToast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ChatSource {
  id: number;
  source: string;
  url: string;
  date: string;
  confidence: number;
}

interface EnhancedChatResponse {
  success: boolean;
  message: string;
  sources?: ChatSource[];
  confidence?: number;
  timestamp?: string;
  metadata?: {
    university_context?: string;
    response_type?: 'local_knowledge' | 'hybrid_search';
    processing_info?: any;
  };
  error?: string;
}

export const useChat = () => {
  const { showError, showSuccess } = useToast();

  // FIXED: Enhanced sendMessage with proper authentication and token management
  const sendMessage = async (
    message: string, 
    conversationId: string, 
    universityName?: string,
    additionalContext?: any
  ): Promise<EnhancedChatResponse> => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 FIXED: Sending message with auth check:', !!token);

      console.log('📤 FIXED: Sending enhanced message:', { 
        message: message.substring(0, 100), 
        conversationId, 
        universityName,
        hasContext: !!additionalContext,
        hasToken: !!token
      });

      // Prepare enhanced request payload
      const requestPayload = {
        message,
        conversation_id: conversationId,
        university_name: universityName || null,
        user_context: {
          preferred_university: universityName,
          timestamp: new Date().toISOString(),
          ...additionalContext
        }
      };

      // FIXED: Prepare headers with proper authentication
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // FIXED: Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // FIXED: Use correct endpoint based on authentication
      const endpoint = token ? `${API_BASE_URL}/chat/send` : `${API_BASE_URL}/chat/demo`;
      console.log('📤 FIXED: Sending to endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        credentials: 'include'
      });

      console.log('📥 FIXED: Enhanced backend response status:', response.status);

      // FIXED: Handle authentication errors specifically and trigger auth modal
      if (response.status === 401 || response.status === 403) {
        console.log('🔒 FIXED: Authentication failed, clearing token');
        localStorage.removeItem('token');
        
        const errorData = await response.json().catch(() => ({}));
        
        // If this requires auth, we should show the auth modal
        if (errorData.requiresAuth) {
          showError('Authentication Required', errorData.message || 'Please log in to continue.');
          return {
            success: false,
            message: 'Authentication required. Please log in to access this feature.',
            error: 'AUTHENTICATION_REQUIRED',
            requiresAuth: true
          };
        }
        
        // Otherwise, retry with demo endpoint
        console.log('🔄 FIXED: Retrying with demo endpoint');
        const demoResponse = await fetch(`${API_BASE_URL}/chat/demo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });
        
        const demoData = await demoResponse.json();
        if (demoResponse.ok && demoData.success) {
          showError('Session Expired', 'Continued in demo mode. Please log in for full features.');
          return {
            success: true,
            message: demoData.reply || demoData.message,
            sources: demoData.sources || [],
            confidence: demoData.confidence || 0.0,
            timestamp: demoData.timestamp || new Date().toISOString(),
            metadata: { ...demoData.metadata, demo_mode: true }
          };
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('📥 FIXED: Enhanced backend response:', {
        success: data.success,
        confidence: data.confidence,
        sources_count: data.sources?.length || 0,
        response_type: data.metadata?.response_type
      });

      if (!data.success) {
        const errorMessage = data.message || 'Error sending message';
        showError('Chat Error', errorMessage);
        
        return { 
          success: false, 
          message: errorMessage,
          error: data.error
        };
      }

      // Show success feedback with context
      if (data.confidence && data.confidence > 0.9) {
        showSuccess('High Confidence', 'Response generated with high confidence');
      }

      // Return enhanced response data
      return { 
        success: true, 
        message: data.reply || data.message || 'No response received',
        sources: data.sources || [],
        confidence: data.confidence || 0.0,
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: data.metadata || {}
      };

    } catch (error) {
      console.error('❌ FIXED: Enhanced chat error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message.includes('fetch') 
          ? 'Connection problem. Please check your internet and try again.'
          : error.message
        : 'Unexpected error occurred';

      showError('Connection Error', 'Chat service temporarily unavailable');
      
      return { 
        success: false, 
        message: `I'm sorry, but I'm having connection issues right now. ${errorMessage}. Please try again!`,
        error: errorMessage
      };
    }
  };

  const searchUniversities = async (query: string) => {
    try {
      const _token = localStorage.getItem('token');
      
      if (!_token) {
        return { success: false, universities: [] };
      }

      const response = await fetch(`${API_BASE_URL}/universities/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${_token}`
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        universities: data.universities || [],
        total: data.total || 0
      };

    } catch (error) {
      console.error('❌ University search error:', error);
      return { success: false, universities: [] };
    }
  };

  const getScholarships = async () => {
    try {
      const _token = localStorage.getItem('token');
      
      if (!_token) {
        return { success: false, scholarships: [] };
      }

      const response = await fetch(`${API_BASE_URL}/scholarships`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${_token}`
        }
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        scholarships: data.scholarships || [],
        total: data.total || 0
      };

    } catch (error) {
      console.error('❌ Scholarships fetch error:', error);
      return { success: false, scholarships: [] };
    }
  };

  return { 
    sendMessage, 
    searchUniversities, 
    getScholarships 
  };
};