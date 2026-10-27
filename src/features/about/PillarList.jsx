import { Card, Icon } from '@/components/ui/index.js';
import { cx } from '@/components/ui/utils.js';
import { ORG_PILLARS } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

import './pillars.css';

/** მიმართულება → IconSet-ის ხატულა (BrandKit / IconSet: ჩართულობა, განვითარება, სოციალური ცვლილება). */
const PILLAR_ICONS = { engagement: 'engagement', development: 'growth', change: 'change' };

/**
 * სამი მიმართულება (§1): ბარათი ხატულით, სათაურით (h3) და ტექსტით — AboutPage და HomePage დაფები.
 * ხატულის აქცენტი ერთი ფერია (`--mc-graphic`); დაფის ოქროსფერი და მწვანე აქცენტები ფერთა
 * როლებს არღვევდა (ოქროსფერი მხოლოდ CTA-ა, მწვანე — მხოლოდ ზრდა).
 *
 * `compact` — HomeMobile: ვიწრო კონტეინერში (< 48rem) ბარათები ჩიპებად იკეცება (სათაური ჩანს,
 * ტექსტი და ხატულა — არა); ფართოზე იგივე ბარათებია.
 *
 * @param {{ compact?: boolean }} props
 */
export default function PillarList({ compact = false }) {
  return (
    <ul className={cx('mc-grid mc-grid--tight mc-pillars', compact && 'mc-pillars--compact')}>
      {ORG_PILLARS.map((id) => (
        <li key={id}>
          <Card
            as="div"
            title={t(`about.pillars.${id}.title`)}
            icon={<Icon name={PILLAR_ICONS[id]} accent size="1.75rem" />}
          >
            <p>{t(`about.pillars.${id}.text`)}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
