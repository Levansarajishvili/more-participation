import { useState } from 'react';

import PageSection from '@/components/layout/PageSection.jsx';
import {
  ChipGroup,
  ContentState,
  LiveRegion,
  SkeletonGroup,
  VideoCard,
} from '@/components/ui/index.js';
import { label, options, VIDEO_CATEGORIES } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

import { videoHref } from './useVideoParam.js';

export const GRID_HEADING_ID = 'videos-all';

/**
 * „ყველა ისტორია“ (VideosPage დაფა): კატეგორიის ჩიპები („ყველა“ + 5, `?category=` — push) →
 * ხილული სტატუსი „ნაჩვენებია {n} ვიდეო“ (`role="status"`, ფოკუსი ჩიპზე რჩება; ტექსტი მხოლოდ ახალ
 * შედეგზე იცვლება — F6) → 6 ბარათი. ბარათი ბმულია `?video=`-ზე (კატეგორია რჩება); ფლეიერში მიმდინარე
 * ვიდეო — „ფლეიერში“ + `aria-current`.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('@/hooks/useContent.js').useContent>} props.state  `listVideos()`
 * @param {string | null} props.category
 * @param {(value: string | null) => void} props.onCategory
 * @param {string | null} props.currentSlug
 */
export default function VideoGrid({ state, category, onCategory, currentSlug }) {
  const items = state.data ?? [];
  // სტატუსი მხოლოდ ახალ შედეგზე იცვლება (ჩატვირთვისას წინა რჩება — F6): წარმოებული მდგომარეობა
  const text =
    state.status === 'success'
      ? category
        ? t('videos.shownIn', { count: items.length, category: label('videoCategory', category) })
        : t('videos.shown', { count: items.length })
      : null;
  const [statusText, setStatusText] = useState(text ?? '');
  if (text !== null && text !== statusText) setStatusText(text);
  const chips = [
    { id: null, label: t('common.all') },
    ...options('videoCategory', VIDEO_CATEGORIES),
  ];

  return (
    <PageSection
      headingId={GRID_HEADING_ID}
      title={t('videos.allStories')}
      action={
        <LiveRegion visible as="p" className="mc-result-status">
          {statusText}
        </LiveRegion>
      }
      tone="alt"
      className="mc-section--tight"
    >
      <ChipGroup
        label={t('videos.categoryLabel')}
        options={chips}
        value={category}
        onChange={onCategory}
      />
      <ContentState
        status={state.status}
        error={state.error}
        onRetry={state.reload}
        label={t('videos.allStories')}
        skeleton={<SkeletonGroup count={6} className="mc-grid" ratio="16:9" />}
        empty={items.length === 0}
        emptyText={category ? t('videos.empty') : t('videos.listEmpty')}
        focusId={GRID_HEADING_ID}
      >
        {() => (
          <ul className="mc-grid" role="list">
            {items.map((video) => (
              <li key={video.slug}>
                <VideoCard
                  video={video}
                  to={videoHref(video.slug, category)}
                  current={video.slug === currentSlug}
                />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
