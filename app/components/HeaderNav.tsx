import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Link, NavLink, useLocation} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useLocalePrefix} from '~/lib/i18n';
import type {
  HeaderMenuData,
  HeaderMenuItem,
  MenuProductCard,
} from '~/lib/headerMenu';

const CLOSE_DELAY_MS = 150;

/**
 * Desktopnavigatie met mega-menu panelen voor collectiegroepen.
 * Losse links renderen als gewone NavLinks; groepen openen op hover/focus
 * een full-width paneel met collectie-links en productkaarten.
 */
export function HeaderNav({
  menu,
  light,
  onOpenChange,
}: {
  menu: HeaderMenuData;
  light: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {pathname} = useLocation();
  const navId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenKey(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  const closeNow = useCallback(() => {
    cancelClose();
    setOpenKey(null);
  }, [cancelClose]);

  useEffect(() => {
    onOpenChange?.(openKey !== null);
  }, [openKey, onOpenChange]);

  // Sluit het paneel bij navigatie
  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  // Sluit bij klik buiten de nav en bij Escape (focus terug op de trigger)
  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenKey(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenKey(null);
        navRef.current
          ?.querySelector<HTMLButtonElement>(`[data-menu-key="${openKey}"]`)
          ?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openKey]);

  useEffect(() => cancelClose, [cancelClose]);

  const linkColor = light ? '#fff' : '#000';

  return (
    <nav className="header-menu-desktop" role="navigation" ref={navRef}>
      {menu.items.map((item) =>
        item.kind === 'link' ? (
          <TopLevelLink key={item.key} item={item} linkColor={linkColor} />
        ) : (
          <MenuGroup
            key={item.key}
            item={item}
            linkColor={linkColor}
            panelId={`${navId}-${item.key}`}
            open={openKey === item.key}
            onOpen={() => {
              cancelClose();
              setOpenKey(item.key);
            }}
            onToggle={() => {
              cancelClose();
              setOpenKey((current) => (current === item.key ? null : item.key));
            }}
            onScheduleClose={scheduleClose}
            onCancelClose={cancelClose}
            onClose={closeNow}
          />
        ),
      )}
    </nav>
  );
}

function TopLevelLink({
  item,
  linkColor,
}: {
  item: Extract<HeaderMenuItem, {kind: 'link'}>;
  linkColor: string;
}) {
  const localePrefix = useLocalePrefix();

  if (item.external) {
    return (
      <a
        className="header-menu-item"
        href={item.to}
        rel="noopener noreferrer"
        style={{color: linkColor}}
        target={item.newWindow ? '_blank' : undefined}
      >
        {item.label}
      </a>
    );
  }

  return (
    <NavLink
      className="header-menu-item"
      end
      prefetch="intent"
      style={({isActive, isPending}) => ({
        fontWeight: isActive ? 'bold' : undefined,
        color: isPending ? 'grey' : linkColor,
      })}
      to={`${localePrefix}${item.to}`}
    >
      {item.label}
    </NavLink>
  );
}

function MenuGroup({
  item,
  linkColor,
  panelId,
  open,
  onOpen,
  onToggle,
  onScheduleClose,
  onCancelClose,
  onClose,
}: {
  item: Extract<HeaderMenuItem, {kind: 'group'}>;
  linkColor: string;
  panelId: string;
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
  onClose: () => void;
}) {
  const localePrefix = useLocalePrefix();

  return (
    <>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="true"
        className="header-menu-item reset"
        data-menu-key={item.key}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            onOpen();
          }
        }}
        onMouseEnter={onOpen}
        onMouseLeave={onScheduleClose}
        style={{color: linkColor}}
        type="button"
      >
        {item.title}
      </button>
      {open && (
        <div
          className="mega-menu-panel"
          id={panelId}
          onMouseEnter={onCancelClose}
          onMouseLeave={onScheduleClose}
        >
          <ul className="mega-menu-panel__links">
            {item.links.map((link) => (
              <li key={link.to}>
                <NavLink
                  onClick={onClose}
                  prefetch="intent"
                  to={`${localePrefix}${link.to}`}
                >
                  {link.title}
                </NavLink>
              </li>
            ))}
          </ul>
          {item.products.length > 0 && (
            <div className="mega-menu-panel__products">
              {item.products.map((product) => (
                <MegaMenuProductCard
                  key={product.id}
                  onClose={onClose}
                  product={product}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function MegaMenuProductCard({
  product,
  onClose,
}: {
  product: MenuProductCard;
  onClose: () => void;
}) {
  const localePrefix = useLocalePrefix();

  return (
    <Link
      className="collection-product-card"
      onClick={onClose}
      prefetch="intent"
      to={`${localePrefix}/products/${product.handle}`}
    >
      <div className="collection-product-card__image">
        {product.image && (
          <Image
            aspectRatio="4/5"
            data={product.image}
            sizes="(min-width: 64em) 220px, 40vw"
          />
        )}
      </div>
      <span className="collection-product-card__title">{product.title}</span>
      <span className="collection-product-card__price">
        <Money data={product.price} />
      </span>
    </Link>
  );
}
