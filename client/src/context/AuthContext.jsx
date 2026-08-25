import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  // Fetch authenticated user profile on initial load or token change
  const fetchCurrentUser = async () => {
    const activeToken = localStorage.getItem('auth_token');
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiClient.get('/auth/me');
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to restore auth session:', err.message);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  // Request Email OTP
  const requestOTP = async (email) => {
    return await apiClient.post('/auth/request-otp', { email });
  };

  // Verify Email OTP & Login
  const verifyOTP = async (email, otp) => {
    const data = await apiClient.post('/auth/verify-otp', { email, otp });
    if (data.success && data.token) {
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  // Google OAuth Login
  const loginWithGoogle = async (googlePayload) => {
    const data = await apiClient.post('/auth/google', googlePayload);
    if (data.success && data.token) {
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  // Logout User
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('[AuthContext] Logout warning:', err.message);
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    role: user?.role || 'VISITOR',
    isVisitor: user?.role === 'VISITOR',
    isStaff: user?.role === 'STAFF',
    isAdmin: user?.role === 'ADMIN',
    requestOTP,
    verifyOTP,
    loginWithGoogle,
    logout,
    refreshUser: fetchCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
