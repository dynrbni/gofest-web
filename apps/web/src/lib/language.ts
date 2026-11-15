import { useEffect, useSyncExternalStore } from 'react';

export type Language = 'id' | 'en';
const key = 'gofest-language';
let current: Language = 'id';
try {
  if (localStorage.getItem(key) === 'en') current = 'en';
} catch {
  // Language switching also works when browser storage is unavailable.
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    current = event.newValue === 'en' ? 'en' : 'id';
    listener();
  };
  window.addEventListener(key, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(key, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, () => current);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return {
    language,
    t: (indonesian: string, english: string) => (language === 'en' ? english : indonesian),
    setLanguage: (value: Language) => {
      current = value;
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Keep the in-memory preference. */
      }
      window.dispatchEvent(new Event(key));
    },
  };
}
