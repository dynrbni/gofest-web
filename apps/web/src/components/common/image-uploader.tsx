import { useEffect, useId, useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { assetUrl } from '@/lib/assets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ImageFolder = 'events' | 'organizers' | 'avatars' | 'cms';
interface ImageUploaderProps {
  label: string;
  folder: ImageFolder;
  value: string | null;
  onChange: (key: string | null) => void;
  hint: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ImageUploader({
  label,
  folder,
  value,
  onChange,
  hint,
  disabled,
  onUploadingChange,
}: ImageUploaderProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const maxMB = folder === 'avatars' ? 2 : 8;
  async function upload(file: File) {
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Pilih gambar JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Ukuran gambar maksimal ${maxMB} MB.`);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const body = new FormData();
      body.append('folder', folder);
      body.append('file', file);
      const result = await api<{ key: string }>('/uploads', { method: 'POST', body });
      if (mounted.current) onChange(result.key);
    } catch (failure) {
      if (mounted.current) setError(errorMessage(failure));
    } finally {
      if (mounted.current) {
        setUploading(false);
        setPreview(null);
        onUploadingChange?.(false);
      }
    }
  }
  const image = preview ?? assetUrl(value);
  return (
    <div className="space-y-3" aria-busy={uploading}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <p id={`${id}-hint`} className="text-xs leading-5 text-slate-600">
        {hint} JPG, PNG, WebP. Maksimal {maxMB} MB.
      </p>
      {image ? (
        <img
          src={image}
          alt={`Pratinjau ${label.toLowerCase()}`}
          width={folder === 'avatars' ? 160 : 1500}
          height={folder === 'avatars' ? 160 : 500}
          className={
            folder === 'avatars'
              ? 'size-24 rounded-full border border-slate-200 object-cover'
              : 'aspect-[3/1] w-full rounded-lg border border-slate-200 bg-slate-50 object-cover'
          }
        />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Belum ada gambar.
        </div>
      )}
      <Input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="h-auto py-2"
        disabled={disabled || uploading}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      {value ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => input.current?.click()}
          >
            Ganti gambar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            Hapus gambar
          </Button>
        </div>
      ) : null}
      {uploading ? (
        <p role="status" className="text-sm text-blue-700">
          Mengunggah gambar… Tunggu sebelum menyimpan.
        </p>
      ) : null}
      {error ? (
        <p role="alert" id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
