import {useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {
  clearFiltersSearch,
  isFilterActive,
  parseSortSlug,
  setFilterSearch,
  setSortSearch,
  SORT_OPTIONS,
  toggleFilterSearch,
  type SortSlug,
} from '~/lib/collectionFilters';

export type CollectionFilterValue = {
  id: string;
  label: string;
  count: number;
  input: unknown;
};

export type CollectionFilter = {
  id: string;
  label: string;
  type: string;
  values: CollectionFilterValue[];
};

function inputAsString(input: unknown): string {
  return typeof input === 'string' ? input : JSON.stringify(input);
}

/** Actieve filters als verwijderbare chips. */
export function AppliedFilterChips({filters}: {filters: CollectionFilter[]}) {
  const [searchParams] = useSearchParams();

  const chips = filters.flatMap((filter) =>
    filter.values
      .filter((value) =>
        isFilterActive(searchParams, filter.id, inputAsString(value.input)),
      )
      .map((value) => ({
        key: value.id,
        label: filter.type === 'PRICE_RANGE' ? filter.label : value.label,
        removeTo: toggleFilterSearch(
          searchParams,
          filter.id,
          inputAsString(value.input),
        ),
      })),
  );

  // Prijsfilter met eigen min/max staat niet altijd tussen de facet-values
  const priceFilter = filters.find((filter) => filter.type === 'PRICE_RANGE');
  if (
    priceFilter &&
    searchParams.has(priceFilter.id) &&
    !chips.some((chip) => chip.label === priceFilter.label)
  ) {
    chips.push({
      key: priceFilter.id,
      label: priceFilter.label,
      removeTo: setFilterSearch(searchParams, priceFilter.id, null),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          to={chip.removeTo}
          preventScrollReset
          prefetch="intent"
          className="inline-flex items-center gap-1 rounded-full border border-black/20 px-3 py-1 font-body text-xs text-black transition-colors hover:border-black"
        >
          {chip.label}
          <span aria-hidden="true">&times;</span>
        </Link>
      ))}
      <Link
        to={clearFiltersSearch(searchParams)}
        preventScrollReset
        className="font-body text-xs text-black/60 underline hover:text-black"
      >
        Wis alle filters
      </Link>
    </div>
  );
}

function PriceRangeFilter({filter}: {filter: CollectionFilter}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const active = searchParams.get(filter.id);
  let activeMin = '';
  let activeMax = '';
  if (active) {
    try {
      const parsed = JSON.parse(active) as {
        price?: {min?: number; max?: number};
      };
      activeMin = parsed.price?.min != null ? String(parsed.price.min) : '';
      activeMax = parsed.price?.max != null ? String(parsed.price.max) : '';
    } catch {
      // negeren
    }
  }

  const [min, setMin] = useState(activeMin);
  const [max, setMax] = useState(activeMax);

  const apply = () => {
    const price: {min?: number; max?: number} = {};
    if (min !== '' && !Number.isNaN(Number(min))) price.min = Number(min);
    if (max !== '' && !Number.isNaN(Number(max))) price.max = Number(max);
    const input =
      price.min != null || price.max != null
        ? JSON.stringify({price})
        : null;
    navigate(setFilterSearch(searchParams, filter.id, input), {
      preventScrollReset: true,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Min"
          value={min}
          onChange={(event) => setMin(event.target.value)}
          aria-label={`${filter.label} minimum`}
          className="w-full rounded border border-black/20 px-2 py-1.5 font-body text-sm"
        />
        <span className="font-body text-sm text-black/60">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Max"
          value={max}
          onChange={(event) => setMax(event.target.value)}
          aria-label={`${filter.label} maximum`}
          className="w-full rounded border border-black/20 px-2 py-1.5 font-body text-sm"
        />
      </div>
      <button
        type="button"
        onClick={apply}
        className="rounded bg-black px-3 py-1.5 font-body text-xs uppercase tracking-wider text-cream transition-opacity hover:opacity-80"
      >
        Toepassen
      </button>
    </div>
  );
}

/** Facetgroepen (maat, kleur, prijs, beschikbaarheid) als uitklapbare lijsten. */
export function CollectionFilters({filters}: {filters: CollectionFilter[]}) {
  const [searchParams] = useSearchParams();

  if (!filters.length) return null;

  return (
    <div className="flex flex-col divide-y divide-black/10">
      {filters.map((filter) => (
        <details key={filter.id} className="group py-3" open>
          <summary className="flex cursor-pointer list-none items-center justify-between font-body text-sm font-semibold uppercase tracking-wider text-black [&::-webkit-details-marker]:hidden">
            {filter.label}
            <span
              aria-hidden="true"
              className="text-black/60 transition-transform group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>
          <div className="pt-3">
            {filter.type === 'PRICE_RANGE' ? (
              <PriceRangeFilter
                key={searchParams.get(filter.id) ?? 'empty'}
                filter={filter}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {filter.values.map((value) => {
                  const input = inputAsString(value.input);
                  const active = isFilterActive(searchParams, filter.id, input);
                  return (
                    <li key={value.id}>
                      <Link
                        to={toggleFilterSearch(searchParams, filter.id, input)}
                        preventScrollReset
                        prefetch="intent"
                        className="flex items-center gap-2 font-body text-sm text-black/80 transition-colors hover:text-black"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] leading-none ${
                            active
                              ? 'border-black bg-black text-cream'
                              : 'border-black/30 bg-transparent text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className={active ? 'font-semibold' : undefined}>
                          {value.label}
                        </span>
                        <span className="text-xs text-black/50">
                          ({value.count})
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

/** Sorteerdropdown — navigeert via het `sort_by`-URL-param. */
export function SortSelect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const current = parseSortSlug(searchParams);

  return (
    <label className="flex items-center gap-2 font-body text-sm text-black/80">
      <span className="hidden sm:inline">Sorteren:</span>
      <select
        value={current}
        onChange={(event) =>
          navigate(
            setSortSearch(searchParams, event.target.value as SortSlug),
            {preventScrollReset: true},
          )
        }
        className="rounded border border-black/20 bg-transparent px-2 py-1.5 font-body text-sm text-black"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
