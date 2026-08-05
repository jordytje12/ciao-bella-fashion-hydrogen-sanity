export const VIP_TAGS = [
  'VIP_ACTIEF',
  'VIP_SLAPEND',
  'VIP_RISICO',
] as const;

const VIP_TAGS_LOWER = new Set(VIP_TAGS.map((tag) => tag.toLowerCase()));

export const VIP_SALE_HANDLE = 'vip-sale';
export const SALE_COLLECTION_PATH = '/collections/sale';
export const VIP_SALE_PATH = '/collections/vip-sale';

const CUSTOMER_TAGS_QUERY = `#graphql
  query CustomerTags {
    customer {
      tags
    }
  }
` as const;

type CustomerTagsResult = {
  data?: {customer?: {tags?: unknown} | null} | null;
  errors?: Array<{message: string}> | null;
};

type CustomerAccountClient = {
  // Hydrogen Customer Account client; keep loose to avoid fighting generated types.
  query: (query: string, options?: object) => Promise<CustomerTagsResult>;
};

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  // Some APIs historically expose tags as a comma-separated string
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Returns true when the logged-in customer has a VIP tag.
 * Caller must ensure the customer is authenticated first
 * (e.g. via customerAccount.handleAuthStatus()).
 */
export async function isVipCustomer(
  customerAccount: CustomerAccountClient,
): Promise<boolean> {
  const {data, errors} = await customerAccount.query(CUSTOMER_TAGS_QUERY);

  if (errors?.length || !data?.customer) {
    console.warn('[vip] Customer tags query failed', {
      errors,
      hasCustomer: Boolean(data?.customer),
    });
    return false;
  }

  const tags = normalizeTags(data.customer.tags);
  const isVip = tags.some((tag) => VIP_TAGS_LOWER.has(tag.toLowerCase()));

  if (!isVip) {
    console.warn('[vip] Customer is logged in but missing VIP tag', {
      tags,
      required: VIP_TAGS,
    });
  }

  return isVip;
}
