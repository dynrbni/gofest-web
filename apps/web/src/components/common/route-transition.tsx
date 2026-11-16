import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLoading } from '@/components/common/states';

const authPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [readyPath, setReadyPath] = useState<string | null>(null);
  const auth = authPaths.has(pathname.replace(/\/+$/, ''));
  const account = /^\/account(?:\/|$)/.test(pathname);
  const pending = !account && readyPath !== pathname;

  useEffect(() => {
    if (account) return;
    const timer = window.setTimeout(() => setReadyPath(pathname), 320);
    return () => window.clearTimeout(timer);
  }, [pathname, account]);

  return (
    <>
      {pending ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-white" data-route-loading>
          <PageLoading fullPage />
        </div>
      ) : null}
      <div
        inert={pending}
        aria-hidden={pending ? true : undefined}
        style={pending ? { visibility: 'hidden' } : undefined}
      >
        <Suspense
          key={auth ? 'auth' : account ? 'account' : pathname}
          fallback={<PageLoading fullPage={!account} />}
        >
          {children}
        </Suspense>
      </div>
    </>
  );
}
