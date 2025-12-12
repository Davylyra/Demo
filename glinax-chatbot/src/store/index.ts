/**
 * Zustand Store - Global State Management
 *
 * This is the central state management system for the Glinax Chatbot application.
 * It uses Zustand for lightweight, type-safe state management with persistence.
 *
 * Features:
 * - User authentication state
 * - Chat conversations and messages
 * - University data management
 * - Forms and transactions
 * - Theme and configuration
 * - Local storage persistence
 * - DevTools integration
 *
 * Integration Notes:
 * - Ready for backend API integration
 * - Mock data can be replaced with real API calls
 * - Persistent storage for user sessions
 * - Type-safe state management
 *
 * Backend Integration Points:
 * - Replace mock data with real API calls
 * - Add real-time data synchronization
 * - Implement optimistic updates
 * - Add error handling and retry logic
 * - Integrate with WebSocket for real-time chat
 *
 * Store Structure:
 * - User: Authentication and profile data
 * - Chat: Messages and conversations
 * - Universities: University data and search
 * - Forms: Application forms and purchases
 * - Transactions: Payment and purchase history
 * - UI: Theme, loading states, and configuration
 *
 * Dependencies:
 * - Zustand: State management library
 * - DevTools: Development debugging
 * - Persist: Local storage persistence
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { UNIVERSITIES_DATA, MOCK_TRANSACTIONS } from '../data/constants';

// Type definitions for the application state
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  location?: string;
  bio?: string;
  interests?: string[];
  preferredUniversities?: string[];
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  conversationId: string;
  universityContext?: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
  }>;
  sources?: any[];
  confidence?: number;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  universityContext?: string;
  unreadCount: number;
}

export interface UniversityForm {
  id: string;
  universityName: string;
  fullName: string;
  formPrice: number | string; // Support both for backward compatibility
  buyPrice?: string; // Optional for backward compatibility
  currency?: string;
  deadline: string;
  isAvailable: boolean;
  logo?: string;
  description?: string;
  // New dynamic fields
  status?: 'available' | 'expired' | 'not_yet_open' | 'sold_out';
  daysUntilDeadline?: number;
  lastUpdated?: string;
}

export interface Transaction {
  id: string;
  universityName: string;
  fullName: string;
  type: string;
  date: string;
  time: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  amount: string;
  currency: string;
  reference: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

// Application state interface
interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  
  // Chat state
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  
  // Forms state
  forms: UniversityForm[];
  purchasedForms: UniversityForm[];
  
  // Transactions state
  transactions: Transaction[];
  
  // Notifications state
  notifications: Notification[];
  
  // UI state
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setGuest: (isGuest: boolean) => void;
  
  // Chat actions
  addConversation: (conversation: Conversation) => void;
  createConversation: (title: string) => string;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  getConversationMessages: (conversationId: string) => ChatMessage[];
  saveCurrentConversation: () => Promise<void>;
  startNewConversation: (title?: string) => string;
  clearCurrentMessages: () => void;
  
  // Forms actions
  loadForms: () => void;
  purchaseForm: (formId: string) => Promise<void>;
  loadPurchasedForms: (userId: string) => void;
  
  // Transactions actions
  loadTransactions: (userId: string) => void;
  addTransaction: (transaction: Transaction) => void;
  
  // Notifications actions
  loadNotifications: (userId: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  
  // UI actions
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utility actions
  clearError: () => void;
  reset: () => void;
}

// Create the Zustand store with persistence and devtools
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isGuest: false,
        conversations: [],
        currentConversation: null,
        messages: [],
        forms: [],
        purchasedForms: [],
        transactions: [],
        notifications: [],
        sidebarOpen: false,
        loading: false,
        error: null,

        // User actions
        setUser: (user) => set({ 
          user, 
          isAuthenticated: !!user,
          // Don't reset guest mode here - let setGuest handle it
        }, false, 'setUser'),
        setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }, false, 'setAuthenticated'),
        setGuest: (isGuest) => set({ isGuest }, false, 'setGuest'),

        // Chat actions
        addConversation: (conversation) => 
          set((state) => ({ 
            conversations: [conversation, ...state.conversations] 
          }), false, 'addConversation'),

        createConversation: (title) => {
          const conversationId = `conv_${Date.now()}`;
          const newConversation: Conversation = {
            id: conversationId,
            title,
            lastMessage: '',
            timestamp: new Date().toISOString(),
            messageCount: 0,
            unreadCount: 0
          };
          
          set((state) => ({ 
            conversations: [newConversation, ...state.conversations] 
          }), false, 'createConversation');
          
          return conversationId;
        },

        setCurrentConversation: (conversation) => 
          set({ currentConversation: conversation }, false, 'setCurrentConversation'),

        addMessage: (message) => 
          set((state) => ({ 
            messages: [...state.messages, message] 
          }), false, 'addMessage'),

        updateConversation: (id, updates) =>
          set((state) => ({
            conversations: state.conversations.map(conv =>
              conv.id === id ? { ...conv, ...updates } : conv
            )
          }), false, 'updateConversation'),

        deleteConversation: (id) =>
          set((state) => ({
            conversations: state.conversations.filter(conv => conv.id !== id),
            currentConversation: state.currentConversation?.id === id ? null : state.currentConversation
          }), false, 'deleteConversation'),

        getConversationMessages: (conversationId) => {
          const state = get();
          return state.messages.filter(msg => msg.conversationId === conversationId);
        },

        saveCurrentConversation: async () => {
          const state = get();
          if (!state.currentConversation) return;

          try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const conversationMessages = state.messages.filter(
              msg => msg.conversationId === state.currentConversation!.id
            );

            // Only save if there are messages
            if (conversationMessages.length === 0) return;

            // Update conversation with last message
            const lastMessage = conversationMessages[conversationMessages.length - 1];
            const updatedConversation = {
              ...state.currentConversation,
              lastMessage: lastMessage.text,
              messageCount: conversationMessages.length,
              timestamp: new Date().toISOString()
            };

            // Save conversation and messages to backend
            const response = await fetch(`${API_BASE_URL}/chat/save-conversation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify({
                conversation: updatedConversation,
                messages: conversationMessages
              })
            });

            if (response.ok) {
              console.log('✅ Conversation saved to MongoDB');
              // Update local conversation
              set((state) => ({
                conversations: state.conversations.map(conv =>
                  conv.id === updatedConversation.id ? updatedConversation : conv
                )
              }), false, 'updateSavedConversation');
            } else {
              console.warn('⚠️ Failed to save to backend, keeping local copy');
            }
          } catch (error) {
            console.warn('⚠️ Backend unavailable, conversation kept locally:', error);
          }
        },

        startNewConversation: (title = 'New Chat') => {
          const state = get();
          
          console.log('🧹 STORE: Starting new conversation - saving and clearing ALL messages');
          
          // Save current conversation if it has messages (but don't block)
          if (state.currentConversation && state.messages.some(m => m.conversationId === state.currentConversation!.id)) {
            console.log('💾 STORE: Saving current conversation before creating new one');
            state.saveCurrentConversation().catch(err => console.warn('Failed to save conversation:', err));
          }

          // Create new conversation with unique ID
          const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newConversation: Conversation = {
            id: conversationId,
            title,
            lastMessage: '',
            timestamp: new Date().toISOString(),
            messageCount: 0,
            unreadCount: 0
          };

          // ABSOLUTE CRITICAL FIX: Force complete message clearing - NO message leakage
          // This COMPLETELY resets the messages array, ensuring NO assessment/university messages carry over
          set(() => ({
            messages: [], // ABSOLUTE CLEAR - removes ALL messages from ALL conversations
            conversations: [newConversation, ...state.conversations],
            currentConversation: newConversation,
            loading: false,
            error: null
          }), false, 'startNewConversation_ABSOLUTE_CLEAR');
          
          console.log('✅ STORE: New conversation created with ABSOLUTELY CLEARED state', conversationId);
          console.log('🧹 STORE: All previous messages cleared - assessment/university messages will NOT leak');
          
          return conversationId;
        },

        clearCurrentMessages: () => {
          const state = get();
          if (state.currentConversation) {
            set((prevState) => ({
              messages: prevState.messages.filter(msg => msg.conversationId !== state.currentConversation!.id)
            }), false, 'clearCurrentMessages');
          }
        },

        // Forms actions - Load instantly
        loadForms: async () => {
          try {
            // Try to get cached data first for immediate display
            const cachedForms = localStorage.getItem('glinax-forms-cache');
            if (cachedForms) {
              const { data } = JSON.parse(cachedForms);
              set({ forms: data }, false, 'loadForms/cached');
            }
            
            // Import and use the new Forms API
            const { FormsApiService } = await import('../services/formsApi');
            const response = await FormsApiService.getForms();
            
            if (response.success && response.data) {
              set({ 
                forms: response.data
              }, false, 'loadForms/success');
            } else {
              throw new Error('Failed to load forms');
            }
          } catch {
            // Failed to load forms - using fallback data
            // Fallback to static data
            set({ 
              forms: UNIVERSITIES_DATA
            }, false, 'loadForms/error');
          }
        },

        purchaseForm: async (formId) => {
          try {
            // TODO: Replace with real API call from services/api.ts
            // const response = await formsApi.purchaseForm(formId, paymentData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const form = get().forms.find(f => f.id === formId);
            if (form) {
              set((state) => ({
                purchasedForms: [...state.purchasedForms, form]
              }), false, 'purchaseForm/success');
            }
          } catch {
            set({ 
              error: 'Failed to purchase form. Please try again.' 
            }, false, 'purchaseForm/error');
          }
        },

        loadPurchasedForms: (_userId) => {
          // TODO: Replace with real API call from services/api.ts
          // const response = await formsApi.getUserForms(userId);
          
          // Mock data for now
          const mockPurchasedForms = UNIVERSITIES_DATA.slice(0, 2);
          set({ purchasedForms: mockPurchasedForms }, false, 'loadPurchasedForms');
        },

        // Transactions actions
        loadTransactions: (_userId) => {
          // TODO: Replace with real API call from services/api.ts
          // const response = await formsApi.getPaymentHistory(userId);
          
          set({ transactions: MOCK_TRANSACTIONS }, false, 'loadTransactions');
        },

        addTransaction: (transaction) =>
          set((state) => ({
            transactions: [transaction, ...state.transactions]
          }), false, 'addTransaction'),

        // Notifications actions
        loadNotifications: (_userId) => {
          // TODO: Replace with real API call from services/api.ts
          // const response = await notificationsApi.getNotifications(userId);
          
          // Mock data for now
          const mockNotifications = [
            {
              id: "1",
              type: "info" as const,
              title: "KNUST Forms Out Now",
              message: "Application Forms are currently out, click to purchase now!",
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              isRead: false
            },
            {
              id: "2",
              type: "success" as const,
              title: "Form Purchase Successful",
              message: "Your KNUST admission form has been purchased successfully.",
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              isRead: false
            },
            {
              id: "3",
              type: "info" as const,
              title: "Assessment Results Ready",
              message: "Your program recommendation assessment results are now available.",
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              isRead: true
            },
            {
              id: "4",
              type: "warning" as const,
              title: "Application Deadline Approaching",
              message: "The deadline for university applications is in 3 days.",
              timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
              isRead: true
            },
            {
              id: "5",
              type: "info" as const,
              title: "New University Added",
              message: "University of Cape Coast has been added to our platform.",
              timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
              isRead: true
            }
          ];
          
          set({ notifications: mockNotifications }, false, 'loadNotifications');
        },

        markNotificationAsRead: (id) =>
          set((state) => ({
            notifications: state.notifications.map(notif =>
              notif.id === id ? { ...notif, isRead: true } : notif
            )
          }), false, 'markNotificationAsRead'),

        markAllNotificationsAsRead: async (_userId) => {
          // TODO: Replace with real API call from services/api.ts
          // await notificationsApi.markAllAsRead(userId);
          
          // Simulate API delay for better UX
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set((state) => ({
            notifications: state.notifications.map(notif => ({ ...notif, isRead: true }))
          }), false, 'markAllNotificationsAsRead');
        },

        addNotification: (notification) => {
          const newNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}`
          };
          
          set((state) => ({
            notifications: [newNotification, ...state.notifications]
          }), false, 'addNotification');
        },

        // UI actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
        setLoading: (loading) => set({ loading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),

        // Utility actions
        clearError: () => set({ error: null }, false, 'clearError'),
        
        reset: () => set({
          user: null,
          isAuthenticated: false,
          isGuest: false,
          conversations: [],
          currentConversation: null,
          messages: [],
          forms: [],
          purchasedForms: [],
          transactions: [],
          notifications: [],
          sidebarOpen: false,
          loading: false,
          error: null
        }, false, 'reset')
      }),
      {
        name: 'glinax-store', // Local storage key
        partialize: (state) => ({
          // Only persist essential data
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isGuest: state.isGuest,
          conversations: state.conversations,
          purchasedForms: state.purchasedForms,
          transactions: state.transactions
        })
      }
    ),
    {
      name: 'glinax-store' // DevTools name
    }
  )
);

// Selectors for optimized re-renders
export const useUser = () => useAppStore(state => state.user);
export const useIsAuthenticated = () => useAppStore(state => state.isAuthenticated);
export const useIsGuest = () => useAppStore(state => state.isGuest);
export const useConversations = () => useAppStore(state => state.conversations);
export const useCurrentConversation = () => useAppStore(state => state.currentConversation);
export const useMessages = () => useAppStore(state => state.messages);
export const useForms = () => useAppStore(state => state.forms);
export const usePurchasedForms = () => useAppStore(state => state.purchasedForms);
export const useTransactions = () => useAppStore(state => state.transactions);
export const useNotifications = () => useAppStore(state => state.notifications);
export const useSidebarOpen = () => useAppStore(state => state.sidebarOpen);
export const useLoading = () => useAppStore(state => state.loading);
export const useError = () => useAppStore(state => state.error);