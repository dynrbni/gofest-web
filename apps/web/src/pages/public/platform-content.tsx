import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ContentItem } from '@/pages/workspace/content';

export function PlatformContent() {
  const query = useQuery({
    queryKey: ['public-content'],
    queryFn: () => api<{ items: ContentItem[] }>('/content'),
    staleTime: 60_000,
  });
  if (!query.data?.items.length) return null;
  return (
    <section className="container py-6" aria-label="Informasi dan promosi GOFEST">
      <div className="grid gap-4 md:grid-cols-2">
        {query.data.items.map((item) => {
          const content = (
            <>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  width={1200}
                  height={400}
                  loading="lazy"
                  className="aspect-[3/1] w-full object-cover"
                />
              ) : null}
              <div className="p-5">
                <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                {item.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </>
          );
          return item.targetUrl ? (
            item.targetUrl.startsWith('/') ? (
              <Link
                to={item.targetUrl}
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-400"
              >
                {content}
              </Link>
            ) : (
              <a
                key={item.id}
                href={item.targetUrl}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-400"
              >
                {content}
              </a>
            )
          ) : (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
