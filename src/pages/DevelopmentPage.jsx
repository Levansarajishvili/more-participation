import { useEffect, useRef } from 'react';

import PageIntro from '@/components/layout/PageIntro.jsx';
import { Breadcrumbs } from '@/components/ui/index.js';
import { getSeries, getSettings, listSeries } from '@/content/adapter.js';
import SeriesDeck from '@/features/development/SeriesDeck.jsx';
import SeriesGrid from '@/features/development/SeriesGrid.jsx';
import { useContent } from '@/hooks/useContent.js';
import { useUrlFilters } from '@/hooks/useUrlFilters.js';
import { t } from '@/i18n/index.js';

import '@/features/development/development.css';

/**
 * პიროვნული განვითარება (`/development`; SlidesPage 1440, 390 — HomeMobile-ის პატერნებით).
 * ბილიკი + h1 + lead → სლაიდერში სერია (ნაგულისხმევად რჩეული „ჩვევა — 5 ნაბიჯი“; `?series=:slug`
 * — სხვა) → „სხვა სერიები“ (6 ბარათი).
 *
 * სერიის შეცვლა მომხმარებლის ქმედებით (ბარათი, „უკან“) → ჩატვირთვის შემდეგ ფოკუსი სერიის h2-ზე
 * (PageShell query-ის ცვლილებაზე ფოკუსს არ ცვლის — F4). პირველ ჩატვირთვაზე — არა.
 *
 * დაფიდან გადახვევა: თემის ჩიპები ამოღებულია — თითო თემას ერთი სერია აქვს, ჩიპი ბარათების
 * ბადეს იმეორებდა, „ყველა“ კი ერთ სლაიდერზე აზრს კარგავდა; სერიას ბადე ირჩევს.
 */
export default function DevelopmentPage() {
  const { series: seriesParam } = useUrlFilters();
  const list = useContent(() => listSeries(), []);
  const settings = useContent(() => getSettings(), []);
  const featured = list.data?.find((series) => series.featured) ?? list.data?.[0] ?? null;
  const slug = seriesParam ?? featured?.slug ?? null;
  const deck = useContent(() => getSeries(slug ?? ''), [slug], { enabled: Boolean(slug) });
  const empty = !seriesParam && list.status === 'success' && !featured;

  // სიის შეცდომა რჩეულის გარეშე → სლაიდერის ბლოკიც შეცდომას აჩვენებს (თავიდან ცდა → სია)
  const deckState =
    !slug && list.status === 'error'
      ? { status: /** @type {const} */ ('error'), error: list.error, reload: list.reload }
      : deck;

  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const previous = useRef(slug);
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (previous.current && slug && slug !== previous.current) pendingFocus.current = true;
    previous.current = slug;
  }, [slug]);
  useEffect(() => {
    if (!pendingFocus.current || deck.status === 'loading' || deck.status === 'idle') return;
    pendingFocus.current = false;
    headingRef.current?.focus();
  }, [deck.status, deck.data]);

  return (
    <>
      <PageIntro headingId="development-title">
        <Breadcrumbs items={[{ to: '/', label: t('nav.home') }, { label: t('nav.development') }]} />
        <h1 id="development-title" className="text-h1">
          {t('development.title')}
        </h1>
        <p className="mc-lead">{t('development.lead')}</p>
      </PageIntro>
      <SeriesDeck
        state={deckState}
        empty={empty}
        handle={settings.data?.socialHandle ?? null}
        headingRef={headingRef}
      />
      <SeriesGrid state={list} currentSlug={slug} />
    </>
  );
}
