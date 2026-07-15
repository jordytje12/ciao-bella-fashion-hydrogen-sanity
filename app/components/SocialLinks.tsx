import {stegaClean} from '@sanity/client/stega';

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'pinterest'
  | 'youtube'
  | 'linkedin';

export type SocialLink = {
  _key?: string;
  platform: SocialPlatform;
  url: string;
};

const platformLabels: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
};

function SocialIcon({
  platform,
  color,
}: {
  platform: SocialPlatform;
  color: string;
}) {
  switch (platform) {
    case 'instagram':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle
            cx="17.5"
            cy="6.5"
            r="0.5"
            fill={color}
            stroke="none"
          />
        </svg>
      );
    case 'tiktok':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={color}
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={color}
          aria-hidden="true"
        >
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={color}
          aria-hidden="true"
        >
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={color}
          aria-hidden="true"
        >
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={color}
          aria-hidden="true"
        >
          <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
  }
}

type SocialLinksProps = {
  links?: SocialLink[] | null;
  tone?: 'light' | 'dark';
  className?: string;
};

export function SocialLinks({
  links,
  tone = 'dark',
  className = '',
}: SocialLinksProps) {
  if (!links?.length) return null;

  const linkColor =
    tone === 'light'
      ? 'text-cream/80 hover:text-cream focus-visible:text-cream'
      : 'text-black/70 hover:text-terracotta focus-visible:text-terracotta';
  const iconColor = tone === 'light' ? '#fffaf1' : '#1c1a18';

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label="Social media"
    >
      {links.map((social) => {
        const platform = stegaClean(social.platform);

        return (
          <a
            key={social._key ?? `${platform}-${social.url}`}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Bekijk Ciao Bella Fashion op ${platformLabels[platform]}`}
            title={platformLabels[platform]}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${linkColor}`}
          >
            <SocialIcon platform={platform} color={iconColor} />
          </a>
        );
      })}
    </div>
  );
}
