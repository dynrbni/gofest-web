import { useEffect, useRef, useState, type ReactNode } from 'react';

export function DeferredSection({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={element}>{visible ? children : fallback}</div>;
}
