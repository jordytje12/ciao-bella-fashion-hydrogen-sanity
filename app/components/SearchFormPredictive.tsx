import {
  useFetcher,
  useNavigate,
  type FormProps,
  type Fetcher,
} from 'react-router';
import React, {useCallback, useRef, useEffect} from 'react';
import type {PredictiveSearchReturn} from '~/lib/search';
import {useAside} from './Aside';
import {useLocalePrefix} from '~/lib/i18n';

type SearchFormPredictiveChildren = (args: {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
  goToSearch: () => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  fetcher: Fetcher<PredictiveSearchReturn>;
}) => React.ReactNode;

type SearchFormPredictiveProps = Omit<FormProps, 'children'> & {
  children: SearchFormPredictiveChildren | null;
};

export const SEARCH_ENDPOINT = '/search';
export const PREDICTIVE_SEARCH_LIMIT = 6;
const PREDICTIVE_SEARCH_DEBOUNCE_MS = 200;

/**
 *  Search form component that sends search requests to the `/search` route
 **/
export function SearchFormPredictive({
  children,
  className = 'predictive-search-form',
  ...props
}: SearchFormPredictiveProps) {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'search'});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const navigate = useNavigate();
  const aside = useAside();
  const localePrefix = useLocalePrefix();

  /** Reset the input value and blur the input */
  function resetInput(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (inputRef?.current?.value) {
      inputRef.current.blur();
    }
  }

  /** Navigate to the search page with the current input value */
  function goToSearch() {
    const term = inputRef?.current?.value;
    void navigate(
      `${localePrefix}${SEARCH_ENDPOINT}` +
        (term ? `?q=${encodeURIComponent(term)}` : ''),
    );
    aside.close();
  }

  /** Fetch search results based on the input value, debounced so it doesn't fire on every keystroke */
  const fetchResults = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const term = event.target.value || '';
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void fetcher.submit(
          {q: term, limit: PREDICTIVE_SEARCH_LIMIT, predictive: true},
          {method: 'GET', action: SEARCH_ENDPOINT},
        );
      }, PREDICTIVE_SEARCH_DEBOUNCE_MS);
    },
    [fetcher],
  );

  // clear a pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <fetcher.Form {...props} className={className} onSubmit={resetInput}>
      {children({inputRef, fetcher, fetchResults, goToSearch})}
    </fetcher.Form>
  );
}
