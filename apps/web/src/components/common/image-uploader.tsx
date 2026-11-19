import { useEffect, useId, useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { assetUrl } from '@/lib/assets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ImageFolder = 'events' | 'organizers' | 'avatars' | 'cms' | 'cms-cities';
interface ImageUploaderProps {
  label: string;
  folder: ImageFolder;
  value: string | null;
  onChange: (key: string | null) => void;
  hint: string;
  disabled?: boolean;
  hidePreview?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ImageUploader({
  label,
  folder,
  value,
  onChange,
  hint,
  disabled,
  hidePreview = false,
  onUploadingChange,
}: ImageUploaderProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
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
  const cityIllustration = folder === 'cms-cities';
  const maxMB = folder === 'avatars' || cityIllustration ? 2 : 8;
  const formats = cityIllustration
    ? ['image/png', 'image/webp']
    : ['image/jpeg', 'image/png', 'image/webp'];
  async function upload(file: File) {
    setError(null);
    if (!formats.includes(file.type)) {
      setError(
        cityIllustration
          ? 'Pilih ilustrasi PNG atau WebP transparan.'
          : 'Pilih gambar JPG, PNG, atau WebP.',
      );
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
    <div
      className={`space-y-3 ${cityIllustration ? `rounded-lg border-2 border-dashed p-4 ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}` : ''}`}
      aria-busy={uploading}
      onDragOver={(event) => {
        if (!cityIllustration) return;
        event.preventDefault();
        if (!disabled && !uploading) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!cityIllustration) return;
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file && !disabled && !uploading) void upload(file);
      }}
    >
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <p id={`${id}-hint`} className="text-xs leading-5 text-slate-600">
        {hint}{' '}
        {cityIllustration
          ? 'PNG/WebP transparan, persegi, minimal 600 × 600 px.'
          : 'JPG, PNG, WebP.'}{' '}
        Maksimal {maxMB} MB.
      </p>
      {!hidePreview &&
        (image ? (
          <img
            src={image}
            alt={`Pratinjau ${label.toLowerCase()}`}
            width={folder === 'avatars' ? 160 : cityIllustration ? 600 : 1500}
            height={folder === 'avatars' ? 160 : cityIllustration ? 600 : 500}
            className={
              cityIllustration
                ? 'mx-auto aspect-square w-40 object-contain'
                : folder === 'avatars'
                  ? 'size-24 rounded-full border border-slate-200 object-cover'
                  : 'aspect-[3/1] w-full rounded-lg border border-slate-200 bg-slate-50 object-cover'
            }
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Belum ada gambar.
          </div>
        ))}
      <Input
        ref={input}
        id={id}
        type="file"
        accept={formats.join(',')}
        className={cityIllustration ? 'sr-only' : 'h-auto py-2'}
        disabled={disabled || uploading}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      {cityIllustration && !value ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => input.current?.click()}
        >
          Pilih ilustrasi
        </Button>
      ) : null}
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
