import type {CustomerFragment} from 'customer-accountapi.generated';
import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/($locale).account.profile';
import {getSeoMeta, rootSeo} from '~/lib/seo';
import {getUiTranslations} from '~/lib/translations';
import type {RootLoader} from '~/root';

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = ({matches}) => {
  const {seo} = rootSeo(matches);
  const root = matches.find((match) => match?.id === 'root')?.data as
    | {consent?: {language?: string}}
    | undefined;
  const labels = getUiTranslations(root?.consent?.language as never);
  return getSeoMeta(seo, {
    title: labels.accountProfileTitle,
    robots: {noIndex: true},
  });
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'PUT') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    const validInputKeys = ['firstName', 'lastName'] as const;
    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        customer[key as (typeof validInputKeys)[number]] = value;
      }
    }

    // update customer and possibly password
    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
          language: customerAccount.i18n.language,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error('Customer profile update failed.');
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: any) {
    return data(
      {error: error.message, customer: null},
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;
  const rootData = useRouteLoaderData<RootLoader>('root');
  const labels = getUiTranslations(rootData?.consent.language);

  return (
    <div className="account-profile">
      <h2>{labels.accountProfileTitle}</h2>
      <br />
      <Form method="PUT">
        <legend>{labels.accountPersonalInfo}</legend>
        <fieldset>
          <label htmlFor="firstName">{labels.accountFirstName}</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder={labels.accountFirstName}
            aria-label={labels.accountFirstName}
            defaultValue={customer.firstName ?? ''}
            minLength={2}
          />
          <label htmlFor="lastName">{labels.accountLastName}</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder={labels.accountLastName}
            aria-label={labels.accountLastName}
            defaultValue={customer.lastName ?? ''}
            minLength={2}
          />
        </fieldset>
        {action?.error ? (
          <p>
            <mark>
              <small>{action.error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        <button type="submit" disabled={state !== 'idle'}>
          {state !== 'idle' ? labels.accountUpdating : labels.accountUpdate}
        </button>
      </Form>
    </div>
  );
}
