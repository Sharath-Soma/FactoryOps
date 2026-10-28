import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Factory } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  activeFactory: Factory | null;
  inspectingFactory: Factory | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email?: string; username?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER_SUPERVISOR' | 'TECHNICIAN' | 'PRODUCTION_PLANNER') => Promise<void>;
  inspectFactory: (factory: Factory) => void;
  stopInspectingFactory: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeFactory, setActiveFactory] = useState<Factory | null>(null);
  const [inspectingFactory, setInspectingFactory] = useState<Factory | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const savedToken = api.getToken();
    if (!savedToken) {
      setUser(null);
      setActiveFactory(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      setUser(data.user);
      setActiveFactory(data.factory || null);
      setToken(savedToken);
      setError(null);
    } catch {
      setUser(null);
      setActiveFactory(null);
      setToken(null);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      setUser(null);
      setActiveFactory(null);
      setInspectingFactory(null);
      setToken(null);
    };

    window.addEventListener('factoryops:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('factoryops:unauthorized', handleUnauthorized);
  }, [refreshUser]);

  const login = async (credentials: { email?: string; username?: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(credentials);
      setUser(res.user);
      setActiveFactory(res.factory || null);
      setToken(res.token);
      setInspectingFactory(null);
      api.setInspectingFactoryId(null);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setActiveFactory(null);
      setInspectingFactory(null);
      setToken(null);
      api.setInspectingFactoryId(null);
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER_SUPERVISOR' | 'TECHNICIAN' | 'PRODUCTION_PLANNER') => {
    const roleCredentials: Record<string, { email: string; pass: string }> = {
      SUPER_ADMIN: { email: 'superadmin@factoryops.com', pass: 'SuperAdmin@123' },
      ADMIN: { email: 'admin.apex@factoryops.com', pass: 'Admin@123' },
      MANAGER_SUPERVISOR: { email: 'manager.apex@factoryops.com', pass: 'Manager@123' },
      TECHNICIAN: { email: 'tech.apex@factoryops.com', pass: 'Tech@123' },
      PRODUCTION_PLANNER: { email: 'planner.apex@factoryops.com', pass: 'Planner@123' },
    };
    const target = roleCredentials[role];
    if (target) {
      await login({ email: target.email, password: target.pass });
    }
  };

  const inspectFactory = (factory: Factory) => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setInspectingFactory(factory);
    api.setInspectingFactoryId(factory.id);
  };

  const stopInspectingFactory = () => {
    setInspectingFactory(null);
    api.setInspectingFactoryId(null);
  };

  // The effectively active factory is either the inspected one (for Super Admin) or the user's assigned one
  const currentEffectiveFactory = inspectingFactory || activeFactory;

  return (
    <AuthContext.Provider
      value={{
        user,
        activeFactory: currentEffectiveFactory,
        inspectingFactory,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        logout,
        switchDemoRole,
        inspectFactory,
        stopInspectingFactory,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
