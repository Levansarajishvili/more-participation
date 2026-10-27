import { useEffect, useRef } from 'react';

import PageIntro from '@/components/layout/PageIntro.jsx';
import { Breadcrumbs } from '@/components/ui/index.js';
import { getVideo, listVideos } from '@/content/adapter.js';
import { VIDEO_CATEGORIES } from '@/content/taxonomy.js';
import ShareStoryBand from '@/features/videos/ShareStoryBand.jsx';
import { useVideoParam } from '@/features/videos/useVideoParam.js';
import VideoGrid from '@/features/videos/VideoGrid.jsx';
import VideoStage from '@/features/videos/VideoStage.jsx';
import { useContent } from '@/hooks/useContent.js';
import { useUrlFilters } from '@/hooks/useUrlFilters.js';
import { t } from '@/i18n/index.js';

import '@/features/videos/videos.css';

/**
 * ვიდეოები (`/videos`; VideosPage 1440, 390 — HomeMobile-ის პატერნებით). ბილიკი + h1 + lead →
 * ფლეიერი (ნაგულისხმევად კვირის ვიდეო; `?video=:slug` — სხვა) → „ყველა ისტორია“ (კატეგორიები +
 * 6 ბარათი) → „გაგვიზიარე შენი ისტორია“ (`/contact?topic=story`).
 *
 * ბარათზე დაჭერა → `?video=` (push) → ჩატვირთვის შემდეგ ფოკუსი ფლეიერზე (რეგიონი „ვიდეოფლეიერი:
 * {სათაური}“ — Space / K მაშინვე მუშაობს); შეცდომისას — ბლოკის h2-ზე. პირველ ჩატვირთვაზე ფოკუსი არ
 * გადაიტანება. ვიდეო თავისით არ ირთვება.
 */
export default function VideosPage() {
  const filters = useUrlFilters({ categories: VIDEO_CATEGORIES });
  const { category } = filters;
  const param = useVideoParam();

  const all = useContent(() => listVideos(), []);
  const filtered = useContent(() => listVideos({ category }), [category], {
    enabled: Boolean(category),
  });
  const weekly = all.data?.find((video) => video.featured) ?? all.data?.[0] ?? null;
  const slug = param ?? weekly?.slug ?? null;
  const video = useContent(() => getVideo(slug ?? ''), [slug], { enabled: Boolean(slug) });
  const empty = !param && all.status === 'success' && !weekly;
  const stageState =
    !slug && all.status === 'error'
      ? { status: /** @type {const} */ ('error'), error: all.error, reload: all.reload }
      : video;

  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const playerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const previous = useRef(slug);
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (previous.current && slug && slug !== previous.current) pendingFocus.current = true;
    previous.current = slug;
  }, [slug]);
  useEffect(() => {
    if (!pendingFocus.current || video.status === 'loading' || video.status === 'idle') return;
    pendingFocus.current = false;
    (video.status === 'success' ? playerRef.current : headingRef.current)?.focus();
  }, [video.status, video.data]);

  return (
    <>
      <PageIntro headingId="videos-title">
        <Breadcrumbs items={[{ to: '/', label: t('nav.home') }, { label: t('nav.videos') }]} />
        <h1 id="videos-title" className="text-h1">
          {t('videos.title')}
        </h1>
        <p className="mc-lead">{t('videos.lead')}</p>
      </PageIntro>
      <VideoStage state={stageState} empty={empty} headingRef={headingRef} playerRef={playerRef} />
      <VideoGrid
        state={category ? filtered : all}
        category={category}
        onCategory={filters.setCategory}
        currentSlug={video.status === 'success' ? (video.data?.slug ?? null) : slug}
      />
      <ShareStoryBand />
    </>
  );
}
