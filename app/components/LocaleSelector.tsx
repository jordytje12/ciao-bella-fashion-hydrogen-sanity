import {useLocation, useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';
import {countries, marketDefaults, languageNames} from '~/data/countries';

function stripLocalePrefix(pathname: string) {
  return pathname.replace(/^\/[a-z]{2}-[a-z]{2}/, '') || '/';
}

function navigateToLocale(url: string) {
  window.location.assign(url);
}

const languageFlags: Record<string, string> = {
  NL: 'NL',
  EN: 'GB',
  DE: 'DE',
};

function FlagIcon({country}: {country: string}) {
  const props = {
    xmlns: 'http://www.w3.org/2000/svg',
    style: {width: '24px', height: 'auto', display: 'block'},
  };
  switch (country) {
    case 'NL':
      return (
        <svg {...props} viewBox="0 0 900 600">
          <rect width="900" height="200" fill="#AE1C28" />
          <rect y="200" width="900" height="200" fill="#FFFFFF" />
          <rect y="400" width="900" height="200" fill="#21468B" />
        </svg>
      );
    case 'BE':
      return (
        <svg {...props} viewBox="0 0 900 600">
          <rect width="300" height="600" fill="#000000" />
          <rect x="300" width="300" height="600" fill="#FAE042" />
          <rect x="600" width="300" height="600" fill="#EF3340" />
        </svg>
      );
    case 'DE':
      return (
        <svg {...props} viewBox="0 0 5 3">
          <rect width="5" height="3" fill="#FFCE00" />
          <rect width="5" height="2" fill="#DD0000" />
          <rect width="5" height="1" fill="#000000" />
        </svg>
      );
    case 'GB':
      return (
        <svg {...props} viewBox="0 0 60 30">
          <clipPath id="gb-clip">
            <path d="M0,0 v30 h60 v-30 z" />
          </clipPath>
          <clipPath id="gb-t">
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <g clipPath="url(#gb-clip)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path
              d="M0,0 L60,30 M60,0 L0,30"
              clipPath="url(#gb-t)"
              stroke="#C8102E"
              strokeWidth="4"
            />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

export function MarketSelector() {
  const data = useRouteLoaderData<RootLoader>('root');
  const {pathname} = useLocation();
  const currentCountry = (data?.consent?.country ?? 'NL') as string;

  function handleChange(newCountry: string) {
    const localeKey = marketDefaults[newCountry];
    if (!localeKey) return;
    const locale = countries[localeKey];
    navigateToLocale(`${locale.pathPrefix}${stripLocalePrefix(pathname)}`);
  }

  return (
    <details style={{position: 'relative'}}>
      <summary style={{listStyle: 'none', cursor: 'pointer'}}>
        <FlagIcon country={currentCountry} />
      </summary>
      <div style={{position: 'absolute', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'white', zIndex: 10}}>
        {Object.entries(marketDefaults)
          .filter(([country]) => country !== currentCountry)
          .map(([country, localeKey]) => (
            <button
              key={country}
              onClick={() => handleChange(country)}
              title={countries[localeKey].label}
              style={{border: 'none', background: 'none', cursor: 'pointer', padding: 0}}
            >
              <FlagIcon country={country} />
            </button>
          ))}
      </div>
    </details>
  );
}

export function LanguageSelector() {
  const data = useRouteLoaderData<RootLoader>('root');
  const {pathname} = useLocation();
  const currentLanguage = (data?.consent?.language ?? 'NL') as string;
  const currentCountry = (data?.consent?.country ?? 'NL') as string;

  const availableLocales = Object.entries(countries).filter(
    ([, locale]) => locale.country === currentCountry,
  );

  if (availableLocales.length <= 1) return null;

  function handleChange(newLanguage: string) {
    const entry = availableLocales.find(([, l]) => l.language === newLanguage);
    if (!entry) return;
    const [, locale] = entry;
    navigateToLocale(`${locale.pathPrefix}${stripLocalePrefix(pathname)}`);
  }

  return (
    <details style={{position: 'relative'}}>
      <summary style={{listStyle: 'none', cursor: 'pointer'}}>
        <FlagIcon country={languageFlags[currentLanguage] ?? currentCountry} />
      </summary>
      <div style={{position: 'absolute', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'white', zIndex: 10}}>
        {availableLocales
          .filter(([, locale]) => locale.language !== currentLanguage)
          .map(([key, locale]) => (
            <button
              key={key}
              onClick={() => handleChange(locale.language)}
              title={languageNames[locale.language] ?? locale.language}
              style={{border: 'none', background: 'none', cursor: 'pointer', padding: 0}}
            >
              <FlagIcon country={languageFlags[locale.language] ?? locale.country} />
            </button>
          ))}
      </div>
    </details>
  );
}
