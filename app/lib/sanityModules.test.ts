import {describe, expect, it} from 'vitest';
import {
  resolveDualCardBanner,
  resolveFeaturedProductItem,
  resolveHeroBanner,
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

describe('resolveHeroBanner', () => {
  const imageDesktop = {
    asset: {
      url: 'https://cdn.sanity.io/images/abc123/production/hero-2000x1200.jpg',
    },
  };

  it('returns null without a desktop image or title', () => {
    expect(resolveHeroBanner({title: 'Sale'}, CONFIG)).toBeNull();
    expect(resolveHeroBanner({imageDesktop}, CONFIG)).toBeNull();
  });

  it('resolves a hero with desktop image and title, without inventing a CTA', () => {
    const result = resolveHeroBanner(
      {
        title: 'Sale',
        description: 'Tot 50% korting',
        imageDesktop,
      },
      CONFIG,
    );

    expect(result).toMatchObject({
      title: 'Sale',
      description: 'Tot 50% korting',
      buttonText: null,
      linkUrl: null,
    });
    expect(result?.desktopImage.src).toContain('w=2000');
    expect(result?.mobileImage).toBeNull();
  });

  it('includes a CTA only when button text and link are both set', () => {
    const result = resolveHeroBanner(
      {
        title: 'Sale',
        button_text: 'Shop de sale',
        imageDesktop,
        link: [{_type: 'linkExternal', url: '/collections/sale'}],
      },
      CONFIG,
    );

    expect(result).toMatchObject({
      buttonText: 'Shop de sale',
      linkUrl: '/collections/sale',
    });
  });
});
