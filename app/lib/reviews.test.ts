import {describe, expect, it} from 'vitest';
import {resolveReviews} from './reviews';

describe('resolveReviews', () => {
  it('returns null when there is nothing to show', () => {
    expect(resolveReviews(null, [])).toBeNull();
    expect(resolveReviews({heading: 'Reviews'}, [])).toBeNull();
  });

  it('prefers the hand-picked selection over the featured fallback', () => {
    const result = resolveReviews(
      {
        selected: [
          {_id: 'a', author: 'Anna', rating: 5, text: 'Top!'},
        ],
      },
      [{_id: 'b', author: 'Bram', rating: 4, text: 'Ook goed'}],
    );

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({id: 'a', author: 'Anna'});
  });

  it('falls back to featured reviews when nothing is selected', () => {
    const result = resolveReviews(
      {selected: []},
      [{_id: 'b', author: 'Bram', rating: 4, text: 'Ook goed'}],
    );

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({id: 'b', author: 'Bram'});
  });

  it('filters out items missing text or a numeric rating', () => {
    const result = resolveReviews(null, [
      {_id: 'a', author: 'Anna', rating: 5, text: 'Top!'},
      {_id: 'b', author: 'Geen tekst', rating: 5, text: ''},
      {_id: 'c', author: 'Geen rating', rating: null, text: 'Prima'},
    ]);

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].id).toBe('a');
  });

  it('falls back to a deterministic index-based id when _id is missing', () => {
    const result = resolveReviews(null, [
      {author: 'Anna', rating: 5, text: 'Top!'},
      {author: 'Bram', rating: 4, text: 'Ook goed'},
    ]);

    expect(result?.items.map((item) => item.id)).toEqual([
      'review-0',
      'review-1',
    ]);
  });

  it('builds a trustBar from score/caption even without any review items', () => {
    const result = resolveReviews(
      {
        score: 4.8,
        caption: 'Op basis van 120 reviews',
        trustpilotLabel: 'Excellent',
        trustpilotUrl: 'https://trustpilot.com/review/ciaobellafashion.nl',
      },
      [],
    );

    expect(result).toMatchObject({
      items: [],
      trustBar: {
        score: 4.8,
        caption: 'Op basis van 120 reviews',
        label: 'Excellent',
        url: 'https://trustpilot.com/review/ciaobellafashion.nl',
      },
    });
  });
});
