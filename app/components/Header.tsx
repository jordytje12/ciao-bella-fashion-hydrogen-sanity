import {Suspense, useState, useEffect} from 'react';
import {Await, NavLink, useAsyncValue, useLocation} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {HeaderNav} from '~/components/HeaderNav';
import {useLocalePrefix} from '~/lib/i18n';
import type {HeaderMenuData} from '~/lib/headerMenu';

interface HeaderProps {
  menu: HeaderMenuData;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
}

export function Header({menu, isLoggedIn, cart}: HeaderProps) {
  const localePrefix = useLocalePrefix();
  const {pathname} = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Detect homepage (works with or without locale prefix like /en-gb)
  const rest = pathname.slice(localePrefix.length) || '/';
  const isHome = rest === '/' || rest === '';

  // Track whether user has scrolled past the hero
  const [scrolled, setScrolled] = useState(false);
  // topOffset: volgt de topbar omhoog terwijl die wegscrolt.
  // Start op 40 (= --topbar-height) zodat de header vanaf frame 1 juist staat.
  const TOPBAR_HEIGHT = 40;
  const [topOffset, setTopOffset] = useState(TOPBAR_HEIGHT);

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const updateScrolled = () => {
      const hero = document.querySelector<HTMLElement>('[data-hero]');
      const threshold = hero ? hero.offsetHeight * 0.5 : 200;
      setScrolled(window.scrollY > threshold);
      setTopOffset(Math.max(0, TOPBAR_HEIGHT - window.scrollY));
    };
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, {passive: true});
    return () => window.removeEventListener('scroll', updateScrolled);
  }, [isHome]);

  // light = white text/icons: on homepage before scrolling past the hero,
  // tenzij het mega-menu open is (dan krijgt de header een cream achtergrond)
  const light = isHome && !scrolled && !menuOpen;

  let headerClass = isHome
    ? scrolled
      ? 'header header--home header--scrolled'
      : 'header header--home'
    : 'header header--solid';
  if (menuOpen) headerClass += ' header--menu-open';

  return (
    <header
      className={headerClass}
      style={isHome ? {top: topOffset} : undefined}
    >
      <div className="header-inner">
        <div className="header-left">
          <HeaderMenuMobileToggle />
          <HeaderNav menu={menu} light={light} onOpenChange={setMenuOpen} />
        </div>
        <NavLink
          reloadDocument
          to={`${localePrefix}/`}
          className="header-logo"
          end
        >
          <img
            src="https://cdn.shopify.com/s/files/1/0651/3541/1427/files/Ciao_Bella.svg?v=1781609526"
            alt="Ciao Bella"
            className="header-logo-img"
            width={379}
            height={71}
          />
        </NavLink>
        <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
      </div>
    </header>
  );
}

function AccountIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title>Account</title>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title>Search</title>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title>Cart</title>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className="header-ctas" role="navigation">
      <NavLink prefetch="intent" to="/account" className="header-icon-link">
        <Suspense fallback={<AccountIcon />}>
          <Await resolve={isLoggedIn} errorElement={<AccountIcon />}>
            {() => <AccountIcon />}
          </Await>
        </Suspense>
        <span className="visually-hidden">
          <Suspense fallback="Sign in">
            <Await resolve={isLoggedIn} errorElement="Sign in">
              {(loggedIn) => (loggedIn ? 'Account' : 'Sign in')}
            </Await>
          </Suspense>
        </span>
      </NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      aria-label="Menu openen"
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Menu</title>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button className="reset header-icon-link" onClick={() => open('search')} aria-label="Search">
      <SearchIcon />
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      className="header-icon-link header-cart-link"
      aria-label={`Cart${count > 0 ? `, ${count} items` : ''}`}
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      <CartIcon />
      {count > 0 && (
        <span className="cart-badge" aria-hidden="true">
          {count}
        </span>
      )}
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

