import {useLoaderData, Link, useRouteLoaderData} from 'react-router';
import type {Route} from './+types/($locale).policies._index';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';
import {getSeoMeta, canonicalUrl, rootSeo} from '~/lib/seo';
import {getUiTranslations} from '~/lib/translations';
import type {RootLoader} from '~/root';

export const meta: Route.MetaFunction = ({matches, location}) => {
  const {origin, seo} = rootSeo(matches);
  const root = matches.find((match) => match?.id === 'root')?.data as
    | {consent?: {language?: string}}
    | undefined;
  const labels = getUiTranslations(root?.consent?.language as never);
  return getSeoMeta(seo, {
    title: labels.policiesTitle,
    url: canonicalUrl(origin, location.pathname),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);

  const shopPolicies = data.shop;
  // subscriptionPolicy has no detail route — omit to avoid 404s
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const labels = getUiTranslations(rootData?.consent.language);

  return (
    <div className="policies">
      <h1>{labels.policiesTitle}</h1>
      <div>
        {policies.map((policy) => (
          <fieldset key={policy.id}>
            <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
    }
  }
` as const;
