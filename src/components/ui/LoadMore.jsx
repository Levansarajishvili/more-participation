import { useId } from 'react';

import { t } from '@/i18n/index.js';

import Button from './Button.jsx';
import Icon from './Icon.jsx';
import VisuallyHidden from './VisuallyHidden.jsx';
import { cx } from './utils.js';

/** @typedef {import('@/content/errors.js').ContentError} ContentError */

/**
 * „მეტის ჩატვირთვა“ (ContentKit: სამი მდგომარეობა) — `useLoadMore`-ის შედეგს იღებს:
 * - ნაგულისხმევი: ღილაკი „მეტის ჩატვირთვა“ + „ნაჩვენებია {n} / {სულ}“ (`aria-describedby`);
 * - იტვირთება: ღილაკი ადგილზე რჩება `loading`-ით (ტრიალი + „იტვირთება…“, `aria-busy`), ფოკუსი
 *   არ იკარგება; reduced-motion-ში ტრიალი სტატიკურია;
 * - ყველა ნაჩვენებია: ღილაკის ნაცვლად ტექსტი.
 * შეცდომისას სია რჩება, ქვემოთ — ხატულა + `ContentError.message` (`role="alert"`), ღილაკი თავიდან
 * ცდის. ფოკუსს პირველ ახალ ბარათზე და სტატუსს „დაემატა {n}, სულ {n}“ გვერდი მართავს
 * (`useLoadMoreFocus`).
 *
 * @param {object} props
 * @param {import('@/hooks/useLoadMore.js').LoadMoreStatus} props.status
 * @param {boolean} props.hasMore
 * @param {() => void} props.onLoadMore
 * @param {number} props.shown
 * @param {number} props.total
 * @param {ContentError | null} [props.error]
 * @param {string} props.label        სიის სახელი ღილაკის ხელმისაწვდომ სახელში („სტატიები“)
 * @param {string} [props.className]
 */
export default function LoadMore({
  status,
  hasMore,
  onLoadMore,
  shown,
  total,
  error = null,
  label,
  className,
}) {
  const countId = useId();
  if (total === 0) return null;
  return (
    <div className={cx('mc-load-more', className)}>
      {hasMore ? (
        <Button
          variant="secondary"
          size="lg"
          loading={status === 'loading-more'}
          aria-describedby={countId}
          onClick={onLoadMore}
        >
          {t('common.loadMore')}
          <VisuallyHidden>: {label}</VisuallyHidden>
        </Button>
      ) : (
        <p className="mc-load-more__done">{t('common.allShown')}</p>
      )}
      <p id={countId} className="mc-load-more__count">
        {t('common.shownOf', { shown, total })}
      </p>
      {status === 'error' && error && (
        <p role="alert" className="mc-load-more__error">
          <Icon name="alert" size="1.25rem" />
          <span>{error.message}</span>
        </p>
      )}
    </div>
  );
}
