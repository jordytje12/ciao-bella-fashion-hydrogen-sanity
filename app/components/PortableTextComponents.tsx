import {Link} from 'react-router';
import type {PortableTextComponents} from '@portabletext/react';
import {isAbsoluteExternalUrl, isRelativePath} from '~/lib/links';

type InternalLinkMark = {
  _type: 'linkInternal';
  docType?: string;
  slug?: string;
};

type ExternalLinkMark = {
  _type: 'linkExternal';
  url?: string;
  newWindow?: boolean;
};

type EmailLinkMark = {
  _type: 'linkEmail';
  email?: string;
};

type ProductLinkMark = {
  _type: 'linkProduct';
  slug?: string;
};

function internalUrl(docType?: string, slug?: string): string | null {
  if (!slug) return null;
  if (docType === 'collection') return `/collections/${slug}`;
  if (docType === 'product') return `/products/${slug}`;
  if (docType === 'page') return `/pages/${slug}`;
  return null;
}

/**
 * Componentmap voor @portabletext/react, afgestemd op de marks van
 * portableTextSimple in de studio (linkInternal/linkExternal/linkEmail/linkProduct).
 * Verwacht dat de GROQ-projectie docType/slug op de markDefs heeft gezet.
 */
export const portableTextComponents: PortableTextComponents = {
  marks: {
    linkInternal: ({value, children}) => {
      const url = internalUrl(
        (value as InternalLinkMark)?.docType,
        (value as InternalLinkMark)?.slug,
      );
      if (!url) return <>{children}</>;
      return <Link to={url}>{children}</Link>;
    },
    linkExternal: ({value, children}) => {
      const mark = value as ExternalLinkMark;
      if (!mark?.url) return <>{children}</>;
      const href = mark.url.trim();
      if (isRelativePath(href)) {
        const to =
          href.length > 1 && href.endsWith('/') ? href.slice(0, -1) : href;
        return <Link to={to}>{children}</Link>;
      }
      return (
        <a
          href={href}
          rel="noopener noreferrer"
          target={
            isAbsoluteExternalUrl(href) && mark.newWindow
              ? '_blank'
              : undefined
          }
        >
          {children}
        </a>
      );
    },
    linkEmail: ({value, children}) => {
      const mark = value as EmailLinkMark;
      if (!mark?.email) return <>{children}</>;
      return <a href={`mailto:${mark.email}`}>{children}</a>;
    },
    linkProduct: ({value, children}) => {
      const slug = (value as ProductLinkMark)?.slug;
      if (!slug) return <>{children}</>;
      return <Link to={`/products/${slug}`}>{children}</Link>;
    },
  },
};
