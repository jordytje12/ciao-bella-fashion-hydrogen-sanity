import {useRef} from 'react';

export type ReviewItem = {
  id: string;
  author: string;
  rating: number;
  date: string | null;
  reviewTitle: string | null;
  text: string;
};

export type TrustBar = {
  score: number | null;
  caption: string | null;
  label: string | null;
  url: string | null;
};

export type ReviewsData = {
  heading: string;
  subtitle: string | null;
  items: ReviewItem[];
  trustBar: TrustBar | null;
};

function formatDate(dateStr: string): string {
  // dateStr is 'YYYY-MM-DD' from Sanity
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts.map(Number);
  const months = [
    'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
  ];
  if (month < 1 || month > 12) return dateStr;
  return `${day} ${months[month - 1]} ${year}`;
}

/**
 * Trustpilot-stijl sterren: groene vierkante tegels met witte ster.
 * Ondersteunt decimale scores (bv. 4.6) via een lineaire gradient.
 * Wordt ook op de productpagina gebruikt (boven de titel).
 */
export function TrustpilotStars({
  rating,
  size = 'md',
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={`tp-stars tp-stars--${size}`}
      role="img"
      aria-label={`${rating} van 5 sterren`}
    >
      {Array.from({length: 5}, (_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i));
        const bg =
          fill >= 1
            ? '#00b67a'
            : fill > 0
            ? `linear-gradient(to right, #00b67a ${fill * 100}%, #dcdce6 ${fill * 100}%)`
            : '#dcdce6';
        return (
          <span
            key={i}
            className="tp-stars__tile"
            style={{background: bg}}
            aria-hidden="true"
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

export function Reviews({data}: {data: ReviewsData}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!data.items.length && !data.trustBar) return null;

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('.home-reviews__card');
    const gap = parseFloat(getComputedStyle(track).gap || '0');
    const amount = (card?.offsetWidth ?? track.clientWidth) + gap;
    track.scrollBy({left: dir * amount, behavior: 'smooth'});
  };

  const bar = data.trustBar;

  // Content voor de trustbar (wordt hergebruikt in <a> of <div>)
  const trustBarContent = bar ? (
    <>
      {bar.score !== null ? (
        <TrustpilotStars rating={bar.score} size="md" />
      ) : null}
      {bar.caption ? (
        <p className="home-reviews__trustbar-caption">{bar.caption}</p>
      ) : null}
      {bar.label ? (
        <span className="home-reviews__trustbar-label">
          <span className="home-reviews__trustbar-star" aria-hidden="true">
            ★
          </span>
          {bar.label}
        </span>
      ) : null}
    </>
  ) : null;

  return (
    <section className="home-reviews" aria-label="Klantreviews">
      <div className="home-reviews__inner">
        {data.heading || data.subtitle ? (
          <div className="home-reviews__header">
            {data.heading ? (
              <h2 className="home-reviews__heading">{data.heading}</h2>
            ) : null}
            {data.subtitle ? (
              <p className="home-reviews__subtitle">{data.subtitle}</p>
            ) : null}
          </div>
        ) : null}

        {data.items.length > 0 ? (
          <div className="home-reviews__slider">
            <button
              type="button"
              aria-label="Vorige reviews"
              className="home-reviews__arrow home-reviews__arrow--prev"
              onClick={() => scrollByCard(-1)}
            >
              ‹
            </button>

            <div className="home-reviews__track" ref={trackRef}>
              {data.items.map((item) => (
                <article key={item.id} className="home-reviews__card">
                  <TrustpilotStars rating={item.rating} size="sm" />
                  {item.reviewTitle ? (
                    <h3 className="home-reviews__card-title">
                      {item.reviewTitle}
                    </h3>
                  ) : null}
                  <p className="home-reviews__card-text">{item.text}</p>
                  <footer className="home-reviews__card-footer">
                    <span className="home-reviews__card-author">
                      {item.author}
                    </span>
                    {item.date ? (
                      <time
                        className="home-reviews__card-date"
                        dateTime={item.date}
                      >
                        {formatDate(item.date)}
                      </time>
                    ) : null}
                  </footer>
                </article>
              ))}
            </div>

            <button
              type="button"
              aria-label="Volgende reviews"
              className="home-reviews__arrow home-reviews__arrow--next"
              onClick={() => scrollByCard(1)}
            >
              ›
            </button>
          </div>
        ) : null}

        {bar ? (
          bar.url ? (
            <a
              href={bar.url}
              className="home-reviews__trustbar"
              target="_blank"
              rel="noopener noreferrer"
            >
              {trustBarContent}
            </a>
          ) : (
            <div className="home-reviews__trustbar">{trustBarContent}</div>
          )
        ) : null}
      </div>
    </section>
  );
}
