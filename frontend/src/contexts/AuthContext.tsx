import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

/** Mirrors the Prisma DisabilityType enum. Drives which dashboard a student lands on (see lib/homePath.ts). */
export type DisabilityType = 'NONE' | 'AUTISM' | 'ADHD' | 'BLINDNESS' | 'DEAFNESS';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  teacherStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null;
  disabilityType?: DisabilityType | null;
  demoResult?: any;
  freeTrialUsed?: boolean;
  hasPaid?: boolean;
  subscription?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    intendedRole?: 'STUDENT' | 'TEACHER',
    disabilityType?: DisabilityType | null
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user || data); // backend returns user directly from /me
      } catch (error) {
        console.error('Failed to load user', error);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user as User;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    intendedRole: 'STUDENT' | 'TEACHER' = 'STUDENT',
    disabilityType: DisabilityType | null = null
  ) => {
    const { data } = await api.post('/auth/register', { name, email, password, intendedRole, disabilityType });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user || data);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
