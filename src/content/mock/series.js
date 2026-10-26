import { withSeriesDerived } from '../query.js';
import { slugify } from '../slug.js';

import { pad2, tbilisi } from './helpers.js';

/** @typedef {import('../model.js').Series} Series */
/** @typedef {import('../model.js').Slide} Slide */
/** @typedef {import('../taxonomy.js').SeriesTopic} SeriesTopic */
/** @typedef {import('../taxonomy.js').SeriesTone} SeriesTone */

/**
 * რჩეული სერია „ჩვევა — 5 ნაბიჯი“ (§5, §10: slug `chveva-5-nabiji`): ყდა + 5 ნაბიჯი,
 * ტექსტი SlidesPage დაფიდან, ფრჩხილებში. მარტივი ენის ვერსიები — ჩანაცვლება.
 * @type {Omit<Slide, 'id'>[]}
 */
const HABIT_SLIDES = [
  {
    kind: 'cover',
    number: null,
    title: '[ჩვევა]',
    body: '[როგორ იქმნება ჩვევა და როგორ რჩება — 5 ნაბიჯი.]',
    plain: '[მარტივად: ჩვევა არის ის, რასაც ყოველდღე ვაკეთებთ. აქ არის 5 ნაბიჯი ახალი ჩვევისთვის.]',
  },
  {
    kind: 'step',
    number: 1,
    title: '[ჩვევა არის ციკლი]',
    body: '[ნიშანი → რუტინა → ჯილდო. შეცვალე რუტინა, ნიშანი და ჯილდო კი დატოვე.]',
    plain:
      '[მარტივად: რაღაც გახსენებს. შენ რაღაცას აკეთებ. მერე კარგად გრძნობ თავს. შეცვალე შუა ნაწილი.]',
  },
  {
    kind: 'step',
    number: 2,
    title: '[დაიწყე ორწუთიანით]',
    body: '[„ვვარჯიშობ 2 წუთს“. მთავარია დაწყება, არა მოცულობა — მოცულობა მერე მოვა.]',
    plain: '[მარტივად: დაიწყე ძალიან პატარა საქმით. 2 წუთიც საკმარისია.]',
  },
  {
    kind: 'step',
    number: 3,
    title: '[მიაბი არსებულს]',
    body: '[ახალი ჩვევა მიაბი ძველს: „ყავის შემდეგ — 5 წუთი კითხვა“.]',
    plain: '[მარტივად: ახალი საქმე გააკეთე იმის შემდეგ, რასაც უკვე ყოველდღე აკეთებ.]',
  },
  {
    kind: 'step',
    number: 4,
    title: '[გარემო ნებაზე ძლიერია]',
    body: '[გაადვილე სასურველი და გაართულე არასასურველი — წიგნი მაგიდაზე, ტელეფონი სხვა ოთახში.]',
    plain: '[მარტივად: საჭირო ნივთი ახლოს დადე. ის, რაც ხელს გიშლის, შორს გადადე.]',
  },
  {
    kind: 'step',
    number: 5,
    title: '[მონიშნე დღე]',
    body: '[კალენდარში ყოველი შესრულებული დღე მონიშნე. ჯაჭვი, რომელსაც აღარ გაწყვეტ.]',
    plain: '[მარტივად: ყოველ დღეს, როცა გააკეთე, კალენდარში ნიშანი დასვი.]',
  },
];

/**
 * §5-ის ექვსი სერია; აღწერა SlidesPage დაფის „სხვა სერიებიდან“. ყდის ფერი მხოლოდ
 * ნეიტრალური ტოკენებია (taxonomy SERIES_TONES).
 * @type {{ topic: SeriesTopic, title: string, excerpt: string, tone: SeriesTone }[]}
 */
