import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { api } from './api';
import type { EventSummary } from './models';
import type {
  BannerDocument,
  NavigationDocument,
  PageDocument,
  SectionDocument,
  SettingsDocument,
} from '@/pages/cms/cms-models';

type Entry<T> = T & { id: string; key: string };
export interface CmsSite {
  settings: SettingsDocument;
  sections: Array<Entry<SectionDocument> & { events: EventSummary[] }>;
  banners: Entry<BannerDocument>[];
  navigation: Entry<NavigationDocument>[];
  pages?: Entry<PageDocument>[];
  updatedAt: string | null;
  preview: boolean;
}
export function useCmsSite() {
  const { pathname } = useLocation();
  const preview = pathname === '/admin/cms/preview';
  return useQuery({
    queryKey: ['cms-site', preview ? 'draft' : 'published'],
    queryFn: () => api<CmsSite>(preview ? '/admin/cms/preview' : '/cms/site'),
    staleTime: preview ? 0 : 15_000,
    refetchInterval: preview ? false : 30_000,
    refetchOnWindowFocus: true,
  });
}
