export const VIP_TAG = 'vip';
export const VIP_SALE_HANDLE = 'vip-sale';
export const SALE_COLLECTION_PATH = '/collections/sale';

const CUSTOMER_TAGS_QUERY = `#graphql
  query CustomerTags {
    customer {
      tags
    }
  }
` as const;

type CustomerTagsResult = {
  data?: {customer?: {tags?: string[]} | null} | null;
  errors?: Array<{message: string}> | null;
};

type CustomerAccountClient = {
  // Hydrogen Customer Account client; keep loose to avoid fighting generated types.
  query: (query: string, options?: object) => Promise<CustomerTagsResult>;
};

/**
 * Returns true when the logged-in customer has the VIP tag.
 * Caller must ensure the customer is authenticated first
 * (e.g. via customerAccount.handleAuthStatus()).
 */
export async function isVipCustomer(
  customerAccount: CustomerAccountClient,
): Promise<boolean> {
  const {data, errors} = await customerAccount.query(CUSTOMER_TAGS_QUERY);

  if (errors?.length || !data?.customer) {
    return false;
  }

  const tags = data.customer.tags ?? [];
  return tags.some((tag) => tag.toLowerCase() === VIP_TAG);
}
