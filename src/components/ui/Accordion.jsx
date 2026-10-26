import { useId, useRef, useState } from 'react';

import Icon from './Icon.jsx';
import { cx } from './utils.js';

/**
 * @typedef {object} AccordionItem
 * @property {string} id
 * @property {import('react').ReactNode} title
 * @property {import('react').ReactNode} content
 */

/** APG: 6-ზე მეტ პანელს `region` როლი არ ედება — landmark-ების სია არ უნდა გადაიტვირთოს. */
const REGION_LIMIT = 6;

/**
 * აკორდეონი (WAI-ARIA APG): სათაური → `<button aria-expanded aria-controls>`, პანელი `hidden`.
 * „+“ 45°-ით ბრუნავს, 200ms (reduced-motion — მყისიერად). კლავიატურა: Enter / Space — გახსნა,
 * ↓ / ↑ — შემდეგი / წინა სათაური (წრიულად), Home / End — პირველი / ბოლო.
 *
 * @param {object} props
 * @param {AccordionItem[]} props.items
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {boolean} [props.multiple=true]       ერთდროულად რამდენიმე ღია პანელი
 * @param {string[]} [props.defaultOpen=[]]
 * @param {string} [props.className]
 */
export default function Accordion({
  items,
  headingLevel: Heading = 'h3',
  multiple = true,
  defaultOpen = [],
  className,
}) {
  const baseId = useId();
  const [open, setOpen] = useState(() => new Set(defaultOpen));
  /** @type {import('react').RefObject<HTMLButtonElement[]>} */
  const triggers = useRef([]);
  const regions = items.length <= REGION_LIMIT;

  /** @param {string} id */
  const toggle = (id) =>
    setOpen((current) => {
      const next = new Set(multiple ? current : []);
      if (current.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** @param {import('react').KeyboardEvent} event @param {number} index */
  const handleKeyDown = (event, index) => {
    const last = items.length - 1;
    const target = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    triggers.current[target]?.focus();
  };

  return (
    <div className={cx('mc-accordion', className)}>
      {items.map((item, index) => {
        const expanded = open.has(item.id);
        const triggerId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div key={item.id} className="mc-acc-item">
            <Heading className="mc-acc-heading">
              <button
                ref={(node) => {
                  triggers.current[index] = node;
                }}
                type="button"
                id={triggerId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="mc-acc-trigger"
              >
                <span>{item.title}</span>
                <Icon name="plus" className="mc-acc-icon" />
              </button>
            </Heading>
            <div
              id={panelId}
              role={regions ? 'region' : undefined}
              aria-labelledby={regions ? triggerId : undefined}
              hidden={!expanded}
              className="mc-acc-panel"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
