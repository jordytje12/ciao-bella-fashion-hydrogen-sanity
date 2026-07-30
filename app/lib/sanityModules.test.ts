import {describe, expect, it} from 'vitest';
import {
  resolveDualCardBanner,
  resolveFeaturedProductItem,
  uniqueStrings,
  type ShopifyProductNode,
} from './sanityModules';

const CONFIG = {projectId: 'abc123', dataset: 'production'};

describe('uniqueStrings', () => {
  it('dedupes and drops null/undefined/empty values', () => {
    expect(uniqueStrings(['a', 'b', 'a', null, undefined, ''])).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('resolveFeaturedProductItem', () => {
  const product: ShopifyProductNode = {
    id: 'gid://shopify/Product/1',
    title: 'Linnen jurk',
    handle: 'linnen-jurk',
    featuredImage: {url: 'https://cdn.shopify.com/image.jpg', altText: 'Jurk'},
    priceRange: {minVariantPrice: {amount: '49.99', currencyCode: 'EUR'}},
  };
  const productsById = new Map([[product.id, product]]);

  it('returns null when the Sanity selection has no productId', () => {
    expect(resolveFeaturedProductItem({}, productsById)).toBeNull();
  });

  it('returns null when the referenced product was not found on Shopify', () => {
    expect(
      resolveFeaturedProductItem({productId: 'missing'}, productsById),
    ).toBeNull();
  });

  it('maps a matched product, preferring live Shopify title/handle', () => {
    const result = resolveFeaturedProductItem(
      {productId: product.id, title: 'Stale titel', handle: 'oude-handle'},
      productsById,
    );

    expect(result).toMatchObject({
      id: product.id,
      title: 'Linnen jurk',
      handle: 'linnen-jurk',
      price: product.priceRange.minVariantPrice,
    });
  });

  it('falls back to the Sanity title/handle when Shopify data is missing them', () => {
    const partial: ShopifyProductNode = {
      ...product,
      id: 'gid://shopify/Product/2',
      title: '',
      handle: '',
    };
    const result = resolveFeaturedProductItem(
      {productId: partial.id, title: 'Fallback titel', handle: 'fallback-handle'},
      new Map([[partial.id, partial]]),
    );

    expect(result).toMatchObject({title: 'Fallback titel', handle: 'fallback-handle'});
  });
});

describe('resolveDualCardBanner', () => {
  const image = {
    asset: {url: 'https://cdn.sanity.io/images/abc123/production/x-1200x1500.jpg'},
  };

  it('skips cards without an image asset', () => {
    expect(resolveDualCardBanner([{title: 'Zonder afbeelding'}], CONFIG)).toEqual(
      [],
    );
  });

  it('resolves a card into a DualCardItem with src + srcSet', () => {
    const [card] = resolveDualCardBanner(
      [
        {
          _key: 'card-1',
          image,
          title: 'Zomercollectie',
          subtitle: 'Nu live',
          buttonText: 'Shop nu',
          link: [{_type: 'linkExternal', url: '/collections/zomer'}],
        },
      ],
      CONFIG,
    );

    expect(card.key).toBe('card-1');
    expect(card.title).toBe('Zomercollectie');
    expect(card.subtitle).toBe('Nu live');
    expect(card.buttonText).toBe('Shop nu');
    expect(card.url).toBe('/collections/zomer');
    expect(card.image.url).toContain('w=1200');
    expect(card.image.srcSet).toContain('w=1200');
  });
});
