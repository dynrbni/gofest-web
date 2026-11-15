import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export function OverflowMarquee({
  text,
  paused,
  onOverflowChange,
  className,
}: {
  text: string;
  paused: boolean;
  onOverflowChange: (overflowing: boolean) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [duration, setDuration] = useState(8);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const content = textRef.current;
    if (!container || !content) return;
    const measure = () => {
      const width = content.getBoundingClientRect().width;
      const exceedsContainer = width > container.clientWidth + 1;
      setOverflowing(exceedsContainer);
      setDuration(Math.max(8, (width + 32) / 32));
      onOverflowChange(exceedsContainer);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [text, onOverflowChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setInView(entry.isIntersecting);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties & { '--marquee-duration': string } = {
    '--marquee-duration': `${duration}s`,
  };
  return (
    <span
      ref={containerRef}
      className={cn('overflow-marquee', className)}
      data-overflow={overflowing}
      data-paused={paused || !inView}
      title={text}
      style={style}
    >
      <span key={text} className="overflow-marquee-track">
        <span className="overflow-marquee-copy">
          <span ref={textRef} className="overflow-marquee-content">
            {text}
          </span>
        </span>
        {overflowing ? (
          <span className="overflow-marquee-copy" aria-hidden="true">
            {text}
          </span>
        ) : null}
      </span>
    </span>
  );
}
