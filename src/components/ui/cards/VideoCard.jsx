import { contentLang } from '@/content/localize.js';
import { label } from '@/content/taxonomy.js';
import { formatDuration, formatDurationLabel, t } from '@/i18n/index.js';

import Card from '../Card.jsx';
import Icon from '../Icon.jsx';
import Media from '../Media.jsx';
import { cx } from '../utils.js';
import VisuallyHidden from '../VisuallyHidden.jsx';

/**
 * ვიდეოს ბარათი (`VideoSummary`): კადრი 16:9, ხანგრძლივობა, CC და ჟესტური ენის ნიშნები, ავტორი.
 * ნიშნები კადრზეა — ფოტოს ფერისგან დამოუკიდებლად იკითხება (ფიქსირებული წყვილები
 * #FFFFFF / #0B2545 15.39:1 და #0A1D38 / #FFFFFF 16.86:1); ეკრანის მკითხველი სრულ სიტყვებს ისმენს.
 * hover / ფოკუსი: დაკვრის წრე (დეკორატიული, `aria-hidden`).
 * `onSelect` — ღილაკი (ვიდეო იმავე გვერდის ფლეიერში ირთვება, F7); სხვაგვარად ბმული `to`.
 * ბარათი ვიდეოს თავისით არასოდეს რთავს — ის მხოლოდ ფლეიერისკენ მიდის.
 *
 * F5:
 * - `eyebrow` — წარწერა კატეგორიის ნაცვლად („კვირის ვიდეო“);
 * - `feature` — დაკვრის წრე მუდმივად ჩანს და დიდია (ჰეროს ბარათი, HomePage დაფა);
 * - `layout="row"` — კადრი მარცხნივ (მცირე სია): კადრზე მხოლოდ ხანგრძლივობაა, CC / ჟესტური ენა
 *   ეკრანის მკითხველისთვის მეტაში რჩება; ჩანაცვლების ჩარჩოში მხოლოდ „[ვიდეოს კადრი]“;
 * - `showExcerpt={false}` — მოკლე აღწერის გარეშე.
 *
 * @param {object} props
 * @param {import('@/content/model.js').VideoSummary} props.video
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.to]            ნაგულისხმევი `/videos?video=:slug` (F7 დააზუსტებს)
 * @param {() => void} [props.onSelect]
 * @param {import('react').ReactNode} [props.eyebrow]
 * @param {boolean} [props.feature=false]
 * @param {'stack' | 'row'} [props.layout='stack']
 * @param {boolean} [props.showExcerpt=true]
 * @param {boolean} [props.current=false]  F7: ვიდეო ფლეიერშია — წარწერა „ფლეიერში“ + `aria-current`
 * @param {string} [props.className]
 */
export default function VideoCard({
  video,
  headingLevel = 'h3',
  to,
  onSelect,
  eyebrow,
  feature = false,
  layout = 'stack',
  showExcerpt = true,
  current = false,
  className,
  ...rest
}) {
  const { slug, title, excerpt, category, person, poster, duration } = video;
  const row = layout === 'row';
  const features = [
    video.hasCaptions && t('player.captions'),
    video.hasSignLanguage && t('player.sign'),
    video.hasAudioDescription && t('player.audioDescription'),
  ].filter(Boolean);
  const media = (
    <div className={cx('mc-video-thumb', feature && 'mc-video-thumb--feature')}>
      <Media image={poster} ratio="16:9" kind="poster" compact={row} />
      {!row && (
        <span className="mc-video-thumb__badges" aria-hidden="true">
          {video.hasCaptions && <span className="mc-thumb-badge">{t('videos.badgeCaptions')}</span>}
          {video.hasSignLanguage && <span className="mc-thumb-badge">{t('videos.badgeSign')}</span>}
        </span>
      )}
      <span className="mc-thumb-badge mc-thumb-badge--time" aria-hidden="true">
        {formatDuration(duration)}
      </span>
      {!row && (
        <span className="mc-video-thumb__play" aria-hidden="true">
          <Icon name="play" size={feature ? '2.25rem' : '1.75rem'} />
        </span>
      )}
    </div>
  );
  return (
    <Card
      contentLang={contentLang(video)}
      to={onSelect ? undefined : (to ?? `/videos?video=${slug}`)}
      onSelect={onSelect}
      title={title}
      headingLevel={headingLevel}
      eyebrow={
        current ? (
          <>
            <Icon name="play" size="1em" /> {t('videos.nowPlaying')}
          </>
        ) : (
          (eyebrow ?? label('videoCategory', category))
        )
      }
      current={current}
      media={media}
      layout={layout}
      meta={
        <>
          <span>
            {person.name}, {person.role}
          </span>
          <span>
            <VisuallyHidden>{formatDurationLabel(duration)}</VisuallyHidden>
            {features.length > 0 && <VisuallyHidden>; {features.join(', ')}</VisuallyHidden>}
          </span>
        </>
      }
      className={className}
      {...rest}
    >
      {showExcerpt && <p>{excerpt}</p>}
    </Card>
  );
}
