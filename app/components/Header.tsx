import {Suspense, useState, useEffect} from 'react';
import {Await, NavLink, useAsyncValue, useLocation} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {MarketSelector} from '~/components/LocaleSelector';
import {useLocalePrefix} from '~/lib/i18n';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';


export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;
  const localePrefix = useLocalePrefix();
  const {pathname} = useLocation();

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

  // light = white text/icons: on homepage before scrolling past the hero
  const light = isHome && !scrolled;

  const headerClass = isHome
    ? scrolled
      ? 'header header--home header--scrolled'
      : 'header header--home'
    : 'header header--solid';

  return (
    <header
      className={headerClass}
      style={isHome ? {top: topOffset} : undefined}
    >
      <div className="header-inner">
        <div className="header-left">
          <HeaderMenuMobileToggle />
          <HeaderMenu
            menu={menu}
            viewport="desktop"
            primaryDomainUrl={header.shop.primaryDomain.url}
            publicStoreDomain={publicStoreDomain}
            light={light}
          />
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

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
  light = false,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
  light?: boolean;
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();
  const localePrefix = useLocalePrefix();
  const linkColor = light ? '#fff' : '#000';

  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={close}
          prefetch="intent"
          style={({isActive, isPending}) => activeLinkStyle({isActive, isPending}, '#000')}
          to="/"
        >
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const rawUrl =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        const url = rawUrl.startsWith('/') ? `${localePrefix}${rawUrl}` : rawUrl;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            style={({isActive, isPending}) => activeLinkStyle({isActive, isPending}, linkColor)}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
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
      <span className="header-market">
        <MarketSelector />
      </span>
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
    >
      <h3>☰</h3>
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

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

function activeLinkStyle(
  {isActive, isPending}: {isActive: boolean; isPending: boolean},
  color: string = '#000',
) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : color,
  };
}
