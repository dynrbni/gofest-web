import { useSyncExternalStore } from 'react';

const pending = new Set<object>();
const operations = new Set<object>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function setCmsPending(token: object, value: boolean) {
  if (value) pending.add(token);
  else pending.delete(token);
  listeners.forEach((listener) => listener());
}
export function setCmsOperation(token: object, value: boolean) {
  if (value) operations.add(token);
  else operations.delete(token);
  setCmsPending(token, value);
}
export function useCmsPending() {
  return useSyncExternalStore(subscribe, () => pending.size);
}
export function useCmsOperation() {
  return useSyncExternalStore(subscribe, () => operations.size > 0);
}
