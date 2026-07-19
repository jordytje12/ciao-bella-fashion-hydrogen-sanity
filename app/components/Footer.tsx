import {Link} from 'react-router';
import {useAnalytics} from '@shopify/hydrogen';
import {useLocalePrefix} from '~/lib/i18n';
import {resolveLinkUrl, isAbsoluteExternalUrl} from '~/lib/links';
import {SocialLinks, type SocialLink} from '~/components/SocialLinks';
import {MarketSelector} from '~/components/LocaleSelector';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UspCard = {
  iconUrl?: string | null;
  title?: string | null;
  subtext?: string | null;
};

export type FooterMenuLink = {
  label?: string | null;
  link?: {
    _type: string;
    url?: string;
    reference?: {_type: string; slug?: string};
  } | null;
};

export type FooterMenuColumn = {
  title?: string | null;
  links?: FooterMenuLink[] | null;
};

export type FooterData = {
  uspCards?: UspCard[] | null;
  brandTitle?: string | null;
  brandText?: string | null;
  socialLinks?: SocialLink[] | null;
  menuColumns?: FooterMenuColumn[] | null;
  newsletterTitle?: string | null;
  newsletterText?: string | null;
  klaviyoCompanyId?: string | null;
  klaviyoFormId?: string | null;
};

// ─── Payment icons ────────────────────────────────────────────────────────────

function PaymentIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Visa */}
      <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa" role="img">
        <rect width="38" height="24" rx="4" fill="white" fillOpacity="0.15"/>
        <path d="M15.33 16H13.2L14.62 8h2.13L15.33 16zM22.12 8.18c-.42-.16-.99-.34-1.74-.34-1.92 0-3.27 1.02-3.28 2.48-.01 1.08.96 1.68 1.7 2.04.75.37 1 .6 1 .93-.01.5-.6.73-1.15.73-.77 0-1.18-.11-1.81-.38l-.25-.12-.27 1.67c.45.21 1.28.39 2.14.4 2.03 0 3.35-1.01 3.37-2.57.01-.86-.51-1.51-1.63-2.04-.68-.35-1.09-.58-1.09-.93 0-.31.35-.64 1.11-.64.63-.01 1.09.13 1.45.28l.17.08.26-1.59zM27.1 8h-1.5c-.46 0-.8.13-1.01.6L21.74 16h2.02l.4-1.1h2.47L26.88 16h1.79L27.1 8zm-2.37 5.37.77-2.08.2-.57.14.55.46 2.1h-1.57zM12.5 8l-1.9 5.43-.2-1.02-.69-3.52c-.12-.49-.47-.63-.9-.65H5.98l-.03.15c.77.2 1.45.48 2.02.81l1.72 6.8H11.8L15.2 8h-2.7z" fill="white"/>
      </svg>

      {/* Mastercard */}
      <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard" role="img">
        <rect width="38" height="24" rx="4" fill="white" fillOpacity="0.15"/>
        <circle cx="15" cy="12" r="5" fill="#EB001B"/>
        <circle cx="23" cy="12" r="5" fill="#F79E1B"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M19 8.27a5 5 0 010 7.46A5 5 0 0119 8.27z" fill="#FF5F00"/>
      </svg>

      {/* iDEAL */}
      <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="iDEAL" role="img">
        <rect width="38" height="24" rx="4" fill="white" fillOpacity="0.15"/>
        <text x="19" y="16" textAnchor="middle" fill="white" fontSize="9" fontFamily="sans-serif" fontWeight="bold">iDEAL</text>
      </svg>

      {/* PayPal */}
      <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PayPal" role="img">
        <rect width="38" height="24" rx="4" fill="white" fillOpacity="0.15"/>
        <path d="M23.5 8c.83 0 1.4.17 1.73.5.3.32.38.82.23 1.5-.43 2.07-1.87 2.77-3.72 2.77h-.94c-.23 0-.42.16-.46.38l-.56 3.35h-1.73l1.5-8.5H23.5z" fill="#009cde"/>
        <path d="M15.2 8h3.13c1.85 0 3.29.7 3.72 2.77.15.68.07 1.18-.23 1.5-.33.33-.9.5-1.73.5h-2.45l-.56 3.35H15.4l-.19-1.12-.01-.5V8z" fill="white"/>
      </svg>

      {/* Bancontact */}
      <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Bancontact" role="img">
        <rect width="38" height="24" rx="4" fill="white" fillOpacity="0.15"/>
        <text x="19" y="16" textAnchor="middle" fill="white" fontSize="7.5" fontFamily="sans-serif" fontWeight="bold">Bancontact</text>
      </svg>

      {/* Klarna */}
      <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Klarna" role="img">
        <rect width="38" height="24" rx="4" fill="white" fillOpacity="0.15"/>
        <text x="19" y="16" textAnchor="middle" fill="white" fontSize="9" fontFamily="sans-serif" fontWeight="bold">Klarna</text>
      </svg>
    </div>
  );
}

