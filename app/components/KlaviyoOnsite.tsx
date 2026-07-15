import {useEffect} from 'react';

/**
 * Laadt Klaviyo's officiële onsite-script voor Hydrogen.
 * Klaviyo respecteert de Shopify Customer Privacy-instellingen voor tracking.
 */
export function KlaviyoOnsite({companyId}: {companyId?: string | null}) {
  useEffect(() => {
    if (!companyId) return;

    const src = `https://static.klaviyo.com/onsite/js/${companyId}/klaviyo.js`;
    if (document.querySelector(`script[src="${src}"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);
  }, [companyId]);

  return null;
}
