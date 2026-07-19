/**
 * Resolves a Sanity link object (linkInternal or linkExternal) to a URL string.
 * Internal links use the document slug to build the path.
 * External links may be absolute (http/https) or relative site paths (/pages/…).
 */

export function isRelativePath(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith('/');
}

/** True for absolute http(s) external URLs — not for site paths like /pages/over-ons. */
export function isAbsoluteExternalUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

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
  if (link._type === 'linkExternal') {
    const url = link.url?.trim();
    if (!url) return '/';
    // Normalize trailing slash on site paths (Hydrogen routes are typically without)
    if (url.startsWith('/') && url.length > 1 && url.endsWith('/')) {
      return url.slice(0, -1);
    }
    return url;
  }
  const ref = link.reference;
  if (!ref?.slug) return '/';
  if (ref._type === 'collection') return `/collections/${ref.slug}`;
  if (ref._type === 'product') return `/products/${ref.slug}`;
  if (ref._type === 'page') return `/pages/${ref.slug}`;
  return '/';
}
