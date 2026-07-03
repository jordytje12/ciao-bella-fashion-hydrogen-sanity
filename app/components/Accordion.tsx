/**
 * Uitklapbare panelen op basis van native <details>/<summary>.
 */
export function Accordion({
  items,
  defaultOpenIndex,
}: {
  items: Array<{id: string; title: string; content: React.ReactNode}>;
  defaultOpenIndex?: number;
}) {
  if (!items.length) return null;

  return (
    <div className="pdp-accordion">
      {items.map((item, index) => (
        <details
          className="pdp-accordion__item"
          key={item.id}
          open={index === defaultOpenIndex}
        >
          <summary className="pdp-accordion__summary">
            {item.title}
            <span aria-hidden="true" className="pdp-accordion__icon" />
          </summary>
          <div className="pdp-accordion__body">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
