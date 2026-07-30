import {describe, expect, it} from 'vitest';
import {isAbsoluteExternalUrl, isRelativePath, resolveLinkUrl} from './links';

describe('isRelativePath', () => {
  it('is true for site-relative paths', () => {
    expect(isRelativePath('/pages/over-ons')).toBe(true);
  });

  it('is false for absolute URLs, empty strings, and nullish values', () => {
    expect(isRelativePath('https://example.com/pages/x')).toBe(false);
    expect(isRelativePath('')).toBe(false);
    expect(isRelativePath(null)).toBe(false);
    expect(isRelativePath(undefined)).toBe(false);
  });
});

describe('isAbsoluteExternalUrl', () => {
  it('is true for http(s) URLs', () => {
    expect(isAbsoluteExternalUrl('https://example.com')).toBe(true);
    expect(isAbsoluteExternalUrl('http://example.com')).toBe(true);
    expect(isAbsoluteExternalUrl('  https://example.com  ')).toBe(true);
  });

  it('is false for site-relative paths and other schemes', () => {
    expect(isAbsoluteExternalUrl('/pages/over-ons')).toBe(false);
    expect(isAbsoluteExternalUrl('mailto:info@ciaobellafashion.nl')).toBe(false);
    expect(isAbsoluteExternalUrl(undefined)).toBe(false);
  });
});

describe('resolveLinkUrl', () => {
  it('defaults to / when no link is given', () => {
    expect(resolveLinkUrl(undefined)).toBe('/');
  });

  it('resolves an external link verbatim', () => {
    expect(
      resolveLinkUrl({_type: 'linkExternal', url: 'https://example.com/sale'}),
    ).toBe('https://example.com/sale');
  });

  it('strips a trailing slash from a site-relative external link', () => {
    expect(resolveLinkUrl({_type: 'linkExternal', url: '/pages/over-ons/'})).toBe(
      '/pages/over-ons',
    );
  });

  it('keeps a bare "/" external link as-is', () => {
    expect(resolveLinkUrl({_type: 'linkExternal', url: '/'})).toBe('/');
  });

  it('falls back to / when an external link has no url', () => {
    expect(resolveLinkUrl({_type: 'linkExternal'})).toBe('/');
  });

  it('builds a /collections/:slug path for an internal collection reference', () => {
    expect(
      resolveLinkUrl({
        _type: 'linkInternal',
        reference: {_type: 'collection', slug: 'nieuw'},
      }),
    ).toBe('/collections/nieuw');
  });

  it('builds a /products/:slug path for an internal product reference', () => {
    expect(
      resolveLinkUrl({
        _type: 'linkInternal',
        reference: {_type: 'product', slug: 'linnen-jurk'},
      }),
    ).toBe('/products/linnen-jurk');
  });

  it('builds a /pages/:slug path for an internal page reference', () => {
    expect(
      resolveLinkUrl({
        _type: 'linkInternal',
        reference: {_type: 'page', slug: 'over-ons'},
      }),
    ).toBe('/pages/over-ons');
  });

  it('falls back to / for an internal link without a resolvable slug', () => {
    expect(resolveLinkUrl({_type: 'linkInternal'})).toBe('/');
    expect(
      resolveLinkUrl({_type: 'linkInternal', reference: {_type: 'unknownType'}}),
    ).toBe('/');
  });
});
