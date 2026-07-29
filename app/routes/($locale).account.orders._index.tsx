import {
  Link,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';
import type {Route} from './+types/($locale).account.orders._index';
import {useRef} from 'react';
import {
  Money,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  ORDER_FILTER_FIELDS,
  type OrderFilterParams,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {getSeoMeta, rootSeo} from '~/lib/seo';
import {getUiTranslations, type UiTranslations} from '~/lib/translations';
import type {RootLoader} from '~/root';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export const meta: Route.MetaFunction = ({matches}) => {
  const {seo} = rootSeo(matches);
  const root = matches.find((match) => match?.id === 'root')?.data as
    | {consent?: {language?: string}}
    | undefined;
  const labels = getUiTranslations(root?.consent?.language as never);
  return getSeoMeta(seo, {
    title: labels.accountOrdersTitle,
    robots: {noIndex: true},
  });
};

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;
  const rootData = useRouteLoaderData<RootLoader>('root');
  const labels = getUiTranslations(rootData?.consent.language);

  return (
    <div className="orders">
      <OrderSearchForm currentFilters={filters} labels={labels} />
      <OrdersTable orders={orders} filters={filters} labels={labels} />
    </div>
  );
}

function OrdersTable({
  orders,
  filters,
  labels,
}: {
  orders: CustomerOrdersFragment['orders'];
  filters: OrderFilterParams;
  labels: UiTranslations;
}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="acccount-orders" aria-live="polite">
      {orders?.nodes.length ? (
        <PaginatedResourceSection connection={orders}>
          {({node: order}) => (
            <OrderItem key={order.id} order={order} labels={labels} />
          )}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders hasFilters={hasFilters} labels={labels} />
      )}
    </div>
  );
}

function EmptyOrders({
  hasFilters = false,
  labels,
}: {
  hasFilters?: boolean;
  labels: UiTranslations;
}) {
  return (
    <div>
      {hasFilters ? (
        <>
          <p>{labels.accountNoOrdersMatch}</p>
          <br />
          <p>
            <Link to="/account/orders">{labels.accountClearFilters}</Link>
          </p>
        </>
      ) : (
        <>
          <p>{labels.accountNoOrders}</p>
          <br />
          <p>
            <Link to="/collections">{labels.accountStartShopping}</Link>
          </p>
        </>
      )}
    </div>
  );
}

function OrderSearchForm({
  currentFilters,
  labels,
}: {
  currentFilters: OrderFilterParams;
  labels: UiTranslations;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching =
    navigation.state !== 'idle' &&
    navigation.location?.pathname?.includes('orders');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
    const confirmationNumber = formData
      .get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)
      ?.toString()
      .trim();

    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
    if (confirmationNumber)
      params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);

    setSearchParams(params);
  };

  const hasFilters = currentFilters.name || currentFilters.confirmationNumber;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="order-search-form"
      aria-label={labels.accountFilterOrders}
    >
      <fieldset className="order-search-fieldset">
        <legend className="order-search-legend">{labels.accountFilterOrders}</legend>

        <div className="order-search-inputs">
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.NAME}
            placeholder={labels.accountOrderNumber}
            aria-label={labels.accountOrderNumber}
            defaultValue={currentFilters.name || ''}
            className="order-search-input"
          />
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
            placeholder={labels.accountConfirmationNumber}
            aria-label={labels.accountConfirmationNumber}
            defaultValue={currentFilters.confirmationNumber || ''}
            className="order-search-input"
          />
        </div>

        <div className="order-search-buttons">
          <button type="submit" disabled={isSearching}>
            {isSearching ? labels.accountSearching : labels.searchSubmit}
          </button>
          {hasFilters && (
            <button
              type="button"
              disabled={isSearching}
              onClick={() => {
                setSearchParams(new URLSearchParams());
                formRef.current?.reset();
              }}
            >
              {labels.accountClear}
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

function OrderItem({
  order,
  labels,
}: {
  order: OrderItemFragment;
  labels: UiTranslations;
}) {
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
  return (
    <>
      <fieldset>
        <Link to={`/account/orders/${btoa(order.id)}`}>
          <strong>#{order.number}</strong>
        </Link>
        <p>{new Date(order.processedAt).toDateString()}</p>
        {order.confirmationNumber && (
          <p>
            {labels.accountConfirmation}: {order.confirmationNumber}
          </p>
        )}
        <p>{order.financialStatus}</p>
        {fulfillmentStatus && <p>{fulfillmentStatus}</p>}
        <Money data={order.totalPrice} />
        <Link to={`/account/orders/${btoa(order.id)}`}>
          {labels.accountViewOrder}
        </Link>
      </fieldset>
      <br />
    </>
  );
}
