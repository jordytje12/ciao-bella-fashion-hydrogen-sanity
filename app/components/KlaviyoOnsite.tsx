import {useEffect, useRef} from 'react';
import {isMarketingConsentAllowed} from '~/lib/consent';

/**
 * Laadt Klaviyo's officiële onsite-script voor Hydrogen — pas ná
 * marketing-consent. Het script respecteert zelf ook de Shopify Customer
 * Privacy-instellingen, maar laadde voorheen altijd meteen; nu injecteren we
 * het pas zodra toestemming er is (en alsnog zodra die later komt).
 */
export function KlaviyoOnsite({companyId}: {companyId?: string | null}) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!companyId) return;

    function tryLoad() {
      if (loadedRef.current || !isMarketingConsentAllowed()) return;

      const src = `https://static.klaviyo.com/onsite/js/${companyId}/klaviyo.js`;
      if (document.querySelector(`script[src="${src}"]`)) {
        loadedRef.current = true;
        return;
      }

      loadedRef.current = true;
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }

    tryLoad();

    document.addEventListener('visitorConsentCollected', tryLoad);
    return () => document.removeEventListener('visitorConsentCollected', tryLoad);
  }, [companyId]);

  return null;
}
