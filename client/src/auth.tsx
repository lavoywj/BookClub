import { createContext, useContext, useMemo, useState } from 'react';
import { api, LoginResponse, User } from './api';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login(email: string, password: string): Promise<void>;
  register(payload: {
    username: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    major?: string;
  }): Promise<void>;
  logout(): void;
  setUser(user: User): void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const tokenKey = 'bookclub.token';
const userKey = 'bookclub.user';

function readUser() {
  const storedUser = localStorage.getItem(userKey);
  return storedUser ? JSON.parse(storedUser) as User : null;
}

function persistSession(session: LoginResponse) {
  localStorage.setItem(tokenKey, session.token);
  localStorage.setItem(userKey, JSON.stringify(session.user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [user, setUserState] = useState<User | null>(() => readUser());

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    async login(email, password) {
      const session = await api.login(email, password);
      persistSession(session);
      setToken(session.token);
      setUserState(session.user);
    },
    async register(payload) {
      const session = await api.register(payload);
      persistSession(session);
      setToken(session.token);
      setUserState(session.user);
    },
    logout() {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
      setToken(null);
      setUserState(null);
    },
    setUser(nextUser) {
      localStorage.setItem(userKey, JSON.stringify(nextUser));
      setUserState(nextUser);
    }
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
