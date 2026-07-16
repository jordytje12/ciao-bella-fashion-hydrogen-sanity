import type {I18nBase} from '@shopify/hydrogen';
import {useParams} from 'react-router';
import {countries} from '~/data/countries';

/** Basistaal voor Sanity content (lowercase, overeenkomend met LANGUAGES ids in studio) */
export const SANITY_BASE_LANGUAGE = 'nl';

/**
 * Zet de Hydrogen/Shopify language code (uppercase bv. 'NL', 'EN', 'DE')
 * om naar de lowercase Sanity taal-id ('nl', 'en', 'de').
 */
export function sanityLanguage(language: I18nLocale['language']): string {
  return language.toLowerCase();
}

export function useLocalePrefix(): string {
  const {locale} = useParams();
  if (!locale) return '';

  // Optional `($locale)` can capture unknown first path segments (e.g. `/404`).
  // Only treat known market prefixes as a locale path.
  const key = locale.toLowerCase();
  if (key !== 'default' && key in countries) {
    return `/${key}`;
  }

  return '';
}

export interface I18nLocale extends I18nBase {
  pathPrefix: string;
}

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toLowerCase() ?? '';
  const locale = countries[firstPathPart];

  if (locale) {
    return {
      language: locale.language,
      country: locale.country,
      pathPrefix: `/${firstPathPart}`,
    };
  }

  return {
    language: countries.default.language,
    country: countries.default.country,
    pathPrefix: '',
  };
}
