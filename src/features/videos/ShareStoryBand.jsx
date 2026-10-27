import { Button } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

/** ფორმა თემას `?topic=`-ით ირჩევს (F6; `story` — F7-ში დაემატა CONTACT_TOPICS-ს). */
export const SHARE_STORY_HREF = '/contact?topic=story';

/**
 * „გაგვიზიარე შენი ისტორია“ (VideosPage დაფა): მუქი ზოლი 6px ნარინჯისფერი ზედა კიდით, CTA
 * „ისტორიის გაზიარება“ → `/contact?topic=story`. ფონი ძირეული თემის `--mc-hero`, შიგთავსი
 * `data-theme="dark"` ქვეხე (F5-ის მუქი ზოლის წესი).
 */
export default function ShareStoryBand() {
  return (
    <div className="site-container mc-block mc-block--last">
      <section aria-labelledby="share-story-title" className="mc-story">
        <div className="mc-story__inner" data-theme="dark">
          <div className="mc-story__text">
            <h2 id="share-story-title" className="mc-story__title">
              {t('videos.shareStoryTitle')}
            </h2>
            <p className="mc-story__lead">{t('videos.shareStoryText')}</p>
          </div>
          <div className="mc-story__action">
            <Button variant="cta" to={SHARE_STORY_HREF}>
              {t('videos.shareStoryCta')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
