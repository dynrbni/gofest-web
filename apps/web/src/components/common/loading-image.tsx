import { useCallback, useState, type ImgHTMLAttributes } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// The positioned parent reserves the image's layout while the placeholder covers it.
export function LoadingImage({
  src,
  className,
  onLoad,
  onError,
  loading = 'lazy',
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const [settledSource, setSettledSource] = useState<string | null>(null);
  const pending = settledSource !== src;
  const imageRef = useCallback(
    (element: HTMLImageElement | null) => {
      if (element?.complete && element.naturalWidth > 0) setSettledSource(src);
    },
    [src],
  );

  return (
    <>
      {pending ? (
        <Skeleton
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          aria-hidden
          data-image-loading
        />
      ) : null}
      <img
        {...props}
        ref={imageRef}
        src={src}
        loading={loading}
        decoding="async"
        className={cn(className, pending && 'opacity-0')}
        onLoad={(event) => {
          setSettledSource(src);
          onLoad?.(event);
        }}
        onError={(event) => {
          setSettledSource(src);
          onError?.(event);
        }}
      />
    </>
  );
}
