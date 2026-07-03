/**
 * Aantal-selector voor de productpagina. De .qty__*-classes worden ook
 * door de stepper in de cart-drawer hergebruikt (daar met eigen CartForms).
 */
export function QuantitySelector({
  value,
  onDecrease,
  onIncrease,
  min = 1,
  disabled,
  decreaseLabel = 'Aantal verlagen',
  increaseLabel = 'Aantal verhogen',
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
  disabled?: boolean;
  decreaseLabel?: string;
  increaseLabel?: string;
}) {
  return (
    <div className="qty">
      <button
        aria-label={decreaseLabel}
        className="qty__btn"
        disabled={disabled || value <= min}
        onClick={onDecrease}
        type="button"
      >
        &#8722;
      </button>
      <span aria-live="polite" className="qty__value">
        {value}
      </span>
      <button
        aria-label={increaseLabel}
        className="qty__btn"
        disabled={disabled}
        onClick={onIncrease}
        type="button"
      >
        +
      </button>
    </div>
  );
}
