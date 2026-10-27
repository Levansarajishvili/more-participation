import { Icon } from '@/components/ui/index.js';

import { ta } from '../i18n/index.js';

const ICON = /** @type {const} */ ({ published: 'check', scheduled: 'clock', draft: 'pencil' });

/**
 * მასალის სტატუსი: ხატულა + ტექსტი + 2px ჩარჩო სტატუსის ფერით, surface ფონზე — დაფის ტინტები
 * (#E3F6EE, #FFF1E0 / #0A2E22, #33280B) ტოკენებში არ არის. ფერი არასოდეს მარტოა:
 * - გამოქვეყნებული — ✓, `--mc-growth` (#08704C 6.1:1 / #3DDC97 8.8:1); ▲ ზრდის მეტრიკისთვის რჩება;
 * - დაგეგმილი — საათი, `--mc-accent-text` (#A8430C 6.1:1 / #FF8A4C 6.7:1; მუქის #FFD166 — CTA-ს
 *   hover — სტატუსად არ გამოიყენება);
 * - მონახაზი — ფანქარი, ink + წყვეტილი `--mc-border` ჩარჩო.
 *
 * @param {{ status: import('@/content/model.js').Status, className?: string }} props
 */
export default function StatusBadge({ status, className }) {
  return (
    <span className={`mc-status mc-status--${status}${className ? ` ${className}` : ''}`}>
      <Icon name={ICON[status] ?? 'pencil'} size="1.125rem" />
      <span>{ta(`status.${status}`)}</span>
    </span>
  );
}

/**
 * ხელმისაწვდომობის ხარვეზი: ხატულა + „ხარვეზი: 2“, `--mc-error` ჩარჩო.
 * @param {{ count: number, className?: string }} props
 */
export function IssueBadge({ count, className }) {
  if (!count) return null;
  return (
    <span className={`mc-issue${className ? ` ${className}` : ''}`}>
      <Icon name="alert" size="1.125rem" />
      <span>{ta('issues.badge', { count })}</span>
    </span>
  );
}
