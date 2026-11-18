import type { AuthUser } from '@gofest/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { api, ApiError, setAccessToken } from './api';
import { AuthContext, useAuth, type AuthContextValue } from './auth-context';
import { PageLoading } from '@/components/common/states';

async function loadMe(): Promise<AuthUser | null> {
  try {
    const data = await api<{ user: AuthUser }>('/auth/me', { skipRefresh: false });
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: loadMe,
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: async (input: { email: string; password: string; rememberMe?: boolean }) => {
      const data = await api<{ user: AuthUser; accessToken?: string }>('/auth/login', {
        method: 'POST',
        body: input,
      });
      if (data.accessToken) setAccessToken(data.accessToken);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      username: string;
      email: string;
      verificationToken: string;
      phone?: string;
      password: string;
    }) => {
      const data = await api<{ user: AuthUser; accessToken?: string }>('/auth/register', {
        method: 'POST',
        body: input,
      });
      if (data.accessToken) setAccessToken(data.accessToken);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api('/auth/logout', { method: 'POST' });
    },
    onSettled: () => {
      setAccessToken(null);
      queryClient.setQueryData(['me'], null);
      queryClient.clear();
    },
  });
  const logoutAsync = logoutMutation.mutateAsync;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      login: loginMutation.mutateAsync,
      register: registerMutation.mutateAsync,
      logout: async () => {
        await logoutAsync();
      },
      refreshMe: async () => {
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      },
    }),
    [
      meQuery.data,
      meQuery.isLoading,
      loginMutation.mutateAsync,
      registerMutation.mutateAsync,
      logoutAsync,
      queryClient,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: AuthUser['roles'];
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return <PageLoading label="Memeriksa sesi" />;
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (roles && !roles.some((role) => user.roles.includes(role))) {
    return (
      <main className="container flex min-h-[70vh] max-w-2xl flex-col items-start justify-center py-16">
        <p className="text-xs font-medium tracking-[0.14em] text-olive">Akses terbatas</p>
        <h1 className="mt-3 font-display text-4xl tracking-tightest">
          Halaman ini bukan untuk akunmu.
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          Akun {user.email} tidak memiliki izin membuka area ini. Kembali ke beranda atau masuk
          dengan akun yang sesuai.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-ink px-4 py-2 text-sm font-medium"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md bg-brick px-4 py-2 text-sm font-medium text-paper"
          >
            Ke beranda
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
