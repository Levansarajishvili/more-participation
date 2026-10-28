import { useParams } from 'react-router';

import { Button, ContentState, EventCard, Media, SkeletonGroup } from '@/components/ui/index.js';
import { Slider, VideoPlayer } from '@/components/media/index.js';
import ArticleBody from '@/features/articles/ArticleBody.jsx';
import { useContent } from '@/hooks/useContent.js';
import { localizePath } from '@/i18n/index.js';

import { content } from '../api/adminAdapter.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { TYPE_CONFIG, isContentType, typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';
import AdminNotFound from '../pages/AdminNotFound.jsx';
import { useAdminPage } from '../shell/admin-page.js';

/**
 * „გადახედვა საიტზე“ (`/admin/:type/:id/preview`): საჯარო საიტის კომპონენტებით — სტატია და სიახლე
 * `ArticleBody`-ით (20/1.75, 68ch), სერია `Slider`-ით, ვიდეო `VideoPlayer`-ით, ღონისძიება
 * `EventCard`-ით. ახალი კომპონენტი არ იქმნება. ნაჩვენებია სამუშაო ასლი (თუ არის).
 */
export default function PreviewPage() {
  const { type, id = '' } = useParams();
  const state = useContent(() => content.get(id), [id]);
  const item = state.data ? (state.data.working?.item ?? state.data.item) : null;
  const valid = isContentType(type);
  useAdminPage({
    title: ta('preview.title', { title: item?.title ?? '' }),
    crumbs: valid
      ? [
          { to: '/admin', label: ta('header.root') },
          { to: `/admin/${type}`, label: typeLabel(type) },
          { to: `/admin/${type}/${id}`, label: item?.title || ta('editor.untitled') },
          { label: ta('preview.crumb') },
        ]
      : [],
  });
  if (!valid) return <AdminNotFound />;

  return (
    <div className="mc-preview">
      <div className="mc-admin-panel mc-preview__bar">
        <p className="mc-preview__note">
          {ta('preview.note')} {state.data && <StatusBadge status={state.data.item.status} />}
        </p>
        <Button variant="secondary" size="sm" icon="chevron-left" to={`/admin/${type}/${id}`}>
          {ta('preview.back')}
        </Button>
        {state.data?.item.status === 'published' && (
          <Button
            variant="link"
            size="sm"
            href={localizePath(TYPE_CONFIG[type].publicPath(state.data.item))}
            newTab
          >
            {ta('preview.public')}
          </Button>
        )}
      </div>
      <ContentState
        status={state.status}
        error={state.error}
        onRetry={state.reload}
        label={ta('preview.crumb')}
        skeleton={<SkeletonGroup count={1} variant="card" />}
      >
        {() => (
          <section className="mc-preview__frame" aria-label={ta('preview.frame')}>
            {(type === 'articles' || type === 'news') && item && (
              <article className="mc-reading__column">
                <h2 className="mc-preview__title">{item.title}</h2>
                <p className="mc-preview__lead">{item.excerpt}</p>
                {item.cover && <Media image={item.cover} ratio="3:2" kind="photo" />}
                <ArticleBody blocks={item.body ?? []} />
              </article>
            )}
            {(type === 'series' || type === 'videos') && item && (
              <h2 className="mc-preview__title">{item.title}</h2>
            )}
            {type === 'series' && item && (
              <Slider
                slides={item.slides ?? []}
                title={item.title}
                tone={item.tone}
                headingLevel="h3"
              />
            )}
            {type === 'videos' && item && <VideoPlayer video={/** @type {any} */ (item)} />}
            {type === 'events' && item && (
              <EventCard event={/** @type {any} */ (item)} headingLevel="h2" />
            )}
            {type === 'pages' && item && (
              <p>
                <Button variant="link" href={localizePath(item.path)} newTab>
                  {ta('preview.public')}
                </Button>
              </p>
            )}
          </section>
        )}
      </ContentState>
    </div>
  );
}
