import type {ReviewsData} from '~/components/Reviews';

export type SanityReviewItemRaw = {
  _id?: string | null;
  author?: string | null;
  rating?: number | null;
  date?: string | null;
  reviewTitle?: string | null;
  text?: string | null;
};

export type SanityReviewsConfigRaw = {
  heading?: string | null;
  subtitle?: string | null;
  selected?: SanityReviewItemRaw[] | null;
  score?: number | null;
  caption?: string | null;
  trustpilotLabel?: string | null;
  trustpilotUrl?: string | null;
} | null;

/** GROQ projection for home.reviews (expects $language). */
export const SANITY_REVIEWS_PROJECTION = `
  reviews{
    "heading": coalesce(heading[language == $language][0].value, heading[language == "nl"][0].value),
    "subtitle": coalesce(subtitle[language == $language][0].value, subtitle[language == "nl"][0].value),
    "selected": selected[]->{
      _id,
      author,
      rating,
      date,
      "reviewTitle": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
      "text": coalesce(body[language == $language][0].value, body[language == "nl"][0].value)
    },
    "score": score,
    "caption": coalesce(caption[language == $language][0].value, caption[language == "nl"][0].value),
    "trustpilotLabel": trustpilotLabel,
    "trustpilotUrl": trustpilotUrl
  }
`;

/** GROQ projection for featured review documents (expects $language). */
export const SANITY_FEATURED_REVIEWS_PROJECTION = `
  "featuredReviews": *[_type == "review" && featured == true] | order(date desc) [0...9] {
    _id,
    author,
    rating,
    date,
    "reviewTitle": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "text": coalesce(body[language == $language][0].value, body[language == "nl"][0].value)
  }
`;

export function resolveReviews(
  config: SanityReviewsConfigRaw,
  featured: SanityReviewItemRaw[],
): ReviewsData | null {
  // Use hand-picked selection if any; otherwise fall back to featured reviews
  const rawItems = config?.selected?.length ? config.selected : featured;

  const items = rawItems
    .filter(
      (item): item is SanityReviewItemRaw & {text: string; rating: number} =>
        Boolean(item.text) && typeof item.rating === 'number',
    )
    .map((item) => ({
      id: item._id ?? Math.random().toString(36).slice(2),
      author: item.author ?? '',
      rating: item.rating,
      date: item.date ?? null,
      reviewTitle: item.reviewTitle ?? null,
      text: item.text,
    }));

  const score = typeof config?.score === 'number' ? config.score : null;
  const caption = (config?.caption as string) ?? null;
  const label =
    typeof config?.trustpilotLabel === 'string' ? config.trustpilotLabel : null;
  const url =
    typeof config?.trustpilotUrl === 'string' ? config.trustpilotUrl : null;
  const trustBar =
    score !== null || caption ? {score, caption, label, url} : null;

  if (items.length === 0 && !trustBar) return null;

  return {
    heading: (config?.heading as string) ?? '',
    subtitle: (config?.subtitle as string) ?? null,
    items,
    trustBar,
  };
}
