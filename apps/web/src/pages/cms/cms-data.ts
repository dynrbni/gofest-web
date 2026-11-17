import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, api, errorMessage } from '@/lib/api';
import { setCmsOperation } from './cms-state';
import type { CmsDocument, CmsModule, CmsRecord } from './cms-models';

export function useCmsRecords(module: CmsModule) {
  return useQuery({
    queryKey: ['cms', module],
    queryFn: ({ signal }) => api<{ items: CmsRecord[] }>(`/admin/cms/${module}`, { signal }),
  });
}
export function useCmsUpdate() {
  const client = useQueryClient();
  const token = useRef({});
  return useMutation({
    mutationFn: ({
      module,
      record,
      document,
    }: {
      module: CmsModule;
      record: CmsRecord;
      document: CmsDocument;
    }) =>
      api<{ item: CmsRecord }>(`/admin/cms/${module}/${record.id}`, {
        method: 'PATCH',
        body: { document, expectedVersion: record.version },
      }),
    onMutate: async ({ module }) => {
      setCmsOperation(token.current, true);
      await client.cancelQueries({ queryKey: ['cms', module] });
    },
    onSuccess: ({ item }, { module }) => {
      client.setQueryData<{ items: CmsRecord[] }>(
        ['cms', module],
        (old) => old && { items: old.items.map((row) => (row.id === item.id ? item : row)) },
      );
      void client.invalidateQueries({ queryKey: ['cms', 'changes'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 409
          ? 'Konten sudah berubah. Daftar terbaru dimuat; coba kembali setelah memeriksanya.'
          : errorMessage(error),
      );
      void client.invalidateQueries({ queryKey: ['cms'] });
    },
    onSettled: () => setCmsOperation(token.current, false),
  });
}
export function cmsSorted(items: CmsRecord[]) {
  return [...items].sort(
    (a, b) =>
      ('sortOrder' in a.draft ? a.draft.sortOrder : 0) -
      ('sortOrder' in b.draft ? b.draft.sortOrder : 0),
  );
}
