import type { AuthUser } from '@gofest/shared';
import { createContext, useContext } from 'react';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string; rememberMe?: boolean }) => Promise<AuthUser>;
  register: (input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return context;
}
