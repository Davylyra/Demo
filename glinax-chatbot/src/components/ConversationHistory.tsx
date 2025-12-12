/**
 * Conversation History Component
 * Displays a list of previous chat conversations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiClock, FiUser, FiBox, FiRefreshCw } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  universityContext?: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  conversationId: string;
  sources?: any[];
  confidence?: number;
  attachments?: any[];
}

const ConversationHistory: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  // FIXED: Enhanced conversation loading with proper authentication
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      console.log('🔐 FIXED: Loading conversations with auth check:', !!token);
      
      let response: Response | undefined;
      let endpoint: string | undefined;
      
      if (token) {
        // FIXED: Try authenticated endpoint with proper headers
        endpoint = `${API_BASE_URL}/chat/conversations`;
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        // FIXED: Check for authentication errors specifically
        if (response.status === 401 || response.status === 403) {
          console.log('🔒 FIXED: Authentication failed, clearing token and using demo');
          localStorage.removeItem('token');
          // Don't redirect to login, just use demo endpoint
          endpoint = `${API_BASE_URL}/chat/conversations-demo`;
          response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
        } else if (!response.ok) {
          if (response.status === 404) {
            // Try legacy endpoint
            console.log('🔄 Auth endpoint 404, trying legacy /chat/user/all');
            endpoint = `${API_BASE_URL}/chat/user/all`;
            response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              credentials: 'include'
            });
          }
          // If still not ok, fall back to demo endpoint
          if (!response.ok) {
            console.log('🔄 FIXED: Auth endpoints failed, trying demo endpoint');
            endpoint = `${API_BASE_URL}/chat/conversations-demo`;
            response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
          }
        }
      } else {
        // FIXED: No token, use demo endpoint with proper headers
        console.log('🔄 FIXED: No token, using demo endpoint');
        endpoint = `${API_BASE_URL}/chat/conversations-demo`;
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      }
      
      if (!response || !response.ok) {
        const status = response ? response.status : 'NO_RESPONSE';
        throw new Error(`HTTP error! status: ${status}`);
      }
      
      const data = await response.json();
      console.log('📥 FIXED: Conversation data received:', data);
      
      if (Array.isArray((data as any).conversations) || Array.isArray((data as any).chats) || Array.isArray((data as any).data)) {
        // FIXED: Better data validation and processing
        const list = (data as any).conversations || (data as any).data || [];
        const validConversations = list
          .filter((conv: any) => conv && (conv.id || conv._id) && conv.title)
          .map((conv: any) => {
            const ts = conv.timestamp || conv.updated_at || conv.created_at;
            const parsed = parseDate(ts) || new Date(0);
            return {
              id: conv.id || conv._id?.toString?.() || String(conv._id),
              title: conv.title,
              lastMessage: conv.lastMessage || conv.last_message || 'No messages yet',
              timestamp: parsed.toISOString(),
              messageCount: Number(conv.messageCount || conv.message_count || 0),
              universityContext: conv.universityContext || conv.university_context
            } as Conversation;
          })
          .sort((a, b) => {
            const da = parseDate(a.timestamp)?.getTime() ?? 0;
            const db = parseDate(b.timestamp)?.getTime() ?? 0;
            return db - da;
          });
          
        setConversations(validConversations);
        console.log('✅ FIXED: Loaded conversations:', validConversations.length);
      } else {
        console.warn('⚠️ FIXED: Invalid conversation data received:', data);
        setConversations([]);
        setError('No conversation history found');
      }
    } catch (error) {
      console.error('❌ FIXED: Error loading conversations:', error);
      setError('Unable to load conversation history. Please check your connection.');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced message loading with proper authentication
  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      console.log('🔐 FIXED: Loading messages with auth check:', !!token);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // FIXED: Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      // FIXED: Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.log('🔒 FIXED: Authentication failed for messages, clearing token');
        localStorage.removeItem('token');
        setError('Session expired. Please log in again to view messages.');
        setMessages([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📥 FIXED: Message data received:', data);
      
      if (data.success && Array.isArray(data.messages)) {
        // FIXED: Enhanced message processing with better validation
        const validMessages = data.messages
          .filter(msg => msg && (msg.message || msg.text) && (msg.id || msg._id))
          .map(msg => {
            const ts = msg.timestamp || msg.created_at;
            const parsedTs = parseDate(ts) || new Date();
            return {
              id: msg.id || msg._id?.toString() || `msg_${Date.now()}`,
              text: msg.message ?? msg.text ?? '',
              isUser: typeof msg.isUser === 'boolean' ? msg.isUser : !msg.is_bot,
              timestamp: parsedTs.toISOString(),
              conversationId: msg.conversation_id || conversationId,
              sources: msg.sources || [],
              confidence: Number(msg.confidence || 0),
              attachments: msg.attachments || []
            } as Message;
          })
          .sort((a, b) => {
            const da = parseDate(a.timestamp)?.getTime() ?? 0;
            const db = parseDate(b.timestamp)?.getTime() ?? 0;
            return da - db;
          });
          
        setMessages(validMessages);
        console.log('✅ FIXED: Loaded messages:', validMessages.length);

        // Update selected conversation metadata with latest info
        setSelectedConversation(prev => {
          if (!prev || prev.id !== conversationId) return prev;
          const last = validMessages[validMessages.length - 1];
          return {
            ...prev,
            lastMessage: last ? last.text.slice(0, 120) : prev.lastMessage,
            messageCount: validMessages.length,
            timestamp: last ? last.timestamp : prev.timestamp,
          };
        });
      } else {
        console.warn('⚠️ FIXED: Invalid message data received:', data);
        setError('No messages found for this conversation');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ FIXED: Error loading messages:', error);
      setError('Unable to load conversation messages. Please try again.');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  const handleContinueConversation = (conversation: Conversation) => {
    // Navigate to chat with the selected conversation context
    navigate('/chat', {
      state: {
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        universityContext: conversation.universityContext ? {
          name: conversation.universityContext,
          fullName: conversation.universityContext
        } : undefined
      }
    });
  };

  const parseDate = (ts?: string | Date | null): Date | null => {
    if (!ts) return null;
    const d = ts instanceof Date ? ts : new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = parseDate(timestamp);
    if (!date) return 'Unknown';
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FiRefreshCw className="w-8 h-8" />
        </motion.div>
        <span className="ml-3">Loading conversation history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-8 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <p className="text-red-500 mb-4">{error}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadConversations}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
        >
          Try Again
        </motion.button>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className={`w-1/3 border-r ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className={`p-4 border-b ${
          theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Conversation History
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadConversations}
              className={`p-2 rounded-lg ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-400' 
                  : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              <FiRefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
        
        <div className="overflow-y-auto h-full scrollbar-hide">
          {conversations.length === 0 ? (
            <div className={`text-center p-8 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <FiMessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No conversation history yet</p>
              <p className="text-sm mt-2">Start chatting to see your conversations here!</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleConversationSelect(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedConversation?.id === conversation.id
                      ? theme === 'dark'
                        ? 'bg-primary-600/20 border border-primary-500'
                        : 'bg-primary-100 border border-primary-300'
                      : theme === 'dark'
                        ? 'hover:bg-gray-700/50'
                        : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-medium text-sm truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {conversation.title}
                    </h4>
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(conversation.timestamp)}
                    </span>
                  </div>
                  
                  {conversation.universityContext && (
                    <div className={`text-xs px-2 py-1 rounded-full mb-2 inline-block ${
                      theme === 'dark' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {conversation.universityContext}
                    </div>
                  )}
                  
                  <p className={`text-xs truncate ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {conversation.lastMessage || 'No messages yet'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <FiClock className={`w-3 h-3 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {conversation.messageCount} messages
                      </span>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContinueConversation(conversation);
                      }}
                      className="text-xs px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors duration-200"
                    >
                      Continue
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className={`p-4 border-b ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
            }`}>
              <h3 className={`font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                {selectedConversation.title}
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {selectedConversation.messageCount} messages • Last active {formatTimestamp(selectedConversation.timestamp)}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
              {loadingMessages ? (
                <div className={`flex items-center justify-center h-32 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FiRefreshCw className="w-6 h-6" />
                  </motion.div>
                  <span className="ml-3">Loading messages...</span>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`flex items-start space-x-3 ${
                        message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.isUser
                          ? 'bg-primary-600'
                          : theme === 'dark'
                            ? 'bg-gray-700'
                            : 'bg-gray-200'
                      }`}>
                        {message.isUser ? (
                          <FiUser className="w-4 h-4 text-white" />
                        ) : (
                          <FiBox className={`w-4 h-4 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`} />
                        )}
                      </div>
                      
                      <div className={`flex-1 ${message.isUser ? 'text-right' : ''}`}>
                        <div className={`inline-block p-3 rounded-2xl max-w-[80%] ${
                          message.isUser
                            ? 'bg-primary-600 text-white'
                            : theme === 'dark'
                              ? 'bg-gray-700 text-gray-100'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          <p className="text-sm leading-relaxed">{message.text}</p>
                          
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-2 text-xs opacity-75">
                              Sources: {message.sources.length} references
                            </div>
                          )}
                        </div>
                        
                        <p className={`text-xs mt-1 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {message.timestamp}
                          {message.confidence && (
                            <span className="ml-2">
                              • {Math.round(message.confidence * 100)}% confidence
                            </span>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
            
            <div className={`p-4 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleContinueConversation(selectedConversation)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors duration-200"
              >
                Continue This Conversation
              </motion.button>
            </div>
          </>
        ) : (
          <div className={`flex items-center justify-center h-full ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <div className="text-center">
              <FiMessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the list to view its messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;