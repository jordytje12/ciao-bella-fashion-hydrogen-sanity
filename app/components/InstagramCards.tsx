import {Link} from 'react-router';

export type InstagramCardItem = {
  image: {url: string};
  username: string;
  title: string;
  handle: string;
};

export type InstagramCardsData = {
  heading: string;
  instagramHandle: string | null;
  instagramUrl: string | null;
  cards: InstagramCardItem[];
};

export function InstagramCards({data}: {data: InstagramCardsData}) {
  if (!data.cards.length) return null;

  return (
    <section className="home-instagram" aria-label="Instagram">
      <div className="home-instagram__header">
        <h2 className="home-instagram__heading">{data.heading}</h2>
        {data.instagramHandle ? (
          data.instagramUrl ? (
            <a
              className="home-instagram__handle"
              href={data.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.instagramHandle}
            </a>
          ) : (
            <span className="home-instagram__handle">{data.instagramHandle}</span>
          )
        ) : null}
      </div>

      <div className="home-instagram__items">
        {data.cards.map((card, index) => (
          <Link
            key={index}
            to={`/products/${card.handle}`}
            prefetch="viewport"
            className="home-instagram__card"
          >
            <img
              src={card.image.url}
              alt={card.title}
              className="home-instagram__image"
              loading="lazy"
              sizes="(min-width: 64em) 16vw, 50vw"
            />
            <div className="home-instagram__overlay">
              <span className="home-instagram__username">{card.username}</span>
              <span className="home-instagram__title">{card.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
