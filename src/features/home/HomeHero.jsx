import { Fragment } from 'react';
import { Link } from 'react-router';

import PageHero from '@/components/layout/PageHero.jsx';
import { JOIN_HREF } from '@/components/layout/site-nav.js';
import {
  Button,
  ContentState,
  Icon,
  Skeleton,
  VideoCard,
  VisuallyHidden,
} from '@/components/ui/index.js';
import { formatNumber, t } from '@/i18n/index.js';

import { splitVideos } from './useHomeContent.js';

/** სათაურის კასკადი 54 / 74 / 100 (მობილურზე 32 / 42 / 54) — theme.css-ის თხევადი შკალა. */
const LINE_SIZES = ['text-hero-1', 'text-hero-2', 'text-hero-3'];

/** სამი შესასვლელი (HomePage დაფა): ნავიგაციაა, ქმედება — CTA „ჩაერთე“ (§10). */
const ENTRIES = [
  { key: 'articles', to: '/articles', label: 'nav.articles', icon: 'education' },
  { key: 'series', to: '/development', label: 'nav.developmentShort', icon: 'slides' },
  { key: 'videos', to: '/videos', label: 'nav.videos', icon: 'video' },
];

/**
 * მთავარის ჰერო: h1-ის კასკადი, lead, ოქროსფერი CTA „ჩაერთე“ (56px, `JOIN_HREF`), სამი შესასვლელი
 * რაოდენობებით და „კვირის ვიდეო“ (პოსტერი + ბმული `/videos?video={slug}`; ბარათი ვიდეოს არ რთავს).
 *
 * @param {object} props
 * @param {{ articles?: number, series?: number, videos?: number }} props.counts  ჩატვირთვამდე — undefined
 * @param {import('@/hooks/useContent.js').ContentState<import('@/content/model.js').VideoSummary[]>} props.videos
 */
export default function HomeHero({ counts, videos }) {
  const lines = t('home.heroTitle').split(' ');
  const { weekly } = splitVideos(videos.data);

  return (
    <PageHero
      headingId="home-title"
      className="mc-home-hero"
      aside={
        <ContentState
          status={videos.status}
          error={videos.error}
          onRetry={videos.reload}
          label={t('home.weeklyVideo')}
          skeleton={<Skeleton ratio="16:9" lines={2} />}
          empty={!weekly}
          emptyText={t('home.weeklyEmpty')}
        >
          {() =>
            weekly && (
              <VideoCard
                video={weekly}
                headingLevel="h2"
                eyebrow={t('home.weeklyVideo')}
                feature
                showExcerpt={false}
              />
            )
          }
        </ContentState>
      }
    >
      <h1 id="home-title" className="mc-hero-title">
        {lines.map((line, i) => (
          // სიტყვებს შორის ჰარი span-ის გარეთაა: ხელმისაწვდომი სახელი „ისწავლე. შთაგონდი. გაიზარდე.“
          <Fragment key={line}>
            {i > 0 && ' '}
            <span className={LINE_SIZES[Math.min(i, LINE_SIZES.length - 1)]}>{line}</span>
          </Fragment>
        ))}
      </h1>
      <p className="mc-lead">{t('home.heroLead')}</p>
      <Button variant="cta" to={JOIN_HREF}>
        {t('nav.cta')}
      </Button>
      <nav aria-label={t('home.entriesLabel')} className="mc-entries">
        <ul className="mc-entries__list">
          {ENTRIES.map((entry) => {
            const count = counts[/** @type {keyof typeof counts} */ (entry.key)];
            return (
              <li key={entry.key}>
                <Link to={entry.to} className="mc-entry">
                  <Icon name={entry.icon} accent size="1.375rem" />
                  <span className="mc-entry__label">{t(entry.label)}</span>
                  {count != null && (
                    <>
                      <span className="mc-entry__count" aria-hidden="true">
                        {formatNumber(count)}
                      </span>
                      <VisuallyHidden>{t('home.entryCount', { count })}</VisuallyHidden>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </PageHero>
  );
}
