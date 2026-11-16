import { ImageUploader } from '@/components/common/image-uploader';

export function CmsMedia({
  label,
  value,
  onChange,
  onBusy,
}: {
  label: string;
  value: string;
  onChange: (key: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 [&_img]:object-contain">
      <ImageUploader
        label={label}
        folder="cms"
        value={value || null}
        onChange={(key) => onChange(key ?? '')}
        onUploadingChange={onBusy}
        hint="Gambar disimpan ke server sebelum draft disimpan."
      />
    </div>
  );
}
