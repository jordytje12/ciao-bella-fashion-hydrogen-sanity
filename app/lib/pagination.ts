import {redirect} from 'react-router';

/** Pagination-params van Hydrogen's getPaginationVariables. */
export const PAGINATION_PARAMS = ['cursor', 'direction'] as const;

/**
 * Infinite scroll zet `?cursor=` in de URL via client-side navigatie. Bij een
 * harde refresh (document request) is de geaccumuleerde product-state weg, dus
 * strippen we die params zodat de pagina vanaf het begin laadt.
 *
 * Client-side pagination-navigaties hebben `Sec-Fetch-Dest: empty` en worden
 * niet omgeleid.
 */
export function redirectDocumentRequestAwayFromPaginationCursor(
  request: Request,
): void {
  if (request.headers.get('Sec-Fetch-Dest') !== 'document') return;

  const url = new URL(request.url);
  const hasPaginationParam = PAGINATION_PARAMS.some((param) =>
    url.searchParams.has(param),
  );
  if (!hasPaginationParam) return;

  for (const param of PAGINATION_PARAMS) {
    url.searchParams.delete(param);
  }

  const search = url.searchParams.toString();
  throw redirect(search ? `${url.pathname}?${search}` : url.pathname);
}
