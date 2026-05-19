import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api';
import { getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.me();
      if (res.data?.role !== 'admin') {
        setToken(null);
        setUser(null);
      } else {
        setUser(res.data);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const data = res.data;

    if (data.token) setToken(data.token);

    if (data.requiresVerification) {
      return { requiresVerification: true, email: data.email || email };
    }

    if (data.role !== 'admin') {
      setToken(null);
      throw new Error('Admin access only. Use an admin account.');
    }

    setToken(data.token);
    setUser(data);
    return { success: true };
  };

  const verifyOtp = async (email, otp) => {
    const res = await authApi.verifyOtp(email, otp);
    const data = res.data;
    if (data.role !== 'admin') {
      throw new Error('Admin access only.');
    }
    setToken(data.token);
    setUser(data);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
