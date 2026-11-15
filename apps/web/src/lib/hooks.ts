import { useEffect, useState, useSyncExternalStore } from 'react';

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(motionQuery).matches,
    () => true,
  );
}

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Gofest` : 'Gofest';
    return () => {
      document.title = 'Gofest';
    };
  }, [title]);
}

export function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  if (!target) return 0;
  return Math.max(0, new Date(target).getTime() - now);
}
