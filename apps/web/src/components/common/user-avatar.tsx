import { useState } from 'react';
import { assetUrl } from '@/lib/assets';
import { cn } from '@/lib/utils';

export function UserAvatar({
  name,
  avatarKey,
  className,
}: {
  name: string;
  avatarKey?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = assetUrl(avatarKey);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toLocaleUpperCase('id-ID') || 'G';
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 font-semibold text-blue-800',
        className,
      )}
    >
      {src && src !== failed ? (
        <img
          src={src}
          alt=""
          width={80}
          height={80}
          onError={() => setFailed(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
