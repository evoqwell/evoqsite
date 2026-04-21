import { useEffect } from 'react';

/**
 * Registers the admin-area global keyboard shortcuts that rely on single-key
 * triggers. Multi-key combos (⌘K) are wired directly where needed — this hook
 * is just the shared "single key when not typing in an input" helper.
 *
 * Currently:
 *   - `/` → focus the first element on the page marked `data-page-search`.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (target?.isContentEditable ?? false);
      if (isEditable) return;

      const el = document.querySelector<HTMLElement>('[data-page-search]');
      if (!el) return;
      e.preventDefault();
      el.focus();
      // Move cursor to end of input if it's text-like
      if (el instanceof HTMLInputElement && typeof el.select === 'function') {
        el.select();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
