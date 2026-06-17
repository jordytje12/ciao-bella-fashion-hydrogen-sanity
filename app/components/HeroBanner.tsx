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
};

export function HeroBanner({
  imageUrl,
  mobileImageUrl,
  imageAlt,
  title,
  description,
  link,
}: HeroBannerProps) {
  return (
    <section data-hero className="relative overflow-hidden bg-neutral-950 text-white">
      <picture className="absolute inset-0 h-full w-full">
        {mobileImageUrl ? (
          <source media="(max-width: 767px)" srcSet={mobileImageUrl} />
        ) : null}
        <img
          alt={imageAlt ?? title}
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          loading="eager"
          src={imageUrl}
        />
      </picture>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.05)_0%,rgba(8,8,8,0.22)_45%,rgba(8,8,8,0.52)_100%),linear-gradient(90deg,rgba(8,8,8,0.45)_0%,rgba(8,8,8,0.18)_50%,rgba(8,8,8,0.04)_100%)]" />

      <div className="relative z-10 flex min-h-[80vh] max-w-3xl flex-col justify-end gap-4 px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-14">
        <h1 className="max-w-3xl font-heading font-normal leading-[normal] text-white text-balance text-[40px] sm:text-[52px] lg:text-[64px]">
          {title}
        </h1>

        {description ? (
          <p className="max-w-lg font-body text-[18px] font-normal leading-[normal] text-white">
            {description}
          </p>
        ) : null}

        <div className="pt-2">
          <Link
            className="font-body text-[18px] font-normal leading-[normal] text-white underline hover:underline"
            to={link.url}
          >
            {link.text}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
