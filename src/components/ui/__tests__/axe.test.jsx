import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { ContentError } from '@/content/errors.js';

import {
  A11yBadge,
  Accordion,
  ArticleCard,
  BRAND_ICONS,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  ContentState,
  DateTile,
  Chip,
  ChipGroup,
  EventCard,
  GrowthStat,
  Icon,
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
  VisuallyHidden,
} from '../index.js';

import { article, event, member, newsItem, partner, renderUi, series, video } from './fixtures.jsx';

beforeEach(() => localStorage.clear());

/** jsdom-ში განლაგება არ არის — კონტრასტს Chromium-ის axe ამოწმებს (`/__kit`, gate). */
const OPTIONS = { rules: { 'color-contrast': { enabled: false } } };

const OPTIONS_LIST = [
  { id: 'email', label: 'ელფოსტა' },
  { id: 'call', label: 'ზარი' },
];

/** @type {[string, () => import('react').ReactElement][]} */
const CASES = [
  [
    'Button: ოთხი ვარიანტი, ბმული, გათიშული, loading',
    () => (
      <>
        <Button variant="cta">ჩაერთე</Button>
        <Button variant="primary" to="/articles">
          სტატიები
        </Button>
        <Button variant="secondary" href="https://example.org" newTab>
          გარე ბმული
        </Button>
        <Button variant="link" disabled to="/x">
          გათიშული ბმული
        </Button>
        <Button variant="secondary" disabled>
          გათიშული
        </Button>
        <Button loading>მეტის ჩატვირთვა</Button>
      </>
    ),
  ],
  [
    'IconButton',
    () => (
      <>
        <IconButton icon="close" label="დახურვა" />
        <IconButton icon="contrast" label="კონტრასტი" pressed={false} />
        <IconButton icon="moon" label="მუქი რეჟიმი" pressed />
        <IconButton icon="plus" label="გაზრდა" aria-disabled />
      </>
    ),
  ],
  [
    'Switch: ჩართული, გამორთული, გათიშული მიზეზით',
    () => (
      <>
        <Switch icon="layout" label="განლაგება" description="მეტი მანძილი" checked />
        <Switch label="ხმოვანი რეჟიმი" checked={false} disabled disabledReason="ხმა არ არის" />
      </>
    ),
  ],
  [
    'Chip, ChipGroup',
    () => (
      <>
        <Chip pressed>ყველა</Chip>
        <ChipGroup
          label="კატეგორია"
          options={[{ id: null, label: 'ყველა' }, ...OPTIONS_LIST]}
          value={null}
          onChange={() => {}}
        />
      </>
    ),
  ],
  ['ArticleCard', () => <ArticleCard article={article} />],
  ['SeriesCard', () => <SeriesCard series={series} />],
  [
    'VideoCard (ბმული და ღილაკი)',
    () => (
      <>
        <VideoCard video={video} />
        <VideoCard video={video} onSelect={() => {}} />
      </>
    ),
  ],
  ['NewsCard', () => <NewsCard item={newsItem} />],
  ['EventCard', () => <EventCard event={event} />],
  ['TeamCard', () => <TeamCard member={member} />],
  ['PartnerCard', () => <PartnerCard partner={partner} />],
  [
    'Media: ჩანაცვლება და სურათი',
    () => (
      <>
        <Media image={{ src: null, alt: '[აღწერა]', ratio: '3:2' }} />
        <Media image={{ src: '/photo.jpg', alt: 'ფოტოს აღწერა', ratio: '16:9' }} />
        <Media image={{ src: null, alt: '[სახელი]', ratio: '1:1' }} round />
      </>
    ),
  ],
  [
    'ველები, შეცდომით',
    () => (
      <form>
        <TextField label="სახელი" hint="მინიშნება" required />
        <TextField label="ელფოსტა" error="შეამოწმე მისამართი" />
        <TextArea label="შეტყობინება" optional />
        <Select
          label="თემა"
          placeholder="აირჩიე"
          options={OPTIONS_LIST}
          error={{ message: 'აირჩიე' }}
        />
        <Checkbox label="ვეთანხმები" error="საჭიროა თანხმობა" />
        <RadioGroup legend="როგორ გიპასუხოთ?" name="r" options={OPTIONS_LIST} error="აირჩიე" />
      </form>
    ),
  ],
  [
    'Accordion',
    () => (
      <Accordion
        items={[
          { id: 'a', title: 'პირველი', content: <p>ტექსტი</p> },
          { id: 'b', title: 'მეორე', content: <p>ტექსტი</p> },
        ]}
        defaultOpen={['a']}
      />
    ),
  ],
  [
    'SaveToggle (ხატულა და ლეიბლი)',
    () => (
      <>
        <SaveToggle slug="a-b" title="სათაური" />
        <SaveToggle slug="a-b" title="სათაური" variant="label" />
      </>
    ),
  ],
  [
    'A11yBadge, GrowthStat',
    () => (
      <>
        <A11yBadge kind="wheelchair" value="yes" />
        <A11yBadge kind="signInterpreter" value="on-request" />
        <A11yBadge kind="captions" value="no" />
        <A11yBadge kind="format" value="online" />
        <GrowthStat value="[+00%]" label="წინა წელთან" />
      </>
    ),
  ],
  [
    'SectionHeading, Quote',
    () => (
      <>
        <SectionHeading eyebrow="წარწერა" title="სათაური" lead="ტექსტი" />
        <SectionHeading band title="ზოლი" lead="ტექსტი" as="h3" />
        <Quote cite="[სახელი გვარი]">[ციტატა]</Quote>
      </>
    ),
  ],
  [
    'Icon (18 + იარლიყით)',
    () => (
      <p>
        {BRAND_ICONS.map((name) => (
          <Icon key={name} name={name} />
        ))}
        <Icon name="alert" label="შეცდომა" />
      </p>
    ),
  ],
  [
    'Logo: სამი განლაგება × სამი ტონი',
    () => (
      <>
        {['horizontal', 'vertical', 'mark'].flatMap((layout) =>
          ['color', 'inverse', 'mono'].map((tone) => (
            <Logo key={layout + tone} layout={layout} tone={tone} />
          )),
        )}
        <Logo layout="mark" decorative />
      </>
    ),
  ],
  [
    'F5: ContentState — ჩატვირთვა, შეცდომა, ცარიელი',
    () => (
      <>
        <ContentState
          status="loading"
          error={null}
          onRetry={() => {}}
          label="სტატიები"
          skeleton={<SkeletonGroup count={2} lines={2} />}
        >
          {() => null}
        </ContentState>
        <ContentState
          status="error"
          error={new ContentError('network')}
          onRetry={() => {}}
          label="სიახლეები"
          skeleton={null}
        >
          {() => null}
        </ContentState>
        <ContentState
          status="success"
          error={null}
          onRetry={() => {}}
          label="გუნდი"
          skeleton={null}
          empty
          emptyText="გუნდის წევრები ჯერ არ არის დამატებული."
        >
          {() => null}
        </ContentState>
      </>
    ),
  ],
  [
    'F5: Skeleton (ყველა ვარიანტი), Breadcrumbs, DateTile, PendingLink',
    () => (
      <>
        {['card', 'row', 'tile', 'person', 'logo', 'text'].map((variant) => (
          <Skeleton key={variant} variant={variant} />
        ))}
        <Breadcrumbs items={[{ to: '/', label: 'მთავარი' }, { label: 'ჩვენ შესახებ' }]} />
        <DateTile date="2026-10-24T10:00:00+04:00" />
        <PendingLink>ვაკანსიები</PendingLink>
      </>
    ),
  ],
  [
    'F5: Card icon, VideoCard feature / row, NewsCard compact',
    () => (
      <>
        <Card as="div" title="ჩართულობა" icon={<Icon name="engagement" accent />}>
          <p>[ტექსტი]</p>
        </Card>
        <VideoCard video={video} feature eyebrow="კვირის ვიდეო" headingLevel="h2" />
        <ul className="mc-row-list">
          <li>
            <VideoCard video={{ ...video, slug: 'row-demo' }} layout="row" showExcerpt={false} />
          </li>
        </ul>
        <NewsCard item={newsItem} variant="compact" />
      </>
    ),
  ],
  [
    'VisuallyHidden, LiveRegion',
    () => (
      <>
        <VisuallyHidden>დამალული</VisuallyHidden>
        <LiveRegion>ნაპოვნია 5 სტატია</LiveRegion>
      </>
    ),
  ],
];

describe('axe: UI ნაკრები', () => {
  it.each(CASES)('%s', async (_, make) => {
    const { container } = renderUi(make());
    expect(await axe(container, OPTIONS)).toHaveNoViolations();
  });
});
