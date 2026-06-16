import {Link} from 'react-router';

const COLLECTION_GRID_SIZE = 5;

export type CollectionGridImage = {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CollectionGridItem = {
  id: string;
  title: string;
  handle: string;
  image: CollectionGridImage;
};

export function CollectionGrid({
  collections,
}: {
  collections: CollectionGridItem[];
}) {
  const visibleCollections = collections.slice(0, COLLECTION_GRID_SIZE);

  if (visibleCollections.length !== COLLECTION_GRID_SIZE) return null;

  return (
    <section className="home-collection-grid" aria-label="Collections">
      <div className="home-collection-grid__items">
        {visibleCollections.map((collection, index) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

export function CollectionCard({
  collection,
  index,
}: {
  collection: CollectionGridItem;
  index: number;
}) {
  return (
    <Link
      className="home-collection-card"
      to={`/collections/${collection.handle}`}
      prefetch="intent"
    >
      <img
        alt={collection.image.altText || collection.title}
        className="home-collection-card__image"
        height={collection.image.height ?? undefined}
        loading={index < 3 ? 'eager' : 'lazy'}
        sizes="(min-width: 64em) 20vw, 33vw"
        src={collection.image.url}
        width={collection.image.width ?? undefined}
      />
      <span className="home-collection-card__title">
        {collection.title}
      </span>
    </Link>
  );
}
