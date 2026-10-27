import { useEffect, useId, useRef } from 'react';

import { cx } from '@/components/ui/utils.js';

/**
 * მოდალური დიალოგი ნატიური `<dialog>`-ით (`showModal()`): ფონი თავისთავად `inert`-ია, Esc ხურავს
 * (`cancel` → `onClose`), ფოკუსი გახსნისას `initialFocus`-ზე (ან პირველ ღილაკზე) გადადის და
 * დახურვისას იმ ელემენტს უბრუნდება, საიდანაც დიალოგი გაიხსნა.
 *
 * - `role="alertdialog"` — მოთხოვნა, რომელიც პასუხს ითხოვს (სესიის ვადა); სახელი — სათაური,
 *   აღწერა — `description` (`aria-describedby`).
 * - დადასტურების დიალოგი (არქივი, აღდგენა) — `ConfirmDialog`.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(reason: 'cancel' | 'close') => void} props.onClose
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.description]
 * @param {import('react').ReactNode} [props.children]
 * @param {import('react').ReactNode} [props.actions]
 * @param {'dialog' | 'alertdialog'} [props.role='dialog']
 * @param {import('react').RefObject<HTMLElement | null>} [props.initialFocus]
 * @param {string} [props.className]
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  role = 'dialog',
  initialFocus,
  className,
}) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const returnTo = useRef(/** @type {HTMLElement | null} */ (null));
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = /** @type {HTMLElement | null} */ (document.activeElement);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      const target = initialFocus?.current ?? dialog.querySelector('button');
      target?.focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      const back = returnTo.current;
      if (back?.isConnected) back.focus();
    }
  }, [open, initialFocus]);

  return (
    <dialog
      ref={ref}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className={cx('mc-dialog', className)}
      onCancel={(event) => {
        event.preventDefault();
        onClose('cancel');
      }}
    >
      <h2 id={titleId} className="mc-dialog__title">
        {title}
      </h2>
      {description && (
        <p id={descId} className="mc-dialog__text">
          {description}
        </p>
      )}
      {children}
      {actions && <div className="mc-dialog__actions">{actions}</div>}
    </dialog>
  );
}
