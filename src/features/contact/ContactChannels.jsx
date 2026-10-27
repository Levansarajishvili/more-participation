import {
  Button,
  Card,
  ContentState,
  Icon,
  PendingLink,
  SkeletonGroup,
} from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { contactChannels } from './contact-channels.js';

const HEADING_ID = 'contact-channels-title';

/** @typedef {import('@/content/model.js').SiteSettings} SiteSettings */

/**
 * „დაკავშირების გზები“ — სათაური ეკრანის მკითხველისთვისაა (დაფაზე ხილული სათაური არ არის, h3
 * ბარათებს კი h2 სჭირდება). 1440-ზე 5 სვეტი, ვიწროზე / დიდ შრიფტზე ნაკლები.
 *
 * @param {{ state: import('@/hooks/useContent.js').ContentState<SiteSettings> }} props
 */
export default function ContactChannels({ state }) {
  return (
    <section aria-labelledby={HEADING_ID} className="site-container mc-block mc-contact-channels">
      <h2 id={HEADING_ID} className="sr-only">
        {t('contact.channelsTitle')}
      </h2>
      <ContentState
        status={state.status}
        error={state.error}
        onRetry={state.reload}
        label={t('contact.channelsTitle')}
        focusId={HEADING_ID}
        skeleton={
          <SkeletonGroup count={5} variant="text" lines={3} className="mc-grid mc-contact-grid5" />
        }
      >
        {() => (
          <ul className="mc-grid mc-contact-grid5">
            {state.data &&
              contactChannels(state.data).map((channel) => (
                <li key={channel.id}>
                  <Card
                    as="div"
                    title={channel.title}
                    icon={<Icon name={channel.icon} size="1.625rem" accent />}
                    className="mc-contact-channel"
                    actions={
                      channel.href ? (
                        <Button
                          variant="link"
                          href={channel.href}
                          newTab={channel.href.startsWith('http')}
                        >
                          {channel.action}
                        </Button>
                      ) : (
                        <PendingLink>{channel.action}</PendingLink>
                      )
                    }
                  >
                    {channel.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </Card>
                </li>
              ))}
          </ul>
        )}
      </ContentState>
    </section>
  );
}
