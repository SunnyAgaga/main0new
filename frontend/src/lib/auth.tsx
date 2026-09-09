import { createContext, useContext, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAuthMe, useLogout, getGetAuthMeQueryKey, type AuthUser } from '@/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const authMe = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey(), retry: false },
  });
  const logoutMutation = useLogout();

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        queryClient.removeQueries({ queryKey: authMe.queryKey });
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{ user: authMe.data ?? null, isLoading: authMe.isLoading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
