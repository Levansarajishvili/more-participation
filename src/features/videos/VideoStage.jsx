import { contentLang } from '@/content/localize.js';
import { Button, ContentState, Skeleton } from '@/components/ui/index.js';
import { durationAttribute, VideoPlayer } from '@/components/media/index.js';
import { label } from '@/content/taxonomy.js';
import { formatDuration, t } from '@/i18n/index.js';

/** @typedef {import('@/content/model.js').Video} Video */

export const STAGE_HEADING_ID = 'video-title';

/**
 * ფლეიერი + ვიდეოს ინფორმაცია (VideosPage დაფა): კონტეინერი ≥ 64rem — ფლეიერი 8fr | ინფორმაცია 4fr,
 * ვიწროზე ფლეიერი ზემოთ. DOM: ინფორმაცია (წარწერა, h2, აღწერა, ავტორი, ხანგრძლივობა, ენა,
 * „ავტოდაკვრა არ არის“) → ფლეიერი; ინფორმაციაში ინტერაქტიული ელემენტი არ არის, ამიტომ Tab-ის რიგი
 * ვიზუალურს ემთხვევა.
 *
 * h2 ერთი კვანძია ყველა მდგომარეობაში (`tabIndex={-1}` — შეცდომისას ფოკუსის სამიზნე).
 *
 * @param {object} props
 * @param {{ status: 'idle' | 'loading' | 'success' | 'error', data?: Video, error?: import('@/content/errors.js').ContentError | null, reload?: () => void }} props.state
 * @param {boolean} [props.empty=false]
 * @param {import('react').RefObject<HTMLHeadingElement | null>} props.headingRef
 * @param {import('react').RefObject<HTMLDivElement | null>} props.playerRef
 */
export default function VideoStage({ state, empty = false, headingRef, playerRef }) {
  const video = state.status === 'success' ? state.data : undefined;
  const notFound = state.status === 'error' && state.error?.code === 'not-found';

  let title = t('videos.loadingTitle');
  if (video) title = video.title;
  else if (empty) title = t('videos.title');
  else if (notFound) title = t('videos.notFoundTitle');
  else if (state.status === 'error') title = t('videos.errorTitle');

  let status = state.status;
  if (empty) status = 'success';
  else if (status === 'idle') status = 'loading';

  return (
    <section aria-labelledby={STAGE_HEADING_ID} className="site-container mc-block">
      <div className="mc-video-stage">
        <div className="mc-video-stage__info">
          {video && (
            <p className="mc-video-stage__eyebrow">{label('videoCategory', video.category)}</p>
          )}
          <h2
            id={STAGE_HEADING_ID}
            ref={headingRef}
            tabIndex={-1}
            data-route-focus=""
            className="mc-video-stage__title"
            lang={contentLang(video)}
          >
            {title}
          </h2>
          {video && (
            <>
              <p className="mc-video-stage__lead" lang={contentLang(video)}>
                {video.excerpt}
              </p>
              <p className="mc-video-stage__person">
                {t('videos.person', { name: video.person.name, role: video.person.role })}
              </p>
              <ul className="mc-pills" role="list">
                <li>
                  <time dateTime={durationAttribute(video.duration)}>
                    {formatDuration(video.duration)}
                  </time>
                </li>
                <li>{video.signLanguage ? t('videos.languages') : t('videos.languageKa')}</li>
              </ul>
              <p className="mc-video-stage__note">{t('videos.noAutoplay')}</p>
            </>
          )}
        </div>
        <div className="mc-video-stage__player">
          {video && <VideoPlayer key={video.slug} video={video} playerRef={playerRef} />}
          {!video && notFound && (
            <div className="mc-video-stage__fallback">
              <p className="mc-lead">{t('videos.notFoundText')}</p>
              <Button variant="primary" to="/videos">
                {t('videos.backToWeekly')}
              </Button>
            </div>
          )}
          {!video && !notFound && (
            <ContentState
              status={status}
              error={state.error ?? null}
              onRetry={() => state.reload?.()}
              label={t('player.label')}
              skeleton={<Skeleton variant="card" ratio="16:9" lines={1} />}
              empty={empty}
              emptyText={t('videos.listEmpty')}
            >
              {() => null}
            </ContentState>
          )}
        </div>
      </div>
    </section>
  );
}
