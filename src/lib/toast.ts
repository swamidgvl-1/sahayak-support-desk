export type ToastKind = 'success' | 'error' | 'info';

/** Fire a toast from anywhere in client code. */
export function toast(message: string, kind: ToastKind = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, kind } }));
}
