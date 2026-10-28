import { contentLang } from '@/content/localize.js';
import { formatTimeRange, t } from '@/i18n/index.js';

import A11yBadge from '../A11yBadge.jsx';
import Button from '../Button.jsx';
import Card from '../Card.jsx';
import DateTile from '../DateTile.jsx';
import Icon from '../Icon.jsx';
import VisuallyHidden from '../VisuallyHidden.jsx';

/**
 * ღონისძიების ბარათი (`Event`): თარიღის ბლოკი, სათაური, დრო (Asia/Tbilisi), ადგილი,
 * ხელმისაწვდომობის ნიშნები (ეტლი, თარჯიმანი, სუბტიტრები, ფორმატი) და რეგისტრაცია.
 * ბარათს რამდენიმე მოქმედება აქვს, ამიტომ stretched-link არ ედება. F6: „რეგისტრაცია“-ს ხელმისაწვდომ
 * სახელს ღონისძიების სათაური ემატება („რეგისტრაცია: {სათაური}“) — სიაში რამდენიმე ერთნაირი
 * სახელის ბმული აღარ არის.
 *
 * @param {object} props
 * @param {import('@/content/model.js').Event} props.event
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.className]
 */
export default function EventCard({ event, headingLevel = 'h3', className, ...rest }) {
  const { title, excerpt, start, end, location, accessibility, registrationUrl } = event;
  return (
    <Card
      contentLang={contentLang(event)}
      title={title}
      headingLevel={headingLevel}
      aside={<DateTile date={start} format="weekday" />}
      meta={
        <>
          <span className="mc-card__time">{formatTimeRange(start, end)}</span>
          <span className="mc-card__meta-icon">
            <Icon name="location" size="1.25em" />
            {location}
          </span>
        </>
      }
      actions={
        <>
          <span className="mc-card__badges">
            <VisuallyHidden>{t('event.accessTitle')}: </VisuallyHidden>
            <A11yBadge kind="format" value={accessibility.format} />
            <A11yBadge kind="wheelchair" value={accessibility.wheelchair} />
            <A11yBadge kind="signInterpreter" value={accessibility.signInterpreter} />
            <A11yBadge kind="captions" value={accessibility.captions} />
          </span>
          {accessibility.notes && <p className="mc-card__note">{accessibility.notes}</p>}
          <Button
            variant="secondary"
            size="sm"
            href={registrationUrl ?? undefined}
            newTab
            disabled={!registrationUrl}
            disabledReason={t('footer.linkPending')}
          >
            {t('news.register')}
            <VisuallyHidden>: {title}</VisuallyHidden>
          </Button>
        </>
      }
      className={className}
      {...rest}
    >
      <p>{excerpt}</p>
    </Card>
  );
}
