import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useId} from 'react';

type AsideType = 'search' | 'cart' | 'mobile' | 'filters' | 'closed';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

// Elements a focus trap should cycle between — mirrors the common
// WAI-ARIA APG dialog pattern's focusable-selector list.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside type="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  type,
}: {
  children?: React.ReactNode;
  type: AsideType;
  heading: React.ReactNode;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const id = useId();
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!expanded) return;

    // Remember what had focus before opening, so it can be restored on close.
    triggerRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const focusable = panel
      ? panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      : null;
    (focusable?.[0] ?? panel)?.focus();

    const abortController = new AbortController();

    document.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeRef.current();
          return;
        }

        // Trap Tab/Shift+Tab inside the panel. Re-queried on every keypress
        // (rather than captured once) so it stays correct as content changes
        // while the panel is open — e.g. the cart drawer's contents.
        if (event.key !== 'Tab' || !panel) return;
        const focusableNow = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (!focusableNow.length) return;
        const first = focusableNow[0];
        const last = focusableNow[focusableNow.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      },
      {signal: abortController.signal},
    );

    return () => {
      abortController.abort();
      // Give focus back to whatever opened this panel (e.g. the cart icon).
      triggerRef.current?.focus?.();
    };
  }, [expanded]);

  return (
    <div
      aria-modal
      className={`overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
      aria-labelledby={id}
    >
      {/* Backdrop click-to-close only — hidden from the tab order and from
          assistive tech since the labelled close button below covers the
          same action for keyboard/screen-reader users. */}
      <button
        className="close-outside"
        onClick={close}
        tabIndex={-1}
        aria-hidden="true"
      />
      <aside ref={panelRef} tabIndex={-1}>
        <header>
          <h3 id={id}>{heading}</h3>
          <button className="close reset" onClick={close} aria-label="Sluiten">
            &times;
          </button>
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');
  const open = useCallback((mode: AsideType) => setType(mode), []);
  const close = useCallback(() => setType('closed'), []);
  const value = useMemo(() => ({type, open, close}), [type, open, close]);

  return (
    <AsideContext.Provider value={value}>{children}</AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}
