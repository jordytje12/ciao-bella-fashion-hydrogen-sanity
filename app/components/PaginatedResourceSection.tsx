import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';
import {useNavigate} from 'react-router';
import {useInView} from 'react-intersection-observer';

/**
 * <PaginatedResourceSection> encapsulates the previous and next pagination behaviors throughout your application.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
  loadOnScroll = false,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: React.FunctionComponent<{node: NodesType; index: number}>;
  ariaLabel?: string;
  resourcesClassName?: string;
  loadOnScroll?: boolean;
}) {
  const {ref, inView} = useInView();

  return (
    <Pagination connection={connection}>
      {({
        nodes,
        isLoading,
        PreviousLink,
        NextLink,
        nextPageUrl,
        hasNextPage,
        state,
      }) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div>
            <PreviousLink>
              {isLoading ? (
                'Loading...'
              ) : (
                <span>
                  <span aria-hidden="true">↑</span> Load previous
                </span>
              )}
            </PreviousLink>
            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? 'region' : undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              resourcesMarkup
            )}
            {loadOnScroll ? (
              <>
                <LoadMoreOnScroll
                  inView={inView}
                  hasNextPage={hasNextPage}
                  nextPageUrl={nextPageUrl}
                  state={state}
                />
                <NextLink ref={ref} className="pagination-load-on-scroll">
                  {isLoading ? 'Loading...' : <span>Load more</span>}
                </NextLink>
              </>
            ) : (
              <NextLink>
                {isLoading ? (
                  'Loading...'
                ) : (
                  <span>
                    Load more <span aria-hidden="true">↓</span>
                  </span>
                )}
              </NextLink>
            )}
          </div>
        );
      }}
    </Pagination>
  );
}

function LoadMoreOnScroll({
  inView,
  hasNextPage,
  nextPageUrl,
  state,
}: {
  inView: boolean;
  hasNextPage: boolean;
  nextPageUrl: string;
  state: unknown;
}) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (inView && hasNextPage) {
      navigate(nextPageUrl, {
        replace: true,
        preventScrollReset: true,
        state,
      });
    }
  }, [inView, hasNextPage, navigate, nextPageUrl, state]);

  return null;
}
