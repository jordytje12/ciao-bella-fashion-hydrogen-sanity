import {Link} from 'react-router';

type HeroBannerProps = {
  imageUrl: string;
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
  imageAlt,
  title,
  description,
  link,
}: HeroBannerProps) {
  return (
    <section data-hero className="relative overflow-hidden bg-neutral-950 text-white">
      <img
        alt={imageAlt ?? title}
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        loading="eager"
        src={imageUrl}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.12)_0%,rgba(8,8,8,0.38)_45%,rgba(8,8,8,0.74)_100%),linear-gradient(90deg,rgba(8,8,8,0.72)_0%,rgba(8,8,8,0.3)_50%,rgba(8,8,8,0.08)_100%)]" />

      <div className="relative z-10 flex min-h-[80vh] max-w-2xl flex-col justify-end gap-4 px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-14">
        <h1 className="max-w-xl text-4xl font-semibold leading-none tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
          {title}
        </h1>

        {description ? (
          <p className="max-w-lg text-xl leading-6 text-white/85">
            {description}
          </p>
        ) : null}

        <div className="pt-2">
          <Link
            className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-transparent hover:text-white hover:ring-1 hover:ring-white/40"
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