const SERIES = [
  {
    topic: 'worldview',
    title: '[მსოფლხედვა]',
    excerpt: '[რუკა, რომლითაც სამყაროს ვკითხულობთ — და როგორ შევცვალოთ იგი.]',
    tone: 'orange',
  },
  {
    topic: 'character',
    title: '[ხასიათი]',
    excerpt: '[რას ვაკეთებ მაშინ, როცა არავინ მიყურებს.]',
    tone: 'navy-deep',
  },
  {
    topic: 'win-win',
    title: '[მოგება-მოგება]',
    excerpt: '[შეთანხმება, სადაც ორივე მხარე იგებს — და როგორ მივაღწიოთ მას.]',
    tone: 'petrol',
  },
  {
    topic: 'flow',
    title: '[დინება (flow)]',
    excerpt: '[მდგომარეობა, როცა დრო ქრება: გამოწვევისა და უნარის ბალანსი.]',
    tone: 'orange',
  },
  {
    topic: 'time-priorities',
    title: '[დრო და პრიორიტეტები]',
    excerpt: '[მნიშვნელოვანი ჯერ — სასწრაფო მერე.]',
    tone: 'navy',
  },
  {
    topic: 'self-reflection',
    title: '[თვითრეფლექსია]',
    excerpt: '[კვირის სამი კითხვა, რომელიც წინ გწევს.]',
    tone: 'alt',
  },
];

/**
 * ყდა + 4 ნაბიჯი = 5 სლაიდი.
 * @param {string} title
 * @param {string} excerpt
 * @returns {Omit<Slide, 'id'>[]}
 */
function genericSlides(title, excerpt) {
  return [
    {
      kind: 'cover',
      number: null,
      title,
      body: excerpt,
      plain: '[მარტივი ენის ვერსია: ერთი წინადადებით, რას ისწავლი ამ სერიაში.]',
    },
    ...[1, 2, 3, 4].map((n) => ({
      kind: /** @type {const} */ ('step'),
      number: n,
      title: `[ნაბიჯი ${pad2(n)}: სათაური სამიდან ხუთ სიტყვამდე]`,
      body: '[სლაიდის ტექსტი: ერთი აზრი, 120–160 სიმბოლო — 24px-ზე 620×620 სლაიდში ექვს სტრიქონზე ნაკლები. ტექსტი ცოცხალია, არა სურათი.]',
      plain: '[მარტივი ენის ვერსია: მოკლე წინადადებები, ერთი აზრი თითოში, უცხო სიტყვების გარეშე.]',
    })),
  ];
}

/**
 * @param {string} slug
 * @param {Omit<Slide, 'id'>[]} slides
 * @returns {Slide[]}
 */
function withIds(slug, slides) {
  return slides.map((slide, i) => ({ id: `${slug}-${pad2(i + 1)}`, ...slide }));
}

/**
 * @param {number} now
 * @returns {Series[]}
 */
export function createSeries(now) {
  const habitTitle = '[ჩვევა — 5 ნაბიჯი]';
  const habitSlug = slugify(habitTitle);

  /** @type {Series[]} */
  const list = [
    withSeriesDerived({
      slug: habitSlug,
      title: habitTitle,
      topic: 'habit',
      excerpt:
        '[როგორ იქმნება ჩვევა და როგორ რჩება. პრაქტიკული ნაბიჯები, რომლებიც ერთ კვირაში შეგიძლია სცადო — სწავლაში, სამსახურსა და ყოველდღიურობაში.]',
      tone: 'navy',
      cover: null,
      status: 'published',
      publishedAt: tbilisi(now, -4),
      featured: true,
      slides: withIds(habitSlug, HABIT_SLIDES),
      pdf: { src: null, label: '[ჩვევა — 5 ნაბიჯი, PDF]' },
    }),
  ];

  SERIES.forEach((entry, i) => {
    const slug = slugify(entry.title);
    list.push(
      withSeriesDerived({
        slug,
        title: entry.title,
        topic: entry.topic,
        excerpt: entry.excerpt,
        tone: entry.tone,
        cover: null,
        status: 'published',
        publishedAt: tbilisi(now, -(20 + i * 14)),
        featured: false,
        slides: withIds(slug, genericSlides(entry.title, entry.excerpt)),
        pdf: null,
      }),
    );
  });

  return list;
}
