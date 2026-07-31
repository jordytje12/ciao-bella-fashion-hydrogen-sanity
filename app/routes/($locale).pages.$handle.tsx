import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).pages.$handle';
import {PortableText, type PortableTextBlock} from '@portabletext/react';
import {ContentPage} from '~/components/ContentPage';
import {HeroBanner} from '~/components/HeroBanner';
import {CollectionModules} from '~/components/CollectionModules';
import {portableTextComponents} from '~/components/PortableTextComponents';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {getSeoMeta, canonicalUrl, rootSeo} from '~/lib/seo';
import {sanityLanguage} from '~/lib/i18n';
import {
  sanityImageConfig,
  sanityImageProps,
  urlFor,
  type SanityImageConfig,
} from '~/lib/sanityImage';
import {
  resolveContentModules,
  resolveLinkUrl,
  SANITY_MODULES_GROQ,
  type SanityContentModuleRaw,
  type SanityLinkRaw,
} from '~/lib/sanityModules';

export const meta: Route.MetaFunction = ({data, matches, location}) => {
  const {origin, seo} = rootSeo(matches);

  const title =
    data?.sanityPage?.seo?.title ??
    data?.sanityPage?.title ??
    data?.page?.seo?.title ??
    data?.page?.title ??
    '';
  const description =
    data?.sanityPage?.seo?.description ??
    data?.page?.seo?.description ??
    undefined;

  return getSeoMeta(seo, {
    title,
    description,
    url: canonicalUrl(origin, location.pathname),
  });
};

type SanityHeroImageRaw = {
  asset?: {url?: string | null} | null;
} | null;

type SanityHeroRaw = {
  title?: string | null;
  description?: string | null;
  button_text?: string | null;
  link?: SanityLinkRaw[] | null;
  imageDesktop?: SanityHeroImageRaw;
  imageMobile?: SanityHeroImageRaw;
} | null;

type SanityPageRaw = {
  title?: string | null;
  showHero?: boolean | null;
  hero?: SanityHeroRaw;
  body?: PortableTextBlock[] | null;
  modules?: SanityContentModuleRaw[] | null;
  seo?: {title?: string | null; description?: string | null} | null;
} | null;

type ResolvedPageHero = {
  title: string;
  description: string | null;
  buttonText: string;
  linkUrl: string;
  desktopImage: {src: string; srcSet: string};
  mobileImage: {src: string; srcSet: string} | null;
} | null;

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 *
 * Sanity-first: als er een Sanity `page`-document met deze slug bestaat, wordt die
 * gerenderd (incl. hero, body en modules zoals de product slider). Anders valt de
 * route terug op de Shopify-pagina, zodat bestaande standaardpagina's (privacyverklaring,
 * cookies, etc.) blijven werken.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const language = sanityLanguage(context.storefront.i18n.language);

  const [{page}, sanityPage] = await Promise.all([
    context.storefront.query(PAGE_QUERY, {
      variables: {
        handle: params.handle,
      },
    }),
    context.sanity
      .fetch<SanityPageRaw>(SANITY_PAGE_QUERY, {
        handle: params.handle,
        language,
      })
      .catch(() => null),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (sanityPage) {
    const config = sanityImageConfig(context.env);
    const modules = await resolveContentModules(
      context,
      sanityPage.modules ?? [],
      config,
    );
    const hero = sanityPage.showHero
      ? resolveHeroBanner(sanityPage.hero ?? null, config)
      : null;

    return {
      sanityPage,
      hero,
      modules,
      page: null,
    };
  }

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  return {
    page,
    sanityPage: null,
    hero: null,
    modules: [],
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

function resolveHeroBanner(
  raw: SanityHeroRaw,
  config: SanityImageConfig,
): ResolvedPageHero {
  if (!raw?.imageDesktop?.asset?.url || !raw.title) return null;

  const desktopImage = sanityImageProps(
    raw.imageDesktop as Parameters<typeof urlFor>[0],
    config,
    {width: 2000},
  );
  if (!desktopImage.src) return null;

  const mobileImage = raw.imageMobile?.asset?.url
    ? sanityImageProps(raw.imageMobile as Parameters<typeof urlFor>[0], config, {
        width: 900,
      })
    : null;

  return {
    title: raw.title,
    description: raw.description ?? null,
    buttonText: raw.button_text ?? 'Shop now',
    linkUrl: resolveLinkUrl(raw.link?.[0]),
    desktopImage,
    mobileImage,
  };
}

export default function Page() {
  const {page, sanityPage, hero, modules} = useLoaderData<typeof loader>();

  if (sanityPage) {
    return (
      <article className="content-page">
        <header className="content-page__header">
          {hero ? null : (
            <h1 className="content-page__title">{sanityPage.title}</h1>
          )}
        </header>
        {hero ? (
          <HeroBanner
            imageUrl={hero.desktopImage.src}
            imageSrcSet={hero.desktopImage.srcSet}
            mobileImageUrl={hero.mobileImage?.src ?? hero.desktopImage.src}
            mobileImageSrcSet={hero.mobileImage?.srcSet}
            title={hero.title}
            description={hero.description ?? undefined}
            link={{text: hero.buttonText, url: hero.linkUrl}}
            markAsHero={false}
          />
        ) : null}
        {sanityPage.body?.length ? (
          <div className="content-page__body">
            <PortableText
              value={sanityPage.body}
              components={portableTextComponents}
            />
          </div>
        ) : null}
        <CollectionModules modules={modules} />
      </article>
    );
  }

  return <ContentPage title={page.title} html={page.body} />;
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;

const SANITY_PAGE_QUERY = `*[_type == "page" && slug.current == $handle && !(_id in path("drafts.**"))][0]{
  "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
  showHero,
  hero{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value),
    "button_text": coalesce(button_text[language == $language][0].value, button_text[language == "nl"][0].value),
    link[]{
      _type,
      _type == "linkInternal" => {
        reference->{
          _type,
          _type in ["collection", "product"] => { "slug": store.slug.current },
          _type == "page" => { "slug": slug.current }
        }
      },
      _type == "linkExternal" => {
        url,
        newWindow
      }
    },
    imageDesktop{ asset->{_id, url, metadata{dimensions}}, hotspot, crop },
    imageMobile{ asset->{_id, url, metadata{dimensions}}, hotspot, crop }
  },
  "body": coalesce(body[language == $language][0].value, body[language == "nl"][0].value)[]{
    ...,
    markDefs[]{
      ...,
      _type == "linkInternal" => {
        "docType": reference->_type,
        "slug": coalesce(reference->store.slug.current, reference->slug.current)
      },
      _type == "linkProduct" => {
        "slug": productWithVariant.product->store.slug.current
      }
    }
  },
  ${SANITY_MODULES_GROQ},
  seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value)
  }
}`;
