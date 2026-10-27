import { t } from '@/i18n/index.js';

import { EXCERPT_MAX, MEDIA_RATIO, STATUSES } from './model.js';
import { SLUG_PATTERN } from './slug.js';
import {
  ACCESS_LEVELS,
  ARTICLE_CATEGORIES,
  EVENT_FORMATS,
  NEWS_TYPES,
  OFFICE_FEATURES,
  PARTNER_KINDS,
  SERIES_TONES,
  SERIES_TOPICS,
  SOCIAL_NETWORKS,
  VIDEO_CATEGORIES,
  isOneOf,
} from './taxonomy.js';
import { inlineText } from './text.js';

/**
 * კონტენტის შემოწმება — AdminPanel-ის ხელმისაწვდომობის ჩეკლისტის ანალოგი.
 * dev-ში adapter-ი mock-ს ჩატვირთვისას ამოწმებს და console-ში აფრთხილებს; F8-ის ადმინი
 * იგივე ფუნქციებით გამოქვეყნებას ბლოკავს.
 *
 * severity:
 * - `error` — გამოქვეყნების ბლოკერი (§10): alt, სათაურების იერარქია, ბმულის ტექსტი,
 *   სუბტიტრი, ტრანსკრიპტი, აუდიოაღწერა, ასევე ფორმატის შეცდომები (slug, თარიღი, ტიპი);
 * - `warning` — გამოქვეყნება გადის: ჟესტური ენის ვერსია, ქართული სუბტიტრი ნაგულისხმევად.
 */

/** @typedef {import('./model.js').ContentSnapshot} ContentSnapshot */
/** @typedef {import('./model.js').Article} Article */
/** @typedef {import('./model.js').Series} Series */
/** @typedef {import('./model.js').Video} Video */
/** @typedef {import('./model.js').NewsItem} NewsItem */
/** @typedef {import('./model.js').Event} Event */
/** @typedef {import('./model.js').Image} Image */
/** @typedef {import('./model.js').Block} Block */
/** @typedef {import('./model.js').Ratio} Ratio */

/**
 * @typedef {'article' | 'series' | 'video' | 'news' | 'event' | 'team' | 'partner' | 'stage' | 'settings'} IssueEntity
 */

/**
 * @typedef {object} Issue
 * @property {'error' | 'warning'} severity
 * @property {IssueEntity} entity
 * @property {string} id         slug ან id
 * @property {string} field      ველის გზა: `cover.alt`, `body[3]`, `slides[2].plain`
 * @property {string} code       `checks.*`-ის გასაღები
 * @property {string} message    ქართულად
 */

/**
 * ბმულის ტექსტი, რომელიც კონტექსტის გარეშე არაფერს ამბობს (WCAG 2.4.4).
 * ფრჩხილები და პუნქტუაცია შედარებამდე იშლება.
 */
const GENERIC_LINK_TEXT = new Set([
  'აქ',
  'აქ დააჭირე',
  'დააჭირე აქ',
  'დააჭირეთ აქ',
  'ბმული',
  'ეს ბმული',
  'ამ ბმულზე',
  'ვრცლად',
  'მეტი',
  'მეტის ნახვა',
  'სრულად',
  'გადასვლა',
  'here',
  'click here',
  'link',
  'more',
  'read more',
]);

/**
 * @param {string} text
 * @returns {string}
 */
