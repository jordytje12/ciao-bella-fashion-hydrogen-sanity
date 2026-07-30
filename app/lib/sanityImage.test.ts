import {describe, expect, it} from 'vitest';
import {sanityImageConfig, sanityImageProps} from './sanityImage';

const CONFIG = {projectId: 'abc123', dataset: 'production'};

// Mirrors the `asset->{_id, url, metadata{dimensions}}` shape our GROQ
// projections resolve to — `@sanity/image-url` can build a full transform
// URL from either the `_id` or the raw `url`, no network access needed.
const SOURCE = {
  asset: {
    _id: 'image-Tb9Ew8CXIwaY6R1kjMvI4WjO-1600x2000-jpg',
    url: 'https://cdn.sanity.io/images/abc123/production/Tb9Ew8CXIwaY6R1kjMvI4WjO-1600x2000.jpg',
  },
};

function queryOf(url: string) {
  return new URL(url).searchParams;
}

describe('sanityImageConfig', () => {
  it('reads projectId/dataset from env', () => {
    expect(
      sanityImageConfig({SANITY_PROJECT_ID: 'abc123', SANITY_DATASET: 'staging'}),
    ).toEqual({projectId: 'abc123', dataset: 'staging'});
  });

  it('falls back to the production dataset when unset', () => {
    expect(
      sanityImageConfig({SANITY_PROJECT_ID: 'abc123', SANITY_DATASET: ''}),
    ).toEqual({projectId: 'abc123', dataset: 'production'});
  });
});

describe('sanityImageProps', () => {
  it('builds a src at the requested width', () => {
    const {src} = sanityImageProps(SOURCE, CONFIG, {width: 900});
    expect(queryOf(src).get('w')).toBe('900');
  });

  it('omits height from the URL when no height is requested', () => {
    const {src} = sanityImageProps(SOURCE, CONFIG, {width: 900});
    expect(queryOf(src).has('h')).toBe(false);
  });

  it('scales height to match the aspect ratio at each candidate width', () => {
    const {src} = sanityImageProps(SOURCE, CONFIG, {width: 1000, height: 1250});
    const query = queryOf(src);
    expect(query.get('w')).toBe('1000');
    expect(query.get('h')).toBe('1250');
  });

  it('builds a srcSet only from default widths at or below the requested width', () => {
    const {srcSet} = sanityImageProps(SOURCE, CONFIG, {width: 1000});
    const widths = srcSet
      .split(', ')
      .map((entry) => Number(entry.split(' ')[1].replace('w', '')));

    // Default candidates are [480, 768, 1024, 1440, 2000]; only <=1000 survive,
    // plus the requested width itself.
    expect(widths).toEqual([480, 768, 1000]);
  });

  it('respects a custom widths list', () => {
    const {srcSet} = sanityImageProps(SOURCE, CONFIG, {
      width: 800,
      widths: [200, 400, 900],
    });
    const widths = srcSet
      .split(', ')
      .map((entry) => Number(entry.split(' ')[1].replace('w', '')));

    // 900 is above the requested width (800) so it's dropped; 800 itself is added.
    expect(widths).toEqual([200, 400, 800]);
  });
});
