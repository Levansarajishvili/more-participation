import PageSection from '@/components/layout/PageSection.jsx';
import { Button, ContentState, Skeleton, SkeletonGroup, VideoCard } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { splitVideos } from './useHomeContent.js';

const HEADING_ID = 'home-videos-title';

/**
 * ვიდეო-ისტორიები (მუქი ზოლი): ერთი დიდი ბარათი + ორი მცირე (`layout="row"`). კვირის ვიდეო
 * ჰეროშია და აქ აღარ მეორდება. ვიწრო კონტეინერში ყველა ერთმანეთის ქვეშაა (HomeMobile).
 *
 * @param {{ videos: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').VideoSummary[]> }} props
 */
export default function HomeVideos({ videos }) {
  const { rest } = splitVideos(videos.data);
  const [lead, ...others] = rest;
  return (
    <PageSection
      tone="dark"
      headingId={HEADING_ID}
      title={t('home.videosTitle')}
      lead={t('home.videosLead')}
      action={
        <Button variant="link" to="/videos">
          {t('home.videosAll')}
        </Button>
      }
    >
      <ContentState
        status={videos.status}
        error={videos.error}
        onRetry={videos.reload}
        label={t('home.videosTitle')}
        focusId={HEADING_ID}
        skeleton={
          <div className="mc-home-videos">
            <Skeleton ratio="16:9" lines={3} />
            <SkeletonGroup count={2} variant="row" lines={2} className="mc-row-list" />
          </div>
        }
        empty={!lead}
        emptyText={t('home.videosEmpty')}
      >
        {() => (
          <div className="mc-home-videos">
            <VideoCard video={lead} />
            {others.length > 0 && (
              <ul className="mc-row-list">
                {others.map((video) => (
                  <li key={video.slug}>
                    <VideoCard video={video} layout="row" showExcerpt={false} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </ContentState>
    </PageSection>
  );
}
