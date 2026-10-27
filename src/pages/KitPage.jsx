import { useState } from 'react';

import {
  A11yBadge,
  Accordion,
  ArticleCard,
  BRAND_ICONS,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Chip,
  ChipGroup,
  ContentState,
  DateTile,
  EventCard,
  GrowthStat,
  Icon,
  ICONS,
  IconButton,
  LiveRegion,
  Logo,
  Media,
  NewsCard,
  PartnerCard,
  PendingLink,
  Quote,
  RadioGroup,
  SaveToggle,
  SectionHeading,
  Select,
  SeriesCard,
  Skeleton,
  SkeletonGroup,
  Switch,
  TeamCard,
  TextArea,
  TextField,
  VideoCard,
} from '@/components/ui/index.js';
import {
  getPartners,
  getTeam,
  listArticles,
  listEvents,
  listNews,
  listSeries,
  listVideos,
} from '@/content/adapter.js';
import { ContentError } from '@/content/errors.js';
import { ARTICLE_CATEGORIES, CONTACT_TOPICS, options, REPLY_CHANNELS } from '@/content/taxonomy.js';
import { usePageTitle } from '@/components/layout/usePageTitle.js';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

/**
 * UI ნაკრების საჩვენებელი (`/__kit`), მხოლოდ dev — წარმოების build-ში chunk არ იქმნება.
 * ყოველი კომპონენტი × მდგომარეობა; სამი თემა გვერდიგვერდ (`data-theme` თითო სვეტზე),
 * 390px-ზე სვეტები ერთმანეთის ქვეშ დგება. hover / focus / დაჭერილი სტატიკურად `data-force`-ით
 * ჩანს; იგივე ელემენტები ცოცხლადაც მუშაობს. ნაკრების წარწერები dev-ის ტექსტია და i18n-ში არ არის.
 */

/** @typedef {'light' | 'dark' | 'contrast'} Theme */

/** @type {{ id: Theme, name: string }[]} */
const THEMES = [
  { id: 'light', name: 'ღია' },
  { id: 'dark', name: 'მუქი' },
  { id: 'contrast', name: 'მაღალი კონტრასტი' },
];

const STATES = [
  { force: undefined, name: 'ნაგულისხმევი' },
  { force: 'hover', name: 'Hover' },
  { force: 'focus', name: 'ფოკუსი' },
  { force: 'active', name: 'დაჭერილი' },
];

const UI_GLYPHS = [
  'check',
  'alert',
  'triangle-up',
  'sign-language',
  'bookmark',
  'play',
  'plus',
  'chevron-down',
  'close',
  'captions',
  'online',
  'external',
  'menu',
  'moon',
  'minus',
  'reset',
  'arrow-up-right',
  'slides',
  'video',
];

/** F5: ContentState-ის შეცდომის მაგალითი. */
const KIT_ERROR = new ContentError('network');
const noop = () => {};

const FAQ = [
  { id: 'q1', title: '[კითხვა: როგორ ჩავერთო პროგრამაში?]', content: <p>[პასუხის ტექსტი]</p> },
  { id: 'q2', title: '[კითხვა: არის თუ არა ოფისი მისადგომი?]', content: <p>[პასუხის ტექსტი]</p> },
  { id: 'q3', title: '[კითხვა: რა ღირს მონაწილეობა?]', content: <p>[პასუხის ტექსტი]</p> },
];

/**
 * სექცია: სათაური და სამი თემის სვეტი.
 * @param {{ id: string, title: string, note?: string, children: (theme: Theme) => import('react').ReactNode }} props
 */
function KitSection({ id, title, note, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t-2 border-line pt-5">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-h2">
          {title}
        </h2>
        {note && <p className="max-w-article text-muted">{note}</p>}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {THEMES.map((theme) => (
          <div
            key={theme.id}
            data-theme={theme.id}
            className="flex min-w-0 flex-col gap-3 rounded-block border-2 border-line bg-page p-3"
          >
            <h3 className="text-small font-bold text-muted">{theme.name}</h3>
            {children(theme.id)}
          </div>
        ))}
      </div>
    </section>
  );
}

/** @param {{ name: string, children: import('react').ReactNode }} props */
function State({ name, children }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <p className="text-small text-muted">{name}</p>
      {children}
    </div>
  );
}

