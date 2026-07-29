import type {Route} from './+types/($locale).sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';
import {countries} from '~/data/countries';

// Non-default locale keys (e.g. 'en-nl', 'de-de') double as the URL path
// prefix, so they can be reused directly as hreflang alternates.
const SITEMAP_LOCALES = Object.keys(countries).filter((key) => key !== 'default');

export async function loader({
  request,
  params,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    locales: SITEMAP_LOCALES,
    getLink: ({type, baseUrl, handle, locale}) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
