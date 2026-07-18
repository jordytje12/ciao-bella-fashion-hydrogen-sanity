import {useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';
import {getUiTranslations} from '~/lib/translations';

type StockLevel = 'low' | 'medium' | 'high';

function getStockLevel(quantity: number): StockLevel {
  if (quantity <= 5) return 'low';
  if (quantity <= 10) return 'medium';
  return 'high';
}

const FILL_WIDTH: Record<StockLevel, string> = {
  low: '25%',
  medium: '60%',
  high: '100%',
};

export function StockLevelBar({
  quantityAvailable,
  availableForSale,
}: {
  quantityAvailable?: number | null;
  availableForSale?: boolean | null;
}) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const labels = getUiTranslations(rootData?.consent.language);

  if (
    !availableForSale ||
    quantityAvailable == null ||
    quantityAvailable <= 0
  ) {
    return null;
  }

  const level = getStockLevel(quantityAvailable);
  const label =
    quantityAvailable === 1
      ? labels.stockLastOne
      : level === 'low'
        ? labels.stockLow
        : level === 'medium'
          ? labels.stockMedium
          : labels.stockHigh;

  return (
    <div
      aria-live="polite"
      className={`pdp-stock pdp-stock--${level}`}
      role="status"
    >
      <div className="pdp-stock__meta">
        <span aria-hidden="true" className="pdp-stock__dot" />
        <span className="pdp-stock__label">{label}</span>
      </div>
      <div aria-hidden="true" className="pdp-stock__track">
        <div
          className="pdp-stock__fill"
          style={{width: FILL_WIDTH[level]}}
        />
      </div>
    </div>
  );
}
