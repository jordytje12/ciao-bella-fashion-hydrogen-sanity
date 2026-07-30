/**
 * Leest de Shopify Customer Privacy-consentstatus rechtstreeks van
 * `window.Shopify.customerPrivacy` — net als Hydrogen's eigen interne
 * analytics-plumbing doet — zodat elke consument (marketing-tags, Klaviyo)
 * altijd de actuele toestemming ziet zonder afhankelijk te zijn van een
 * React re-render die de context ververst.
 */
export function isAnalyticsConsentAllowed(): boolean {
  try {
    return window.Shopify?.customerPrivacy?.analyticsProcessingAllowed?.() ?? false;
  } catch {
    return false;
  }
}

export function isMarketingConsentAllowed(): boolean {
  try {
    return window.Shopify?.customerPrivacy?.marketingAllowed?.() ?? false;
  } catch {
    return false;
  }
}
