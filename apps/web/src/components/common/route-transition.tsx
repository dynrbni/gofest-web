import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLoading } from '@/components/common/states';

export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [readyPath, setReadyPath] = useState<string | null>(null);
  const account = /^\/account(?:\/|$)/.test(pathname);
  const workspace = /^\/(admin|creator|organizer)(?:\/|$)/.test(pathname);
  const pending = !account && !workspace && readyPath !== pathname;

  useEffect(() => {
    if (account || workspace) return;
    const timer = window.setTimeout(() => setReadyPath(pathname), 320);
    return () => window.clearTimeout(timer);
  }, [pathname, account, workspace]);

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
        <Suspense fallback={<PageLoading fullPage={!account && !workspace} />}>{children}</Suspense>
      </div>
    </>
  );
}
