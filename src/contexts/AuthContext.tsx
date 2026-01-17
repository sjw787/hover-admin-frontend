'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, type User, type LoginCredentials } from '@/lib/api';
import { getUserRole, getCustomerId, getEmail } from '@/lib/jwt';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  userRole: 'admin' | 'customer' | null;
  customerId: string | null;
  isAdmin: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Warning time before expiration (in seconds)
const WARNING_TIME = 120; // Show modal 2 minutes before expiration
const LOGOUT_TIME = 60; // Auto-logout after 60 seconds of no response

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'customer' | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    console.log('🔄 loadUser called');
    try {
      const accessToken = localStorage.getItem('access_token');
      console.log('🔑 Access token exists:', !!accessToken);

      if (!accessToken) {
        console.log('❌ No access token found');
        setIsLoading(false);
        return;
      }

      // Decode role and customer ID from token
      const role = getUserRole(accessToken);
      const custId = getCustomerId(accessToken);
      const emailFromToken = getEmail(accessToken);
      console.log('👤 Decoded role:', role, 'Customer ID:', custId, 'Email:', emailFromToken);

      setUserRole(role);
      setCustomerId(custId);

      console.log('📡 Fetching current user...');
      const userData = await api.getCurrentUser();
      console.log('✅ User loaded:', userData.username);

      // Ensure email is set - use email from JWT if API doesn't return it
      if (!userData.email && emailFromToken) {
        userData.email = emailFromToken;
        console.log('📧 Set email from JWT token:', emailFromToken);
      }

      setUser(userData);
    } catch (error) {
      console.error('❌ Failed to load user:', error);
      console.log('🧹 Clearing invalid tokens');
      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiration');
      setUser(null);
      setUserRole(null);
      setCustomerId(null);
    } finally {
      console.log('✅ loadUser complete, isLoading = false');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiration');
    setUser(null);
    setUserRole(null);
    setCustomerId(null);
    setShowTimeoutModal(false);
    router.push('/login');
  }, [router]);

  // Check token expiration and show modal
  useEffect(() => {
    if (!user) {
      setShowTimeoutModal(false);
      return;
    }

    const checkExpiration = () => {
      const expirationStr = localStorage.getItem('token_expiration');
      if (!expirationStr) return;

      const expiration = parseInt(expirationStr, 10);
      const now = Date.now();
      const timeUntilExpiration = (expiration - now) / 1000; // in seconds

      // Show modal when within warning time
      if (timeUntilExpiration <= WARNING_TIME && timeUntilExpiration > 0) {
        setShowTimeoutModal(true);
      }

      // Auto-logout if token expired
      if (timeUntilExpiration <= 0) {
        logout();
      }
    };

    // Check immediately
    checkExpiration();

    // Check every 10 seconds
    const interval = setInterval(checkExpiration, 10000);

    return () => clearInterval(interval);
  }, [user, logout]);

  const refreshUserToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.refreshToken(refreshToken);

      // Store new tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('id_token', response.id_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      // Calculate and store expiration time
      const expirationTime = Date.now() + response.expires_in * 1000;
      localStorage.setItem('token_expiration', expirationTime.toString());

      setShowTimeoutModal(false);
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const login = async (credentials: LoginCredentials) => {
    console.log('🔐 Login function called');
    try {
      console.log('📡 Calling API login...');
      const response = await api.login(credentials);
      console.log('✅ API login successful');

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('id_token', response.id_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      // Calculate and store expiration time
      const expirationTime = Date.now() + response.expires_in * 1000;
      localStorage.setItem('token_expiration', expirationTime.toString());
      console.log('💾 Tokens stored in localStorage');

      // Verify tokens were stored
      const storedToken = localStorage.getItem('access_token');
      console.log('🔍 Verification - Token stored:', !!storedToken);

      // Decode role and customer ID from token
      const role = getUserRole(response.access_token);
      const custId = getCustomerId(response.access_token);
      console.log('👤 Decoded role:', role, 'Customer ID:', custId);

      setUserRole(role);
      setCustomerId(custId);

      // Load user data
      console.log('👤 Loading user data...');
      const userData = await api.getCurrentUser();
      console.log('✅ User data loaded:', userData.username);

      // Set user state BEFORE redirecting
      setUser(userData);
      console.log('💾 User state set');

      // Small delay to ensure state propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to gallery after successful login
      console.log('🚀 Redirecting to landing page...');
      router.push('/');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const handleStayLoggedIn = () => {
    refreshUserToken();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    userRole,
    customerId,
    isAdmin: userRole === 'admin',
    isCustomer: userRole === 'customer',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionTimeoutModal
        isOpen={showTimeoutModal}
        remainingSeconds={LOGOUT_TIME}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={logout}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

