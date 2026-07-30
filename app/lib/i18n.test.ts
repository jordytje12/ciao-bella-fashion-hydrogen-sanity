import {describe, expect, it} from 'vitest';
import {getLocaleFromRequest, sanityLanguage} from './i18n';

describe('sanityLanguage', () => {
  it('lowercases the Shopify/Hydrogen language code for Sanity', () => {
    expect(sanityLanguage('NL')).toBe('nl');
    expect(sanityLanguage('EN')).toBe('en');
  });
});

describe('getLocaleFromRequest', () => {
  it('falls back to the default locale for the root path', () => {
    expect(getLocaleFromRequest(new Request('https://example.com/'))).toEqual({
      language: 'NL',
      country: 'NL',
      pathPrefix: '',
    });
  });

  it('falls back to the default locale for an unknown first path segment', () => {
    expect(
      getLocaleFromRequest(new Request('https://example.com/collections/nieuw')),
    ).toEqual({
      language: 'NL',
      country: 'NL',
      pathPrefix: '',
    });
  });
});