function bareText(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function filled(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function validDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

/** შემგროვებელი: ერთი entity-ს შემოწმება. */
class Collector {
  /** @param {IssueEntity} entity @param {string} id @param {Issue[]} sink */
  constructor(entity, id, sink) {
    this.entity = entity;
    this.id = id;
    this.sink = sink;
  }

  /**
   * @param {'error' | 'warning'} severity
   * @param {string} field
   * @param {string} code
   * @param {Record<string, string | number>} [vars]
   */
  add(severity, field, code, vars) {
    this.sink.push({
      severity,
      entity: this.entity,
      id: this.id,
      field,
      code,
      message: t(`checks.${code}`, vars),
    });
  }

  /** @param {object} obj @param {string[]} fields */
  required(obj, fields) {
    const record = /** @type {Record<string, unknown>} */ (obj);
    for (const field of fields) {
      if (!filled(record[field])) this.add('error', field, 'required', { field });
    }
  }

  /** @param {string} field @param {unknown} value @param {readonly string[]} list */
  oneOf(field, value, list) {
    if (!isOneOf(list, value))
      this.add('error', field, 'unknownValue', { field, value: String(value) });
  }

  /** @param {string} field @param {unknown} value */
  date(field, value) {
    if (!validDate(value)) this.add('error', field, 'date', { field });
  }

  /** @param {string} field @param {Image | null | undefined} image @param {Ratio} [ratio] */
  image(field, image, ratio) {
    if (!image) {
      this.add('error', field, 'required', { field });
      return;
    }
    if (!filled(image.alt)) this.add('error', `${field}.alt`, 'altMissing');
    if (ratio && image.ratio !== ratio) {
      this.add('error', `${field}.ratio`, 'ratio', {
        expected: ratio,
        actual: String(image.ratio),
      });
    }
  }

  /** @param {string} field @param {string} text */
  excerpt(field, text) {
    if (!filled(text)) this.add('error', field, 'required', { field });
    else if (text.length > EXCERPT_MAX) {
      this.add('error', field, 'excerptLength', { length: text.length, max: EXCERPT_MAX });
    }
  }

  /**
   * ბმული: ტექსტი აღწერითია, href არაცარიელია, შიდა `/articles/…` არსებულ სტატიაზე მიდის.
   * `href: null` — ბმული ჯერ უცნობია (მოქმედების ღილაკი), ტექსტი მაინც მოწმდება.
   * @param {string} field @param {string} text @param {string | null} href @param {Set<string>} articleSlugs
   */
  link(field, text, href, articleSlugs) {
    if (!filled(text) || GENERIC_LINK_TEXT.has(bareText(text))) {
      this.add('error', field, 'linkText', { text: text ?? '' });
    }
    if (href === null) return;
    if (!filled(href)) {
      this.add('error', `${field}.href`, 'required', { field: `${field}.href` });
      return;
    }
    const match = /^\/articles\/([^/?#]+)/.exec(href);
    if (match && !articleSlugs.has(match[1]))
      this.add('error', `${field}.href`, 'linkBroken', { href });
  }

  /**
   * სათაურები: H3 მხოლოდ H2-ის შემდეგ; ბმულები აღწერითი; ფოტოს alt.
   * @param {string} field
   * @param {Block[]} blocks
   * @param {Set<string>} articleSlugs
   */
  body(field, blocks, articleSlugs) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      this.add('error', field, 'required', { field });
      return;
    }
    let seenH2 = false;
    blocks.forEach((block, i) => {
      const at = `${field}[${i}]`;
      switch (block.type) {
        case 'h2':
          seenH2 = true;
          if (!filled(block.text)) this.add('error', at, 'required', { field: at });
          break;
        case 'h3':
          if (!seenH2) this.add('error', at, 'headingOrder');
          if (!filled(block.text)) this.add('error', at, 'required', { field: at });
          break;
        case 'p':
          if (!filled(inlineText(block.content))) this.add('error', at, 'required', { field: at });
          block.content.forEach((run, j) => {
            if (run.type === 'link')
              this.link(`${at}.content[${j}]`, run.text, run.href, articleSlugs);
          });
          break;
        case 'list':
          block.items.forEach((item, j) =>
            item.forEach((run, k) => {
              if (run.type === 'link') {
                this.link(`${at}.items[${j}][${k}]`, run.text, run.href, articleSlugs);
              }
            }),
          );
          break;
        case 'quote':
          if (!filled(block.text)) this.add('error', at, 'required', { field: at });
          break;
        case 'image':
          this.image(`${at}.image`, block.image);
          break;
        case 'link':
          this.link(at, block.text, block.href, articleSlugs);
          break;
        default:
          this.add('error', at, 'unknownValue', {
            field: `${at}.type`,
            value: String(/** @type {{ type?: unknown }} */ (block).type),
          });
      }
    });
  }

  /** @param {{ status: unknown, publishedAt: unknown }} item */
  publication(item) {
    this.oneOf('status', item.status, STATUSES);
    this.date('publishedAt', item.publishedAt);
  }
}

/**
 * @param {{ slug: string }[]} items
 * @param {IssueEntity} entity
 * @param {Issue[]} sink
 */
function checkSlugs(items, entity, sink) {
  const seen = new Set();
  for (const item of items) {
    const c = new Collector(entity, item.slug, sink);
    if (!SLUG_PATTERN.test(item.slug ?? ''))
      c.add('error', 'slug', 'slug', { slug: item.slug ?? '' });
    else if (seen.has(item.slug)) c.add('error', 'slug', 'slugDuplicate', { slug: item.slug });
    seen.add(item.slug);
  }
}

/**
 * @param {Article} article
 * @param {Set<string>} articleSlugs
 * @param {Issue[]} sink
 */
export function validateArticle(article, articleSlugs, sink = []) {
  const c = new Collector('article', article.slug, sink);
  c.required(article, ['title', 'author']);
  c.excerpt('excerpt', article.excerpt);
  c.oneOf('category', article.category, ARTICLE_CATEGORIES);
  c.image('cover', article.cover, MEDIA_RATIO.articleCover);
  c.publication(article);
  c.body('body', article.body, articleSlugs);
  return sink;
}

/**
 * @param {Series} series
 * @param {Issue[]} sink
 */
export function validateSeries(series, sink = []) {
  const c = new Collector('series', series.slug, sink);
  c.required(series, ['title', 'excerpt']);
  c.oneOf('topic', series.topic, SERIES_TOPICS);
  c.oneOf('tone', series.tone, SERIES_TONES);
  if (series.cover) c.image('cover', series.cover, MEDIA_RATIO.seriesCover);
  c.publication(series);
  if (!series.slides?.length) c.add('error', 'slides', 'slidesMissing');
  series.slides?.forEach((slide, i) => {
    const at = `slides[${i}]`;
    if (!filled(slide.title)) c.add('error', `${at}.title`, 'required', { field: `${at}.title` });
    if (!filled(slide.body)) c.add('error', `${at}.body`, 'required', { field: `${at}.body` });
    if (!filled(slide.plain)) c.add('error', `${at}.plain`, 'plainMissing');
    if (slide.image) c.image(`${at}.image`, slide.image);
  });
  // F8: ატვირთული PDF-ის tagged-სტატუსი (PDF/UA) დადასტურებული უნდა იყოს — გაფრთხილება
  if (series.pdf?.src && !series.pdf.tagged) c.add('warning', 'pdf', 'pdfUntagged');
  return sink;
}

/**
 * @param {Video} video
 * @param {Issue[]} sink
 */
export function validateVideo(video, sink = []) {
  const c = new Collector('video', video.slug, sink);
  c.required(video, ['title', 'excerpt']);
  c.required(video.person ?? {}, ['name']);
  c.oneOf('category', video.category, VIDEO_CATEGORIES);
  c.image('poster', video.poster, MEDIA_RATIO.videoPoster);
  c.publication(video);

  if (!video.captions?.length) c.add('error', 'captions', 'captionsMissing');
  else if (!video.captions.some((track) => track.srclang === video.language && track.default)) {
    c.add('warning', 'captions', 'captionsDefault');
  }
  if (!video.transcript?.length) c.add('error', 'transcript', 'transcriptMissing');
  else {
    const ordered = video.transcript.every(
      (line, i, all) =>
        Number.isFinite(line.start) &&
        line.start >= 0 &&
        line.start <= video.duration &&
        (i === 0 || line.start >= all[i - 1].start) &&
        filled(line.text),
    );
    if (!ordered) c.add('error', 'transcript', 'transcriptOrder');
  }
  // F8: აუდიოაღწერა არ სჭირდება, თუ რედაქტორმა მონიშნა „ვიზუალური ინფორმაცია აუდიოშიცაა“
  if (!video.audioDescription && !video.visualInAudio) {
    c.add('error', 'audioDescription', 'audioDescriptionMissing');
  }
  if (!video.signLanguage) c.add('warning', 'signLanguage', 'signLanguageMissing');
  return sink;
}

/**
 * @param {NewsItem} item
 * @param {Set<string>} articleSlugs
 * @param {Issue[]} sink
 */
export function validateNews(item, articleSlugs, sink = []) {
  const c = new Collector('news', item.slug, sink);
  c.required(item, ['title']);
  c.excerpt('excerpt', item.excerpt);
  c.oneOf('type', item.type, NEWS_TYPES);
  c.image('cover', item.cover, MEDIA_RATIO.newsCover);
  c.publication(item);
  if (item.body?.length) c.body('body', item.body, articleSlugs);
  if (item.action) c.link('action', item.action.text, item.action.href, articleSlugs);
  return sink;
}

/**
 * @param {Event} event
 * @param {Issue[]} sink
 */
export function validateEvent(event, sink = []) {
  const c = new Collector('event', event.slug, sink);
  c.required(event, ['title', 'location']);
  c.date('start', event.start);
  c.date('end', event.end);
  if (
    validDate(event.start) &&
    validDate(event.end) &&
    Date.parse(event.end) < Date.parse(event.start)
  ) {
    c.add('error', 'end', 'eventTime');
  }
  c.publication(event);
  const access = event.accessibility;
  if (!access) {
    c.add('error', 'accessibility', 'eventAccess', { field: 'accessibility' });
    return sink;
  }
  for (const field of /** @type {const} */ (['wheelchair', 'signInterpreter', 'captions'])) {
    if (!isOneOf(ACCESS_LEVELS, access[field])) {
      c.add('error', `accessibility.${field}`, 'eventAccess', { field });
    }
  }
  if (!isOneOf(EVENT_FORMATS, access.format)) {
    c.add('error', 'accessibility.format', 'eventAccess', { field: 'format' });
  }
  return sink;
}

/**
 * ყველა კონტენტის შემოწმება. ცარიელი მასივი — შენიშვნა არ არის.
 * @param {ContentSnapshot} data
 * @returns {Issue[]}
 */
export function validateContent(data) {
  /** @type {Issue[]} */
  const issues = [];
  const articleSlugs = new Set(data.articles.map((a) => a.slug));

  checkSlugs(data.articles, 'article', issues);
  checkSlugs(data.series, 'series', issues);
  checkSlugs(data.videos, 'video', issues);
  checkSlugs(data.news, 'news', issues);
  checkSlugs(data.events, 'event', issues);
  checkSlugs(data.team, 'team', issues);
  checkSlugs(data.partners, 'partner', issues);

  data.articles.forEach((a) => validateArticle(a, articleSlugs, issues));
  data.series.forEach((s) => validateSeries(s, issues));
  data.videos.forEach((v) => validateVideo(v, issues));
  data.news.forEach((n) => validateNews(n, articleSlugs, issues));
  data.events.forEach((e) => validateEvent(e, issues));

  for (const member of data.team) {
    const c = new Collector('team', member.slug, issues);
    c.required(member, ['name', 'role']);
    c.image('photo', member.photo, MEDIA_RATIO.portrait);
  }
  for (const partner of data.partners) {
    const c = new Collector('partner', partner.slug, issues);
    c.required(partner, ['name']);
    c.oneOf('kind', partner.kind, PARTNER_KINDS);
    c.image('logo', partner.logo);
  }
  for (const stage of data.stages) {
    const c = new Collector('stage', stage.id, issues);
    c.required(stage, ['year', 'text']);
  }

  const s = new Collector('settings', 'site', issues);
  const contacts = data.settings.contacts;
  s.required(contacts, ['phone', 'email']);
  s.required(data.settings, ['responseTime']);
  if (!filled(contacts.address?.text))
    s.add('error', 'contacts.address', 'required', { field: 'contacts.address' });
  data.settings.officeAccessibility.forEach((item, i) =>
    s.oneOf(`officeAccessibility[${i}].feature`, item.feature, OFFICE_FEATURES),
  );
  data.settings.social.forEach((item, i) =>
    s.oneOf(`social[${i}].network`, item.network, SOCIAL_NETWORKS),
  );

  return issues;
}

/**
 * dev-ის console: ჯამი + თითო შენიშვნა ცალკე გაფრთხილებად (Warnings ფილტრში ჩანს).
 * შენიშვნა რომ არ არის, არაფერს წერს.
 * @param {Issue[]} issues
 */
export function reportContentIssues(issues) {
  if (issues.length === 0) return;
  console.warn(`[content] ${t('checks.summary', { count: issues.length })}`);
  for (const { severity, entity, id, field, message } of issues) {
    console.warn(`[content] ${severity} · ${entity}/${id} · ${field} — ${message}`);
  }
}
