import type {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen/storefront-api-types';

export type Locale = {
  language: LanguageCode;
  country: CountryCode;
  label: string;
  pathPrefix: string;
};

export const countries: Record<string, Locale> = {
  default: {language: 'NL', country: 'NL', label: 'Nederland', pathPrefix: ''},
  'en-nl': {
    language: 'EN',
    country: 'NL',
    label: 'Netherlands (EN)',
    pathPrefix: '/en-nl',
  },
  'nl-be': {
    language: 'NL',
    country: 'BE',
    label: 'België',
    pathPrefix: '/nl-be',
  },
  'en-be': {
    language: 'EN',
    country: 'BE',
    label: 'Belgium (EN)',
    pathPrefix: '/en-be',
  },
  'de-de': {
    language: 'DE',
    country: 'DE',
    label: 'Deutschland',
    pathPrefix: '/de-de',
  },
  'en-de': {
    language: 'EN',
    country: 'DE',
    label: 'Germany (EN)',
    pathPrefix: '/en-de',
  },
  'en-gb': {
    language: 'EN',
    country: 'GB',
    label: 'United Kingdom',
    pathPrefix: '/en-gb',
  },
};

// Default locale per market — drives the market selector
export const marketDefaults: Record<string, string> = {
  NL: 'default',
  BE: 'nl-be',
  DE: 'de-de',
  GB: 'en-gb',
};

export const languageNames: Record<string, string> = {
  NL: 'Nederlands',
  EN: 'English',
  DE: 'Deutsch',
};
