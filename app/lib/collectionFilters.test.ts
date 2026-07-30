import {describe, expect, it} from 'vitest';
import {
  clearFiltersSearch,
  getCatalogSortVariables,
  getCollectionSortVariables,
  isFilterActive,
  isFilteredOrSorted,
  parseFiltersFromSearchParams,
  parseSortSlug,
  setFilterSearch,
  setSortSearch,
  toggleFilterSearch,
} from './collectionFilters';

describe('parseSortSlug', () => {
  it('defaults to featured when sort_by is missing or unknown', () => {
    expect(parseSortSlug(new URLSearchParams(''))).toBe('featured');
    expect(parseSortSlug(new URLSearchParams('sort_by=not-a-real-option'))).toBe(
      'featured',
    );
  });

  it('reads a known sort_by value', () => {
    expect(parseSortSlug(new URLSearchParams('sort_by=newest'))).toBe('newest');
  });
});

describe('getCollectionSortVariables / getCatalogSortVariables', () => {
  it('map price-descending to a reversed PRICE sort on both endpoints', () => {
    const params = new URLSearchParams('sort_by=price-descending');
    expect(getCollectionSortVariables(params)).toEqual({
      sortKey: 'PRICE',
      reverse: true,
    });
    expect(getCatalogSortVariables(params)).toEqual({
      sortKey: 'PRICE',
      reverse: true,
    });
  });

  it('use different default sort keys per endpoint (collection vs. catalog)', () => {
    const params = new URLSearchParams('');
    expect(getCollectionSortVariables(params).sortKey).toBe('COLLECTION_DEFAULT');
    expect(getCatalogSortVariables(params).sortKey).toBe('RELEVANCE');
  });
});

describe('parseFiltersFromSearchParams', () => {
  it('parses valid filter.* JSON params', () => {
    const params = new URLSearchParams();
    params.append('filter.v.option.size', JSON.stringify({variantOption: {name: 'Size', value: 'M'}}));
    expect(parseFiltersFromSearchParams(params)).toEqual([
      {variantOption: {name: 'Size', value: 'M'}},
    ]);
  });

  it('ignores non-filter params and invalid JSON', () => {
    const params = new URLSearchParams();
    params.append('sort_by', 'newest');
    params.append('filter.broken', '{not-json');
    expect(parseFiltersFromSearchParams(params)).toEqual([]);
  });
});

describe('toggleFilterSearch', () => {
  it('adds a filter value when not yet active', () => {
    const result = toggleFilterSearch(new URLSearchParams(''), 'filter.v.option.size', 'M');
    expect(new URLSearchParams(result).getAll('filter.v.option.size')).toEqual(['M']);
  });

  it('removes a filter value when already active', () => {
    const params = new URLSearchParams('filter.v.option.size=M');
    const result = toggleFilterSearch(params, 'filter.v.option.size', 'M');
    expect(new URLSearchParams(result).has('filter.v.option.size')).toBe(false);
  });

  it('resets pagination params', () => {
    const params = new URLSearchParams('cursor=abc&direction=next');
    const result = toggleFilterSearch(params, 'filter.v.option.size', 'M');
    const resultParams = new URLSearchParams(result);
    expect(resultParams.has('cursor')).toBe(false);
    expect(resultParams.has('direction')).toBe(false);
  });
});

describe('setFilterSearch', () => {
  it('sets a single value for a filter group', () => {
    const result = setFilterSearch(new URLSearchParams(''), 'filter.v.price.gte', '10');
    expect(new URLSearchParams(result).get('filter.v.price.gte')).toBe('10');
  });

  it('clears the group when input is null', () => {
    const params = new URLSearchParams('filter.v.price.gte=10');
    const result = setFilterSearch(params, 'filter.v.price.gte', null);
    expect(new URLSearchParams(result).has('filter.v.price.gte')).toBe(false);
  });
});

describe('clearFiltersSearch', () => {
  it('removes all filter.* params but keeps sort_by', () => {
    const params = new URLSearchParams(
      'filter.v.option.size=M&filter.v.price.gte=10&sort_by=newest',
    );
    const result = new URLSearchParams(clearFiltersSearch(params));
    expect(result.has('filter.v.option.size')).toBe(false);
    expect(result.has('filter.v.price.gte')).toBe(false);
    expect(result.get('sort_by')).toBe('newest');
  });
});

describe('setSortSearch', () => {
  it('removes sort_by for the default "featured" slug', () => {
    const result = setSortSearch(new URLSearchParams('sort_by=newest'), 'featured');
    expect(new URLSearchParams(result).has('sort_by')).toBe(false);
  });

  it('sets sort_by for a non-default slug', () => {
    const result = setSortSearch(new URLSearchParams(''), 'newest');
    expect(new URLSearchParams(result).get('sort_by')).toBe('newest');
  });
});

describe('isFilterActive', () => {
  it('detects whether a value is present for a filter group', () => {
    const params = new URLSearchParams('filter.v.option.size=M');
    expect(isFilterActive(params, 'filter.v.option.size', 'M')).toBe(true);
    expect(isFilterActive(params, 'filter.v.option.size', 'L')).toBe(false);
  });
});

describe('isFilteredOrSorted', () => {
  it('is false for a plain collection URL', () => {
    expect(isFilteredOrSorted('')).toBe(false);
    expect(isFilteredOrSorted('?page=2')).toBe(false);
  });

  it('is true when sorted or filtered', () => {
    expect(isFilteredOrSorted('?sort_by=newest')).toBe(true);
    expect(isFilteredOrSorted('?filter.v.option.size=M')).toBe(true);
  });
});
