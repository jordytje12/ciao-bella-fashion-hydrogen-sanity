/**
 * Resolves a Sanity link object (linkInternal or linkExternal) to a URL string.
 * Internal links use the document slug to build the path.
 */
export function resolveLinkUrl(
  link:
    | {
        _type: string;
        url?: string;
        reference?: {_type: string; slug?: string};
      }
    | undefined,
): string {
  if (!link) return '/';
  if (link._type === 'linkExternal') return link.url ?? '/';
  const ref = link.reference;
  if (!ref?.slug) return '/';
  if (ref._type === 'collection') return `/collections/${ref.slug}`;
  if (ref._type === 'product') return `/products/${ref.slug}`;
  if (ref._type === 'page') return `/pages/${ref.slug}`;
  return '/';
}
