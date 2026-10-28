import { useRef } from 'react';

import { Button } from '@/components/ui/index.js';

import Dialog from './Dialog.jsx';

/**
 * დადასტურება (წაშლა, ვერსიის აღდგენა, გათიშვა): ფოკუსი „გაუქმებაზე“ — ნაკლებად სახიფათო
 * მოქმედებაზე (APG). Esc = გაუქმება. დადასტურების ღილაკი `primary`-ა — ოქროსფერი მხოლოდ CTA-ა.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.description]
 * @param {string} props.confirmLabel
 * @param {string} props.cancelLabel
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @param {boolean} [props.busy=false]
 * @param {import('react').ReactNode} [props.children]   მაგ. შეცდომის ტექსტი (`role="alert"`)
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  children,
}) {
  const cancelRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      initialFocus={cancelRef}
      actions={
        <>
          <Button variant="primary" size="sm" loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
