import {Link} from 'react-router';

export type DualCardItem = {
  image: {url: string; altText?: string | null};
  title: string;
  subtitle?: string | null;
  buttonText?: string | null;
  url: string;
};

export function DualCardBanner({cards}: {cards: DualCardItem[]}) {
  if (cards.length !== 2) return null;

  return (
    <section className="home-dual-card-banner" aria-label="Twee cards">
      <div className="home-dual-card-banner__items">
        {cards.map((card, index) => (
          <Link
            key={index}
            className="home-dual-card-banner__card"
            to={card.url}
            prefetch="viewport"
          >
            <img
              alt={card.image.altText || card.title}
              className="home-dual-card-banner__image"
              loading="lazy"
              sizes="(min-width: 64em) 50vw, 100vw"
              src={card.image.url}
            />
            <div className="home-dual-card-banner__overlay">
              <h2 className="home-dual-card-banner__title">{card.title}</h2>
              {card.subtitle ? (
                <p className="home-dual-card-banner__subtitle">{card.subtitle}</p>
              ) : null}
              {card.buttonText ? (
                <span className="home-dual-card-banner__button">{card.buttonText}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
