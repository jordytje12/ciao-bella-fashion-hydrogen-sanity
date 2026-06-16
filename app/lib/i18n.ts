import type {I18nBase} from '@shopify/hydrogen';
import {useParams} from 'react-router';
import {countries} from '~/data/countries';

export function useLocalePrefix(): string {
  const {locale} = useParams();
  return locale ? `/${locale}` : '';
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
