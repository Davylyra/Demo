// FILE: glinax-chatbot/src/contexts/AuthContext.tsx
// PURPOSE: Connect to REAL backend API for authentication
// HOW: Replace your entire AuthContext.tsx with this code

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  is_verified?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginAsGuest: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      console.log('🔍 Checking for existing session...');
      
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const isGuestSession = localStorage.getItem('glinax-guest') === 'true';
      
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('✅ Session found, user:', userData.name);
          setUser(userData);
          setIsAuthenticated(true);
          
          // CRITICAL FIX: Only set guest mode if there's no real token (guest sessions don't have tokens)
          if (isGuestSession && !token) {
            setIsGuest(true);
          } else if (token) {
            // Real authenticated user - ensure guest mode is off
            setIsGuest(false);
          }
        } catch (err) {
          console.error('❌ Failed to parse stored user:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('glinax-guest');
        }
      } else {
        console.log('ℹ️ No existing session found');
      }
    };

    checkSession();
  }, []);

  // ✅ LOGIN with real backend
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔓 Logging in with email:', email);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || 'Login failed';
        console.error('❌ Login failed:', message);
        setError(message);
        return { success: false, message };
      }

      // ✅ Save token and user to localStorage
      console.log('✅ Login successful, saving token and user');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // CRITICAL FIX: Clear guest session completely when real login succeeds
      localStorage.removeItem('glinax-guest');
      
      setUser(data.user);
      setIsAuthenticated(true);
      setIsGuest(false);
      
      console.log('🔄 FIXED: Login completed - Guest mode cleared:', {
        isAuthenticated: true,
        isGuest: false,
        hasToken: true
      });

      return { success: true, message: 'Login successful!' };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      console.error('❌ Login error:', message);
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ SIGNUP with real backend
  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📝 Signing up with email:', email);

      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || 'Signup failed';
        console.error('❌ Signup failed:', message);
        setError(message);
        return { success: false, message };
      }

      // ✅ Save token and user to localStorage
      console.log('✅ Signup successful, saving token and user');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // CRITICAL FIX: Clear guest session completely when real signup succeeds
      localStorage.removeItem('glinax-guest');
      
      setUser(data.user);
      setIsAuthenticated(true);
      setIsGuest(false);
      
      console.log('🔄 FIXED: Signup completed - Guest mode cleared:', {
        isAuthenticated: true,
        isGuest: false,
        hasToken: true
      });

      return { success: true, message: 'Account created successfully!' };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      console.error('❌ Signup error:', message);
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ LOGIN AS GUEST
  const loginAsGuest = () => {
    console.log('👤 Entering guest mode');
    
    const guestUser: User = {
      id: 'guest',
      name: 'Guest User',
      email: 'guest@glinax.com',
    };
    
    localStorage.setItem('user', JSON.stringify(guestUser));
    localStorage.setItem('glinax-guest', 'true');
    
    setUser(guestUser);
    setIsGuest(true);
    setIsAuthenticated(true);
    setError(null);
  };

  // ✅ LOGOUT
  const logout = () => {
    console.log('🚪 Logging out');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('glinax-guest');
    
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    setError(null);
    
    // Redirect to login
    window.location.href = '/login';
  };

  // ✅ UPDATE PROFILE
  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log('✅ Profile updated');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isGuest,
    isLoading,
    error,
    login,
    logout,
    signup,
    loginAsGuest,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};