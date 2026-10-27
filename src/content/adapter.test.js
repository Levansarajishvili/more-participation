import { afterEach, describe, expect, it, vi } from 'vitest';

import * as content from './adapter.js';
import { ContentError } from './errors.js';
import { createMockAdapter } from './mock/index.js';
import { ARTICLE_CATEGORIES } from './taxonomy.js';

const NOW = Date.parse('2026-10-26T12:00:00+04:00');
const mock = () => createMockAdapter({ now: () => NOW });

/**
 * @param {Promise<unknown>} promise
 * @returns {Promise<ContentError>}
 */
async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return /** @type {ContentError} */ (error);
  }
  throw new Error('Promise არ უარყოფილა');
}

describe('listArticles', () => {
  it('ნაგულისხმევად 6 სტატიას აბრუნებს, უახლესი ჯერ, მხოლოდ საჯაროს', async () => {
    const page = await mock().listArticles();
    expect(page.items).toHaveLength(6);
    expect(page.total).toBe(14);
    expect(page.nextCursor).not.toBeNull();
    const dates = page.items.map((a) => Date.parse(a.publishedAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(page.items.every((a) => a.status === 'published')).toBe(true);
  });

  it('cursor ყველა გვერდს გადის დუბლიკატისა და გამოტოვების გარეშე', async () => {
    const adapter = mock();
    /** @type {string[]} */
    const slugs = [];
    let cursor = null;
    let pages = 0;
    do {
      const page = await adapter.listArticles({ cursor, limit: 6 });
      slugs.push(...page.items.map((a) => a.slug));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(3);
    expect(slugs).toHaveLength(14);
    expect(new Set(slugs).size).toBe(14);
  });

  it('მონახაზი და მომავალში დაგეგმილი არ ჩანს; დაგეგმილი თავის დროზე ჩნდება', async () => {
    const before = await mock().listArticles({ limit: 50 });
    expect(before.items.some((a) => a.title.includes('მონახაზი'))).toBe(false);
    expect(before.items.some((a) => a.title.includes('დაგეგმილი'))).toBe(false);

    const later = createMockAdapter({
      now: () => NOW + 6 * 86_400_000,
      data: mock().snapshot,
    });
    const after = await later.listArticles({ limit: 50 });
    expect(after.total).toBe(15);
    expect(after.items.some((a) => a.title.includes('დაგეგმილი'))).toBe(true);
  });

  it('კატეგორიის ფილტრი', async () => {
    const adapter = mock();
    let sum = 0;
    for (const category of ARTICLE_CATEGORIES) {
      const page = await adapter.listArticles({ category, limit: 50 });
      expect(page.items.every((a) => a.category === category)).toBe(true);
      sum += page.total;
    }
    expect(sum).toBe(14);
  });

  it('ძიება: ნაწილობრივი სიტყვა, რამდენიმე სიტყვა (AND), მთავრული და ფრჩხილების გარეშე', async () => {
    const adapter = mock();
    const one = await adapter.listArticles({ q: 'გასაუბრ' });
    expect(one.items.map((a) => a.title)).toContain(
      '[პირველი გასაუბრება: როგორ ვისაუბროთ საჭიროებებზე]',
    );
    const both = await adapter.listArticles({ q: '  „პირველი“   გასაუბრება ', limit: 50 });
    expect(both.items.map((a) => a.title)).toContain(
      '[პირველი გასაუბრება: როგორ ვისაუბროთ საჭიროებებზე]',
    );
    expect((await adapter.listArticles({ q: 'გასაუბრება zzzz' })).total).toBe(0);
    // მთავრული = მხედრული; „გასაუბრება“ ფუძით „გასაუბრებისთვის“-საც პოულობს
    const upper = await adapter.listArticles({ q: 'ᲒᲐᲡᲐᲣᲑᲠᲔᲑᲐ' });
    expect(upper.total).toBe(one.total);
    expect(one.total).toBe(2);
    const none = await adapter.listArticles({ q: 'zzzz-არარსებული' });
    expect(none).toEqual({ items: [], nextCursor: null, total: 0 });
  });

  it('ძიება სტატიის ტექსტშიც ეძებს და კატეგორიასთან ერთად მუშაობს', async () => {
    const page = await mock().listArticles({ q: 'reasonable accommodation', category: 'career' });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((a) => a.category === 'career')).toBe(true);
  });

  it('რჩეული: featured=true მხოლოდ რჩეულს, false — დანარჩენს', async () => {
    const adapter = mock();
    const featured = await adapter.listArticles({ featured: true });
    expect(featured.total).toBe(1);
    const rest = await adapter.listArticles({ featured: false, limit: 50 });
    expect(rest.total).toBe(13);
    expect(rest.items.some((a) => a.featured)).toBe(false);
  });

  it('დალაგება „მოკლე“: კითხვის დრო ზრდადობით', async () => {
    const page = await mock().listArticles({ sort: 'shortest', limit: 50 });
    const minutes = page.items.map((a) => a.readingMinutes);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
    expect(new Set(minutes).size).toBeGreaterThan(1);
  });

  it('სიის ელემენტს ტექსტი არ აქვს, აქვს readingMinutes და hasAudio', async () => {
    const [item] = (await mock().listArticles({ featured: true })).items;
    expect(item).not.toHaveProperty('body');
    expect(item).not.toHaveProperty('audio');
    expect(item.readingMinutes).toBeGreaterThanOrEqual(3);
    expect(item.readingMinutes).toBeLessThanOrEqual(12);
    expect(item.hasAudio).toBe(false);
  });

  it('არასწორი პარამეტრი → bad-request ქართული შეტყობინებით', async () => {
    const adapter = mock();
    for (const params of [
      { category: 'unknown' },
      { cursor: 'abc' },
      { cursor: '999' },
      { limit: 0 },
      { limit: 51 },
      { sort: 'popular' },
    ]) {
      const error = await rejection(adapter.listArticles(/** @type {never} */ (params)));
      expect(error).toBeInstanceOf(ContentError);
      expect(error.code).toBe('bad-request');
      expect(error.message).toMatch(/მოთხოვნა არასწორია/);
    }
  });
});

describe('getArticle', () => {
  it('აბრუნებს სრულ სტატიას ბლოკებით', async () => {
    const adapter = mock();
    const [summary] = (await adapter.listArticles()).items;
    const article = await adapter.getArticle(summary.slug);
    expect(article.body.length).toBeGreaterThan(5);
    expect(article.body[0].type).toBe('p');
  });

  it('არარსებული, მონახაზი ან არასწორი slug → not-found', async () => {
    const adapter = mock();
    const draft = adapter.snapshot.articles.find((a) => a.status === 'draft');
    for (const slug of ['ar-arsebobs', draft?.slug ?? '', '../etc', 'ჩვევა']) {
      const error = await rejection(adapter.getArticle(slug));
      expect(error.code).toBe('not-found');
      expect(error.message).toMatch(/ვერ მოიძებნა/);
    }
  });

  it('პასუხი ასლია: მისი შეცვლა mock-ს არ ცვლის', async () => {
    const adapter = mock();
    const [summary] = (await adapter.listArticles()).items;
    const article = await adapter.getArticle(summary.slug);
    article.title = 'შეცვლილი';
    expect((await adapter.getArticle(summary.slug)).title).not.toBe('შეცვლილი');
  });
});

describe('სერიები და ვიდეოები', () => {
  it('listSeries: რჩეული „ჩვევა — 5 ნაბიჯი“ ჯერ, შემდეგ 6 სერია თემების რიგით', async () => {
    const list = await mock().listSeries();
    expect(list).toHaveLength(7);
    expect(list[0]).toMatchObject({ slug: 'chveva-5-nabiji', featured: true, slideCount: 6 });
    expect(list.slice(1).map((s) => s.topic)).toEqual([
      'worldview',
      'character',
      'win-win',
      'flow',
      'time-priorities',
      'self-reflection',
    ]);
    expect(list.slice(1).every((s) => s.slideCount === 5)).toBe(true);
    expect(list[0]).not.toHaveProperty('slides');
  });

  it('listSeries({ topic }) და getSeries', async () => {
    const adapter = mock();
    expect(await adapter.listSeries({ topic: 'flow' })).toHaveLength(1);
    const series = await adapter.getSeries('chveva-5-nabiji');
    expect(series.slides.map((s) => s.kind)).toEqual([
      'cover',
      'step',
      'step',
      'step',
      'step',
      'step',
    ]);
    expect(series.slides.every((s) => s.plain.length > 0)).toBe(true);
    expect((await rejection(adapter.getSeries('ar-arsebobs'))).code).toBe('not-found');
  });

  it('listVideos: კატეგორია, რჩეული, has*-ველები', async () => {
    const adapter = mock();
    const all = await adapter.listVideos();
    expect(all).toHaveLength(6);
    expect(all.every((v) => v.hasCaptions && v.hasSignLanguage && v.hasAudioDescription)).toBe(
      true,
    );
    expect(all[0]).not.toHaveProperty('transcript');
    expect(await adapter.listVideos({ category: 'art' })).toHaveLength(2);
    const [weekly] = await adapter.listVideos({ featured: true });
    const video = await adapter.getVideo(weekly.slug);
    expect(video.transcript.length).toBeGreaterThan(0);
    expect(video.captions[0]).toMatchObject({ srclang: 'ka', default: true });
  });
});

describe('სიახლეები და ღონისძიებები', () => {
  it('listNews: years ≥ 2 წელი, წლის და ტიპის ფილტრი, cursor', async () => {
    const adapter = mock();
    const page = await adapter.listNews();
    expect(page.years.length).toBeGreaterThanOrEqual(2);
    expect(page.years).toEqual([...page.years].sort((a, b) => b - a));
    expect(page.items).toHaveLength(6);
    expect(page.total).toBe(15);

    const [year] = page.years;
    const byYear = await adapter.listNews({ year, limit: 50 });
    expect(byYear.items.every((n) => n.publishedAt.startsWith(String(year)))).toBe(true);
    expect(byYear.years).toEqual(page.years);

    const events = await adapter.listNews({ type: 'event', limit: 50 });
    expect(events.items.every((n) => n.type === 'event')).toBe(true);
    expect(events.items[0]).not.toHaveProperty('body');

    const second = await adapter.listNews({ cursor: page.nextCursor });
    expect(second.items[0].slug).not.toBe(page.items[0].slug);
  });

  it('listNews: არასწორი წელი ან ტიპი → bad-request', async () => {
    const adapter = mock();
    expect((await rejection(adapter.listNews({ year: 26 }))).code).toBe('bad-request');
    expect((await rejection(adapter.listNews(/** @type {never} */ ({ type: 'x' })))).code).toBe(
      'bad-request',
    );
  });

  it('listEvents: მომავალი ზრდადობით, გასული კლებადობით, ხელმისაწვდომობის ველებით', async () => {
    const adapter = mock();
    const upcoming = await adapter.listEvents({ upcoming: true });
    expect(upcoming.length).toBeGreaterThanOrEqual(3);
    const starts = upcoming.map((e) => Date.parse(e.start));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(starts.every((s) => s > NOW)).toBe(true);
    for (const event of upcoming) {
      expect(event.accessibility).toEqual(
        expect.objectContaining({
          wheelchair: expect.any(String),
          signInterpreter: expect.any(String),
          captions: expect.any(String),
          format: expect.any(String),
        }),
      );
    }
    const past = await adapter.listEvents({ upcoming: false });
    expect(past.length).toBeGreaterThanOrEqual(1);
    expect(past.every((e) => Date.parse(e.end) < NOW)).toBe(true);
  });
});

describe('ორგანიზაცია და ფორმები', () => {
  it('გუნდი (8, რიგით), პარტნიორები, ეტაპები, პარამეტრები', async () => {
    const adapter = mock();
    const team = await adapter.getTeam();
    expect(team).toHaveLength(8);
    expect(team.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(await adapter.getPartners()).toHaveLength(12);
    expect(await adapter.getStages()).toHaveLength(4);
    const settings = await adapter.getSettings();
    expect(settings.officeAccessibility).toHaveLength(6);
    expect(settings.contacts.signVideo).toBeDefined();
  });

  it('subscribe: სწორი ელფოსტა → ok; არასწორი → validation + fields.email', async () => {
    const adapter = mock();
    await expect(adapter.subscribe('  Name@Example.ge ')).resolves.toEqual({ ok: true });
    expect(adapter.subscribers.has('name@example.ge')).toBe(true);
    const error = await rejection(adapter.subscribe('name@'));
    expect(error.code).toBe('validation');
    expect(error.fields?.email.code).toBe('email');
    expect((await rejection(adapter.subscribe(''))).fields?.email.code).toBe('required');
  });

  it('sendContact: სავალდებულო ველები, თანხმობა, ტელეფონი ან ელფოსტა', async () => {
    const adapter = mock();
    const error = await rejection(adapter.sendContact(/** @type {never} */ ({})));
    expect(error.code).toBe('validation');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(
      ['consent', 'contact', 'name', 'replyVia', 'topic'].sort(),
    );
    expect(error.fields?.consent.message).toMatch(/თანხმობა/);

    const ok = await adapter.sendContact({
      name: '[სახელი გვარი]',
      contact: '+995 500 00 00 00',
      topic: 'barrier',
      message: '',
      replyVia: 'sign-video',
      consent: true,
    });
    expect(ok).toEqual({ ok: true, id: 'mock-1' });

    const badContact = await rejection(
      adapter.sendContact({
        name: 'ა',
        contact: '12',
        topic: 'general',
        message: '',
        replyVia: 'email',
        consent: true,
      }),
    );
    expect(badContact.fields?.contact.code).toBe('contact');
  });
});

describe('F6: სიახლის გვერდი და კონტაქტის ფორმის წესები', () => {
  it('getNews: სრული ტექსტით; მონახაზი და არარსებული → not-found', async () => {
    const adapter = mock();
    const item = await adapter.getNews('tsipruli-unarebis-akademiis-akhali-nakadi-ikhsneba');
    expect(item.body.length).toBeGreaterThan(0);
    expect((await rejection(adapter.getNews('monakhazi-gundis-akhali-tsevri'))).code).toBe(
      'not-found',
    );
    expect((await rejection(adapter.getNews('ar-arsebuli'))).code).toBe('not-found');
    expect((await rejection(adapter.getNews('../x'))).code).toBe('not-found');
  });

  const valid = {
    name: '[სახელი გვარი]',
    contact: 'name@example.ge',
    topic: /** @type {const} */ ('general'),
    message: '',
    replyVia: /** @type {const} */ ('email'),
    consent: true,
  };

  it('sendContact: honeypot შევსებული → ok, მაგრამ შეტყობინება არ ინახება', async () => {
    const adapter = mock();
    const result = await adapter.sendContact({ ...valid, website: 'https://spam.example' });
    expect(result.ok).toBe(true);
    expect(adapter.contacts()).toBe(0);
    await adapter.sendContact({ ...valid, website: '' });
    expect(adapter.contacts()).toBe(1);
  });

  it('sendContact: საპასუხო არხი ↔ საკონტაქტო ველი; support ≤ 1000', async () => {
    const adapter = mock();
    const phone = await rejection(adapter.sendContact({ ...valid, contact: '+995 555 00 00 00' }));
    expect(phone.fields?.replyVia.code).toBe('replyEmail');
    const email = await rejection(adapter.sendContact({ ...valid, replyVia: 'call' }));
    expect(email.fields?.replyVia.code).toBe('replyPhone');
    await expect(
      adapter.sendContact({ ...valid, contact: '+995 555 00 00 00', replyVia: 'sign-video' }),
    ).resolves.toMatchObject({ ok: true });
    const long = await rejection(adapter.sendContact({ ...valid, support: 'ა'.repeat(1001) }));
    expect(long.fields?.support.code).toBe('tooLong');
  });
});

describe('mock-ის ოფციები', () => {
  it('delay: პასუხი დაყოვნების შემდეგ მოდის', async () => {
    vi.useFakeTimers();
    const adapter = createMockAdapter({ now: () => NOW, delay: 300 });
    const done = vi.fn();
    adapter.getSettings().then(done);
    await vi.advanceTimersByTimeAsync(299);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('fail: ყოველი მოთხოვნა მოცემული კოდით მთავრდება', async () => {
    const adapter = createMockAdapter({ now: () => NOW, fail: 'network' });
    const error = await rejection(adapter.listVideos());
    expect(error.code).toBe('network');
    expect(error.message).toMatch(/კავშირი/);
  });
});

describe('adapter.js — საჯარო ინტერფეისი', () => {
  afterEach(() => content.setContentAdapter(null));

  it('ნაგულისხმევი adapter mock-ია და ყველა ფუნქცია Promise-ს აბრუნებს', async () => {
    expect(await content.contentSource()).toBe('mock');
    const calls = [
      content.listArticles(),
      content.listSeries(),
      content.listVideos(),
      content.listNews(),
      content.listEvents({ upcoming: true }),
      content.getTeam(),
      content.getPartners(),
      content.getStages(),
      content.getSettings(),
      content.subscribe('name@example.ge'),
    ];
    const results = await Promise.all(calls);
    expect(results.every(Boolean)).toBe(true);
    const { items } = await content.listArticles({ limit: 1 });
    expect((await content.getArticle(items[0].slug)).slug).toBe(items[0].slug);
  });

  it('ნებისმიერი შეცდომა ContentError-ად ნორმალიზდება', async () => {
    const failing = {
      ...mock(),
      getSettings: () => Promise.reject(Object.assign(new Error('boom'), { status: 503 })),
      getTeam: () => Promise.reject(new TypeError('Failed to fetch')),
      getPartners: () => Promise.reject('უცნაური'),
    };
    content.setContentAdapter(failing);
    expect((await rejection(content.getSettings())).toJSON()).toEqual({
      code: 'server',
      message: 'სერვერმა მოთხოვნა ვერ შეასრულა. სცადე ცოტა ხანში.',
    });
    expect((await rejection(content.getTeam())).code).toBe('network');
    expect((await rejection(content.getPartners())).code).toBe('unknown');
  });
});
