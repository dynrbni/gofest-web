import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, api, errorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { defaultDocument, type CmsDocument, type CmsModule, type CmsRecord } from './cms-models';
import { setCmsPending as mark, useCmsOperation } from './cms-state';
export function CmsAutoEditor({
  module,
  record,
  initial,
  onCreated,
  children,
}: {
  module: CmsModule;
  record: CmsRecord | 'new';
  initial?: CmsDocument;
  onCreated?: (record: CmsRecord) => void;
  children: (props: {
    document: CmsDocument;
    onChange: (value: CmsDocument) => void;
    onBusy: (busy: boolean) => void;
    busy: boolean;
  }) => ReactNode;
}) {
  const client = useQueryClient();
  const operation = useCmsOperation();
  const [document, setDocument] = useState<CmsDocument>(
    () =>
      initial ??
      (record === 'new'
        ? defaultDocument(module)
        : { ...defaultDocument(module), ...record.draft }),
  );
  const [state, setState] = useState<'saved' | 'waiting' | 'saving' | 'error' | 'conflict'>(
    'saved',
  );
  const [message, setMessage] = useState('');
  const [uploads, setUploads] = useState(0);
  const ref = useRef({
    token: {},
    key: `${module}-${crypto.randomUUID()}`,
    row: record === 'new' ? null : record,
    desired: document,
    saved: JSON.stringify(document),
    running: false,
    uploads: 0,
    mounted: true,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    failed: false,
  });
  const createdRef = useRef(onCreated);
  createdRef.current = onCreated;
  async function save() {
    const editor = ref.current;
    clearTimeout(editor.timer);
    if (
      editor.running ||
      editor.uploads ||
      editor.failed ||
      JSON.stringify(editor.desired) === editor.saved
    )
      return;
    editor.running = true;
    mark(editor.token, true);
    if (editor.mounted) {
      setState('saving');
      setMessage('');
    }
    try {
      while (JSON.stringify(editor.desired) !== editor.saved && !editor.uploads) {
        const snapshot = editor.desired;
        const previous = editor.row;
        await client.cancelQueries({ queryKey: ['cms', module] });
        const result = await api<{ item: CmsRecord }>(
          `/admin/cms/${module}${previous ? `/${previous.id}` : ''}`,
          {
            method: previous ? 'PATCH' : 'POST',
            body: {
              document: snapshot,
              ...(previous ? { expectedVersion: previous.version } : { key: editor.key }),
            },
          },
        )
          .then((result) => ({ ...result, recovered: false }))
          .catch(async (error: unknown) => {
            if (!previous && error instanceof ApiError && error.status === 409) {
              const latest = await api<{ items: CmsRecord[] }>(`/admin/cms/${module}`);
              const existing = latest.items.find((item) => item.key === editor.key);
              if (existing) return { item: existing, recovered: true };
            }
            throw error;
          });
        editor.row = result.item;
        editor.saved = JSON.stringify(result.recovered ? result.item.draft : snapshot);
        client.setQueryData<{ items: CmsRecord[] }>(['cms', module], (old) =>
          old
            ? {
                items: previous
                  ? old.items.map((item) => (item.id === previous.id ? result.item : item))
                  : [...old.items, result.item],
              }
            : { items: [result.item] },
        );
        if (JSON.stringify(editor.desired) === editor.saved) {
          editor.desired = result.item.draft;
          editor.saved = JSON.stringify(result.item.draft);
          if (editor.mounted) setDocument(result.item.draft);
        }
        void client.invalidateQueries({ queryKey: ['cms', 'changes'] });
        void client.invalidateQueries({ queryKey: ['cms-site', 'draft'] });
      }
      if (
        record === 'new' &&
        editor.row &&
        editor.mounted &&
        JSON.stringify(editor.desired) === editor.saved
      )
        createdRef.current?.(editor.row);
      if (editor.mounted) setState('saved');
    } catch (error) {
      editor.failed = true;
      if (error instanceof ApiError && error.status === 409 && editor.row) {
        const latest = await api<{ items: CmsRecord[] }>(`/admin/cms/${module}`).catch(() => null);
        const row = latest?.items.find((item) => item.id === editor.row?.id);
        if (row) {
          editor.row = row;
          editor.desired = row.draft;
          editor.saved = JSON.stringify(row.draft);
          client.setQueryData(['cms', module], latest);
          if (editor.mounted) setDocument(row.draft);
        }
        if (editor.mounted) {
          setState('conflict');
          setMessage(
            'Konten telah diubah di tempat lain. Versi terbaru dimuat; periksa kembali sebelum melanjutkan.',
          );
        }
      } else if (editor.mounted) {
        setState('error');
        const detail =
          error instanceof ApiError
            ? error.details?.map((item) => item.message).join('. ')
            : undefined;
        setMessage(`Draft belum tersimpan. ${detail || errorMessage(error)}`);
      }
    } finally {
      editor.running = false;
      mark(
        editor.token,
        editor.failed || editor.uploads > 0 || JSON.stringify(editor.desired) !== editor.saved,
      );
    }
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const editor = ref.current;
    editor.mounted = true;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (editor.running || editor.uploads || JSON.stringify(editor.desired) !== editor.saved) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      editor.mounted = false;
      clearTimeout(editor.timer);
      window.removeEventListener('beforeunload', beforeUnload);
      // A sidebar navigation must still save edits queued by the debounce.
      void saveRef.current();
    };
  }, []);
  useEffect(() => {
    if (record === 'new') return;
    const editor = ref.current;
    if (
      (editor.row && editor.row.version >= record.version) ||
      editor.running ||
      editor.failed ||
      JSON.stringify(editor.desired) !== editor.saved
    )
      return;
    editor.row = record;
    editor.desired = record.draft;
    editor.saved = JSON.stringify(record.draft);
    setDocument(record.draft);
  }, [record]);
  function change(value: CmsDocument) {
    const editor = ref.current;
    editor.desired = value;
    editor.failed = false;
    setDocument(value);
    setMessage('');
    clearTimeout(editor.timer);
    if (!editor.running && !editor.uploads && JSON.stringify(value) === editor.saved) {
      setState('saved');
      mark(editor.token, false);
      return;
    }
    setState('waiting');
    mark(editor.token, true);
    editor.timer = setTimeout(() => {
      void saveRef.current();
    }, 700);
  }
  function onBusy(busy: boolean) {
    const editor = ref.current;
    editor.uploads = Math.max(0, editor.uploads + (busy ? 1 : -1));
    setUploads(editor.uploads);
    mark(
      editor.token,
      editor.uploads > 0 || editor.failed || JSON.stringify(editor.desired) !== editor.saved,
    );
    if (!editor.uploads) void saveRef.current();
  }
  return (
    <div className="space-y-5">
      <div role="status" aria-live="polite" className="text-xs leading-5 text-slate-600">
        {uploads
          ? 'Mengunggah gambar...'
          : state === 'saving' || state === 'waiting'
            ? 'Menyimpan perubahan...'
            : state === 'saved'
              ? 'Tersimpan sebagai draft'
              : message}
        {(state === 'error' || state === 'conflict') && (
          <Button
            type="button"
            variant="outline"
            className="ml-2"
            onClick={() => {
              ref.current.failed = false;
              setMessage('');
              setState('saved');
              mark(ref.current.token, JSON.stringify(ref.current.desired) !== ref.current.saved);
              void saveRef.current();
            }}
          >
            {state === 'conflict' ? 'Saya sudah memeriksa' : 'Coba simpan lagi'}
          </Button>
        )}
        {state === 'error' && (
          <Button
            type="button"
            variant="outline"
            className="ml-2"
            onClick={() => {
              const editor = ref.current;
              const original = editor.row?.draft ?? initial ?? defaultDocument(module);
              editor.desired = original;
              editor.saved = JSON.stringify(original);
              editor.failed = false;
              setDocument(original);
              setMessage('');
              setState('saved');
              mark(editor.token, false);
            }}
          >
            Batalkan perubahan
          </Button>
        )}
      </div>
      {children({ document, onChange: change, onBusy, busy: uploads > 0 || operation })}
    </div>
  );
}