// ─── USP Bar ─────────────────────────────────────────────────────────────────

export function FooterUspBar({cards}: {cards: UspCard[]}) {
  if (!cards.length) return null;

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card, i) => (
            <div
              key={i}
              className="flex items-start gap-4"
            >
              {card.iconUrl && (
                <img
                  src={card.iconUrl}
                  alt=""
                  aria-hidden="true"
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 object-contain"
                />
              )}
              <div>
                {card.title && (
                  <p className="font-heading text-sm font-semibold uppercase tracking-wide text-black">
                    {card.title}
                  </p>
                )}
                {card.subtext && (
                  <p className="font-body mt-1 text-sm text-black/70">
                    {card.subtext}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer({footer}: {footer: FooterData | null}) {
  const localePrefix = useLocalePrefix();
  const {privacyBanner} = useAnalytics();

  const uspCards = footer?.uspCards ?? [];
  const socialLinks = footer?.socialLinks ?? [];
  const menuColumns = footer?.menuColumns ?? [];

  return (
    <footer>
      {/* USP bar — cream achtergrond, boven de terracotta sectie */}
      <FooterUspBar cards={uspCards} />

      {/* Hoofdfooter — terracotta achtergrond */}
      <div className="bg-terracotta text-cream">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">

            {/* Kolom 1 — Merk + social */}
            <div className="flex flex-col gap-4">
              {footer?.brandTitle && (
                <h3 className="font-heading text-base font-semibold uppercase tracking-widest text-cream">
                  {footer.brandTitle}
                </h3>
              )}
              {footer?.brandText && (
                <p className="font-body text-sm leading-relaxed text-cream/80">
                  {footer.brandText}
                </p>
              )}
              <SocialLinks
                links={socialLinks}
                tone="light"
                className="pt-2"
              />
            </div>

            {/* Kolom 2 & 3 — Menu kolommen */}
            {menuColumns.map((column, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-3">
                {column.title && (
                  <h3 className="font-heading text-base font-semibold uppercase tracking-widest text-cream">
                    {column.title}
                  </h3>
                )}
                {column.links && column.links.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {column.links.map((item, linkIdx) => {
                      if (!item.link && !item.label) return null;
                      const resolved = item.link
                        ? resolveLinkUrl(item.link)
                        : null;
                      const isAbsoluteExternal =
                        item.link?._type === 'linkExternal' &&
                        isAbsoluteExternalUrl(resolved);
                      const url = resolved
                        ? isAbsoluteExternal
                          ? resolved
                          : `${localePrefix}${resolved}`
                        : null;

                      return (
                        <li key={linkIdx}>
                          {url ? (
                            isAbsoluteExternal ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-body text-sm text-cream/80 transition-colors hover:text-cream"
                              >
                                {item.label}
                              </a>
                            ) : (
                              <Link
                                to={url}
                                prefetch="intent"
                                className="font-body text-sm text-cream/80 transition-colors hover:text-cream"
                              >
                                {item.label}
                              </Link>
                            )
                          ) : (
                            <span className="font-body text-sm text-cream/80">
                              {item.label}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}

            {/* Kolom 4 — Nieuwsbrief / Klaviyo */}
            <div className="flex flex-col gap-3">
              {footer?.newsletterTitle && (
                <h3 className="font-heading text-base font-semibold uppercase tracking-widest text-cream">
                  {footer.newsletterTitle}
                </h3>
              )}
              {footer?.newsletterText && (
                <p className="font-body text-sm leading-relaxed text-cream/80">
                  {footer.newsletterText}
                </p>
              )}
              {footer?.klaviyoFormId && (
                <div className={`klaviyo-form-${footer.klaviyoFormId}`} />
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Onderste balk — payment icons + copyright */}
      <div className="bg-terracotta border-t border-cream/20">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <PaymentIcons />
            <button
              type="button"
              onClick={() => privacyBanner?.showPreferences()}
              className="font-body text-xs text-cream/60 underline transition-colors hover:text-cream"
            >
              Cookievoorkeuren
            </button>
            <div className="flex items-center gap-4">
              <span className="footer-market">
                <MarketSelector />
              </span>
              <p className="font-body text-xs text-cream/60">
                © 2026 Ciaobellafashion | All Rights Reserved
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
