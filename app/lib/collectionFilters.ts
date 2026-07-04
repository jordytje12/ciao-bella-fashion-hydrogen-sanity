import type {
  ProductFilter,
  ProductCollectionSortKeys,
  ProductSortKeys,
} from '@shopify/hydrogen/storefront-api-types';

/**
 * URL-conventie (Hydrogen demo-store): elk actief filter staat als search param
 * met de facet-groep-id als key (bijv. `filter.v.option.size`) en het
 * `values[].input`-veld van de Storefront API verbatim als JSON-waarde.
 * Sorteren gaat via `sort_by` (Shopify-standaard, al uitgesloten in robots.txt).
 */
export const FILTER_URL_PREFIX = 'filter.';
export const SORT_URL_PARAM = 'sort_by';

/** Pagination-params van Hydrogen's getPaginationVariables — resetten bij elke filter/sort-wijziging. */
const PAGINATION_PARAMS = ['cursor', 'direction'];

export type SortSlug =
  | 'featured'
  | 'best-selling'
  | 'price-ascending'
  | 'price-descending'
  | 'newest';

export const SORT_OPTIONS: Array<{value: SortSlug; label: string}> = [
  {value: 'featured', label: 'Aanbevolen'},
  {value: 'best-selling', label: 'Best verkocht'},
  {value: 'price-ascending', label: 'Prijs: laag naar hoog'},
  {value: 'price-descending', label: 'Prijs: hoog naar laag'},
  {value: 'newest', label: 'Nieuwste'},
];

const COLLECTION_SORT: Record<
  SortSlug,
  {sortKey: ProductCollectionSortKeys; reverse: boolean}
> = {
  featured: {sortKey: 'COLLECTION_DEFAULT', reverse: false},
  'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
  'price-ascending': {sortKey: 'PRICE', reverse: false},
  'price-descending': {sortKey: 'PRICE', reverse: true},
  newest: {sortKey: 'CREATED', reverse: true},
};

const CATALOG_SORT: Record<
  SortSlug,
  {sortKey: ProductSortKeys; reverse: boolean}
> = {
  featured: {sortKey: 'RELEVANCE', reverse: false},
  'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
  'price-ascending': {sortKey: 'PRICE', reverse: false},
  'price-descending': {sortKey: 'PRICE', reverse: true},
  newest: {sortKey: 'CREATED_AT', reverse: true},
};

export function parseSortSlug(searchParams: URLSearchParams): SortSlug {
  const value = searchParams.get(SORT_URL_PARAM);
  return value && value in COLLECTION_SORT ? (value as SortSlug) : 'featured';
}

export function getCollectionSortVariables(searchParams: URLSearchParams) {
  return COLLECTION_SORT[parseSortSlug(searchParams)];
}

export function getCatalogSortVariables(searchParams: URLSearchParams) {
  return CATALOG_SORT[parseSortSlug(searchParams)];
}

/** Leest alle `filter.*`-params en parset hun JSON-waarde naar ProductFilter-input. */
export function parseFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ProductFilter[] {
  const filters: ProductFilter[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith(FILTER_URL_PREFIX)) continue;
    try {
      filters.push(JSON.parse(value) as ProductFilter);
    } catch {
      // Ongeldige (handmatig aangepaste) param — negeren
    }
  }
  return filters;
}

function withoutPagination(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  for (const key of PAGINATION_PARAMS) params.delete(key);
  return params;
}

/** Voegt een filterwaarde toe of verwijdert deze als hij al actief is. */
export function toggleFilterSearch(
  searchParams: URLSearchParams,
  groupId: string,
  input: string,
): string {
  const params = withoutPagination(searchParams);
  const active = params.getAll(groupId);
  params.delete(groupId);
  const remaining = active.filter((value) => value !== input);
  if (remaining.length === active.length) remaining.push(input);
  for (const value of remaining) params.append(groupId, value);
  return `?${params.toString()}`;
}

/** Vervangt de waarde van één filtergroep (voor prijs-min/max). */
export function setFilterSearch(
  searchParams: URLSearchParams,
  groupId: string,
  input: string | null,
): string {
  const params = withoutPagination(searchParams);
  params.delete(groupId);
  if (input) params.set(groupId, input);
  return `?${params.toString()}`;
}

export function clearFiltersSearch(searchParams: URLSearchParams): string {
  const params = withoutPagination(searchParams);
  for (const key of [...params.keys()]) {
    if (key.startsWith(FILTER_URL_PREFIX)) params.delete(key);
  }
  return `?${params.toString()}`;
}

export function setSortSearch(
  searchParams: URLSearchParams,
  slug: SortSlug,
): string {
  const params = withoutPagination(searchParams);
  if (slug === 'featured') {
    params.delete(SORT_URL_PARAM);
  } else {
    params.set(SORT_URL_PARAM, slug);
  }
  return `?${params.toString()}`;
}

export function isFilterActive(
  searchParams: URLSearchParams,
  groupId: string,
  input: string,
): boolean {
  return searchParams.getAll(groupId).includes(input);
}

/** Voor SEO: gefilterde/gesorteerde URL's krijgen noindex + schone canonical. */
export function isFilteredOrSorted(search: string): boolean {
  const params = new URLSearchParams(search);
  if (params.has(SORT_URL_PARAM)) return true;
  for (const key of params.keys()) {
    if (key.startsWith(FILTER_URL_PREFIX)) return true;
  }
  return false;
}
