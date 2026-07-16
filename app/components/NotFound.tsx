import {Link, useRouteLoaderData} from 'react-router';
import {useLocalePrefix} from '~/lib/i18n';
import {getUiTranslations} from '~/lib/translations';
import type {RootLoader} from '~/root';

const LOGO_SRC =
  'https://cdn.shopify.com/s/files/1/0651/3541/1427/files/Ciao_Bella.svg?v=1781609526';

export function NotFound({standalone = false}: {standalone?: boolean}) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const localePrefix = useLocalePrefix();
  const t = getUiTranslations(rootData?.consent.language);
  const homeTo = localePrefix ? `${localePrefix}/` : '/';
  const shopTo = `${localePrefix}/collections`;

  return (
    <section className="not-found" aria-labelledby="not-found-title">
      {standalone ? (
        <Link to={homeTo} className="not-found__logo" prefetch="intent">
          <img
            src={LOGO_SRC}
            alt="Ciao Bella"
            width={379}
            height={71}
            className="not-found__logo-img"
          />
        </Link>
      ) : null}
      <p className="not-found__code" aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title" className="not-found__title">
        {t.notFoundTitle}
      </h1>
      <p className="not-found__body">{t.notFoundBody}</p>
      <div className="not-found__actions">
        <Link className="not-found__cta not-found__cta--primary" to={homeTo}>
          {t.notFoundHome}
        </Link>
        <Link className="not-found__cta not-found__cta--secondary" to={shopTo}>
          {t.notFoundShop}
        </Link>
      </div>
    </section>
  );
}
