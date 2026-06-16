import {useState, useEffect} from 'react';

export type TopbarUsp = {
  text: string;
  iconUrl?: string | null;
};

interface TopbarProps {
  items?: TopbarUsp[] | null;
}

/**
 * Topbar met een verticale USP-slider.
 * Items komen van boven binnen, houden even halt en glijden naar beneden weg.
 * Bij één item: geen animatie. Respecteert prefers-reduced-motion.
 */
export function Topbar({items}: TopbarProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const validItems = items?.filter((item) => item.text) ?? [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (validItems.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % validItems.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [validItems.length]);

  if (validItems.length === 0) return null;

  const activeItem = validItems[activeIndex];

  return (
    <div className="topbar" role="region" aria-label="Topbar USP">
      <div
        className="topbar-inner"
        // Wissel de key zodat de CSS-animatie herstart bij elk nieuw item
        key={mounted ? activeIndex : 'ssr'}
      >
        {activeItem.iconUrl && (
          <img
            src={activeItem.iconUrl}
            alt=""
            aria-hidden="true"
            className="topbar-icon"
            width={20}
            height={20}
          />
        )}
        <span>{activeItem.text}</span>
      </div>
    </div>
  );
}
