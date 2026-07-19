import {FREE_SHIPPING_THRESHOLD} from '~/lib/shipping';

const currencyFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
});

type FreeShippingProgressProps = {
  subtotalAmount?: string | null;
};

export function FreeShippingProgress({
  subtotalAmount,
}: FreeShippingProgressProps) {
  const subtotal = Number(subtotalAmount ?? 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const achieved = remaining <= 0;

  return (
    <div className="free-shipping-progress">
      <p className="free-shipping-progress__text">
        {achieved
          ? 'Je hebt gratis verzending!'
          : `Nog ${currencyFormatter.format(remaining)} tot gratis verzending`}
      </p>
      <div
        className="free-shipping-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Voortgang naar gratis verzending"
      >
        <div
          className="free-shipping-progress__fill"
          style={{width: `${progress}%`}}
        />
      </div>
    </div>
  );
}
