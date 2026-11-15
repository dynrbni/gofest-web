import { Skeleton } from '@/components/ui/skeleton';

export function EventGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-3xl bg-blue-50 p-3">
          <Skeleton className="aspect-[5/2] w-full rounded-xl" />
          <div className="mt-3 space-y-4 rounded-2xl bg-white p-4">
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-7 w-1/2" />
            <div className="flex items-center gap-3 border-t border-dashed border-slate-200 pt-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-3/4 max-w-md sm:h-10" />
      <Skeleton className="h-4 w-1/2 max-w-sm" />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6 rounded-xl border border-slate-100 bg-white p-5 sm:p-8">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function CitySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="container space-y-8 py-8 sm:py-12">
      <HeadingSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-11" />
        ))}
      </div>
      <Skeleton className="h-4 w-28" />
      <EventGridSkeleton />
    </div>
  );
}

function WorkspaceSkeleton({ pathname }: { pathname: string }) {
  const form = /\/(settings|profile|new|edit|apply)$/.test(pathname);
  return (
    <div className="container grid min-h-[70vh] gap-8 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="hidden space-y-5 lg:block">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
      <div className="min-w-0 space-y-8">
        <HeadingSkeleton />
        {form ? (
          <FormSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
            <div className="space-y-5 rounded-xl border border-slate-100 p-5">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PageSkeleton({ pathname }: { pathname: string }) {
  if (/^\/(login|register|forgot-password|reset-password)$/.test(pathname))
    return (
      <div className="auth-page">
        <div className="auth-container">
          <Skeleton className="hidden aspect-[3/2] w-full rounded-3xl md:block" />
          <div className="w-full space-y-8">
            <Skeleton className="h-11 w-40" />
            <HeadingSkeleton />
            <FormSkeleton />
            <Skeleton className="mx-auto h-4 w-2/3" />
          </div>
        </div>
      </div>
    );

  if (/^\/(admin|organizer|account|staff)(\/|$)/.test(pathname))
    return <WorkspaceSkeleton pathname={pathname} />;

  if (/^\/(checkout|order|ticket)\//.test(pathname))
    return (
      <div className="container space-y-8 py-8 sm:py-12">
        <Skeleton className="h-16 w-full" />
        <HeadingSkeleton />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <FormSkeleton />
          <div className="space-y-5 rounded-xl border border-slate-100 p-5">
            <Skeleton className="aspect-video w-full" />
            <HeadingSkeleton />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );

  if (pathname === '/')
    return (
      <>
        <Skeleton className="hero-frame w-full rounded-none" />
        <div className="container space-y-8 py-10">
          <HeadingSkeleton />
          <EventGridSkeleton />
          <HeadingSkeleton />
          <CitySkeleton />
        </div>
      </>
    );

  if (pathname === '/cities')
    return (
      <div className="container min-h-[60vh] space-y-8 py-12">
        <HeadingSkeleton />
        <CitySkeleton />
      </div>
    );

  if (pathname.startsWith('/organizers/'))
    return (
      <div className="container space-y-8 py-8">
        <Skeleton className="aspect-[7/2] max-h-80 w-full rounded-2xl" />
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 shrink-0 rounded-full sm:size-32" />
          <div className="min-w-0 flex-1">
            <HeadingSkeleton />
          </div>
        </div>
        <Skeleton className="h-11 w-60 max-w-full" />
        <EventGridSkeleton />
      </div>
    );

  if (/^\/events\/[^/]+$/.test(pathname))
    return (
      <div className="container grid min-h-[70vh] gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-8">
          <HeadingSkeleton />
          <Skeleton className="h-12 w-full" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className={index === 5 ? 'h-4 w-2/3' : 'h-4 w-full'} />
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );

  if (pathname === '/events' || pathname.startsWith('/events/city/')) return <CatalogSkeleton />;

  return (
    <div className="container min-h-[60vh] max-w-4xl space-y-7 py-12">
      <HeadingSkeleton />
      {Array.from({ length: 10 }, (_, index) => (
        <Skeleton key={index} className={index % 3 === 2 ? 'h-4 w-2/3' : 'h-4 w-full'} />
      ))}
    </div>
  );
}

export function SiteSkeleton({ pathname }: { pathname: string }) {
  if (/^\/(login|register|forgot-password|reset-password)$/.test(pathname))
    return <PageSkeleton pathname={pathname} />;
  const checkout = /^\/(checkout|order)\//.test(pathname);
  return (
    <>
      <div className="border-b border-slate-100">
        <div className="container flex min-h-24 items-center gap-5 py-4">
          <Skeleton className="h-10 w-32 shrink-0" />
          {!checkout ? <Skeleton className="hidden h-11 flex-1 sm:block" /> : null}
          <Skeleton className="ml-auto h-10 w-20 sm:w-28" />
        </div>
      </div>
      <PageSkeleton pathname={pathname} />
      {!checkout ? (
        <div className="border-t border-slate-100">
          <div className="container grid gap-8 py-12 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
