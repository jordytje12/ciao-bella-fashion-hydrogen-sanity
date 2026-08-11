// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer
export const CUSTOMER_TAGS_QUERY = `#graphql
  query CustomerTags {
    customer {
      tags
    }
  }
` as const;
