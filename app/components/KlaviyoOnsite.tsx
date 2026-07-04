import {useEffect} from 'react';
import {useAnalytics, type VisitorConsentCollected} from '@shopify/hydrogen';

/**
 * Laadt het Klaviyo onsite script pas nadat de bezoeker marketing-consent
 * heeft gegeven via de Shopify Customer Privacy banner.
 */
export function KlaviyoOnsite({companyId}: {companyId?: string | null}) {
  const {customerPrivacy} = useAnalytics();

  useEffect(() => {
    if (!companyId) return;

    const inject = () => {
      const existingScript = document.querySelector(
        `script[src*="klaviyo.js?company_id=${companyId}"]`,
      );
      if (existingScript) return;
      const script = document.createElement('script');
      script.src = `https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${companyId}`;
      script.async = true;
      document.head.appendChild(script);
    };

    // Terugkerende bezoekers met opgeslagen consent
    if (customerPrivacy?.marketingAllowed()) {
      inject();
      return;
    }

    // Eerste bezoek: wacht op de consent-keuze uit de banner
    const onConsent = (event: CustomEvent<VisitorConsentCollected>) => {
      if (event.detail.marketingAllowed) inject();
    };
    document.addEventListener('visitorConsentCollected', onConsent);
    return () =>
      document.removeEventListener('visitorConsentCollected', onConsent);
  }, [companyId, customerPrivacy]);

  return null;
}
