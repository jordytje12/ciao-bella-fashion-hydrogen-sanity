import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/($locale).account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {getSeoMeta, rootSeo} from '~/lib/seo';
import {getUiTranslations, t} from '~/lib/translations';
import type {RootLoader} from '~/root';

export function shouldRevalidate() {
  return true;
}

export const meta: Route.MetaFunction = ({matches}) => {
  const {seo} = rootSeo(matches);
  const root = matches.find((match) => match?.id === 'root')?.data as
    | {consent?: {language?: string}}
    | undefined;
  const labels = getUiTranslations(root?.consent?.language as never);
  return getSeoMeta(seo, {
    title: labels.accountDetails,
    robots: {noIndex: true},
  });
};

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const labels = getUiTranslations(rootData?.consent.language);

  const heading = customer
    ? customer.firstName
      ? t(labels.accountWelcomeNamed, {name: customer.firstName})
      : labels.accountWelcome
    : labels.accountDetails;

  return (
    <div className="account">
      <h1>{heading}</h1>
      <br />
      <AccountMenu labels={labels} />
      <br />
      <br />
      <Outlet context={{customer}} />
    </div>
  );
}

function AccountMenu({
  labels,
}: {
  labels: ReturnType<typeof getUiTranslations>;
}) {
  function isActiveStyle({
    isActive,
    isPending,
  }: {
    isActive: boolean;
    isPending: boolean;
  }) {
    return {
      fontWeight: isActive ? 'bold' : undefined,
      color: isPending ? 'grey' : 'black',
    };
  }

  return (
    <nav role="navigation">
      <NavLink to="/account/orders" style={isActiveStyle}>
        {labels.accountOrders} &nbsp;
      </NavLink>
      &nbsp;|&nbsp;
      <NavLink to="/account/profile" style={isActiveStyle}>
        &nbsp; {labels.accountProfile} &nbsp;
      </NavLink>
      &nbsp;|&nbsp;
      <NavLink to="/account/addresses" style={isActiveStyle}>
        &nbsp; {labels.accountAddresses} &nbsp;
      </NavLink>
      &nbsp;|&nbsp;
      <Logout label={labels.accountSignOut} />
    </nav>
  );
}

function Logout({label}: {label: string}) {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
      &nbsp;<button type="submit">{label}</button>
    </Form>
  );
}
