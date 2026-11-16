import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { api, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useCmsSite } from '@/lib/cms';
import { ErrorState, PageLoading } from '@/components/common/states';
import { PublicLayout } from '@/components/layout/public-layout';
import type { PageDocument } from '@/pages/cms/cms-models';
import { CmsHomepage } from './cms-home';

function PageDocumentContent({ page }: { page: PageDocument }) {
  useDocumentTitle(page.title);
  useEffect(() => {
    if (page.seoTitle) document.title = page.seoTitle;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta && page.seoDescription) meta.content = page.seoDescription;
  }, [page.seoTitle, page.seoDescription]);
  return (
    <main className="container max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div className="prose prose-slate mt-8 max-w-none break-words">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{page.content}</ReactMarkdown>
      </div>
    </main>
  );
}
export function CmsPublicPage({
  slug: suppliedSlug,
  fallback,
}: { slug?: string; fallback?: ReactNode } = {}) {
  const params = useParams();
  const slug = suppliedSlug ?? params.slug ?? params.pageSlug;
  const query = useQuery({
    queryKey: ['cms-page', slug],
    queryFn: () => api<{ page: PageDocument }>(`/cms/pages/${encodeURIComponent(slug!)}`),
    enabled: Boolean(slug),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  if (query.isLoading) return <PageLoading label="Memuat halaman" />;
  if (query.data) return <PageDocumentContent page={query.data.page} />;
  if (fallback && query.error instanceof ApiError && query.error.status === 404) return fallback;
  return (
    <main className="container max-w-3xl py-16">
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    </main>
  );
}
function DraftPreviewContent() {
  const query = useCmsSite();
  const [search] = useSearchParams();
  if (query.isLoading) return <PageLoading label="Memuat pratinjau draft" />;
  if (!query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const slug = search.get('page');
  if (slug) {
    const page = query.data.pages?.find((item) => item.slug === slug);
    return page ? (
      <PageDocumentContent page={page} />
    ) : (
      <main className="container py-16">
        <h1 className="text-2xl font-semibold">Draft halaman tidak ditemukan</h1>
        <p className="mt-3">Simpan draft halaman sebelum membukanya di preview.</p>
      </main>
    );
  }
  return <CmsHomepage site={query.data} />;
}
export function CmsPreviewPage() {
  return (
    <PublicLayout>
      <DraftPreviewContent />
    </PublicLayout>
  );
}
