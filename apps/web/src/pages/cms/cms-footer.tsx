import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, EmptyState } from '@/components/common/states';
import { BrandLogo } from '@/components/common/brand-logo';
import { assetUrl } from '@/lib/assets';
import { cn } from '@/lib/utils';
import { Panel, QueryState } from '../workspace/workspace-components';
import { CmsAutoEditor } from './cms-autosave';
import { useCmsOperation, useCmsPending } from './cms-state';
import { cmsSorted, useCmsRecords } from './cms-data';
import { CmsFields } from './cms-fields';
import { CmsMedia } from './cms-media';
import { CmsItemMenu, CmsOrderButtons, CmsStatus, CmsVisibility } from './cms-controls';
import type { NavigationDocument, SettingsDocument } from './cms-models';

type Placement = NavigationDocument['placement'];
export function MenuFooter() {
  const [placement, setPlacement] = useState<Placement>('FOOTER');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [linkPreview, setLinkPreview] = useState<{
    id: string;
    document: NavigationDocument;
  } | null>(null);
  const navigation = useCmsRecords('navigation');
  const settings = useCmsRecords('settings');
  const pending = useCmsPending();
  const operation = useCmsOperation();
  const items = cmsSorted(navigation.data?.items ?? []).filter(
    (record) => (record.draft as NavigationDocument).placement === placement,
  );
  const selected = items.find((record) => record.id === editing);
  const general = settings.data?.items.find((record) => record.key === 'general');
  const previewLinks = items.map((record) =>
    linkPreview?.id === record.id ? linkPreview.document : (record.draft as NavigationDocument),
  );
  if (linkPreview?.id === 'new') previewLinks.push(linkPreview.document);
  function select(id: string | 'new' | null) {
    setEditing(id);
    setLinkPreview(null);
  }
  const list = (
    <Panel
      title={placement === 'FOOTER' ? 'Tautan Jelajahi website' : 'Tautan bagian atas'}
      description="Susun tautan yang membantu pengunjung menemukan halaman website."
    >
      <QueryState query={navigation}>
        {items.length ? (
          <ul className="divide-y divide-slate-200">
            {items.map((record) => {
              const doc = record.draft as NavigationDocument;
              return (
                <li
                  key={record.id}
                  className={cn(
                    'border-l-4 p-3',
                    editing === record.id ? 'border-blue-600 bg-blue-50' : 'border-transparent',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold">{doc.label}</h3>
                      <CmsStatus record={record} />
                    </div>
                    <CmsItemMenu
                      module="navigation"
                      record={record}
                      onDeleted={() => select(null)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CmsOrderButtons module="navigation" record={record} items={items} />
                    <CmsVisibility module="navigation" record={record} />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending > 0}
                      onClick={() => select(record.id)}
                    >
                      Ubah<span className="sr-only"> {doc.label}</span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-3 text-sm leading-6 text-slate-600">
            Belum ada tautan pada bagian ini. Tambahkan halaman yang perlu ditemukan pengunjung.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={pending > 0}
          onClick={() => select('new')}
        >
          <Plus className="size-4" aria-hidden />
          Tambah tautan
        </Button>
      </QueryState>
    </Panel>
  );
  const editor =
    selected || editing === 'new' ? (
      <Panel
        title={
          selected
            ? `Ubah ${selected.draft && 'label' in selected.draft ? selected.draft.label : 'tautan'}`
            : 'Tambah tautan'
        }
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending > 0}
            onClick={() => select(null)}
            aria-label="Tutup editor tautan"
          >
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <CmsAutoEditor
          key={selected?.id ?? `new-${placement}`}
          module="navigation"
          record={selected ?? 'new'}
          initial={
            selected
              ? undefined
              : {
                  label: '',
                  href: '/events',
                  placement,
                  visible: true,
                  sortOrder: items.length * 10,
                  external: false,
                }
          }
          onCreated={(record) => {
            setEditing(record.id);
            setLinkPreview(null);
          }}
        >
          {({ document, onChange, onBusy, busy }) => (
            <fieldset disabled={busy || operation} className="min-w-0">
              <CmsFields
                module="navigation"
                document={document}
                onChange={(next) => {
                  setLinkPreview({
                    id: selected?.id ?? 'new',
                    document: next as NavigationDocument,
                  });
                  onChange(next);
                }}
                placement={placement}
                featured={false}
                onBusy={onBusy}
              />
            </fieldset>
          )}
        </CmsAutoEditor>
      </Panel>
    ) : (
      <Panel title="Ubah tautan">
        <p className="text-sm leading-6 text-slate-600">
          Pilih Ubah pada tautan atau Tambah tautan untuk mengisi nama dan memilih halaman tujuan.
        </p>
      </Panel>
    );
  return (
    <div className="space-y-6">
      <Tabs
        value={placement}
        onValueChange={(value) => {
          setPlacement(value as Placement);
          select(null);
        }}
      >
        <TabsList className="h-auto p-1">
          <TabsTrigger value="HEADER" disabled={pending > 0} className="min-h-11 px-5">
            Header
          </TabsTrigger>
          <TabsTrigger value="FOOTER" disabled={pending > 0} className="min-h-11 px-5">
            Footer
          </TabsTrigger>
        </TabsList>
        <TabsContent value={placement} className="pt-5">
          {placement === 'FOOTER' ? (
            <QueryState query={settings}>
              {general ? (
                <CmsAutoEditor key={general.id} module="settings" record={general}>
                  {({ document, onChange, onBusy, busy }) => {
                    const footer = document as SettingsDocument;
                    return (
                      <div className="grid items-start gap-6 xl:grid-cols-2">
                        <div className="min-w-0 space-y-6">
                          <Panel
                            title="Bagian bawah website"
                            description="Perubahan logo dan deskripsi langsung terlihat pada pratinjau."
                          >
                            <fieldset disabled={busy || operation} className="min-w-0 space-y-5">
                              <FooterFields
                                document={footer}
                                onChange={(next) => onChange(next)}
                                onBusy={onBusy}
                              />
                            </fieldset>
                          </Panel>
                          {list}
                        </div>
                        <div className="min-w-0 space-y-6 xl:sticky xl:top-6">
                          <FooterPreview document={footer} links={previewLinks} />
                          {editor}
                        </div>
                      </div>
                    );
                  }}
                </CmsAutoEditor>
              ) : (
                <EmptyState
                  title="Pengaturan footer belum tersedia"
                  description="Pengaturan website harus tersedia sebelum footer dapat diubah."
                />
              )}
            </QueryState>
          ) : (
            <div className="grid items-start gap-6 xl:grid-cols-2">
              <div className="min-w-0">{list}</div>
              <div className="min-w-0 space-y-6 xl:sticky xl:top-6">
                <HeaderPreview links={previewLinks} />
                {editor}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
function FooterFields({
  document,
  onChange,
  onBusy,
}: {
  document: SettingsDocument;
  onChange: (value: SettingsDocument) => void;
  onBusy: (busy: boolean) => void;
}) {
  const descriptionId = useId();
  const copyrightId = useId();
  return (
    <>
      <CmsMedia
        label="Logo footer"
        value={document.footerLogoKey}
        onChange={(footerLogoKey) => onChange({ ...document, footerLogoKey })}
        onBusy={onBusy}
      />
      <Field label="Deskripsi singkat" htmlFor={descriptionId}>
        <Textarea
          id={descriptionId}
          rows={4}
          maxLength={2000}
          value={document.footerDescription}
          onChange={(event) => onChange({ ...document, footerDescription: event.target.value })}
        />
      </Field>
      <Field label="Teks hak cipta" htmlFor={copyrightId}>
        <Input
          id={copyrightId}
          className="min-h-11"
          maxLength={500}
          value={document.copyright}
          onChange={(event) => onChange({ ...document, copyright: event.target.value })}
        />
      </Field>
    </>
  );
}
function PreviewLinks({ links }: { links: NavigationDocument[] }) {
  const visible = [...links]
    .filter((link) => link.visible && link.label)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return visible.length ? (
    <ul className="space-y-1">
      {visible.map((link, index) => (
        <li key={`${index}-${link.href}`}>
          {safeDestination(link.href) ? (
            link.href.startsWith('/') ? (
              <Link
                to={link.href}
                className="inline-flex min-h-11 items-center break-words text-sm text-slate-700 underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            ) : (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center break-words text-sm text-slate-700 underline-offset-4 hover:underline"
              >
                {link.label}
              </a>
            )
          ) : (
            <span className="inline-flex min-h-11 items-center text-sm text-slate-600">
              {link.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-600">Tautan yang ditampilkan akan muncul di sini.</p>
  );
}
function safeDestination(href: string) {
  if (!href || href.startsWith('//') || href.includes('\\')) return false;
  try {
    return (
      ['http:', 'https:'].includes(new URL(href, window.location.origin).protocol) &&
      (href.startsWith('/') || /^https?:\/\//i.test(href))
    );
  } catch {
    return false;
  }
}
function FooterPreview({
  document,
  links,
}: {
  document: SettingsDocument;
  links: NavigationDocument[];
}) {
  const logo = assetUrl(document.footerLogoKey || document.logoKey);
  return (
    <Panel title="Pratinjau footer" description="Pratinjau mengikuti draft yang sedang Anda ubah.">
      <footer className="rounded-lg bg-slate-50 p-4">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {logo ? (
              <img
                src={logo}
                alt={document.websiteName}
                width={180}
                height={58}
                className="h-11 w-auto max-w-full object-contain"
              />
            ) : (
              <BrandLogo className="max-w-[180px]" />
            )}
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
              {document.footerDescription}
            </p>
            {document.email && (
              <p className="mt-3 break-words text-sm text-slate-600">{document.email}</p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Jelajahi website</h3>
            <PreviewLinks links={links} />
          </div>
        </div>
        <p className="mt-5 break-words border-t border-slate-200 pt-4 text-xs text-slate-600">
          © {new Date().getFullYear()} {document.copyright || document.websiteName}
        </p>
      </footer>
    </Panel>
  );
}
function HeaderPreview({ links }: { links: NavigationDocument[] }) {
  return (
    <Panel
      title="Pratinjau header"
      description="Nama dan tujuan mengikuti tautan yang sedang diubah."
    >
      <div className="rounded-lg border border-slate-200 p-4">
        <BrandLogo className="max-w-[150px]" />
        <nav aria-label="Pratinjau navigasi atas" className="mt-4">
          <PreviewLinks links={links} />
        </nav>
      </div>
    </Panel>
  );
}
