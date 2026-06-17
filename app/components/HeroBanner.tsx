import {Link} from 'react-router';

type HeroBannerProps = {
  imageUrl: string;
  mobileImageUrl?: string;
  imageAlt?: string;
  title: string;
  description?: string;
  link: {
    text: string;
    url: string;
  };
  /** 'link' = onderstreepte tekstlink (default, hero-stijl); 'filled' = terracotta knop */
  buttonVariant?: 'link' | 'filled';
  /** Tailwind-klasse(n) voor de minimale hoogte van de content-wrapper. Default: 'min-h-[80vh]' */
  minHeightClassName?: string;
  /** Welk heading-element de titel krijgt. Default: 'h1' */
  headingLevel?: 'h1' | 'h2';
  /**
   * Zet het data-hero attribuut op de sectie (de header gebruikt dit voor de scroll-drempel).
   * Stel in op false voor banners die niet de hero zijn. Default: true
   */
  markAsHero?: boolean;
};

export function HeroBanner({
  imageUrl,
  mobileImageUrl,
  imageAlt,
  title,
  description,
  link,
  buttonVariant = 'link',
  minHeightClassName = 'min-h-[80vh]',
  headingLevel = 'h1',
  markAsHero = true,
}: HeroBannerProps) {
  const Heading = headingLevel;
  const headingClassName = markAsHero
    ? 'max-w-3xl font-heading font-normal leading-[normal] text-white text-balance text-[40px] sm:text-[52px] lg:text-[64px]'
    : 'max-w-3xl font-heading font-normal leading-[normal] text-white text-balance text-[28px] lg:text-[48px]';

  return (
    <section
      {...(markAsHero ? {'data-hero': true} : {})}
      className="relative overflow-hidden bg-neutral-950 text-white"
    >
      <picture className="absolute inset-0 h-full w-full">
        {mobileImageUrl ? (
          <source media="(max-width: 767px)" srcSet={mobileImageUrl} />
        ) : null}
        <img
          alt={imageAlt ?? title}
          className="absolute inset-0 h-full w-full object-cover"
          {...(markAsHero
            ? {fetchPriority: 'high' as const, loading: 'eager' as const}
            : {loading: 'lazy' as const})}
          src={imageUrl}
        />
      </picture>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.05)_0%,rgba(8,8,8,0.22)_45%,rgba(8,8,8,0.52)_100%),linear-gradient(90deg,rgba(8,8,8,0.45)_0%,rgba(8,8,8,0.18)_50%,rgba(8,8,8,0.04)_100%)]" />

      <div className={`relative z-10 flex ${minHeightClassName} max-w-3xl flex-col justify-end gap-4 px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-14`}>
        <Heading className={headingClassName}>
          {title}
        </Heading>

        {description ? (
          <p className="max-w-lg font-body text-[18px] font-normal leading-[normal] text-white">
            {description}
          </p>
        ) : null}

        <div className="pt-2">
          {buttonVariant === 'filled' ? (
            <Link
              className="inline-flex w-fit items-center bg-terracotta px-6 py-3 font-body text-[18px] font-normal leading-[normal] text-white underline hover:underline"
              to={link.url}
            >
              {link.text}
            </Link>
          ) : (
            <Link
              className="font-body text-[18px] font-normal leading-[normal] text-white underline hover:underline"
              to={link.url}
            >
              {link.text}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
