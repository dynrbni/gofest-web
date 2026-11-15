import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, type ReactNode } from 'react';
import { PageLoading } from '@/components/common/states';

export function RouteContent({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="route-content">
      <Suspense fallback={<PageLoading />}>{children ?? <Outlet />}</Suspense>
    </div>
  );
}
