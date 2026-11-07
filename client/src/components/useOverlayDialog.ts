import { useEffect, useRef, type RefObject } from 'react';

const PHONE = '(max-width: 860px)';

// Master-detail panes become full-screen overlays on phones. There they must
// behave like a dialog: focus moves in on open, Escape closes, focus returns
// to where it was, and the list behind is inert (WCAG 2.4.3 / 4.1.2).
export function useOverlayDialog(
  open: boolean,
  onClose: () => void,
  panel: RefObject<HTMLElement>,
  behind: RefObject<HTMLElement>,
): { isPhone: boolean } {
  const isPhone = typeof window !== 'undefined' && window.matchMedia(PHONE).matches;
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !window.matchMedia(PHONE).matches) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, textarea');
    first?.focus();
    const list = behind.current;
    if (list) list.setAttribute('inert', '');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (list) list.removeAttribute('inert');
      returnTo.current?.focus?.();
    };
    // onClose identity may change per render; the panel open state is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { isPhone };
}
