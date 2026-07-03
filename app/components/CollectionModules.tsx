import {Link} from 'react-router';
import {HeroBanner} from '~/components/HeroBanner';
import {DualCardBanner, type DualCardItem} from '~/components/DualCardBanner';
import {
  FeaturedProducts,
  type FeaturedProductItem,
} from '~/components/FeaturedProducts';

export type ResolvedCollectionModule =
  | {
      key: string;
      type: 'promoBanner';
      imageUrl: string;
      mobileImageUrl: string | null;
      title: string;
      description: string | null;
      buttonText: string;
      url: string;
    }
  | {key: string; type: 'dualCardBanner'; cards: DualCardItem[]}
  | {
      key: string;
      type: 'featuredProducts';
      heading: string;
      products: FeaturedProductItem[];
      viewAllLabel?: string;
      viewAllUrl?: string;
    }
  | {key: string; type: 'callout'; text: string; url: string | null};

/**
 * Rendert de vanuit Sanity samengestelde modules onder het productgrid
 * van een collectiepagina, met dezelfde componenten als de homepage.
 */
export function CollectionModules({
  modules,
}: {
  modules: ResolvedCollectionModule[];
}) {
  if (!modules.length) return null;

  return (
    <div className="collection-modules">
      {modules.map((module) => {
        switch (module.type) {
          case 'promoBanner':
            return (
              <HeroBanner
                key={module.key}
                imageUrl={module.imageUrl}
                mobileImageUrl={module.mobileImageUrl ?? module.imageUrl}
                title={module.title}
                description={module.description ?? undefined}
                link={{text: module.buttonText, url: module.url}}
                buttonVariant="filled"
                minHeightClassName="min-h-[500px] lg:min-h-[640px]"
                headingLevel="h2"
                markAsHero={false}
              />
            );
          case 'dualCardBanner':
            return <DualCardBanner key={module.key} cards={module.cards} />;
          case 'featuredProducts':
            return (
              <FeaturedProducts
                key={module.key}
                heading={module.heading}
                products={module.products}
                viewAllLabel={module.viewAllLabel}
                viewAllUrl={module.viewAllUrl}
              />
            );
          case 'callout':
            return (
              <section key={module.key} className="collection-callout">
                {module.url ? (
                  <Link className="collection-callout__text" to={module.url}>
                    {module.text}
                  </Link>
                ) : (
                  <p className="collection-callout__text">{module.text}</p>
                )}
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
