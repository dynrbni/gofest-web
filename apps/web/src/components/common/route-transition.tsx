import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLoading } from '@/components/common/states';

export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [readyPath, setReadyPath] = useState<string | null>(null);
  const pending = readyPath !== pathname;

  useEffect(() => {
    const timer = window.setTimeout(() => setReadyPath(pathname), 320);
    return () => window.clearTimeout(timer);
  }, [pathname]);

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
        <Suspense key={pathname} fallback={<PageLoading fullPage />}>
          {children}
        </Suspense>
      </div>
    </>
  );
}