export default function KitPage() {
  usePageTitle('UI ნაკრები');
  const { data } = useContent(
    () =>
      Promise.all([
        listArticles({ limit: 2 }),
        listSeries({}),
        listVideos({}),
        listNews({ limit: 1 }),
        listEvents({ upcoming: true }),
        getTeam(),
        getPartners(),
      ]),
    [],
  );
  const [category, setCategory] = useState(/** @type {string | null} */ (null));
  const [topics, setTopics] = useState(/** @type {string[]} */ ([]));
  const [reply, setReply] = useState('email');
  const [busy, setBusy] = useState(false);
  const [spacing, setSpacing] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const categoryOptions = [
    { id: null, label: t('common.all') },
    ...options('articleCategory', ARTICLE_CATEGORIES),
  ];
  const [articles, series, videos, news, events, team, partners] = data ?? [];

  return (
    <div className="site-container flex flex-col gap-7 py-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">UI ნაკრები</h1>
        <p className="max-w-article text-lead text-muted">
          F3–F5: ყოველი კომპონენტი ყველა მდგომარეობაში, სამ თემაში. ცოცხალი ელემენტები კლავიატურით
          მუშაობს; „Hover“, „ფოკუსი“ და „დაჭერილი“ სტატიკური ასლებია (data-force).
        </p>
      </div>

      <KitSection id="kit-buttons" title="Button, IconButton">
        {() => (
          <>
            {['cta', 'primary', 'secondary', 'link'].map((variant) => (
              <div key={variant} className="flex flex-col gap-2">
                <p className="font-bold">{variant}</p>
                <div className="flex flex-wrap items-end gap-3">
                  {STATES.map((state) => (
                    <State key={state.name} name={state.name}>
                      <Button variant={variant} data-force={state.force}>
                        {variant === 'link' ? 'ყველა პროგრამა' : 'ჩაერთე'}
                      </Button>
                    </State>
                  ))}
                  <State name="გათიშული">
                    <Button variant={variant} disabled>
                      {variant === 'link' ? 'ყველა პროგრამა' : 'ჩაერთე'}
                    </Button>
                  </State>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-3">
              <State name="loading (aria-busy)">
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() => {
                    setBusy(true);
                    setTimeout(() => setBusy(false), 1500);
                  }}
                >
                  {t('common.loadMore')}
                </Button>
              </State>
              <State name="ბმული (to)">
                <Button variant="primary" to="/articles" icon="education">
                  {t('nav.articles')}
                </Button>
              </State>
              <State name="sm, 44px">
                <Button variant="secondary" size="sm">
                  {t('common.retry')}
                </Button>
              </State>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <State name="IconButton">
                <IconButton icon="close" label={t('common.close')} />
              </State>
              <State name="Hover">
                <IconButton icon="close" label={t('common.close')} data-force="hover" />
              </State>
              <State name="ფოკუსი">
                <IconButton icon="close" label={t('common.close')} data-force="focus" />
              </State>
              <State name="aria-pressed">
                <IconButton icon="contrast" label={t('a11y.contrast')} pressed />
              </State>
              <State name="primary">
                <IconButton icon="play" label={t('player.play')} variant="primary" />
              </State>
              <State name="გათიშული">
                <IconButton icon="close" label={t('common.close')} disabled />
              </State>
            </div>
          </>
        )}
      </KitSection>

      <KitSection
        id="kit-chips"
        title="Chip, ChipGroup"
        note="არჩეულს ink-ის შევსება და ✓ აქვს; ერთარჩევნიანი და მრავალარჩევნიანი ჯგუფი ცოცხალია."
      >
        {() => (
          <>
            <div className="flex flex-wrap items-end gap-2">
              {STATES.map((state) => (
                <State key={state.name} name={state.name}>
                  <Chip pressed={false} data-force={state.force}>
                    {t('taxonomy.articleCategory.career')}
                  </Chip>
                </State>
              ))}
              <State name="არჩეული">
                <Chip pressed>{t('common.all')}</Chip>
              </State>
              <State name="გათიშული">
                <Chip pressed={false} disabled>
                  {t('taxonomy.articleCategory.rights')}
                </Chip>
              </State>
            </div>
            <ChipGroup
              label={t('articles.categoryLabel')}
              options={categoryOptions}
              value={category}
              onChange={setCategory}
            />
            <ChipGroup
              label={`${t('development.topicLabel')} (რამდენიმე)`}
              options={[
                { id: 'habit', label: t('taxonomy.seriesTopic.habit') },
                { id: 'flow', label: 'flow', lang: 'en' },
                { id: 'character', label: t('taxonomy.seriesTopic.character') },
              ]}
              value={topics}
              onChange={setTopics}
              multiple
            />
          </>
        )}
      </KitSection>

      <KitSection
        id="kit-cards"
        title="Card"
        note="stretched-link: ერთი Tab-გაჩერება სათაურზე, დაწკაპებადია მთელი ბარათი. hover და focus-within: −4px და მყარი ჩრდილი."
      >
        {() =>
          articles ? (
            <>
              <State name="Hover">
                <ArticleCard article={articles.items[0]} saveable={false} data-force="hover" />
              </State>
              <State name="ფოკუსი">
                <ArticleCard article={articles.items[1]} saveable={false} data-force="focus" />
              </State>
              <ArticleCard article={articles.items[0]} />
              <SeriesCard series={series[0]} />
              <SeriesCard series={series[3]} />
              <VideoCard video={videos[0]} />
              <NewsCard item={news.items[0]} />
              {events[0] && <EventCard event={events[0]} />}
              <TeamCard member={team[0]} />
              <PartnerCard partner={partners[0]} />
            </>
          ) : (
            <p className="text-muted">{t('common.loading')}</p>
          )
        }
      </KitSection>

      <KitSection
        id="kit-media"
        title="Media"
        note="src: null — წყვეტილი ჩარჩო „[ფოტო: …]“; ყალბი სურათი არასოდეს."
      >
        {() => (
          <div className="grid grid-cols-2 gap-2">
            <Media image={{ src: null, alt: '[ვორქშოპი, მონაწილეები მაგიდასთან]', ratio: '3:2' }} />
            <Media image={{ src: null, alt: '[ინტერვიუ]', ratio: '16:9' }} kind="poster" />
            <Media image={{ src: null, alt: '[სახელი გვარი]', ratio: '1:1' }} round />
            <Media image={{ src: null, alt: '[სერიის ყდა]', ratio: '4:3' }} />
          </div>
        )}
      </KitSection>

      <KitSection
        id="kit-fields"
        title="TextField, TextArea, Select, Checkbox, RadioGroup"
        note="ლეიბლი ველის ზემოთ; შეცდომა — ხატულა, ტექსტი, aria-invalid, aria-describedby."
      >
        {(theme) => (
          <>
            <TextField label={t('contact.contactField')} hint="საკმარისია ერთ-ერთი." required />
            <TextField
              label={`${t('contact.contactField')} (hover)`}
              defaultValue="nino@mail.ge"
              data-force="hover"
            />
            <TextField
              label={`${t('contact.contactField')} (ფოკუსი)`}
              defaultValue="nino@mail.ge"
              data-force="focus"
            />
            <TextField
              label={t('contact.contactField')}
              defaultValue="nino@"
              error={t('fieldErrors.contact')}
              required
            />
            <TextField label={t('subscribe.emailLabel')} type="email" disabled />
            <TextArea label={t('contact.message')} optional hint="მაქსიმუმ 4000 სიმბოლო." />
            <Select
              label={t('contact.topic')}
              placeholder={t('fields.selectPlaceholder')}
              options={options('contactTopic', CONTACT_TOPICS)}
              required
            />
            <Select
              label={t('contact.topic')}
              placeholder={t('fields.selectPlaceholder')}
              options={options('contactTopic', CONTACT_TOPICS)}
              error={t('fieldErrors.option')}
            />
            <RadioGroup
              legend={t('contact.replyVia')}
              name={`kit-reply-${theme}`}
              options={options('replyChannel', REPLY_CHANNELS)}
              value={reply}
              onChange={setReply}
              required
            />
            <RadioGroup
              legend={t('contact.replyVia')}
              name={`kit-reply-error-${theme}`}
              layout="list"
              options={options('replyChannel', REPLY_CHANNELS)}
              error={t('fieldErrors.option')}
            />
            <Checkbox label={t('contact.consent')} defaultChecked />
            <Checkbox label={t('contact.consent')} error={t('fieldErrors.consent')} />
            <Checkbox label={t('contact.consent')} disabled />
          </>
        )}
      </KitSection>

      <KitSection id="kit-accordion" title="Accordion" note="↑ ↓ Home End — სათაურებს შორის.">
        {(theme) => (
          <Accordion
            // region-ის სახელი გვერდზე უნიკალური უნდა იყოს — სამ სვეტში თემის სახელი ემატება
            items={FAQ.map((item) => ({ ...item, title: `${item.title} (${theme})` }))}
            defaultOpen={['q2']}
          />
        )}
      </KitSection>

      <KitSection
        id="kit-switch"
        title="Switch (F4)"
        note="role=switch + aria-checked; მდგომარეობის ტექსტი aria-hidden-ია. გათიშული — aria-disabled: ფოკუსს იღებს და მიზეზს ხსნის."
      >
        {(theme) => (
          <>
            <Switch
              icon="layout"
              label={`${t('a11y.spacing')} (${theme})`}
              description={t('a11y.spacingWide')}
              checked={spacing}
              onChange={setSpacing}
            />
            <Switch icon="layout" label="Hover" checked={false} data-force="hover" tabIndex={-1} />
            <Switch icon="layout" label="ფოკუსი" checked data-force="focus" tabIndex={-1} />
            <Switch
              icon="layout"
              label="დაჭერილი"
              checked={false}
              data-force="active"
              tabIndex={-1}
            />
            <Switch
              icon="voice"
              label={`${t('a11y.voice')} (${theme})`}
              checked={false}
              disabled
              disabledReason={t('a11y.voiceUnavailable')}
            />
          </>
        )}
      </KitSection>

      <KitSection
        id="kit-save"
        title="SaveToggle"
        note="სამივე სვეტი ერთ სტატიას ინახავს — მდგომარეობა useSaved-ით სინქრონულია."
      >
        {() => (
          <div className="flex flex-wrap items-end gap-3">
            <State name="ხატულა">
              <SaveToggle slug="kit-demo" title="[სტატიის სათაური]" />
            </State>
            <State name="Hover">
              <SaveToggle slug="kit-demo" title="[სტატიის სათაური]" data-force="hover" />
            </State>
            <State name="ფოკუსი">
              <SaveToggle slug="kit-demo" title="[სტატიის სათაური]" data-force="focus" />
            </State>
            <State name="ლეიბლით">
              <SaveToggle slug="kit-demo" title="[სტატიის სათაური]" variant="label" />
            </State>
          </div>
        )}
      </KitSection>

      <KitSection id="kit-badges" title="A11yBadge, GrowthStat">
        {() => (
          <>
            <div className="flex flex-wrap gap-1">
              {['yes', 'on-request', 'no'].map((level) => (
                <A11yBadge key={level} kind="wheelchair" value={level} />
              ))}
              <A11yBadge kind="signInterpreter" value="yes" />
              <A11yBadge kind="captions" value="on-request" />
              <A11yBadge kind="format" value="online" />
              <A11yBadge kind="format" value="in-person" />
            </div>
            <div className="flex flex-wrap gap-1">
              <GrowthStat value="[+00%]" label="წინა წელთან" />
              <GrowthStat value="[00]" label="ახალი მონაწილე" />
            </div>
          </>
        )}
      </KitSection>

      <KitSection
        id="kit-headings"
        title="SectionHeading, Quote"
        note="ზოლი: ღიაში #FF8A3D ფონი, მუქსა და კონტრასტში 6px ზედა კიდე."
      >
        {() => (
          <>
            <SectionHeading
              as="h4"
              size="h2"
              eyebrow={t('home.aboutTitle')}
              title={t('about.heroTitle')}
              lead={t('home.aboutLead')}
              action={
                <Button variant="link" to="/about">
                  {t('home.aboutLink')}
                </Button>
              }
            />
            <SectionHeading
              as="h4"
              size="h3"
              band
              eyebrow={t('nav.cta')}
              title={t('videos.shareStoryTitle')}
              lead={t('videos.shareStoryText')}
              action={<Button variant="cta">{t('videos.shareStoryCta')}</Button>}
            />
            <Quote cite="[სახელი გვარი], [როლი]">[ციტატის ტექსტი მონაწილის სიტყვებით]</Quote>
          </>
        )}
      </KitSection>

      <KitSection
        id="kit-icons"
        title="Icon"
        note="IconSet-ის 18 ხატულა (accent) და UI-გლიფები; currentColor, ნაგულისხმევად aria-hidden."
      >
        {() => (
          <>
            <ul className="grid grid-cols-6 gap-2">
              {BRAND_ICONS.map((name) => (
                <li key={name} className="flex">
                  <Icon name={name} accent label={ICONS[name].label} size="2rem" />
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-2">
              {UI_GLYPHS.map((name) => (
                <li key={name} className="flex">
                  <Icon name={name} label={ICONS[name].label} size="2rem" />
                </li>
              ))}
            </ul>
          </>
        )}
      </KitSection>

      <KitSection
        id="kit-logo"
        title="Logo"
        note="„ერთად · სინერგია“ LogoSynergy დაფიდან. ნიშანი ≥ 48px — 3D, 24–47 — ბრტყელი, < 24 — favicon. მინიმუმი: ნიშანი 24, ჰორიზონტალური 160, ვერტიკალური 120 px."
      >
        {(theme) => {
          const tone = { light: 'color', dark: 'inverse', contrast: 'mono' }[theme];
          return (
            <>
              <div className="flex flex-wrap items-end gap-2">
                {[96, 48, 32, 24].map((size) => (
                  <State key={size} name={`${size}px`}>
                    <Logo layout="mark" tone={tone} size={size} />
                  </State>
                ))}
              </div>
              <Logo layout="horizontal" tone={tone} size={64} />
              <Logo layout="horizontal" tone={tone} size={30} />
              <Logo layout="vertical" tone={tone} size={200} />
              {theme === 'light' && (
                <div className="flex flex-col gap-2 rounded-card bg-footer p-3">
                  <Logo layout="horizontal" tone="inverse" size={56} />
                  <Logo
                    layout="horizontal"
                    tone="mono"
                    size={40}
                    className="text-surface"
                    knockout="var(--mc-footer)"
                  />
                </div>
              )}
            </>
          );
        }}
      </KitSection>

      <KitSection
        id="kit-f5"
        title="F5: ContentState, Skeleton, Breadcrumbs, DateTile, PendingLink, ვარიანტები"
        note="მონაცემიანი ბლოკის სამი მდგომარეობა (ჩონჩხი ანიმაციის გარეშე); Card icon / row; VideoCard feature / row; NewsCard compact."
      >
        {(theme) => (
          <>
            <State name="ჩატვირთვა">
              <ContentState
                status="loading"
                error={null}
                onRetry={noop}
                label="[სექცია]"
                className="w-full"
                skeleton={<Skeleton ratio="16:9" lines={2} />}
              >
                {() => null}
              </ContentState>
            </State>
            <State name="შეცდომა">
              <ContentState
                status="error"
                error={KIT_ERROR}
                onRetry={noop}
                label={`[სექცია] (${theme})`}
                skeleton={null}
              >
                {() => null}
              </ContentState>
            </State>
            <State name="ცარიელი">
              <ContentState
                status="success"
                error={null}
                onRetry={noop}
                label="[სექცია]"
                skeleton={null}
                empty
                emptyText={t('home.articlesEmpty')}
              >
                {() => null}
              </ContentState>
            </State>
            <State name="Skeleton: row, tile, person, logo, text">
              <div className="flex w-full flex-col gap-2">
                <Skeleton variant="row" lines={2} />
                <Skeleton variant="tile" lines={2} />
                <SkeletonGroup
                  count={2}
                  variant="person"
                  lines={2}
                  className="grid grid-cols-2 gap-2"
                />
                <SkeletonGroup
                  count={2}
                  variant="logo"
                  lines={1}
                  className="grid grid-cols-2 gap-2"
                />
                <Skeleton variant="text" lines={3} />
              </div>
            </State>
            <Breadcrumbs
              label={`ნავიგაციის ბილიკი (${theme})`}
              items={[{ to: '/', label: t('nav.home') }, { label: t('nav.about') }]}
            />
            <div className="flex items-center gap-2">
              <DateTile date="2026-10-24T10:00:00+04:00" />
              <PendingLink>{t('about.vacancies')}</PendingLink>
            </div>
            <Card
              as="div"
              title={t('about.pillars.engagement.title')}
              icon={<Icon name="engagement" accent size="1.75rem" />}
            >
              <p>{t('about.pillars.engagement.text')}</p>
            </Card>
            {videos && news ? (
              <>
                <VideoCard
                  video={videos[0]}
                  feature
                  eyebrow={t('home.weeklyVideo')}
                  showExcerpt={false}
                />
                <ul className="mc-row-list">
                  <li>
                    <VideoCard video={videos[1]} layout="row" showExcerpt={false} />
                  </li>
                </ul>
                <NewsCard item={news.items[0]} variant="compact" />
              </>
            ) : (
              <p className="text-muted">{t('common.loading')}</p>
            )}
          </>
        )}
      </KitSection>

      <KitSection id="kit-live" title="VisuallyHidden, LiveRegion">
        {(theme) => (
          <div className="flex flex-col items-start gap-2">
            <Button
              variant="secondary"
              onClick={() => setAnnouncement(`${t('articles.shown', { count: 6 })} (${theme})`)}
            >
              სტატუსის განახლება
            </Button>
            <LiveRegion visible className="text-small">
              {announcement}
            </LiveRegion>
          </div>
        )}
      </KitSection>
    </div>
  );
}
