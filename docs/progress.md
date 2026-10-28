# progress.md — „მეტი ჩართულობა“ frontend

## F1 — ფუნდამენტი ✅ (2026-10-26)

**Gate:** `npm run lint` ✓ (ESLint 0 შეცდომა / 0 გაფრთხილება, Prettier ✓) · `npm test` ✓ (3 ფაილი, 151 ტესტი) · `npm run build` ✓ (+ `postbuild` check-dist ✓) · თემა ციმციმის გარეშე ✓ — Chromium 153-ში 10 სცენარი (3 თემა × შენახული / OS, 1440 და 390, reload): `data-theme` 22–36ms-ზე ედება, first-paint 32–64ms-ზეა, თემა ერთხელ იცვლება, პირველ კადრში ფონი სწორია.

### შექმნილი ფაილები

`package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `jsconfig.json`, `CLAUDE.md`, `docs/project-context.md`, `docs/progress.md`, `scripts/check-dist.mjs`, `scripts/contrast-report.mjs`, `src/main.jsx`, `src/routes.jsx`, `src/routes.test.jsx`, `src/theme-boot.test.js`, `src/styles/{index,tokens,theme,base,focus,motion}.css`, `src/styles/tokens.test.js`, `src/features/a11y/prefs.js`, `src/components/layout/RootLayout.jsx`, `src/pages/{Home,About,Articles,Article,Development,Videos,News,Contact,NotFound,Kit}Page.jsx`, `src/pages/RouteError.jsx`, `src/test/{setup,contrast}.js`; ცარიელი (`.gitkeep`): `src/{assets/logo,content,hooks,i18n,components/ui,components/media}`.

### საჯარო API

**CSS ტოკენები** (`tokens.css`, `[data-theme="light | dark | contrast"]`, ღია — `:root`-ზეც):
`--mc-bg, --mc-surface, --mc-alt, --mc-hero, --mc-footer, --mc-ink, --mc-muted, --mc-link, --mc-accent-text, --mc-graphic, --mc-band, --mc-growth, --mc-line, --mc-border, --mc-error, --mc-cta, --mc-cta-hover, --mc-cta-ink, --mc-cta-shadow` + `--mc-cta-frame, --mc-ring-inner, --mc-ring-mid, --mc-ring-outer`.

**Tailwind-ის ფერები** (`@theme inline`, ქვეხის თემას მიჰყვება): `page`(=bg), `surface`, `alt`, `hero`, `footer`, `ink`, `muted`, `link`, `accent`(=accent-text), `graphic`, `band`, `growth`, `line`, `border`, `error`, `cta`, `cta-hover`, `cta-ink`, `cta-shadow`, `cta-frame`. ნაგულისხმევი პალიტრა, `shadow-*`, `drop-shadow-*`, `text-shadow-*` გათიშულია.

**შკალები** (`theme.css`):
- ტექსტი: `text-hero-1|2|3`, `text-h1|h2|h3`, `text-lead`, `text-body`, `text-small`, `text-article`, `text-quote`, `text-slide-title|slide-text|slide-num` (ზომა + line-height × `--mc-leading` + წონა);
- ბიჯი: `--spacing: 0.5rem` (8px);
- breakpoint: `sm` 390 · `md` 768 · `lg` 1200 · `xl` 1440 (rem);
- რადიუსი: `rounded-pill` 999 · `-block` 32 · `-card` 24 · `-field-lg` 14 · `-field` 12 · `-circle` 50%;
- კონტეინერი: `max-w-site` 1440, `max-w-article` 36em, უტილიტა `site-container` (კიდე `--mc-edge` 20 / ≥ 768-ზე 80);
- პროპორციები: `aspect-video` 16:9 · `-slide` 1:1 · `-slide-tall` 4:5 · `-photo` 3:2 · `-cover` 4:3;
- მოძრაობა: `--mc-dur-press|chip|pop|base|slide|progress|spin` → `duration-press` …; `ease-out`, `ease-spring`; `animate-spin` 900ms.

**თავსებადობის ცვლადები** (`base.css`): `--mc-font-scale` (data-size 100…200 → 1…2, `html { font-size: calc(100% × scale) }`), `--mc-leading` (1 / wide 1.2), `--mc-tracking`, `--mc-word-spacing`, `--mc-paragraph-gap` (1.1em / 2em), `--mc-edge`.

**ფოკუსი** (`focus.css`, layer-ის გარეშე): `:focus-visible` — box-shadow 2/5/8px `--mc-ring-*` + `outline: 2px solid transparent`; forced-colors → `3px CanvasText`. საკუთარი ჩრდილი კომპონენტს `--mc-shadow`-ით ეძლევა.

**`src/features/a11y/prefs.js`:** `A11Y_STORAGE_KEY = 'mc-a11y'`, `THEMES`, `FONT_SIZES`, `DEFAULT_PREFS`, `parsePrefs(raw) → { theme | null, size, spacing, voice }`, `toRootAttributes(prefs, prefersDark)`, `colorSchemeFor(theme)`. index.html-ის `#mc-boot` იგივეს ES5-ზე აკეთებს (თანხვედრა ტესტშია). F4-ის მენიუ თემის შეცვლისას `data-theme`-ს და `<meta name="color-scheme">`-ს ერთად ცვლის.

**როუტები** (`src/routes.jsx`, `export const routes`): `/`, `/about`, `/articles`, `/articles/:slug`, `/development`, `/videos`, `/news`, `/contact`, `*` (404), DEV-ში `/__kit`. Root: `RootLayout` (`<main id="main">`), `ErrorBoundary: RouteError`, `HydrateFallback: () => null`. ყოველი გვერდი — ერთი `<h1>` + `<title>`.

**alias:** `@/` → `src/`.

### დიზაინიდან გადახვევები

- ზომები ნაბიჯად კი არა, თხევადად იცვლება (390 → 1440). 768px-ზე H1 64px სიტყვა „ხელმისაწვდომობა“ 608px-იან სვეტს სცდება, თხევად შკალაზე კი H1 48.6px-ია და სიტყვა 523px-ს იკავებს.
- H1-ის მობილური ზომა (40) და ციტატის შკალა (32 → 24, 1.4) DesignSystem დაფიდანაა, რადგან §3-ში ეს ზომები არ არის.
- მუქი რეჟიმის ფოკუსის რგოლი UIKit-იდან (#071526 / #EAF0F7 / #FFB81C): #0B2545-იანი შუა ფენა მუქ ფონზე არ ჩანს.
- კონტრასტის თემის error #F2B8B5-ია (12.30:1), CTA-ს hover და ჩრდილი #FFFFFF — §2-ში არ იყო.
- ღია რეჟიმის CTA-ს ჩარჩო #0A1D38-ია (UIKit), რადგან ოქროსფერი paper-ზე 1.60:1-ს იძლევა.
- breakpoint-ები rem-შია და არა px-ში, რომ ბრაუზერის შრიფტის ზომას მიჰყვეს.
- ნაგულისხმევი ჩრდილები გათიშულია (შავი ალფაა, სისტემის გარეთ).
- `vitest` 5.0.5-ზეა (11 დღის, მხოლოდ dev): 5.0.4-ზე pin vitest-axe-ის peer-თან npm-ის arborist-ის ბაგს იწვევს. დანარჩენი ვერსიები ≥ 14 დღისაა.

### ღია საკითხები

1. **CTA და ბარათის ჩრდილები (F3).** UIKit-ის 4px/6px მყარი ჩრდილი უნდა დაიწეროს `--mc-shadow`-ით და არა `shadow-*`-ით. ბარათის hover-ჩრდილი დაფაზე `rgba(11,37,69,.10)`-ია — §2-ში ასეთი ფერი არ არის.
2. **ჰეროსა და ზოლის „on-dark“ ტექსტი (F3/F5).** ღიაში ჰერო #0B2545-ია და მასზე ტექსტი თეთრი უნდა იყოს. დაფები #FFFFFF-სა და #DCE6F1-ს იყენებს, მაგრამ ტოკენი არ არის. ორი გზაა: შიდა ელემენტზე `data-theme="dark"` (ink #EAF0F7 #0B2545-ზე ≈ 13:1) ან ახალი ტოკენი `--mc-on-hero`. ზოლის ტექსტი #0A1D38-ია — ჯერ `text-cta-ink`, სემანტიკური ტოკენი გადასაწყვეტია.
3. **გრძელი სიტყვები (F3/F5).** H1 40px/900-ზე „ხელმისაწვდომობა“ 430px-ია, 390-ზე შიგთავსი კი 350px. base-ის `overflow-wrap: break-word` ჰორიზონტალურ სქროლს არ უშვებს, მაგრამ სიტყვას შუაში წყვეტს. გადასაწყვეტია: H1 მობილურზე 36 ან სათაურის ტექსტის შეზღუდვა.
4. **ბადის gutter.** §3-ში არ არის; დაფებზე 24px-ია. F3-ში ტოკენად.
5. **შრიფტის preload.** ქართული subset (41.5 kB woff2) ჯერ `font-display: swap`-ით იტვირთება და FOUT შესაძლებელია. preload-ისთვის Vite-ის hash-იანი გზაა საჭირო.
6. **OS-ის თემის ცვლილება სესიის შუაში.** როცა თემა ხელით არჩეული არ არის, `matchMedia` change-ზე მიყოლა F4-ის hook-ის საქმეა.
7. **SPA-ს 404.** რეალურ 404 სტატუსს ჰოსტინგი/prerender გადაწყვეტს (§9.4). inline `#mc-boot`-ს CSP-ში hash დასჭირდება.
8. **favicon.** `index.html`-ში ჯერ `data:,`-ია; საბოლოო ნაკრები F3-მდე `src/assets/logo/`-ში (§9.1).
9. **§2-ის კორექტირება.** `border` #6B7B91 თეთრზე 4.31:1-ია (§2-ში 3.4:1 ეწერა). Context-ის ფაილში გასწორებულია.

## F2 — კონტენტის ფენა ✅ (2026-10-26)

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (11 ფაილი, 240 ტესტი: F1-ის 151 + F2-ის 89) · `npm run build` ✓ (+ check-dist, ახალი შემოწმებით: validate.js წარმოებაში არ ხვდება — ორივე მიმართულებით გადამოწმდა) · adapter-ის 14-ვე ფუნქცია mock-ით მუშაობს · `validateContent(mock)` → 0 შენიშვნა. სატესტო build-ში (დროებითი იმპორტი HomePage-ში, დაბრუნებულია): mock — ცალკე lazy chunk, 51.7 kB / 13.4 kB gzip.

F1-ის რეპოს გასწორება: წაიშალა ცარიელი საქაღალდეები `src/{styles,assets…` (F1-ში `sh`-ის brace expansion) და zip-ში მოხვედრილი `dist/`.

### შექმნილი ფაილები

`src/content/{model,taxonomy,adapter,query,errors,forms,validate,slug,text}.js`, `src/content/mock/{index,data,helpers,articles,series,videos,news,org}.js`, `src/hooks/{useContent,useLoadMore,useUrlFilters,useSaved}.js`, `src/i18n/{ka,en,index,format}.js`, `scripts/i18n-stub.mjs`; ტესტები: `src/content/{adapter,validate,slug}.test.js`, `src/content/mock/mock.test.js`, `src/i18n/i18n.test.js`, `src/hooks/{useContent,useUrlFilters,useSaved}.test.jsx`. შეიცვალა: `eslint.config.js` (`ignoreRestSiblings`; `exhaustive-deps` → `additionalHooks: useContent|useLoadMore`), `package.json` (`i18n:stub`), `scripts/check-dist.mjs`, `CLAUDE.md` (რუკა + კონვენციები F2). წაიშალა `.gitkeep` content/hooks/i18n-იდან. `docs/project-context.md`: §9 — F2 დასრულებულია, ღია საკითხები 4 (დაზუსტდა), 5–6 (ახალი); §10 — 8 ახალი გადაწყვეტილება (adapter, mock-ის წესი, ბლოკები, ტაქსონომია და URL-ფილტრები, შვიდი თემა და `tone`, ka-GE / Asia/Tbilisi, `mc-saved`, validateContent).

### კონტენტის მოდელი

| ტიპი | სავალდებულო | არასავალდებულო | გვერდი |
|---|---|---|---|
| Article | slug, title, excerpt ≤ 160, category, cover (3:2 + alt), author, status, publishedAt, featured, body (ბლოკები) | updatedAt, audio | მთავარი, სტატიები, სტატია |
| Block | p (Inline[]: text {strong, lang} / link), h2, h3, list, quote {cite}, image {caption}, link {description} | — | სტატია, სიახლე |
| Series | slug, title, topic, excerpt, tone, status, publishedAt, featured, slides ≥ 1 | cover (4:3), pdf | მთავარი, განვითარება |
| Slide | id, kind (cover/step/summary), title, body, plain (მარტივი ენა) | number, image | განვითარება |
| Video | slug, title, excerpt, category, person {name, role}, poster (16:9 + alt), duration (წმ), language, status, publishedAt, featured, sources, captions ≥ 1 (ka default), audioDescription, transcript ≥ 1 | signLanguage (ნაკლებობა — გაფრთხილება) | მთავარი, ვიდეოები |
| CaptionTrack / TranscriptLine | kind, srclang, label, src, default / start, kind (speech/description), text | — / speaker | ვიდეოები |
| NewsItem | slug, title, excerpt ≤ 160, type, cover (3:2), status, publishedAt, featured | body, action {text, href} | მთავარი, სიახლეები |
| Event | slug, title, excerpt, start, end, location, accessibility {wheelchair, signInterpreter, captions, format} | accessibility.notes, registrationUrl, newsSlug | სიახლეები |
| TeamMember | slug, name, role, bio, photo (1:1 + alt), order | — | ჩვენ შესახებ |
| Partner | slug, name, kind, logo (+ alt) | url | ჩვენ შესახებ |
| Stage | id, year, text | — | ჩვენ შესახებ |
| SiteSettings | contacts {phone, email, messenger, signVideo, address}, hours, responseTime, officeAccessibility, faq, social, socialHandle, team.livedExperienceCount, links | ყველა URL (null = ჯერ უცნობი) | კონტაქტი, ფუტერი, ჩვენ შესახებ, სლაიდი |

ზოგადი: სტატუსი `draft | scheduled | published`; საჯაროა `published` ან `scheduled`, რომლის `publishedAt` დადგა. მედია: `{ src: string | null, alt, ratio: '16:9' | '3:2' | '4:3' | '1:1' | '4:5' }`. სიის ელემენტები „Summary“-ა: `ArticleSummary` (body/audio-ს გარეშე + `hasAudio`), `SeriesSummary` (+ `slideCount`), `VideoSummary` (+ `hasCaptions/hasSignLanguage/hasAudioDescription`), `NewsSummary` (body-ს გარეშე). გამოთვლადი: `readingMinutes` (150 სიტყვა/წთ).

### საჯარო API

**adapter** (`@/content/adapter.js`; ყველა → Promise, შეცდომა → `ContentError`):
`listArticles({ category, q, cursor, limit = 6, sort: 'newest' | 'shortest', featured }) → { items, nextCursor, total }` · `getArticle(slug)` · `listSeries({ topic, featured }) → SeriesSummary[]` (რჩეული ჯერ, შემდეგ თემების რიგით) · `getSeries(slug)` · `listVideos({ category, featured })` · `getVideo(slug)` · `listNews({ type, year, cursor, limit = 6, featured }) → { items, nextCursor, total, years }` · `listEvents({ upcoming })` (true — ზრდადობით, false — გასული კლებადობით) · `getTeam()` · `getPartners()` · `getStages()` · `getSettings()` · `subscribe(email) → { ok }` · `sendContact(payload) → { ok, id }` · `setContentAdapter(adapter | null)` · `contentSource() → 'mock' | 'cms'`.
`ContentAdapter` typedef იგივე ფუნქციებით + `source` — CMS-ის adapter მას უნდა აკმაყოფილებდეს. mock: `createMockAdapter({ now, delay, data, fail })`, `createMockData({ now })`; dev-ში დაყოვნება 300ms, ტესტში 0.

**შეცდომა** (`@/content/errors.js`): `ContentError { code: 'not-found' | 'bad-request' | 'validation' | 'network' | 'server' | 'unknown', message (ka), fields?: Record<name, { code, message }>, detail? }`, `normalizeError(e)` (HTTP 404/400/422/5xx, fetch TypeError → network), `fieldError(code, vars)`, `ERROR_CODES`.

**ფორმები** (`@/content/forms.js`): `validateContact(payload)`, `validateSubscribe(email)` → `{ [field]: { code, message } }` (ცარიელი — სწორია); `isEmail`, `isPhone`; `NAME_MAX` 100, `CONTACT_MAX` 120, `MESSAGE_MAX` 4000. contact: name, contact (ტელეფონი ან ელფოსტა), topic, replyVia, consent — სავალდებულო; message — არა.

**შემოწმება** (`@/content/validate.js`, dev-only): `validateContent(snapshot) → Issue[]` (`{ severity: 'error' | 'warning', entity, id, field, code, message }`), `validateArticle/Series/Video/News/Event`, `reportContentIssues(issues)` (console.warn). error = §10-ის ბლოკერი: alt, H2 → H3 იერარქია, აღწერითი და არაგატეხილი ბმული, სუბტიტრი, ტრანსკრიპტი (თანმიმდევრული, ≤ duration), აუდიოაღწერა, excerpt ≤ 160, slug, თარიღი, ტიპი, ღონისძიების ხელმისაწვდომობა, სლაიდის `plain`; warning = ჟესტური ენა, ქართული სუბტიტრი ნაგულისხმევად.

**ტაქსონომია** (`@/content/taxonomy.js`; id ლათინურად, წარწერა `t('taxonomy.<kind>.<id>')`): `ARTICLE_CATEGORIES` growth, career, rights, accessibility, stories · `ARTICLE_SORTS` newest, shortest · `SERIES_TOPICS` habit, worldview, character, win-win, flow, time-priorities, self-reflection (+ `SERIES_TOPIC_TERMS.flow` = `{ text: 'flow', lang: 'en' }`) · `SERIES_TONES` navy, navy-deep, petrol, orange, alt · `VIDEO_CATEGORIES` achievements, career, sport, art, everyday · `NEWS_TYPES` announcement, event, program, media (+ `newsTypePlural` ჩიპებისთვის) · `EVENT_FORMATS` in-person, online, hybrid · `ACCESS_LEVELS` yes, no, on-request, not-applicable · `CONTACT_TOPICS` general, programs, volunteering, partnership, media, barrier · `REPLY_CHANNELS` email, call, message, sign-video · `OFFICE_FEATURES` entrance, elevator, restroom, parking, transit, guide-dog · `PARTNER_KINDS` · `SOCIAL_NETWORKS` · `ORG_PILLARS` · `ORG_VALUES` · `label(kind, id)`, `options(kind, ids)`, `isOneOf(list, value)`.
**მოდელის კონსტანტები** (`@/content/model.js`): `RATIOS`, `STATUSES`, `EXCERPT_MAX` 160, `READING_WPM` 150, `MEDIA_RATIO` (articleCover/newsCover 3:2, videoPoster 16:9, seriesCover 4:3, portrait 1:1, logo 3:2). **slug** (`@/content/slug.js`): `slugify`, `transliterate`, `isSlug`, `SLUG_PATTERN`, `SLUG_MAX` 80. **ტექსტი** (`@/content/text.js`): `blocksToText`, `readingMinutes`, `slidesToText` („ტექსტური ვერსია“), `normalizeSearch`, `matchesQuery`, `searchStem`.

**hook-ები:**
- `useContent(fn, deps, { enabled } = {}) → { data, status: 'idle' | 'loading' | 'success' | 'error', error, reload }` — deps-ის შეცვლისას წინა `data` რჩება, ძველი პასუხი იგნორდება.
- `useLoadMore(fetchPage(cursor), deps, { enabled } = {}) → { items, total, status: 'idle' | 'loading' | 'loading-more' | 'success' | 'error', error, hasMore, loadMore, reload, firstNewIndex, meta }` — `firstNewIndex` ახალი გვერდის პირველი ელემენტია (ContentKit: ფოკუსი პირველ ახალ ბარათზე); „მეტის“ შეცდომისას სია რჩება; `meta.years` სიახლეებისთვის.
- `useUrlFilters({ categories, sorts, debounce = 300 }) → { category, q, query, year, series, sort, active, setCategory, setQuery, submitQuery, setYear, setSeries, setSort, reset }` — URL პარამეტრები `category`, `q`, `year`, `series`, `sort`; ჩიპი/წელი/სერია — push, ძიება — 300ms debounce + replace; `query` — ველის მნიშვნელობა, `q` — ჩაწერილი; სხვა პარამეტრები (utm) ინახება; `preventScrollReset`.
- `useSaved() → { slugs, count, isSaved, toggle → boolean, save, remove, clear }` — `localStorage['mc-saved']` = JSON slug-ები (ახალი თავში, ≤ 200), useSyncExternalStore, `storage` event, საცავის გარეშე — მეხსიერებაში. `SAVED_STORAGE_KEY`, `parseSaved`.

**i18n** (`@/i18n/index.js`): `t(key, vars)` (რიცხვი ka-GE ფორმატით; ოთხნიშნა დაჯგუფების გარეშე, ხუთნიშნა — U+00A0), `createT(dict)`, `LANG` 'ka', `LOCALE` 'ka-GE', `TIME_ZONE` 'Asia/Tbilisi', `formatDate(v, 'long' | 'weekday' | 'monthYear' | 'dayMonth' | 'dateTime')` → „5 მარტი, 2026“, `formatDateParts` → `{ day: '05', month, monthShort: 'მარ', year }`, `formatTime`, `formatTimeRange` → „10:00–16:00“, `formatDuration(270)` → „04:30“, `formatDurationLabel(270)` → „4 წუთი 30 წამი“, `formatNumber`, `getYear`, `toDateAttribute`, `toDate`. გასაღებების ჯგუფები: meta, nav, a11y, footer, common, saved, home, about, articles, development, videos, player, news, event, subscribe, contact, errors, fieldErrors, checks, taxonomy, time. `npm run i18n:stub` en.js-ს ka.js-იდან აახლებს.

### დიზაინიდან და prompt-იდან გადახვევები

- **სერია 7-ია**: §5-ის რჩეული „ჩვევა — 5 ნაბიჯი“ (6 სლაიდი, SlidesPage დაფის მიხედვით: ყდა + 5 ნაბიჯი) + 6 სერია × 5 სლაიდი (ყდა + 4). prompt-ის „6 სერია“ ამ ექვსს ნიშნავს.
- **სერიის ყდის ფერი**: SlidesPage / HomePage დაფებზე ყდები #FFB81C (მხოლოდ CTA), #08704C (მხოლოდ ზრდა) და #DCE6F1 (ტოკენი არ არის) იყენებს. მოდელში `tone` მხოლოდ navy-800 / navy-900 / petrol-600 / orange-300 / alt-ია; mock-ში „ხასიათი“ → navy-deep, „დინება“ → orange, „თვითრეფლექსია“ → alt.
- **ინტერფეისის დამატებები**: `listArticles` + `sort`, `featured`; `listNews` + `cursor`, `limit`, `featured`, პასუხში `years` (დაფაზე „მეტის ჩატვირთვა“ და წლის ჩიპები); `listSeries` + `topic`, `featured`; `listVideos` + `featured` („კვირის ვიდეო“); ახალი `getStages()` („ჩვენი გზა“) და `contentSource()`.
- **`{ enabled }` და არა `fn = null`**: ESLint-ის `exhaustive-deps` deps-ს მხოლოდ inline ფუნქციაზე ამოწმებს, ამიტომ პირობითი მოთხოვნა მესამე არგუმენტითაა.
- **„ყველაზე წაკითხული“ არ არის** — ანალიტიკას საჭიროებს (§9.4).
- **ღონისძიების `format`** ხელმისაწვდომობის ობიექტშია (prompt: ფორმატი ხელმისაწვდომობის ველია); დაემატა `not-applicable` (ეტლი ონლაინ ღონისძიებაზე) და `notes`.
- **validateContent** prompt-ის სამ შემოწმებას (alt, სუბტიტრი, ტრანსკრიპტი) §10-ის ბლოკერებამდე აფართოებს; ჟესტური ენა — გაფრთხილება.
- **ძიება** ქართულ ფორმებს ითვალისწინებს: 4+ ასოიან სიტყვას ბოლო „ა/ი“ ეჭრება („გასაუბრება“ → „გასაუბრებისთვის“); მთავრული = მხედრული; ფრჩხილები და ბრჭყალები იგნორდება.
- **თარიღი** ყველგან `Asia/Tbilisi`-თ — ღონისძიების დრო სტუმრის დროის სარტყელზე არ არის დამოკიდებული.
- **mock-ის ვიდეოები**: VideosPage დაფის „პირველი სამსახური“ ჩანაცვლდა „კვირის ვიდეოთი“ („როგორ გავხდი ვებ-დეველოპერი“), რომ ჯამში 6 დარჩეს.
- **ფრჩხილები ka.js-ში**: newsletter-ის სიხშირე („[თვეში ერთხელ]“, „[თვეში ერთი წერილი]“) ფაქტია და ჯერ დაუდასტურებელია.
- **mock-ის წესი** (ტესტით დაცული): ყოველი წასაკითხი ტექსტი `[ფრჩხილებშია]`, `src` და URL — `null`, ISO თარიღები სინთეზურია და `now`-ზეა მიბმული (სიახლეები ყოველთვის 3 კალენდარულ წელს მოიცავს, ღონისძიებები — მომავალში).
- **გუნდის „[N] წევრი შშმ პირია“** — მხოლოდ ჯამური `settings.team.livedExperienceCount`; პირად ბარათზე ასეთი ველი არ არსებობს.

### ღია საკითხები

1. **ყდის ფერები (F7).** ყდა თემით არ იცვლება (§2), ამიტომ `tone` ფიქსირებულ წყვილებზე უნდა აისახოს და არა თემის ტოკენებზე: navy #0B2545 + #FFFFFF 15.39:1, navy-deep #0A1D38 + #FFFFFF 16.86:1, petrol #155A78 + #FFFFFF 7.59:1, orange #FF8A3D + #0A1D38 7.19:1, alt #E9EFF6 + #0B2545 13.29:1 — ყველა ≥ 7:1. დაფები გასასწორებელია (იხ. გადახვევები).
2. **სიახლის სრული ტექსტი.** NewsPage-ზე „სრულად“ ბმულია, §5-ში `/news/:slug` როუტი არ არის. მოდელს `body` აქვს; F6-ში უნდა გადაწყდეს: ახალი როუტი, აკორდეონი თუ გარე ბმული.
3. **ვიდეოს პლატფორმა (§9.4).** `VideoSource { src, type }` საკუთარ ფაილზეა გათვლილი. YouTube-ს `provider` + `id` დასჭირდება, ჟესტური ენის PiP კი ორი სინქრონული ვიდეოა — YouTube-ზე პრაქტიკულად შეუძლებელია.
4. **სტატიის აუდიო.** `audio.src` mock-ში null-ია; F6: „მოუსმინე“ — ფაილი, თუ არა, `speechSynthesis` (ქართული ხმა ხშირად არ არის, §6).
5. **სერიის PDF** — ატვირთული ფაილი თუ სლაიდებიდან გენერირებული (F7).
6. **mock წარმოებაში.** CMS-მდე mock bundle-შია (lazy, 13.4 kB gzip). `contentSource()` dev-ბანერს („სატესტო მონაცემები“) უზრუნველყოფს — F4-ში გადასაწყვეტი.
7. **i18n-ის ენის გადართვა.** `t` ქართულზეა მიბმული; ინგლისური ვერსიისთვის context/hook დასჭირდება — როცა en.js რეალური გახდება.
8. **CMS-ზე შემოწმება.** dev-ში `validateContent` mock-ის სრულ snapshot-ს ამოწმებს; CMS-ზე ყოველი პასუხის შემოწმება ან ადმინის ჩეკლისტი (F8) დასჭირდება. ბმულის შემოწმება ყველა slug-ს ადარებს — საჯარო სტატია მონახაზზე რომ არ მიუთითებდეს, F8-ში გამოქვეყნებულ slug-ებთან შედარებაა საჭირო.
9. **`READING_WPM` = 150** დაშვებაა (ქართულის გაზომილი მაჩვენებელი არ გვაქვს). mock-ში კითხვის დრო 4–8 წთ-ია.
10. **ძიების ზღვარი.** ფუძის ცვლილებას (სინკოპა: „წყალი“ → „წყლის“) მსუბუქი stemming ვერ ფარავს; CMS-ზე სერვერის სრული ტექსტური ძიება.
11. **ContentKit დაფა.** მოძრაობის ცხრილში შენახვის შევსება ჯერ კიდევ „ოქროსფერია“, §7-ში — `--mc-ink`. დაფა გასასწორებელია.
12. F1-ის ღია საკითხები 1–8 ძალაში რჩება.

### შემდეგი: F3 — UI ნაკრები

პრიმიტივები, ბარათები, ველები, Icon, Logo, `/__kit`. Gate: axe 0 სამივე თემაში. F2-იდან: ბარათები `ArticleSummary` / `VideoSummary` / `SeriesSummary` / `NewsSummary`-ს იღებს, `src: null` → ჩანაცვლების ჩარჩო, თარიღი `formatDateParts`-ით, შენახვა `useSaved`-ით, ტექსტი `t()`-ით. F3-მდე საჭიროა ლოგოს ფაილური ნაკრები (§9.1).

## F3 — UI ნაკრები ✅ (2026-10-26)

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (14 ფაილი, 302 ტესტი: F2-ის 240 + F3-ის 62 — 42 კომპონენტის, 20 ახალი კონტრასტის წყვილი) · `npm run build` ✓ + check-dist ✓ (`/__kit` build-ში არ ხვდება; მთავარი bundle უცვლელია — 313.39 kB / 99.04 kB gzip, გვერდები ნაკრებს ჯერ არ იყენებს) · **axe-core 4.14.0 Chromium-ში, `/__kit`: 0 დარღვევა, 0 incomplete** — ძირეული თემა light / dark / contrast × სიგანე 1440 და 390 (თითო გვერდზე სამივე თემის სვეტი, color-contrast ჩათვლით), ჰორიზონტალური სქროლი არ არის · **reduced-motion** (computed style): CTA და ბარათი `translate: none`, ყველა transition `0s`, შენახვის ანიმაცია `none`, „+“ მყისიერად 45°; ჩვეულებრივ რეჟიმში 120 / 150 / 180 / 200ms და −2 / +4 / −4px ძვრა.

რეპოს გასწორება: წაიშალა `src/components/ui/.gitkeep`, `src/assets/logo/.gitkeep`; `routes.test.jsx`-ში `/__kit`-ის ტესტს 30s timeout (jsdom-ის axe დიდ გვერდზე > 5s).

### შექმნილი ფაილები

- `src/components/ui/`: `index.js`, `Button.jsx` (+ IconButton), `Chip.jsx` (+ ChipGroup), `Card.jsx`, `Media.jsx`, `Accordion.jsx`, `SaveToggle.jsx`, `A11yBadge.jsx`, `GrowthStat.jsx`, `SectionHeading.jsx`, `Quote.jsx`, `Icon.jsx`, `icon-sprite.js`, `Logo.jsx`, `logo-geometry.js`, `VisuallyHidden.jsx`, `LiveRegion.jsx`, `UiLink.jsx`, `utils.js`;
  `cards/{Article,Series,Video,News,Event,Team,Partner}Card.jsx`; `fields/{TextField,TextArea,Select,Checkbox,RadioGroup,Field}.jsx`, `fields/field-utils.js`;
  `__tests__/{axe,keyboard,components}.test.jsx`, `__tests__/fixtures.jsx`.
- `src/assets/icons/icons.svg`; `src/assets/logo/{mark-3d,mark-3d-inverse,mark-flat,mark-flat-inverse,mark-tiny,mark-tiny-inverse,mark-mono,wordmark-horizontal,wordmark-vertical}.svg`; `public/favicon.svg`.
- `src/styles/components.css`.
- შეიცვალა: `tokens.css` (+6 ტოკენი), `tokens.test.js`, `src/test/contrast.js` (+8 წყვილი), `focus.css` (ბარათის რგოლი, `data-force`), `index.css` (components.css), `pages/KitPage.jsx`, `i18n/ka.js` + `en.js` (`saved.toggle`, `saved.toggleOn`, `media.*`, `fields.*`), `routes.test.jsx`, `index.html` (favicon), `eslint.config.js` (`__tests__` — node globals, react-refresh off), `package.json` (`@testing-library/user-event` 14.6.7, exact), `CLAUDE.md` (რუკა, F3 კონვენციები, ლოგოს წყარო), `docs/project-context.md` (§2, §4, §8, §9, §10).

### საჯარო API

**ტოკენები (ახალი):** `--mc-hover`, `--mc-pressed`, `--mc-pressed-ink`, `--mc-card-border`, `--mc-band-bg`, `--mc-band-ink` (მნიშვნელობები და კონტრასტი — project-context §2). ლოგოს ცვლადები: `--mc-logo-name`, `--mc-logo-descriptor`, `--mc-logo-knockout`. ხატულის: `--mc-icon-accent`.

**კომპონენტები** (`@/components/ui/index.js`; ყოველ ფაილში JSDoc; დამატებითი props → ძირეულ ელემენტზე):

| კომპონენტი | props |
|---|---|
| `Button` | `variant: 'cta' \| 'primary' \| 'secondary' \| 'link'` = secondary, `size: 'sm' \| 'md' \| 'lg'` (44 / 48 / 56; cta → lg), `to`, `href`, `newTab`, `type`, `disabled`, `loading`, `loadingLabel`, `icon`, `iconEnd`, `fullWidth`, `onClick` |
| `IconButton` | `icon`, **`label`** (სავალდებულო), `variant: 'secondary' \| 'primary' \| 'ghost'`, `size: 'sm' \| 'md'`, `pressed`, `disabled`, `to`, `href`, `newTab` |
| `Chip` | `pressed`, `onClick`, `disabled`, `lang` |
| `ChipGroup` | `label`, `labelHidden`, `options: { id: string \| null, label, lang?, disabled? }[]`, `value`, `onChange`, `multiple` |
| `Card` | `title`, `headingLevel` = h3, `to` / `href` / `newTab` / `onSelect`, `titleLang`, `eyebrow`, `media`, `overlay`, `meta`, `actions`, `aside`, `children`, `as` = article |
| `ArticleCard` | `article: ArticleSummary`, `headingLevel`, `saveable` = true |
| `SeriesCard` | `series: SeriesSummary`, `headingLevel` → `/development?series=:slug` |
| `VideoCard` | `video: VideoSummary`, `headingLevel`, `to` (ნაგულისხმევი `/videos?video=:slug`), `onSelect` |
| `NewsCard` | `item: NewsSummary`, `headingLevel`, `to` (ბმული მხოლოდ მითითებისას) |
| `EventCard` / `TeamCard` / `PartnerCard` | `event: Event` / `member: TeamMember` / `partner: Partner`, `headingLevel` |
| `Media` | `image: Image \| null`, `ratio`, `kind: 'photo' \| 'poster' \| 'logo' \| 'portrait'`, `fit: 'cover' \| 'contain'`, `decorative`, `round`, `loading` |
| `TextField` / `TextArea` | `label`, `hint`, `error: string \| { message }`, `optional`, `id`, `type` / `rows`, + input props (`required`, `value`, …) |
| `Select` | `label`, `options: { id, label }[]`, `placeholder`, `hint`, `error`, `optional`, + select props |
| `Checkbox` | `label`, `hint`, `error`, + input props |
| `RadioGroup` | `legend`, `name`, `options: { id, label, lang? }[]`, `value` / `defaultValue`, `onChange`, `hint`, `error`, `optional`, `required`, `layout: 'pills' \| 'list'` |
| `Accordion` | `items: { id, title, content }[]`, `headingLevel` = h3, `multiple` = true, `defaultOpen: string[]` |
| `SaveToggle` | `slug`, `title`, `variant: 'icon' \| 'label'`, `onChange(saved)` |
| `A11yBadge` | `kind: 'wheelchair' \| 'signInterpreter' \| 'captions' \| 'format'`, `value: AccessLevel \| EventFormat` |
| `GrowthStat` | `value`, `label` |
| `SectionHeading` | `title`, `as` = h2, `size`, `id`, `eyebrow`, `lead`, `action`, `band` |
| `Quote` | `children`, `cite`, `lang` |
| `Icon` | `name`, `size` = '1.5rem', `accent`, `label` (→ role="img") |
| `Logo` | `layout: 'horizontal' \| 'vertical' \| 'mark'`, `tone: 'color' \| 'mono' \| 'inverse'`, `size` (სიმაღლე px; 56 / 160 / 48), `label`, `decorative`, `knockout` |
| `VisuallyHidden` | `as`, `focusable` |
| `LiveRegion` | `children`, `visible`, `alert`, `as` |
| `UiLink` | `to` / `href`, `newTab` |

**კონსტანტები:** `BRAND_ICONS` (18), `ICONS`, `LOGO_3D_MIN` 48, `LOGO_FLAT_MIN` 24, `LOGO_MIN_WIDTH { mark 24, horizontal 160, vertical 120 }`, `LOGO_CLEAR_SPACE` 0.23, `logoMetrics(layout, size) → { width, height, markPx }`, `logoDetail(markPx) → '3d' | 'flat' | 'tiny'`.

**ხატულები** (`icons.svg`): IconSet — engagement, growth, change, education, employment, art, sport, civic, volunteer, partnership, event, location, contact, accessibility, voice, font-size, contrast, layout; UI — check, alert, triangle-up, sign-language, bookmark, play (დაფებიდან), plus, chevron-down, close, captions, online, external (ზოგადი).

**ლოგოს ზომები:** ჰორიზონტალური viewBox 712.38 × 129.69 (size 56 → 307.6 × 56, ნიშანი 65.3px → 3D; 3D იწყება 41.2px სიმაღლიდან; მინ. 160px სიგანე = 29.1px); ვერტიკალური 391.65 × 336.65. ფაილები gzip-ით: 3D ნიშანი 3.2 kB, ბრტყელი 1.8, tiny 0.7, mono 0.7, სიტყვიერი ნიშანი 7.2 kB თითო; მთელი ნაკრები 12.2 kB.

**კომპონენტი → UIKit-ის მდგომარეობები → განსხვავება დაფისგან:**

| კომპონენტი | მდგომარეობები | განსხვავება |
|---|---|---|
| Button cta | ნაგულისხმ., hover, ფოკუსი, დაჭერილი, გათიშული, loading | დაფას ემთხვევა (4px / 6px ჩრდილი, −2 / +4px); ჩრდილი `--mc-shadow`-ითაა, გათიშულის ფონი `--mc-alt`. |
| Button primary | იგივე | დაფაზე არ არის: ink ფონი, hover → muted, დაჭერა → link (ოქროსფერი მხოლოდ CTA-ა). |
| Button secondary | იგივე | hover #DCE6F1 / #16305A → `--mc-hover`, დაჭერა #1E3A66 → `--mc-pressed` (§2-ის ფერები). |
| Button link | იგივე | დაფას ემთხვევა; 44px სამიზნე. |
| IconButton | ნაგულისხმ., hover, ფოკუსი, aria-pressed, გათიშული | დაფის ✕ ღილაკი (44px წრე), ხატულა SVG-ით და არა ტექსტით. |
| Chip | იგივე + არჩეული | მინ. 48px, ✓ არჩეულზე — დაფას ემთხვევა; hover-ს ფონი `--mc-hover`. |
| Card | ნაგულისხმ., hover, focus-within | რადიუსი 24 (ContentKit 18); hover-ჩრდილი rgba-ს ნაცვლად მყარი `0 4px 0 --mc-card-border`. |
| ველები | ნაგულისხმ., hover, ფოკუსი, შეცდომა, გათიშული | სიმაღლე 56 (Components; UIKit 52), შეცდომის ხატულა Components-იდან; მუქში ველის ფონი surface (UIKit #0B1C33). |
| Checkbox / Radio | მონიშნული, შეცდომა, გათიშული | 24px, რადიო — აბრები (Components); forced-colors-ში ნატიური ველი. |
| Accordion | დახურული, გახსნილი, hover, ფოკუსი | „+“ SVG-ია და არა ტექსტი; ↑ ↓ Home End. |
| SaveToggle | ნაგულისხმ., hover, ფოკუსი, დაჭერილი, შენახული | შევსება `--mc-ink` (ContentKit-ზე ოქროსფერია); წრე 44px (ბარათზე 36px იყო). |
| A11yBadge / GrowthStat | yes / on-request / no | ტინტის ფონი (#E3F6EE) → surface + 2px ჩარჩო (§2); მწვანე მხოლოდ ზრდაზე. |
| SectionHeading band | ღია / მუქი / კონტრასტი | `--mc-band-bg` / `--mc-band-ink` ტოკენებით; მუქში 6px კიდე — §2-ის წესი. |
| VideoCard | ნაგულისხმ., hover, ფოკუსი | CC / ჟესტ. / დრო — ფიქსირებული §2-ის წყვილები (rgba(0,0,0,.75)-ის ნაცვლად #0A1D38). |
| Logo | 3D / ბრტყელი / favicon × ფერადი / ინვერსიული / მონო | LogoSynergy; ვერტიკალური ლოკაპი და ბრტყელი ინვერსია აწყობილია (იხ. გადახვევები). |

### დიზაინიდან და prompt-იდან გადახვევები

- **ლოგოს წყარო LogoSynergy დაფაა** (მომხმარებლის გადაწყვეტილება; prompt-ის „ფაილები რეპოში თუ არ არის — გაჩერდი“ ამით შეიცვალა). დაფის SVG-ები უცვლელადაა გადმოტანილი (ზომის ატრიბუტების გარეშე).
- **აწყობილი ვერსიები:** `mark-flat-inverse` / `mark-tiny-inverse` — ბრტყელი ფორმა + დაფის ინვერსიული პალიტრა (30 წყვილი 3D ფერადი ↔ 3D ინვერსიული შედარებით, მხოლოდ ნაჭრებზე; შემოწმება: იგივე წესი 3D ფერადს დაფის 3D ინვერსიულად ზუსტად აქცევს). `wordmark-vertical` — დაფის გლიფები LogoSystem-ის ვერტიკალური განლაგებით („მეტი / ჩართულობა“, დესკრიპტორი ორ სტრიქონად). მონოქრომის თეთრი 3px კონტური → `--mc-logo-knockout` (ნაგულისხმევი `--mc-bg`).
- **ლოკაპის viewBox** მელნის საზღვრამდეა შეკუმშული (დაფაზე 773 × 220 ცარიელი კიდეებით) — `size` ლოგოს ხილული სიმაღლეა.
- **სუფთა სივრცე** = ჰაბის რადიუსი (ნიშნის 23%) LogoSynergy-დან; §4-ის „თავის დიამეტრი“ შეიცვალა.
- **ახალი ტოკენები** (§2-ის HEX-ით) UIKit-ის §2-ის გარეთა hover / pressed / ტინტების ნაცვლად; კონტრასტის თემაში hover-ს ხაზგასმა აჩვენებს (ფონი შავი რჩება).
- **Button `primary`** — დაფაზე არ არის; ink-ის შევსება (ContentKit-ის „შემდეგი“ ღილაკის სტილი).
- **SaveToggle:** ხატულიანს მუდმივი სახელი „შენახვა: {სათაური}“ + `aria-pressed` (APG); ლეიბლიანს ხილული „შენახვა / შენახულია“ + დამალული სათაური — label-in-name.
- **Card-ის DOM რიგი:** სათაური → წარწერა → ტექსტი → მეტა → მედია; ვიზუალურად მედია და წარწერა ზემოთაა (CSS `order`).
- **ChipGroup:** ყოველი ჩიპი Tab-გაჩერებაა (roving tabindex არ არის); ერთარჩევნიანში არჩეულზე ხელახლა დაჭერა არაფერს ცვლის.
- **RadioGroup** — `role="radiogroup"` + `aria-labelledby` (fieldset-ზე radiogroup jsx-a11y-ს ეწინააღმდეგება).
- **VideoCard-ის დაკვრის ნიშანი ოქროსფერია** (დაფების მიხედვით; დეკორატიული, hover / ფოკუსზე ჩნდება) — დაკვრა CTA-დ ითვლება.
- **Accordion:** `region` მხოლოდ ≤ 6 პანელზე (APG).
- **A11yBadge** მწვანეს არ იყენებს: დონე ჩარჩოს ტიპით და ტექსტით განსხვავდება.
- **ხატულები:** 18 ხატულის აქცენტი ნაგულისხმევად `currentColor`-ია (#F26A1F ღია ფონზე 2.82–3.06:1); `accent` prop — დეკორატიული გამოყენებისთვის. 6 ზოგადი UI-გლიფი (plus, chevron-down, close, captions, online, external) დაფებზე არ იყო.
- **`/__kit`-ის წარწერები** dev-ის ტექსტია და i18n-ში არ არის.

### ღია საკითხები

1. **ვერტიკალური ლოკაპი** — დასადასტურებელი (LogoSynergy-ზე არ არის). ბეჭდვის ნაკრები (PNG, PDF მმ-ში, ავატარი, apple-touch-icon, ICO) — ჯერ არ არის.
2. **ჰედერის ლოგოს ტონი (F4):** ღიაში `color`, მუქში `inverse`, კონტრასტში `mono` — F4-ის თემის hook-მა უნდა აირჩიოს (ან CSS-ით ორი ვერსია).
3. **ლოგოს bundle:** `Logo` ყველა ვარიანტს სტატიკურად შემოიტანს (≈ 12 kB gzip SVG + JSX). F4-ში ჰედერისთვის გაზომვა; საჭიროებისას ვარიანტების lazy.
4. **თარიღის ICU:** ქართული ლოკალის გარეშე `formatDate` ინგლისურს აბრუნებს (Playwright Chromium — „October 24, 2026“, „10:00 AM“). `format.js`-ს თვეების fallback სჭირდება (F2-ის კოდი).
5. **NewsCard-ის ბმული** — F2-ის ღია საკითხი 2-ის მიხედვით (როუტი / აკორდეონი / გარე ბმული). **VideoCard-ის ბმული** `/videos?video=:slug` — F7 დააზუსტებს (ან `onSelect`).
6. **დაფები გასასწორებელია:** UIKit-ის hover / pressed / ტინტები → ახალი ტოკენები; ContentKit — შენახვის შევსება `--mc-ink`, ბარათის რადიუსი 24, play / CC ნიშნები §2-ის წყვილებით.
7. **SeriesCard:** ტიპოგრაფიული ყდა თემას და სლაიდების რაოდენობას აჩვენებს; ტექსტური სათაური ყდაზე F7-ის სლაიდების დიზაინთან ერთად.
8. F1-ის ღია საკითხები 1, 2 და 8 დახურულია (ჩრდილები, ზოლის ტექსტი, favicon); 3–7 და F2-ის 2–11 ძალაშია (F1-ის 4 — ბადის gutter, დაფაზე 24px — F5-ში).

### შემდეგი: F4 — გარსი

SiteHeader (ზედა ზოლი, თავსებადობის მენიუ, ნავიგაცია `aria-current`, რეჟიმის გადამრთველი, CTA „ჩაერთე“, ჰამბურგერი < 1200px), SiteFooter, PageShell (skip-link — `VisuallyHidden focusable`), OS-ის თემის ცვლილება (F1-ის საკითხი 6). Gate: სრულად იმართება კლავიატურით. F3-იდან: `Logo` (ტონი თემით), `Button variant="cta"`, `IconButton`, `ChipGroup`/`RadioGroup` მენიუსთვის, `LiveRegion` („პარამეტრები ნაგულისხმევზე დაბრუნდა“).

## F4 — გარსი ✅ (2026-10-26)

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (16 ფაილი, 361 ტესტი: F3-ის 302 + F4-ის 59; სუიტა ზედიზედ ოთხჯერ — 361/361) · `npm run build` ✓ + check-dist ✓ (14 JS chunk) · **Chromium 141.0.7390.37 + axe-core 4.14.0** (ფერის კონტრასტით):
- გარსი 1440 / 390 × light / dark / contrast — **0 დარღვევა, 0 incomplete**, ჰორიზონტალური სქროლი არ არის;
- გახსნილი თავსებადობის მენიუ — 0 დარღვევა; 12 incomplete = ფენა გვერდს ფარავს და axe ფონს ვერ ადგენს → პანელის ტექსტი computed style-ით გაიზომა: მინიმუმი ღიაში 6.85:1 (გათიშული პუნქტი), მუქში 9.07:1, კონტრასტში 21:1;
- გახსნილი ჰამბურგერი (390) — WCAG-ის წესებით 0; best-practice `landmark-one-main` / `page-has-heading-one` ვარდება, რადგან `main` განზრახ `inert`-ია;
- `/__kit` (უკვე გარსით) — 0 დარღვევა, 0 incomplete, 6 კომბინაცია;
- ჩატევა: შრიფტი 100 / 125 / 150 / 175 / 200 × განლაგება ჩართ./გამორთ. × სიგანე 390 / 768 / 1199 / 1200 / 1300 / 1439 / 1440 / 1600 / 1920 / 2400 — 100 კომბინაცია, 0 გადაფენა / გადაკვეთა / სქროლი, ნავიგაცია ერთ ხაზზე;
- **მხოლოდ კლავიატურით:** Tab-ის თანმიმდევრობა (იხ. ქვემოთ), ყოველ ინტერაქტიულ ელემენტზე რგოლი ჩანს; skip-link → `#main`; ჰამბურგერის ციკლი, Shift+Tab, Esc → ღილაკი; პანელის ბმული → ახალი გვერდის h1 + სათაური; მენიუ: + / რადიო ←→ / Esc → ღილაკი;
- **გადატვირთვა:** შრიფტი 125% + მუქი → reload → `data-size="125"`, `data-theme="dark"` (mc-boot), საცავი `{"size":125,"theme":"dark","spacing":false,"voice":false}`;
- container query-ის rem `<html>`-ს მიჰყვება: ფუტერი 1440-ზე — 100% 12 სვეტი, 125–150% 2, 200% 1;
- reduced-motion (computed style): ისარი, ბურთულა, თემის გადასვლა 0s; no-preference — 200ms.

### Tab-ის თანმიმდევრობა

**1440 (wide):** 1 გადასვლა შინაარსზე → 2 თავსებადობის მენიუ → 3 English → 4 ლოგო („მეტი ჩართულობა — მთავარი“) → 5 მთავარი → 6 ჩვენ შესახებ → 7 სტატიები → 8 განვითარება → 9 ვიდეოები → 10 სიახლეები → 11 კონტაქტი → 12 მუქი რეჟიმი → 13 ჩაერთე → გვერდის შიგთავსი.

**390 (compact):** 1 გადასვლა შინაარსზე (ჩანს ფოკუსისას) → 2 თავსებადობის მენიუ → 3 English → 4 ლოგო → 5 მუქი რეჟიმი → 6 მენიუ. გახსნილი მენიუ: 7 მთავარი … 13 კონტაქტი → 14 ჩაერთე → მენიუ (ციკლი).

**გახსნილი თავსებადობის მენიუ (ორივე ზომა):** ღილაკი → დახურვა → ხმოვანი რეჟიმი → შრიფტის შემცირება → შრიფტის გაზრდა → კონტრასტი (რადიო, ←→) → განლაგება → გასუფთავება → English (პანელი იხურება).

### მატრიცა

| | light | dark | contrast |
|---|---|---|---|
| 1440 | ✓ wide, axe 0, მენიუ ✓ | ✓ wide, axe 0, მენიუ ✓, ლოგო inverse | ✓ wide, axe 0, მენიუ ✓, ლოგო mono |
| 390 | ✓ compact, axe 0, ჰამბურგერი ✓, მენიუ ✓ | ✓ compact, axe 0, ჰამბურგერი ✓ | ✓ compact, axe 0, ჰამბურგერი ✓ |

### შექმნილი ფაილები

- `src/features/a11y/`: `PreferencesProvider.jsx`, `usePreferences.js`, `speech.js`, `A11yMenu.jsx`, `__tests__/a11y-menu.test.jsx`.
- `src/components/layout/`: `PageShell.jsx`, `SiteHeader.jsx`, `SiteFooter.jsx`, `site-nav.js`, `useShellLayout.js`, `usePageTitle.js`, `__tests__/shell.test.jsx`.
- `src/components/ui/Switch.jsx`, `src/hooks/useMediaQuery.js`, `src/pages/RootError.jsx`, `src/styles/layout.css`, `src/test/media.js`.
- შეიცვალა: `routes.jsx` (`createRoutes()`, უგზო ErrorBoundary, `handle.title`), `routes.test.jsx`, `RootLayout.jsx`, `RouteError.jsx` (გარსის შიგნით), `NotFoundPage.jsx`, 8 placeholder-გვერდი (`<title>` ამოღებულია, h1 `t()`-ით), `KitPage.jsx` (Switch, ახალი გლიფები, `<header>` → `<div>`), `prefs.js`, `Logo.jsx` (lazy სიტყვიერი ნიშანი), `index.js` (Switch), `icons.svg` (+5), `tokens.css` / `theme.css` (`--mc-header`), `components.css` (Switch, IconButton `aria-pressed` / `aria-disabled`), `focus.css`, `motion.css`, `index.css`, `ka.js` / `en.js`, `model.js` + `mock/org.js` (`links.accessibilityStatement`), ტესტები: `tokens.test.js`, `contrast.js`, `setup.js`, `theme-boot.test.js`, `axe.test.jsx`, `components.test.jsx`; `CLAUDE.md` (რუკა + F4 კონვენციები), `docs/project-context.md`.

### საჯარო API

**თავსებადობის პარამეტრები** (`@/features/a11y/`):
- `<PreferencesProvider>` — RootLayout-შია; `localStorage['mc-a11y']` → state → `<html data-theme | data-size | data-spacing>` + `<meta name="color-scheme">`; OS-ის თემა (`theme: null`-ზე, სესიის შუაშიც), `storage` event, თემის გადართვისას `data-theme-switching` 260ms.
- `usePreferences() → { prefs: { theme | null, size, spacing, voice }, theme, systemTheme, fontScale, setTheme(theme | null), setSize(size), stepSize(1 | -1) → size, setSpacing(bool), setVoice(bool), reset() }`.
- `prefs.js` (+): `stepFontSize(size, dir)`, `serializePrefs(prefs)` → `{ size, theme?, spacing, voice }`, `readStoredPrefs()`, `writeStoredPrefs(prefs)` (ნაგულისხმევზე გასაღები იშლება), `applyRootAttributes(root, prefs, prefersDark)`.
- `speech.js`: `useSpeech() → { status: 'unsupported' | 'pending' | 'ready' | 'no-voice', phase: 'idle' | 'speaking' | 'done' | 'stopped', voiceName }`, `readElement(el) → boolean`, `speakBlocks(blocks)`, `cancelSpeech()`, `readableBlocks(root)`, `chunkText(text)` (≤ 220), `findGeorgianVoice(voices)`, `VOICE_TIMEOUT_MS` 2000, `SPEECH_LANG` 'ka-GE', `resetSpeechForTests()`.
- `<A11yMenu className>` — SiteHeader-ში; გვერდი არ იყენებს.

**გარსი** (`@/components/layout/`):
- `<RootLayout>` = PreferencesProvider + PageShell + ScrollRestoration (root route Component).
- `<PageShell>` — `<SiteHeader>` + `<main id="main" tabIndex={-1} inert={navOpen}>` + `<SiteFooter>`; სათაური, ფოკუსი (`data-route-focus` h1-ზე), ხმოვანი რეჟიმის წაკითხვა გადასვლისას.
- `<SiteHeader onNavOpenChange={(open) => …}>` — `data-layout="wide | desktop | compact"`.
- `<SiteFooter inert>`.
- `useShellLayout(ref) → 'wide' | 'desktop' | 'compact'`; `shellLayoutFor(availablePx, remPx, spacing)`, `DESKTOP_REM` 65, `WIDE_REM` 78, `SPACING_FACTOR` 1.2.
- `usePageTitle(title)`, `formatDocumentTitle(title)`, `PageTitleContext`.
- `site-nav.js`: `NAV_ITEMS` (7 × `{ to, label, end? }`), `JOIN_HREF` '/contact', `EN_HREF` '[en-ვერსიის მისამართი]', `FOOTER_MATERIALS`, `FOOTER_ORGANIZATION`, `FOOTER_ACCESSIBILITY` (`{ label, to? | setting? }`).

**როუტები** (`@/routes.jsx`): `createRoutes()`, `routes`, `pageRoutes`; `handle: { title: 'nav.about' }` (i18n-ის გასაღები; `null` — მხოლოდ საიტის სახელი). `/` → RootLayout (ErrorBoundary: RootError) → უგზო როუტი (ErrorBoundary: RouteError) → გვერდები, `*` → NotFoundPage.

**UI ნაკრები (+):** `<Switch checked onChange label description icon disabled disabledReason id>` — `role="switch"`, `aria-checked`; გათიშული — `aria-disabled` + ხილული მიზეზი (`aria-describedby`). `IconButton` იღებს `aria-disabled`-ს (ფოკუსი რჩება), `aria-pressed="true"` = ink-ის შევსება. `Logo`: ლოკაპის სიტყვიერი ნიშანი — `React.lazy` (ცალკე chunk, 7.4 kB gzip თითო).

**hook-ი:** `useMediaQuery(query) → boolean` (`change` event-ით).

**ტოკენი:** `--mc-header` (#FFFFFF / #0B1C33 / #000000), Tailwind `bg-header`. **ხატულები (+):** `menu`, `moon`, `minus`, `reset`, `arrow-up-right`.

**CSS (layout.css):** `.mc-topbar`, `.mc-skip(--hidden)`, `.mc-a11y`, `.mc-a11y__toggle`, `.mc-a11y-panel`, `.mc-a11y-row`, `.mc-mainbar`, `.mc-brand`, `.mc-nav`, `.mc-nav__link`, `.mc-mobile-nav`, `.mc-footer*`; container-ები `mc-topbar`, `mc-footer`.

**i18n (+):** `nav.skipLink` („გადასვლა შინაარსზე“), `nav.english`, `a11y.menu` („თავსებადობის მენიუ“), `a11y.menuClose`, `a11y.voiceHint`, `a11y.voiceChecking`, `a11y.themes.{light,dark,contrast}` (სტანდარტული / მუქი / მაღალი), `a11y.status.*`, `common.on/off`, `footer.{descriptor,contactPage,reportBarrier,team,linkPending,year}`, `shell.*` (404 / შეცდომა); ამოღებულია `a11y.themeLight/Dark/Contrast`, `footer.accessibilityStatement` → „ხელმისაწვდომობის განცხადება“.

**მოდელი:** `SiteSettings.links.accessibilityStatement: string | null` (mock — null).

**ბანდლი:** მთავარი chunk 118.86 kB gzip (F3: 99.04 — პირველად შედის UI ნაკრები, ლოგოს ნიშნები, adapter, გარსი), CSS 11.15 kB gzip; `wordmark-horizontal` / `-vertical` — ცალკე chunk-ები (7.39 / 7.41 kB).

### დიზაინიდან და prompt-იდან გადახვევები

- **ოქროსფერი გარსში მხოლოდ CTA-ზე:** თავსებადობის ღილაკის ჩარჩო და გახსნილი მდგომარეობა (დაფაზე #FFB81C) → ink-ის ჩარჩო / შევსება (#EAF0F7 #0A1D38-ზე 14.69:1); პანელის ჩრდილი (#FFB81C) → `--mc-card-border`.
- **ნავიგაცია 16px** (დაფაზე 17): 17px-ზე შვიდი პუნქტი 827px-ია, სრული ზოლი 1329px > 1280.
- **ჰედერის ზღვარი ზოლის რეალურ სიგანეზეა** და არა media query-ზე: 100%-ზე იგივე 1200 / 1440px, მაგრამ 125%+-ზე და გაშლილ ინტერვალებზე ჰამბურგერი ადრე ჩნდება (წინააღმდეგ შემთხვევაში ნავიგაცია ეკრანს სცდებოდა).
- **1200–1439px:** სახელი „მეტი ჩართულობა“ ვიზუალურად დამალულია (ნიშანი რჩება, სახელი — ეკრანის მკითხველისთვის).
- **ლოგო ჰედერში** — ნიშანი + ცოცხალი ტექსტი (SiteHeader / HomeMobile დაფები), არა SVG ლოკაპი; ტონი თემით (color / inverse / mono).
- **გვერდზე გადასვლა — ზემოთ მყისიერად** (prompt: reduced-motion-ში მყისიერად, სხვაგან გლუვად): ScrollRestoration „უკან“ პოზიციას აღადგენს და F2-ის `preventScrollReset`-ს პატივს სცემს; გლუვი სქროლი ახალ გვერდზე მდგომარეობის ცვლილებას არ ხსნის.
- **„მუქი რეჟიმი“** — ხატულა მუდმივად მთვარეა (დაფაზე მზეზე იცვლებოდა); მდგომარეობა — შევსება + `aria-pressed`.
- **პროგრამული ფოკუსი** (`#main`, h1) რგოლს არ აჩვენებს.
- **A11yPanel-ის მენიუ** ციკლური ღილაკების (100→125→…→100, სტანდარტ.→მუქი→მაღალი) ნაცვლად: −/+ ზღვრებით, რადიო-ჯგუფი სამი ვარიანტით, `role="switch"`; პანელის რადიუსი 20 → 24 (იერარქია), სიგანე 360 (`22.5rem`, ≤ ეკრანი − 2 × კიდე).
- **Switch-ის მდგომარეობის ტექსტი წარწერის ქვემოთაა** (დაფაზე მარჯვნივ, ჩიპად) — 360px-იან პანელში ერთ ხაზზე არ ეტეოდა.
- **IconButton `aria-pressed`** — `--mc-pressed`-ის ნაცვლად ink-ის შევსება (მუქ ჰედერზე #0B1C33 ფონს ერწყმოდა).
- **skip-link** desktop-ზე ყოველთვის ჩანს (SiteHeader დაფა), compact-ში — მხოლოდ ფოკუსისას (HomeMobile).
- **ხმოვანი რეჟიმი:** A11yPanel-ის პროტოტიპი ერთ ტექსტს კითხულობდა; აქ — `#main` ბლოკებად და ჩართულ რეჟიმში ყოველი ახალი გვერდი; Esc აჩერებს. ჩატვირთვისას არ ირთვება.
- **ფუტერი:** დაფის „განცხადება“ → „ხელმისაწვდომობის განცხადება“, „ბარიერის შეტყობინება“ → „შეგხვდა ბარიერი? შეგვატყობინე“ (HomeMobile; ბმულის ტექსტი კონტექსტის გარეშეც აღწერითია); ბმულების ფერი #DCE6F1 (ტოკენი არ არის) → `--mc-muted` (#B8C7D9, 9.80 / 11.48:1); გამყოფი #3A5A80 → `--mc-line`; სოციალური ქსელები — 44px აბრები ორივე ზომაზე.
- **განლაგების ფუტერი** container query-ითაა (48rem → 2 სვეტი, 75rem → 12 სვეტი, დაფის მიხედვით 4 + 2 × 4).
- **`/__kit`-ის `<header>` → `<div>`:** `main`-ში `header`-ს ზოგიერთი ხელსაწყო banner-ად ითვლის.
- **გვერდებიდან `<title>` ამოღებულია** — სათაური ერთ ადგილას (PageShell).

### ღია საკითხები

1. **CTA „ჩაერთე“-ს სამიზნე** — §5-ში გვერდი არ არის; დროებით `/contact` (`JOIN_HREF`). ჰეროს CTA (F5) იგივეს გამოიყენებს.
2. **English** — href `[en-ვერსიის მისამართი]` (`EN_HREF`); დაწკაპებისას 404-ზე მიდის.
3. **ხელმისაწვდომობის განცხადება** — გვერდი/URL არ არის (`links.accessibilityStatement` = null). კონფიდენციალურობის პოლიტიკა და საიტის რუკა (HomeMobile-ის ქვედა ზოლი) ფუტერში ჯერ არ არის — URL-ები null-ია.
4. **F5: About-ის `id="team"` და `id="partners"`** — ფუტერის ბმულები მათზე მიდის (ფოკუსი hash-ის სამიზნეზე გადადის).
5. **გვერდების breakpoint-ები (F5+)** `data-size`-ს არ მიჰყვება — სვეტებიანი სექციები container query-ით (როგორც ფუტერი) ან ზღვრის გამრავლებით.
6. **ხმოვანი რეჟიმი რეალური ქართული ხმით** შესამოწმებელია (Windows Narrator-ის ka-GE, macOS, Android); headless Chromium-ს ხმები არ აქვს, ტესტებში ყალბი API-ა. „მოუსმინე“ სტატიაზე (F6) იგივე `speech.js`-ს გამოიყენებს.
7. **ჰედერის ზღვრები (65 / 78rem)** Noto Sans Georgian-ზეა გაზომილი; შრიფტის ჩატვირთვამდე (fallback Sylfaen / system-ui, `font-display: swap`) ზოლი შეიძლება ერთ კადრში განსხვავდებოდეს. F1-ის ღია საკითხი 5 (preload) ამას ამცირებს.
8. **prerender / SSG (§9.4):** ჰედერის განლაგება JS-ზეა (`useShellLayout`) — სერვერზე `estimateAvailable` 1440-ით ითვლის; hydration-ზე compact-ზე გადასვლა შესაძლებელია.
9. **ბანდლი** 118.86 kB gzip: ლოგოს 3D ნიშნები (3.2 kB × 2) და icon sprite (2.5 kB) მთავარშია; F8-მდე გასაზომი, საჭიროებისას ნიშნების lazy.
10. **დაფები გასასწორებელია:** SiteHeader / A11yPanel — ოქროსფერი მენიუს ღილაკი და ჩრდილი; SiteFooter — #DCE6F1, #3A5A80; ნავიგაცია 17 → 16px.
11. F3-ის პირველ ცივ გაშვებაზე ერთხელ ჩავარდა 1/302 ტესტი (timeout, ვერ დავიჭირე); F4-ის შემდეგ ზედიზედ ოთხი გაშვება 361/361 — არ განმეორდა.
12. **დახურულია:** F1-ის 6 (OS-ის თემა სესიის შუაში), F3-ის 2 (ჰედერის ლოგოს ტონი), F3-ის 3 (ლოგოს bundle — სიტყვიერი ნიშანი lazy). ძალაშია: F1 3–5, 7; F2 2–11; F3 1, 4–7.

### შემდეგი: F5 — მთავარი + ჩვენ შესახებ

2 გვერდი: HomePage (ჰერო + CTA „ჩაერთე“ `JOIN_HREF`-ზე + სამი შესასვლელი + კვირის ვიდეო, სექციები), AboutPage (ფოტოები, მისია, ღირებულებები, „ჩვენი გზა“, გუნდი `id="team"`, პარტნიორები `id="partners"`). Gate: სათაურების ხე, axe 0. F4-იდან: გვერდი `<main>`-ს არ ხატავს; h1 — პირველივე რენდერზე; სათაური — `handle.title`; breakpoint-ები `data-size`-ზე — container query; ბადის gutter 24px (F1-ის ღია საკითხი 4).

## F5 — მთავარი + ჩვენ შესახებ ✅ (2026-10-26)

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (19 ფაილი, 399 ტესტი: F4-ის 361 + F5-ის 38) · `npm run build` ✓ + check-dist ✓ (16 JS chunk) · **Chromium 141 + axe-core 4.14.0** (ფერის კონტრასტით):
- `/` და `/about` × 1440 / 390 × light / dark / contrast — **0 დარღვევა, 0 incomplete** (12 კომბინაცია), ჰორიზონტალური სქროლი არ არის;
- `/__kit` (F5-ის ახალი სექციით: შეცდომა, ცარიელი, ჩონჩხი, ვარიანტები) × 1440 / 390 × 3 თემა — 0 / 0;
- **სათაურების ხე:** დონე არ გამოტოვებულა (Chromium-შიც და jsdom-შიც, `skippedLevels`);
- **ყველა ფაქტი ფრჩხილებშია:** `unbracketedFacts(main)` = `[]` ორივე გვერდზე — ყოველი ტექსტი i18n-ის (დაფის) სტრიქონია, `[placeholder]` ან გამოთვლილი მნიშვნელობა (`<time>`, ხანგრძლივობა, რაოდენობა); ფუნქციის თვითტესტი გამოგონილ „2019 წელს“ / „120 მონაწილე“-ს იჭერს;
- **ჩატევა:** შრიფტი 100–200% × განლაგება ჩართ./გამორთ. × 390 / 768 / 1200 / 1440 / 1920 × 2 გვერდი — 100 კომბინაცია, 0 სქროლი, 0 ეკრანს გასული ელემენტი;
- reduced-motion: ახალი ანიმაცია არ არის (ჩონჩხი სტატიკურია; შესასვლელის ფერი `--mc-dur-base` → 0).

### მატრიცა

| | light | dark | contrast |
|---|---|---|---|
| `/` 1440 | ✓ axe 0/0, 23 სათაური | ✓ axe 0/0 | ✓ axe 0/0, ორბიტა დამალულია |
| `/` 390 | ✓ axe 0/0, HomeMobile-ის რაოდენობები | ✓ axe 0/0 | ✓ axe 0/0 |
| `/about` 1440 | ✓ axe 0/0, 35 სათაური | ✓ axe 0/0 | ✓ axe 0/0 |
| `/about` 390 | ✓ axe 0/0, გუნდი row-ად, პარტნიორები 2 სვეტად | ✓ axe 0/0 | ✓ axe 0/0 |

### სათაურების ხე

**მთავარი:** h1 „ისწავლე. შთაგონდი. გაიზარდე.“ → h2 [კვირის ვიდეოს სათაური] → h2 „ვანგრევთ ბარიერებს. ვაძლიერებთ პოტენციალს.“ (h3 × 3 მიმართულება) → h2 სტატიები (h3 × 3) → h2 პიროვნული განვითარება (h3 × 4) → h2 ვიდეო-ისტორიები (h3 × 3) → h2 სიახლეები (h3 × 3).

**ჩვენ შესახებ:** h1 „ვანგრევთ ბარიერებს. ვაძლიერებთ პოტენციალს.“ → h2 მისია (h3 × 3) → h2 ღირებულებები (h3 × 6) → h2 ჩვენი გზა (`<ol>`, სათაურის გარეშე) → h2 გუნდი `#team` (h3 × 8) → h2 პარტნიორები `#partners` (h3 × 12).

ფუტერის h2-ები (F4) `<main>`-ის გარეთაა.

### სექცია → დაფა → კომპონენტები

| სექცია | დაფა | კომპონენტები | მონაცემი |
|---|---|---|---|
| მთავარი: ჰერო | HomePage, HomeMobile | `PageHero`, `Button cta` (`JOIN_HREF`), `Icon` (education / slides / video), `VideoCard feature`, `ContentState`, `Skeleton` | `listVideos()` → `splitVideos`; რაოდენობები: `listArticles.total`, `listSeries`, `listVideos` |
| მთავარი: ჩვენ შესახებ | HomePage, HomeMobile (ჩიპები) | `PageSection split`, `PillarList compact`, `Card icon`, `Button link` | i18n |
| მთავარი: სტატიები | HomePage, HomeMobile | `PageSection alt`, `ArticleCard` (+ `SaveToggle`), `ContentState`, `SkeletonGroup` | `listArticles({ limit: 3 })` |
| მთავარი: პიროვნული განვითარება | HomePage, HomeMobile | `PageSection`, `SeriesCard` (ყდა 30px), `ContentState` | `listSeries()` → 4 |
| მთავარი: ვიდეო-ისტორიები | HomePage, HomeMobile, LandingDark (მუქი ზოლი) | `PageSection dark`, `VideoCard`, `VideoCard layout="row"`, `mc-row-list` | `listVideos()` → კვირის ვიდეოს გარეშე 3 |
| მთავარი: სიახლეები | HomePage, HomeMobile | `PageSection alt`, `NewsCard variant="compact"` (`DateTile`) | `listNews({ limit: 3 })` |
| ჩვენ შესახებ: ჰერო | AboutPage | `PageHero asideTheme="dark"`, `Breadcrumbs`, `Media` × 2 (1:1) | `about-media.js` (i18n) |
| ჩვენ შესახებ: მისია | AboutPage | `PageSection split`, `PillarList` | i18n |
| ჩვენ შესახებ: ღირებულებები | AboutPage | `PageSection alt`, `Card` × 6 | i18n (`ORG_VALUES`) |
| ჩვენ შესახებ: ჩვენი გზა | AboutPage | `PageSection dark`, `<ol class="mc-grid mc-grid--4 mc-path">`, `ContentState` | `getStages()` |
| ჩვენ შესახებ: გუნდი | AboutPage (390 — HomeMobile-ის პატერნი) | `PageSection`, `TeamCard` × 8, `PendingLink` („ვაკანსიები“), `ContentState` | `getTeam()`, `getSettings()` |
| ჩვენ შესახებ: პარტნიორები | AboutPage | `PageSection alt`, `PartnerCard` × 12, `Button cta` („გახდი პარტნიორი“) | `getPartners()` |

### შექმნილი ფაილები

- `src/features/home/`: `HomeHero.jsx`, `HomeAbout.jsx`, `HomeArticles.jsx`, `HomeDevelopment.jsx`, `HomeVideos.jsx`, `HomeNews.jsx`, `useHomeContent.js`, `home.css`, `__tests__/home.test.jsx`.
- `src/features/about/`: `AboutHero.jsx`, `AboutMission.jsx`, `AboutValues.jsx`, `AboutPath.jsx`, `AboutTeam.jsx`, `AboutPartners.jsx`, `PillarList.jsx`, `pillars.css`, `about-media.js`, `about.css`, `__tests__/about.test.jsx`.
- `src/features/__tests__/`: `page-helpers.jsx`, `pages.test.jsx`.
- `src/components/layout/`: `PageSection.jsx`, `PageHero.jsx`.
- `src/components/ui/`: `ContentState.jsx`, `Skeleton.jsx` (+ `SkeletonGroup`), `Breadcrumbs.jsx`, `DateTile.jsx`, `PendingLink.jsx`.
- `src/styles/sections.css`.
- შეიცვალა: `pages/HomePage.jsx`, `pages/AboutPage.jsx`, `pages/KitPage.jsx` (F5-ის სექცია), `components/ui/Card.jsx` (`icon`, `layout`), `Media.jsx` (`compact`), `cards/VideoCard.jsx` (`eyebrow`, `feature`, `layout`, `showExcerpt`), `cards/NewsCard.jsx` (`variant`), `cards/EventCard.jsx` (`DateTile`), `ui/index.js`, `assets/icons/icons.svg` (+ `slides`, `video`), `styles/components.css` (F5-ის ბლოკი), `styles/index.css` (+ sections.css), `i18n/ka.js` + `en.js`, `content/mock/org.js` (გუნდის ფოტოების მიმართულება, პარტნიორის alt), `content/mock/videos.js` (პოსტერები), ტესტები: `routes.test.jsx`, `layout/__tests__/shell.test.jsx`, `a11y/__tests__/a11y-menu.test.jsx`, `ui/__tests__/axe.test.jsx`; `CLAUDE.md` (რუკა + F5 კონვენციები), `docs/project-context.md` (§2, §5, §7, §9, §10).

### საჯარო API

**გვერდის ბლოკები** (`@/components/layout/`):
- `<PageHero headingId children aside asideTheme="root | dark" className>` — `<section aria-labelledby>`, ფონი `--mc-hero`, ორბიტა (CSS mask), ტექსტის სვეტი `data-theme="dark"`; h1 გვერდისაა.
- `<PageSection headingId title eyebrow lead action intro split tone="default | alt | dark" className>{children}</PageSection>` — `<section aria-labelledby>` + `SectionHeading` (h2); `action` DOM-ში სათაურის შემდეგ; `split` → 5fr | 7fr (სათაური + `intro` + `action` | `children`).

**UI ნაკრები (+)** (`@/components/ui/index.js`):

| კომპონენტი | props |
|---|---|
| `ContentState` | `status`, `error: ContentError \| null`, `onRetry`, **`label`** (სექცია), `skeleton`, `empty`, `emptyText`, `focusId`, `className`, `children: () => ReactNode` |
| `Skeleton` | `variant: 'card' \| 'row' \| 'tile' \| 'person' \| 'logo' \| 'text'` = card, `ratio` = '3:2', `lines` = 3, `className` |
| `SkeletonGroup` | `count`, `className` (ბადის კლასი), + `Skeleton`-ის props |
| `Breadcrumbs` | `items: { to?, label }[]` (ბოლო = მიმდინარე, `aria-current="page"`), `label` (ნაგულისხმევი „ნავიგაციის ბილიკი“), `className` |
| `DateTile` | `date` (ISO), `format: 'long' \| 'weekday'` = long, `className` |
| `PendingLink` | `children` (წარწერა), `className` → „{წარწერა} [ბმული მზადდება]“ |
| `Card` (+) | `icon` (ხატულა მუქ წრეში), `layout: 'stack' \| 'row'` |
| `Media` (+) | `compact` (პატარა კადრი — წარწერის გარეშე, alt რჩება) |
| `VideoCard` (+) | `eyebrow`, `feature`, `layout: 'stack' \| 'row'`, `showExcerpt` = true |
| `NewsCard` (+) | `variant: 'default' \| 'compact'` |

**ფიჩერები:** `useHomeContent() → { articles, series, videos, news }` (თითო — `useContent`-ის მდგომარეობა), `HOME_LIMITS` `{ articles: 3, series: 4, videos: 3, news: 3 }`, `splitVideos(list) → { weekly, rest }`; `aboutHeroPhotos() → Image[]`; `TEAM_HEADING_ID` 'team', `PARTNERS_HEADING_ID` 'partners', `BECOME_PARTNER_HREF` '/contact?topic=partnership'; `<PillarList compact>`.

**CSS კლასები:** `sections.css` — `.mc-section`, `--alt`, `--dark`, `.mc-section__inner` (container), `__head`, `__head--split`, `__action`, `__split`, `__intro`, `__aside`, `.mc-grid` (`--mc-cols`, `--mc-min`, `--mc-gap`), `.mc-grid--4`, `--6`, `--tight`, `.mc-page-hero`, `__inner`, `__grid`, `__intro`, `__aside`, `.mc-orbit`, `.mc-pending-link`; `components.css` — `.mc-icon-well`, `.mc-card--row`, `.mc-row-list`, `.mc-video-thumb--feature`, `.mc-card--news-compact`, `.mc-skeleton*`, `.mc-state`, `--error`, `--empty`, `.mc-breadcrumbs*`, `.mc-media--compact`; გვერდებისა — `.mc-hero-title`, `.mc-entries`, `.mc-entry`, `.mc-home-videos`, `.mc-series-grid`, `.mc-home-limit-2 | -3`, `.mc-home-brief`, `.mc-pillars`, `--compact`, `.mc-about-photos`, `.mc-mission__*`, `.mc-path*`, `.mc-team`.

**ტოკენები:** ახალი არ არის — მხოლოდ არსებული `--mc-*` (§2 „გვერდები“ — კონტრასტის წყვილები).

**ხატულები (+):** `slides`, `video` (HomePage დაფის შესასვლელებიდან).

**i18n (+):** `states.loading` („იტვირთება: {label}“), `home.entryCount`, `home.weeklyEmpty`, `home.articlesEmpty`, `home.developmentEmpty`, `home.videosEmpty`, `home.newsEmpty`, `about.photoTraining`, `about.photoTeam`, `about.pathEmpty`, `about.teamEmpty`, `about.partnersEmpty`; `common.retry` „ხელახლა ცდა“ → „თავიდან ცდა“. ცარიელი მდგომარეობების ტექსტი დაფებზე არ იყო — დასადასტურებელია.

**ტესტის დამხმარე** (`@/features/__tests__/page-helpers.jsx`): `renderPage(path, adapter)`, `settle(main)`, `okAdapter()`, `failingAdapter()`, `emptyAdapter()`, `pendingAdapter()`, `switchableAdapter(initial) → { adapter, use }`, `headingTree(main)`, `skippedLevels(tree)`, `unbracketedFacts(main)`, `NOW`, `AXE`.

**ბანდლი:** მთავარი JS 407.55 kB / **120.37 kB gzip** (F4: 118.86), CSS 62.16 / 12.78 kB gzip (F4: 11.16; + sections.css და UI-ის F5 ბლოკი); HomePage 5.75 / 1.75 kB + CSS 0.67 kB, AboutPage 3.83 / 1.23 kB + CSS 0.52 kB, PillarList (საერთო) 1.97 / 0.75 kB + CSS 0.33 kB.

### დიზაინიდან და prompt-იდან გადახვევები

1. **ვიდეოს ბმული `/videos?video={slug}`** (prompt: `?v=`) — VideoCard-ის (F3) და `?series=`-ის თანმიმდევრულობა.
2. **„გახდი პარტნიორი“ → `/contact?topic=partnership`** (prompt: `partner`) — ტაქსონომიის id; F6-ის ფორმა თემას ამით ირჩევს.
3. **ვიდეო-ისტორიები კვირის ვიდეოს არ იმეორებს** (დაფაზე ერთი ვიდეო ჰეროშიც და სექციაშიც იყო).
4. **„ყველა …“ ბმული სათაურის შემდეგაა** მობილურზეც (HomeMobile — სიის ბოლოს): ფოკუსის რიგი = ვიზუალური.
5. **სერიები მობილურზე ბადეა** და არა ჰორიზონტალური ზოლი (WCAG 1.4.10, scrollable-region-focusable).
6. **ღირებულებები ნომრებისა და ფერადი წრეების გარეშე:** თანმიმდევრობა არ არის; წრეები #FFB81C-ს (მხოლოდ CTA) და #13A06F-ს (მხოლოდ ზრდა) იყენებდა.
7. **მიმართულებების ხატულის აქცენტი ერთია** (`--mc-graphic`; დაფაზე ნარინჯისფერი / ოქროსფერი / მწვანე).
8. **ტოკენს გარეთ ფერები:** #17406E → #2B4A70, #DCE6F1 → #B8C7D9, #12294A → #0B1C33; ჰეროს ბარათის rgba-ჩრდილი → ბარათის მყარი hover-ჩრდილი.
9. **მუქ თემაში ზოლის ფონი #030B16** (`--mc-hero`; დაფაზე #0F2440) — მუქი ბარათები ფონისგან გამოიყოფა.
10. **შესასვლელის სახელი „განვითარება“ მობილურზეც** (HomeMobile — „სლაიდები“), ნავიგაციის თანმიმდევრულად.
11. **კვირის ვიდეო მობილურის ჰეროშიც** (HomeMobile-ის ჰეროში არ იყო; prompt-ის შემადგენლობა).
12. **„თავიდან ცდა“** — `common.retry` შეიცვალა (prompt).
13. **390px-ის რაოდენობები** HomeMobile-ის მიხედვით: 2 სტატია, 3 სერია, 2 სიახლე, მოკლე აღწერის გარეშე — media query-ით (1440-ზე 200%-ზეც ყველა ჩანს).
14. **მიმართულების ბარათი:** სათაური 23 → 21px, კიდე 28 → 24px — 7fr-იან სვეტში „ჩართულობა“ / „სოციალური“ იჭრებოდა.
15. **სერიის ყდის სათაური მთავარზე 30px** (SeriesCard-ში h2-ის ზომა) — „მსოფლხედვა“ იჭრებოდა.
16. **დაკვრის წრე ჩანაცვლების ჩარჩოზე არ ჩანს** — ფოტოს მიმართულებას ფარავდა; ნამდვილ პოსტერზე ჩანს. მცირე კადრში (row) წარწერა არ არის — ხანგრძლივობის ნიშანს ეფარებოდა.
17. **ორბიტა CSS mask-ია** და არა inline SVG — SVG axe-ს ფონის დადგენაში უშლიდა ხელს (incomplete); კონტრასტის თემაში დამალულია.
18. **„ჩვენ შესახებ“ 390px** — მობილური დაფა არ არის: ერთი სვეტი, კიდე 20px, გუნდი — ფოტო მარცხნივ (72px), პარტნიორები — 2 სვეტი, ფოტოები — 2 სვეტი.
19. **ჩანაცვლების ჩარჩო იზრდება ტექსტით** (`overflow: visible`) — ფოტოს გრძელი მიმართულება ვიწრო ჩარჩოში არ იჭრება.
20. **ფოტოს მიმართულება mock-ში:** გუნდის 8 პორტრეტი და 6 ვიდეოს პოსტერი — „თვალის დონე, მოქმედების მომენტი — …“; მრავალფეროვნება მოქმედებით (ჟესტური ენა, ეკრანის მკითხველი, ბრაილის დისპლეი, მარტივი ენის მასალა).
21. **ხმოვანი რეჟიმის ტესტი** (F4) განახლდა: `/about` ახლა ბილიკს, h1-ს და ტექსტს კითხულობს.

### ღია საკითხები

1. **ცარიელი მდგომარეობების ტექსტი** დაფებზე არ იყო (6 + 3 სტრიქონი, `home.*Empty`, `about.*Empty`) — დასადასტურებელია.
2. **„ჩვენ შესახებ“-ის ჰეროს ფოტოები** მოდელში არ არის (`about-media.js`) — CMS-თან ერთად `SiteSettings`-ში / გვერდის მოდელში.
3. **თარიღი Chromium-ში ინგლისურია** („Oct“, „October 24, 2026“) — §9.7 (F2-ის `format.js`, ICU). სრული ICU-ის ბრაუზერში ქართულია; fallback ჯერ არ არის.
4. **„ჩაერთე“ და „გახდი პარტნიორი“** `/contact`-ზე მიდის; F6-ის ფორმამ `?topic=partnership` და `?topic=barrier` უნდა წაიკითხოს.
5. **ვიდეოს პარამეტრი `?video=`** — F7-ის ფლეიერმა უნდა წაიკითხოს (ან VideoCard-ს `onSelect`).
6. **სიახლის ბარათი ბმული არ არის** — `/news/:slug` ჯერ გადაუწყვეტელია (F2-ის ღია საკითხი 2, F6).
7. **მთავარი გვერდის სიგრძე 390-ზე** ≈ 7800px (დაფა 4980) — ბარათები UI ნაკრებისაა (ფოტო 3:2, ყდა 4:3), დაფის მობილური ბარათები უფრო კომპაქტურია. თუ დიზაინი მოითხოვს, F7-ის აუდიტში — კომპაქტური ბარათის ვარიანტი.
8. **დაფები გასასწორებელია** (project-context §9.6): ღირებულებების ნომრები და ფერები, ხატულების აქცენტები, #17406E / #DCE6F1 / #12294A, კვირის ვიდეოს გამეორება, HomeMobile-ის სლაიდების ზოლი.
9. **ჩატვირთვის ორი მოთხოვნა `getSettings()`-ზე** (ფუტერი + გუნდი) — mock-ზე უმნიშვნელოა; CMS-ზე adapter-ის დონის ქეში დასჭირდება.
10. F1-ის ღია საკითხი 3 (გრძელი სიტყვები) გვერდებზე დახურულია (`overflow-wrap: anywhere` + `minmax(0, 1fr)`); F1-ის 4 (gutter 24px) — `--mc-gap`. ძალაშია: F1 5, 7; F2 2–11; F3 1, 4–7; F4 1–3, 6–11.

### შემდეგი: F6 — სტატიები + სიახლეები + კონტაქტი

3 გვერდი + სტატიის შაბლონი. Gate: ფორმა გადის კლავიატურით და ეკრანის მკითხველით. F5-იდან: `PageHero` / `PageSection`, `ContentState` + `SkeletonGroup`, `Breadcrumbs` (სტატიის გვერდი), `DateTile`, `PendingLink`, `mc-grid`; ფორმამ `?topic=` უნდა წაიკითხოს (`partnership`, `barrier`); სიახლის სრული ტექსტის გადაწყვეტა (`/news/:slug`?); `format.js`-ის ქართული fallback (§9.7) — სტატიებისა და სიახლეების გვერდებზე თარიღი მთავარია.

## F6 — სტატიები + სიახლეები + კონტაქტი ✅ (2026-10-27)

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (24 ფაილი, 484 ტესტი: F5-ის 399 + F6-ის 85; console-ში React-ის გაფრთხილება 0) · `npm run build` ✓ + check-dist ✓ (22 JS chunk) · **Chromium 141.0.7390.37 + axe-core 4.14.0** (ფერის კონტრასტით):
- `/articles`, `/articles/:slug`, `/news`, `/news/:slug`, `/contact` × 1440 / 390 × light / dark / contrast — **30 კომბინაცია, 0 დარღვევა, 0 incomplete**, ჰორიზონტალური სქროლი არ არის;
- მდგომარეობები × 1440 / 390 × 3 თემა: ფორმის შეცდომების ჯამი, დადასტურება, „მეტის ჩატვირთვის“ შემდეგ — 18 კომბინაცია, 0 / 0;
- `/__kit` (F6-ის სექციით) × 1440 / 390 × 3 თემა — 0 / 0; რეგრესია: `/`, `/about` × 6 — 0 / 0;
- **ფორმა მხოლოდ კლავიატურით (Chromium, 1440 და 390):** Tab → სახელი → Enter (ცარიელი) → ფოკუსი ჯამზე (`role="alert"`, „ფორმაში 3 შეცდომაა…“) → Tab → ბმული → Enter → ველი → აკრეფა → Tab-ით ყველა ველი → ↓ (თემა) → → (რადიო: ელფოსტა → ზარი, ნატიური) → Space (თანხმობა) → Enter → ფოკუსი „შეტყობინება მიღებულია“-ზე (`role="status"`, რგოლის გარეშე) → „ახალი შეტყობინება“ → ფოკუსი სახელზე; honeypot Tab-ში არ ხვდება;
- **ეკრანის მკითხველი (Chromium-ის ARIA snapshot):** ყოველ ველს სახელი „{ლეიბლი} (სავალდებულო | არასავალდებულო)“, მინიშნება და „შეცდომა: …“ — `aria-describedby`; ჯამი — `alert` + h3 + ბმულების სია; რადიო-ჯგუფი — `radiogroup` სახელით; honeypot ხეში არ არის;
- **ფილტრის შედეგი ფოკუსის გადატანის გარეშე:** ჩიპი / წელი / ძიება → `role="status"` ტექსტი იცვლება, ფოკუსი ფილტრზე რჩება (jsdom-ის ტესტები + Chromium);
- ფოკუსის რგოლი: `/articles`-ზე 40 Tab-გაჩერება — რგოლის გარეშე 0;
- ჩატევა: შრიფტი 150 / 200% × განლაგება ჩართ./გამორთ. × 390 / 768 / 1440 × 5 გვერდი — 60 კომბინაცია, 0 სქროლი, 0 ეკრანს გასული ელემენტი (honeypot-ის გარდა — განზრახ);
- reduced-motion: ახალი ანიმაცია არ არის (ჩონჩხი სტატიკურია, LoadMore-ის ტრიალი — F3-ის `mc-spinner`).

### მატრიცა

| | light | dark | contrast |
|---|---|---|---|
| `/articles` 1440 / 390 | ✓ 0/0 · ✓ 0/0 | ✓ · ✓ | ✓ · ✓ |
| `/articles/:slug` 1440 / 390 | ✓ · ✓ | ✓ · ✓ | ✓ · ✓ |
| `/news` 1440 / 390 | ✓ · ✓ | ✓ · ✓ | ✓ · ✓ |
| `/news/:slug` 1440 / 390 | ✓ · ✓ | ✓ · ✓ | ✓ · ✓ |
| `/contact` 1440 / 390 (+ შეცდომა, დადასტურება) | ✓ · ✓ | ✓ · ✓ | ✓ · ✓ |

### სათაურების ხე

- **სტატიები:** h1 „სტატიები“ → h2 [რჩეული სტატია] → h2 „ყველა სტატია“ (h3 × 6) → h2 „ახალი სტატიები — ელფოსტაზე“.
- **სტატია:** h1 [სათაური] → h2 × 5–10 (h3 ქვეთავები) → h2 „მსგავსი სტატიები“ (h3 × 1–3).
- **სიახლეები:** h1 → h2 [რჩეული სიახლე] → h2 „ყველა სიახლე“ (h3 × 6) → h2 „მომავალი ღონისძიებები“ (h3 × 4) → h2 „სიახლეები ელფოსტაზე“.
- **სიახლე:** h1 [სათაური] → ტექსტის h2 / h3 (თუ აქვს).
- **კონტაქტი:** h1 → h2 „დაკავშირების გზები“ (ეკრანის მკითხველისთვის; h3 × 5) → h2 „მოგვწერე“ (h3 ჯამი / „შეტყობინება მიღებულია“ → h4 „რა მოხდება შემდეგ“) → h2 „ოფისის ხელმისაწვდომობა“ → h2 „სამუშაო საათები“ → h2 „ხშირი კითხვები“ (h3 × 3).

### კლავიატურის სცენარები

**`/articles`**
1. Tab გვერდის დასაწყისიდან: გარსი (F4) → ბილიკი „მთავარი“ → ძიების ველი → „ძიება“ → ჩიპები (6) → „დალაგება“ → რჩეულის სათაური (მთელი ბარათის ბმული) → „მოუსმინე“ → „შენახვა“ → [„ფილტრების გასუფთავება“, თუ ფილტრი ჩართულია] → 6 × (ბარათის სათაური → „შენახვა“) → „მეტის ჩატვირთვა“ → ელფოსტა → „გამოწერა“ → ფუტერი. **მოსალოდნელი:** ფოკუსის რიგი = ვიზუალური, რგოლი ყველგან ჩანს.
2. ძიების ველში აკრეფა → 300ms-ის შემდეგ URL `?q=…` (replace), სტატუსი „ნაპოვნია {n} სტატია — „…““; ფოკუსი ველში რჩება. Enter / „ძიება“ — მყისიერად.
3. ჩიპზე Enter / Space → `aria-pressed="true"` + ✓, URL `?category=career` (push), სტატუსი „ნაპოვნია 3 სტატია — კარიერა“; ფოკუსი ჩიპზე რჩება; რჩეული ბლოკი იმალება.
4. „დალაგება“ — ისრები (ნატიური `<select>`) → `?sort=shortest`.
5. „მეტის ჩატვირთვა“ → Enter: ღილაკი „იტვირთება…“ (`aria-busy`, ფოკუსი რჩება) → ფოკუსი მე-7 ბარათის სათაურზე, სტატუსი „დაემატა 6, სულ 12“; ბოლო გვერდზე ღილაკის ნაცვლად „ყველა ნაჩვენებია“.
6. ბრაუზერის „უკან“ → წინა ფილტრი (ჩიპი, სია, სტატუსი).
7. ცარიელი შედეგი → „ფილტრების გასუფთავება“ → Enter: ფილტრი სუფთავდება, ფოკუსი h2 „ყველა სტატია“-ზე.

**`/articles/:slug`**
1. ბარათზე Enter → ახალი გვერდი, ფოკუსი h1-ზე (ჩატვირთვის შემდეგ — სათაურით; ეკრანის მკითხველი სათაურს ისმენს).
2. Tab: ბილიკი (მთავარი, სტატიები) → კატეგორია (`/articles?category=…`) → „მოუსმინე“ → „ბმულის კოპირება“ / „გაზიარება“ → „შენახვა“ → ტექსტის ბმულები → „სტატიების სიაში დაბრუნება“ → „ყველა სტატია — {კატეგორია}“ → მსგავსი სტატიები → ფუტერი.
3. „მოუსმინე“ → Enter: სათაური, აღწერა და ტექსტი ქართული ხმით, ღილაკი → „შეჩერება“; Esc ნებისმიერ ადგილას აჩერებს. ქართული ხმის გარეშე ღილაკი ფოკუსს იღებს, `aria-disabled`, მიზეზი ტექსტით.
4. „ბმულის კოპირება“ → სტატუსი „ბმული დაკოპირდა.“; კოპირება ვერ ხერხდება → ბმულის ველი, ფოკუსი და მონიშვნა მასზე (Ctrl+C).
5. რჩეულის „მოუსმინე“ (`#listen`) → ფოკუსი მოსმენის ღილაკზე.

**`/news`, `/news/:slug`**
1. Tab: ბილიკი → ტიპის ჩიპები (5) → „წელი“ → რჩეულის სათაური → სიის 6 ბმული → „მეტის ჩატვირთვა“ → ელფოსტა → „გამოწერა“ (გათიშული „განაცხადი“ / „რეგისტრაცია“ — Tab-ში არ არის, `href: null`).
2. ჩიპი / წელი → URL `?category=event&year=2025`, სტატუსი „ნაპოვნია {n} სიახლე — ღონისძიებები, 2025“; ფოკუსი ფილტრზე; „უკან“ ნაბიჯ-ნაბიჯ აბრუნებს.
3. „მეტის ჩატვირთვა“ → ფოკუსი მე-7 სიახლეზე, „დაემატა 6, სულ 12“.
4. სიახლეზე Enter → `/news/:slug`, ფოკუსი h1-ზე; Tab: ბილიკი → ტიპი → გაზიარება → „სიახლეების სიაში დაბრუნება“.

**`/contact`**
1. Tab: გარსი → (არხების მოქმედებები — ბმული მხოლოდ რეალურ ტელეფონზე / ელფოსტაზე / URL-ზე) → „სახელი და გვარი“ (1440-ზე მე-15 Tab, 390-ზე მე-8).
2. ცარიელ ფორმაზე Enter → ფოკუსი ჯამზე: „ფორმაში 3 შეცდომაა. გაასწორე მონიშნული ველები.“ (`role="alert"`).
3. Tab → „სახელი და გვარი: ეს ველი სავალდებულოა.“ → Enter → ფოკუსი ველზე, ეკრანის მკითხველი: სახელი + „შეცდომა: ეს ველი სავალდებულოა.“
4. აკრეფა → Tab „ტელეფონი ან ელფოსტა“ → Tab „თემა“ (↑ ↓) → Tab „შეტყობინება“ → Tab „მხარდაჭერა“ → Tab „როგორ გიპასუხოთ?“ (← → ცვლის) → Tab თანხმობა (Space) → Tab „შეტყობინების გაგზავნა“ (Enter).
5. წარმატება → ფოკუსი „შეტყობინება მიღებულია“-ზე (`role="status"`) → Tab „ახალი შეტყობინება“ → Enter → ფოკუსი სახელზე, ფორმა ცარიელია.
6. ქსელის შეცდომა → ღილაკის ზემოთ `role="alert"`, ფოკუსი ღილაკზე რჩება, ტექსტი ადგილზეა.
7. FAQ: კითხვის ღილაკი → Enter / Space (`aria-expanded`), ↑ ↓ Home End — კითხვებს შორის.

### ფორმის შეცდომების ტექსტები

| ველი | პირობა | შეტყობინება |
|---|---|---|
| სახელი და გვარი | ცარიელი | ეს ველი სავალდებულოა. |
| სახელი და გვარი | > 100 სიმბოლო | ტექსტი ძალიან გრძელია — მაქსიმუმ 100 სიმბოლო. |
| ტელეფონი ან ელფოსტა | ცარიელი | ეს ველი სავალდებულოა. |
| ტელეფონი ან ელფოსტა | არც ტელეფონია (7–15 ციფრი), არც ელფოსტა | შეიყვანე ტელეფონის ნომერი ან ელფოსტა. |
| თემა | უცნობი მნიშვნელობა | აირჩიე ერთ-ერთი ვარიანტი. |
| შეტყობინება | > 4000 სიმბოლო | ტექსტი ძალიან გრძელია — მაქსიმუმ 4000 სიმბოლო. |
| მხარდაჭერა | > 1000 სიმბოლო | ტექსტი ძალიან გრძელია — მაქსიმუმ 1000 სიმბოლო. |
| როგორ გიპასუხოთ? | უცნობი მნიშვნელობა | აირჩიე ერთ-ერთი ვარიანტი. |
| როგორ გიპასუხოთ? | ელფოსტა, საკონტაქტო — ტელეფონი | ელფოსტით პასუხისთვის „ტელეფონი ან ელფოსტა“ ველში ელფოსტა მიუთითე — ან აირჩიე სხვა არხი. |
| როგორ გიპასუხოთ? | ზარი / SMS, საკონტაქტო — ელფოსტა | ზარისთვის ან მესიჯისთვის „ტელეფონი ან ელფოსტა“ ველში ტელეფონის ნომერი მიუთითე — ან აირჩიე სხვა არხი. |
| თანხმობა | არ არის მონიშნული | გაგზავნისთვის საჭიროა თანხმობა მონაცემების დამუშავებაზე. |
| ფორმა (ჯამი) | ≥ 1 შეცდომა | ფორმაში {n} შეცდომაა. გაასწორე მონიშნული ველები. — პუნქტი: „{ლეიბლი}: {შეტყობინება}“ |
| ფორმა (გაგზავნა) | ქსელი / სერვერი | შეტყობინება ვერ გაიგზავნა. {ContentError.message} შეყვანილი ტექსტი ადგილზეა — სცადე ხელახლა. |
| გამოწერა: ელფოსტა | ცარიელი | ეს ველი სავალდებულოა. |
| გამოწერა: ელფოსტა | არასწორი | ელფოსტა ასე უნდა გამოიყურებოდეს: name@example.ge |
| გამოწერა: ელფოსტა | ქსელი / სერვერი | {ContentError.message} |

ხაზოვან შეცდომას ეკრანის მკითხველი „შეცდომა:“-ით იწყებს (`fields.errorPrefix`), ეკრანზე — ხატულა + ტექსტი, ველზე `aria-invalid` + 3px `--mc-error`.

### შექმნილი ფაილები

- `src/features/articles/`: `ArticleFilters.jsx`, `FeaturedArticle.jsx`, `ArticleList.jsx`, `filter-summary.js`, `ReadingHeader.jsx`, `ArticleBody.jsx`, `ListenControl.jsx`, `ShareButton.jsx`, `RelatedArticles.jsx`, `articles.css`, `reading.css`, `__tests__/{articles,article}.test.jsx`.
- `src/features/news/`: `NewsFilters.jsx`, `FeaturedNews.jsx`, `NewsList.jsx`, `UpcomingEvents.jsx`, `news.css`, `__tests__/news.test.jsx`.
- `src/features/contact/`: `ContactChannels.jsx`, `contact-channels.js`, `ContactForm.jsx`, `ContactConfirmation.jsx`, `contact-fields.js`, `OfficeInfo.jsx`, `ContactFaq.jsx`, `contact.css`, `__tests__/contact.test.jsx`.
- `src/features/subscribe/`: `SubscribeForm.jsx`, `subscribe.css`, `__tests__/subscribe.test.jsx`.
- `src/pages/NewsItemPage.jsx`; `src/components/layout/PageIntro.jsx`; `src/components/ui/LoadMore.jsx`, `src/components/ui/fields/ErrorSummary.jsx`; `src/hooks/useLoadMoreFocus.js`, `src/hooks/useHeadingRefocus.js`.
- შეიცვალა: `pages/{Articles,Article,News,Contact,Kit}Page.jsx`, `routes.jsx` (+ `news/:slug`), `content/{model,forms,errors,query,adapter}.js`, `content/mock/{index,org}.js`, `i18n/{format,ka,en}.js`, `components/ui/index.js`, `fields/{Field,TextField,TextArea,Select,Checkbox,RadioGroup}.jsx`, `fields/field-utils.js`, `cards/{ArticleCard,NewsCard,EventCard}.jsx`, `assets/icons/icons.svg` (+6), `styles/{components,sections}.css`, `features/home/HomeNews.jsx` (ბმულები `/news/:slug`-ზე), `test/setup.js` (`<search>`-ის jsdom-გაფრთხილება); ტესტები: `routes.test.jsx`, `i18n.test.js`, `content/adapter.test.js`, `mock/mock.test.js`, `ui/__tests__/{axe,components}.test.jsx`, `a11y/__tests__/a11y-menu.test.jsx`, `features/__tests__/{page-helpers.jsx,pages.test.jsx}`; `CLAUDE.md` (რუკა + F6 კონვენციები), `docs/project-context.md` (§5, §6, §9, §10).

### საჯარო API

**adapter (+):** `getNews(slug) → Promise<NewsItem>` (არარსებული / მონახაზი → `not-found`); `ContentAdapter.getNews`. `sendContact`: honeypot (`payload.website`) შევსებული → `{ ok: true }`, შენახვის გარეშე; TODO — სერვერის rate limit. mock: `createMockAdapter().contacts()` — მიღებული შეტყობინებების რაოდენობა. query: `findNews(news, slug, now)`.

**მოდელი (+):** `ContactPayload.support?: string`, `ContactPayload.website?: string` (honeypot); `SiteSettings.contacts.messenger.url: string | null`; `contacts.address.embedUrl: string | null`, `contacts.address.directions: string` (რუკის ტექსტური ალტერნატივა).

**ფორმები (`@/content/forms.js`, +):** `SUPPORT_MAX` 1000, `CONTACT_FIELDS` (ველების რიგი), `telHref(phone)`, `isHoneypotFilled(payload)`; `validateContact` — `support`-ის სიგრძე და არხის შეუსაბამობა (`FieldErrorCode` + `replyEmail`, `replyPhone`).

**ფორმატი (`@/i18n/format.js`):** იგივე ფუნქციები ICU-ის ქართული ლოკალის გარეშე; ახალი ექსპორტი `MONTHS`, `MONTHS_SHORT`, `WEEKDAYS`. `formatTimeRange` სხვადასხვა დღეზე — „5 მარტი, 2026, 10:00 – 6 მარტი, 2026, 16:00“. `formatNumber` — ICU-ის გარეშე ka-GE-ის დაჯგუფება (U+00A0, ხუთნიშნიდან).

**UI ნაკრები (+):**

| კომპონენტი | props |
|---|---|
| `LoadMore` | `status`, `hasMore`, `onLoadMore`, `shown`, `total`, `error`, **`label`** (სიის სახელი ღილაკის სახელში), `className` |
| `ErrorSummary` | **`title`**, **`items: { id, label, message }[]`**, `headingLevel` = h3, `focusOnMount` = true, `className` |
| `focusField(id)` | ველზე ფოკუსი (ჯგუფში — არჩეულ / პირველ ვარიანტზე), ველი ეკრანის შუაში |
| `FieldLabel` (+) | `required` → „(სავალდებულო)“; TextField / TextArea / Select / RadioGroup / Checkbox ამას `required`-იდან თავად აკეთებს |
| `ArticleCard` (+) | `variant: 'default' \| 'feature'`, `actions` |
| `NewsCard` (+) | `variant: 'default' \| 'compact' \| 'feature' \| 'list'`, `to` |
| `EventCard` | „რეგისტრაცია: {სათაური}“ — ხელმისაწვდომი სახელი |

**გარსი (+):** `<PageIntro headingId className>{children}</PageIntro>` — ღია თავი (h1 გვერდისაა).

**hook-ები (+):**
- `useLoadMoreFocus(list: { firstNewIndex, items }, listRef) → string` — ფოკუსი ახალი გვერდის პირველ `a[href] | button`-ზე; დაბრუნებული ტექსტი („დაემატა {n}, სულ {n}“) `LiveRegion`-ში ედება.
- `useHeadingRefocus(headingRef, status)` — h1-ის ხელახალი ფოკუსი ჩატვირთვის / შეცდომის შემდეგ (ან `#hash`-ის სამიზნე), თუ ფოკუსი გვერდის თავში იყო; პირველ ჩატვირთვაზე — არა.

**ფიჩერები:** `ArticleFilters({ filters })`, `ArticleList({ list, statusText, filtered, onReset })`, `LIST_HEADING_ID`, `FeaturedArticle({ state })`, `ReadingHeader({ breadcrumbs, headingRef, headingId, title, category, lead, meta, tools, toolsLabel, children })`, `ArticleBody({ blocks, ref, className })`, `ListenControl({ audio, title, excerpt, bodyRef })` (`id="listen"`), `ShareButton({ title, fieldLabel })`, `RelatedArticles({ slug, category })`, `RELATED_LIMIT` 3, `articleFilterSummary`, `newsFilterSummary`; `NewsFilters({ filters, years })`, `NewsList(…)`, `NEWS_LIST_HEADING_ID`, `FeaturedNews`, `UpcomingEvents`; `ContactForm({ settings })`, `ContactConfirmation({ responseTime, replyVia, withSupport, onAnother })`, `OfficeInfo({ state })`, `ContactChannels({ state })`, `contactChannels(settings)`, `ContactFaq({ state })`, `FIELD_IDS`, `HONEYPOT_ID`, `FORM_HEADING_ID`, `summaryItems(errors)`; `SubscribeForm({ headingId, title, text, tone: 'dark' | 'card' })`.

**როუტი (+):** `/news/:slug` (`handle.title: 'nav.news'`, დინამიკური სათაური `usePageTitle`).

**ტოკენები:** ახალი არ არის. წარმატება — `--mc-growth` (#08704C 6.09:1 / #3DDC97 8.8:1 / #FFFFFF), შეცდომა — `--mc-error`, ჯამი / alert — 3px, surface ფონზე.

**ხატულები (+):** `phone`, `mail` (ContactPage დაფა), `listen` (ArticlesPage დაფა), `share`, `link`, `search` (ზოგადი).

**CSS კლასები:** `sections.css` — `.mc-page-intro__inner`, `.mc-block`, `--last`, `--after-band`, `.mc-section--tight`, `.mc-filters`, `__search`, `__row`, `__select`, `.mc-result-status`; `components.css` — `.mc-card--feature`, `--feature-even`, `.mc-card__eyebrow-sub`, `.mc-card--news-list`, `.mc-card--aside` (wrap), `.mc-error-summary*`, `.mc-load-more*`; გვერდებისა — `.mc-search-form`, `.mc-reading*`, `.mc-prose*`, `.mc-listen*`, `.mc-share*`, `.mc-news-list`, `.mc-news-events`, `.mc-subscribe*`, `.mc-contact-*`, `.mc-hp`, `.mc-form-alert`.

**i18n (+):** `articles.{searchHint,listen*,audioPending,listTitle,total,found,foundIn,relatedEmpty,relatedAll,backToList,loadingTitle,errorTitle,notFoundTitle,notFoundText,shareLabel,tools}`, `news.{total,found,foundIn,eventsLead,backToList,loadingTitle,errorTitle,notFoundTitle,notFoundText,shareLabel,tools}`, `contact.{leadReply,channelsTitle,formNote,contactHint,messageHints.*,support,supportHint,consentFull,privacy,honeypot,sendKept,sendErrorTitle,successTitle,successText,nextTitle,next.*,another,mapPlaceholder,directions,faqEmpty}`, `common.{loadedMore,copyLink,shareManual}`, `fieldErrors.{replyEmail,replyPhone}`; ამოღებულია `articles.{shownIn,foundQuery}`, `news.{shown,shownIn}`, `contact.{success,consentLink}`; `contact.lead` — პასუხის ვადის გარეშე (ვადა — `leadReply`, პარამეტრებიდან).

**ტესტის დამხმარე:** `page-helpers.jsx` — `getNews` adapter-ის მეთოდებში; `unbracketedFacts` ბლოკს მთლიანად ამოწმებს (ბმული / მუქი / `lang` ფრაგმენტები), გამოთვლადი — `.mc-card__time`, წლის `option`.

**ბანდლი:** მთავარი JS 420.49 / **124.00 kB gzip** (F5: 120.37 — LoadMore, ErrorSummary, ბარათების ვარიანტები, format.js, ხატულები), CSS 68.56 / 13.83 kB gzip (F5: 12.79); გვერდები: ArticlesPage 1.81, ArticlePage 1.73, NewsPage 1.79, NewsItemPage 0.97, ContactPage 3.46 kB gzip.

### დიზაინიდან და prompt-იდან გადახვევები

1. **სიახლის გვერდი `/news/:slug`** (მომხმარებლის გადაწყვეტილება, §9.5) — სტატიის შაბლონით; ბარათები (სიახლეები, მთავარი) ბმულია.
2. **ოქროსფერი მხოლოდ CTA-ზე:** რჩეულის „წაიკითხე“ / „სრულად“ (დაფაზე #FFB81C) ამოღებულია — მთელი ბარათი ერთი ბმულია; ღონისძიების თარიღის ოქროსფერი ბლოკი → `DateTile`; რადიოს `accent-color` #FFB81C → UI ნაკრების რადიო. CTA გვერდებზე: „გამოწერა“, „შეტყობინების გაგზავნა“.
3. **მწვანე მხოლოდ ზრდა / წარმატება:** ოფისის ხელმისაწვდომობის მწვანე ✓ (#08704C) — `<dl>` ხატულების გარეშე (სტატუსი ჯერ დაუდასტურებელია, ✓ მას ფაქტად აჩვენებდა); დადასტურების ტინტი #E3F6EE / #0A2E22 → surface + 2px `--mc-growth` + ✓.
4. **§2-ის გარეთა ფერები:** #DCE6F1 (ფოტოს ფონი, ზოლის ტექსტი), #12294A (ხატულის წრე), rgba-ჩრდილი → ტოკენები / F5-ის წესები.
5. **„ყველაზე წაკითხული“ დალაგება არ არის** — ანალიტიკას საჭიროებს (§9.4).
6. **„ყველა სტატია“ ხილული h2-ია** (დაფაზე სათაური არ არის) — h3 ბარათები რჩეულის h2-ის ქვეშ აღარ ექცევა; სიახლეების დაფას იგივე აქვს.
7. **„(სავალდებულო)“** (prompt) — F3-ის „მხოლოდ (არასავალდებულო)“-ის ნაცვლად ორივე სტატუსი სიტყვით ჩანს; ყველა ფორმაზე, მათ შორის გამოწერაზე.
8. **ახალი ველი „რა მხარდაჭერა დაგჭირდება კომუნიკაციისას?“** (prompt: მხარდაჭერის საჭიროება) — არასავალდებულო, მინიშნებით „ჯანმრთელობის მდგომარეობის ან დიაგნოზის შესახებ ინფორმაცია არ გვჭირდება“. დაფაზე არ არის.
9. **არხის შეუსაბამობის შემოწმება** (ელფოსტით პასუხი → ელფოსტა; ზარი / SMS → ტელეფონი) — დაფაზე არ არის; ერთ ველზე ორი შეცდომა არ ჩნდება.
10. **კონფიდენციალურობის ბმული ლეიბლიდან მინიშნებაში** — ბმული `<label>`-ის შიგნით დაწკაპებისას თანხმობასაც ცვლის; URL-ის გარეშე — „[ბმული მზადდება]“.
11. **არხების სათაური** — ეკრანის მკითხველისთვის h2 „დაკავშირების გზები“ + h3 არხის სახელი (დაფაზე `<p>`); მოქმედება ბმული მხოლოდ რეალურ მნიშვნელობაზეა (F4-ის წესი).
12. **სამუშაო საათები `[00:00–00:00]`** (prompt; დაფაზე [10:00–18:00]); მესენჯერისა და ჟესტური ზარის ტექსტი მთლიანად ფრჩხილებშია (`[ნომერი — ტექსტი, ხმა ან ვიდეო]`).
13. **ღონისძიებები მუქ ზოლში, 2 სვეტად** (დაფაზე ლურჯი ბარათები, 3 სვეტი) — ნიშნები ბარათში ეტევა; მუქი ზოლი F5-ის პატერნია.
14. **სტატიის h1 36 → 52px** (DesignSystem-ის 40 → 64-ის ნაცვლად) — 720px-იან სვეტში 64px-ზე ხაზზე ≈ 10 სიმბოლო ეტეოდა. სტატიის გვერდს დაფა არ აქვს: ცენტრში 45rem სვეტი, ტექსტი 20/1.75, H2 28/1.3.
15. **„მოუსმინე“** — აუდიო ფაილი (`<audio controls preload="none">`) ან ქართული ხმა (`speech.js`); ქართული ხმის გარეშე `aria-disabled` + მიზეზი. რჩეულზე — ბმული `#listen`-ზე (დაფაზე ღილაკი სიაში).
16. **„დალაგების“ ლეიბლი ველის ზემოთაა** (დაფაზე მარცხნივ) — UI ნაკრების `Select`; ძიების ღილაკი ველის გასწვრივ კონტეინერი ≥ 20rem-ზე.
17. **რუკა:** iframe მხოლოდ `embedUrl` + `directions`-ით; ჩანაცვლების ჩარჩო `aria-hidden`, ტექსტური ალტერნატივა (მისამართი + როგორ მოგვაგნო + „რუკაზე ნახვა“) `figcaption`-ში ყოველთვის ჩანს.
18. **390px** — მობილური დაფები არ არის: HomeMobile-ის პატერნები (კიდე 20, ერთი სვეტი, ჩიპები გადადის ხაზზე, სიახლის სიაში ფოტოს გარეშე — თარიღი | ტექსტი).
19. **გამოწერის ზოლი მუქში** — ფონი `--mc-hero` #030B16 (დაფაზე surface #0F2440), F5-ის მუქი ზოლის წესით.
20. **`.mc-card--aside` გადადის ხაზზე** — 390px-ზე 200%-ზე ღონისძიების ბარათის ტექსტი ბარათს სცდებოდა (F3-ის EventCard, F5-ის compact სიახლეც ამას იღებს; F5-ის გვერდების რეგრესია 0).
21. **Chromium-ის ხელმისაწვდომი სახელი** „მეტის ჩატვირთვა : სტატიები“ — `sr-only` (absolute) დანართს ჰარი ემატება; უვნებელია, F5-ის „თავიდან ცდა: …“-ც ასეა.

### ღია საკითხები

1. **რჩეული ერთია:** სია ფილტრის გარეშე `featured: false`-ს ითხოვს — მეორე რჩეული სტატია / სიახლე იქ არ გამოჩნდება. F8-ის რედაქტორში ახალი რჩეულის მონიშვნამ წინა უნდა მოხსნას (ან adapter-მა `featured` ერთ ელემენტზე შეზღუდოს).
2. **Safari / VoiceOver:** `list-style: none`-იანი `<ul>` / `<ol>` სიის როლს კარგავს (`.mc-grid`, `.mc-news-list`, F5-ის სიებიც) — F7-ის აუდიტში: `role="list"` ან მარკერის ხრიკი.
3. **spam:** სერვერის rate limit — TODO (adapter.js); honeypot-ის ველის სახელი `website`; მოთხოვნის ნომერი (`ContactResult.id`) დადასტურებაში ჯერ არ ჩანს.
4. **„რა მოხდება შემდეგ“** — პროცესის სამი ნაბიჯი `[ფრჩხილებშია]`; ორგანიზაციამ უნდა დაადასტუროს.
5. **რუკის პროვაიდერი** (OpenStreetMap / Google), iframe-ის CSP და cookies — გადაუწყვეტელია; მესენჯერის ბმულის ფორმატი (`wa.me`, `viber://`) — ნომრის გამოჩენისას.
6. **გათიშული მოქმედება** („განაცხადი“, „რეგისტრაცია“, `href: null`) — `disabled` ღილაკი Tab-ში არ არის და მიზეზს არ ამბობს (F3-ის წესი); F7-ში — `aria-disabled` + „[ბმული მზადდება]“.
7. **კონტაქტის ველის `autocomplete="email"`** — რომელიც ტელეფონსაც იღებს (WCAG 1.3.5 — ორმნიშვნელოვანი დანიშნულება).
8. **კონტაქტი 390px-ზე:** ხუთი არხი ერთმანეთის ქვეშ — ფორმამდე ≈ 1300px; მობილური დიზაინის დადასტურება (კომპაქტური row-ბარათი?).
9. **ქართული ხმა** რეალურ მოწყობილობაზე (F4 #6) — „მოუსმინე“-საც ეხება; აუდიო ფაილის წყარო (CMS) — F2 #4 ნაწილობრივ დახურულია.
10. **`<search>`** — jsdom 30-ს არ აქვს (ტესტის setup-ში ერთი გაფრთხილება ფილტრდება); ბრაუზერებში ✓.
11. **დაფები გასასწორებელია:** ArticlesPage / NewsPage / ContactPage — ოქროსფერი „წაიკითხე“, „სრულად“, ღონისძიების თარიღი, რადიოს accent; მწვანე ✓ და ტინტები; #DCE6F1, #12294A, rgba-ჩრდილი; „ყველაზე წაკითხული“; „(სავალდებულო)“-ს ფორმატი; მხარდაჭერის ველი.
12. **დახურულია:** §9.5 (სიახლის სრული ტექსტი), §9.7 (ICU — თარიღი), §9.8 (`?topic=`), F2 #2, F3 #4, F3 #5 (სიახლე), F5 #3, #4, #6. ძალაშია: F1 5, 7; F2 4–11; F3 1, 5 (ვიდეო), 6, 7; F4 1–3, 6–11; F5 1, 2, 5, 7–9.

### შემდეგი: F7 — განვითარება + ვიდეოები + აუდიტი

სლაიდერი (APG carousel, ← → Home End, PDF, ტექსტური / მარტივი ენის ვერსია) და ფლეიერი (CC ნაგულისხმევად, ჟესტური ენის PiP, აუდიოაღწერა, ტრანსკრიპტი დროის ნიშნულებით, `?video=`), აუდიტის მატრიცა. Gate: AA-ს ყველა ✗ გასწორებულია ან P1-შია. F6-იდან: `PageIntro`, ფილტრის პატერნი (`useUrlFilters` + ხილული სტატუსი), `LoadMore` + `useLoadMoreFocus`, `useHeadingRefocus` (ასინქრონული h1), `ShareButton` (სერიის გაზიარება), `speech.js`-ის ინტეგრაცია; აუდიტში — ღია საკითხები 2 და 6.

## F7 — პიროვნული განვითარება + ვიდეოები + საბოლოო აუდიტი ✅ (2026-10-27)

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (29 ფაილი, 537 ტესტი: F6-ის 484 + F7-ის 53; ერთხელ, Chromium-ის აუდიტთან პარალელურ გაშვებაზე, 2 ტესტი დროში ჩავარდა — ცალკე და თავიდან 537/537) · `npm run build` ✓ + check-dist ✓ (25 JS chunk) · **Chromium 141.0.7390.37 + axe-core 4.14.0** (`scripts/audit.py`, ფერის კონტრასტით):
- 12 როუტი (`/`, `/about`, `/articles`, `/articles/:slug`, `/development`, `/development?series=`, `/videos`, `/videos?video=`, `/news`, `/news/:slug`, `/contact`, 404) × light / dark / contrast × 1440 / 390 = 72 + `/__kit` × 2 — **0 დარღვევა, 0 incomplete**, ჰორიზონტალური სქროლი 0;
- ფლეიერი **რეალური ფაილით** (ffmpeg-ის VP9 / Opus WebM + VTT, Range-ით) × 3 თემა × 1440 (full) / 390 (compact, გახსნილი „მეტით“) — 0 / 0;
- **WCAG 2.2 AA-ს ✗ არ დარჩა** (P1 ცარიელია) — აუდიტში ნაპოვნი ოთხი ხარვეზი გასწორდა (იხ. „აუდიტში გასწორებული“).

### აუდიტის მატრიცა

| გვერდი | axe (3 თემა × 2) | კლავიატურა (Tab-ები 1440 / 390) | 390 | მუქი | კონტრასტი | reduced-motion | reflow 320 / 720 / 200% |
|---|---|---|---|---|---|---|---|
| `/` | ✓ 0/0 | ✓ 49 / 38 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/about` | ✓ | ✓ 25 / 18 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/articles` | ✓ | ✓ 51 / 44 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/articles/:slug` | ✓ | ✓ 41 / 34 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/development` (+ `?series=`) | ✓ | ✓ 41 / 34 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/videos` (+ `?video=`, ფაილით) | ✓ | ✓ 39 / 32 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/news` | ✓ | ✓ 45 / 38 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/news/:slug` | ✓ | ✓ 30 / 23 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/contact` | ✓ | ✓ 35 / 28 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 404 | ✓ | — | ✓ | ✓ | ✓ | ✓ | — |
| `/__kit` (dev) | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✗ 200%-ზე (P3, საჯარო არ არის) |

- **კლავიატურა:** ყოველი Tab-გაჩერება 9 გვერდზე × 2 სიგანე — რგოლი ჩანს (ბარათზე `:has`-ით), ელემენტი ეკრანზეა და არაფერი ფარავს (WCAG 2.4.11), სამიზნე ≥ 44px (2.5.8), ციკლი იკვრება; ფოკუსის ხაფანგი არ არის.
- **reduced-motion:** no-preference — სლაიდი `mc-slide-in-next` 240ms, წერტილი 200ms, CTA 120ms; reduce — ანიმაცია `none`, ყველა transition 0s (მთავარზე მოძრავი ელემენტი 0), ფლეიერის პროგრესი 0s.
- **reflow:** 320px (100%), 720px (= 1440 × 200% zoom), შრიფტი 200% 1440 და 390 — ჰორიზონტალური სქროლი 0 ყველა საჯარო გვერდზე; ტექსტი არ იჭრება (overflow-ის შემოწმება).

### სცენარები (Chromium)

- **სლაიდერი:** ფოკუსი გარეთ → → არაფერს ცვლის; „შემდეგი“-ზე → „სლაიდი 2 / 6“, End → 6 / 6, Home → 1 / 6; წერტილზე → ფოკუსი ახალ წერტილზე (`aria-current`); touch swipe მარცხნივ → შემდეგი; სერიის ბარათი → ფოკუსი სერიის h2-ზე.
- **ფლეიერი (ფაილით):** ავტოდაკვრა არ არის; სუბტიტრის ბილიკი `hidden` (ბრაუზერი არ ხატავს), overlay-ში „[პირველი ფრაზა — სუბტიტრი]“; K → დაკვრა, ჟესტური ენის ვიდეო მიჰყვება (დრიფტი 0.06 წმ); → +5 წმ; M → ხმა გათიშულია; C → overlay ქრება; აუდიოაღწერა → მთავარი ჩუმდება, აუდიო უკრავს (დრიფტი 0.09 წმ); ტრანსკრიპტის „გადასვლა: 00:04“ → 4.2 წმ; პროგრესი `aria-valuetext` „00:04 / 00:20“, Home → 0; სრული ეკრანი → რეგიონი; 390 — „მეტი“, Esc → ფოკუსი „მეტი“-ზე.
- **ფაილის გარეშე (mock):** ბარათი → ფოკუსი ფლეიერზე („ვიდეოფლეიერი: …“), ჩართვა `aria-disabled` + „ვიდეო ფაილი მზადდება…“, ტრანსკრიპტი ღიაა.

### აუდიტში გასწორებული

1. **სლაიდის დეკორი ტექსტის ქვეშ** (axe incomplete 6 კვანძზე, `/development` ღია / მუქი): რკალი #F26A1F თეთრ ტექსტთან < 3:1 იყო — დეკორი ზედა მარჯვენა კუთხეშია (`overflow: hidden` ბლოკში), ვიწრო / დიდშრიფტიან სლაიდზე (< 30rem) არ ჩანს.
2. **დეკორი 200%-ზე გვერდს სქროლავდა** (`/development`, 1440 × 200%, 2px) — იგივე გასწორებით.
3. **label-in-name** (`label-content-name-mismatch`, კომპაქტური „CC“): `aria-label="სუბტიტრები (CC)"` → ხილული „CC“ + დამალული „სუბტიტრები“ (სახელი „CC სუბტიტრები“).
4. **`landmark-unique` + ორჯერ `id="kit-media"`** `/__kit`-ში (jsdom-ის axe-მა დაიჭირა).
- წინა ნაბიჯების ღია საკითხები: F6 #2 (Safari-ს სიები → `role="list"`), F6 #6 (მიუწვდომელი მოქმედება Tab-ში არ იყო → `disabledReason`), F6 #7 (`autocomplete="email"` ორმნიშვნელოვან ველზე → ამოღებულია, WCAG 1.3.5).

### დარჩენილი ხარვეზები

**P1** (WCAG 2.2 AA ✗) — არ არის.

**P2**
1. რეალური ასისტიური ტექნოლოგია: NVDA / JAWS (Windows), VoiceOver (macOS, iOS), TalkBack — `aria-roledescription="კარუსელი"`-ის გამოცხადება, ფლეიერის `role="slider"`, `aria-pressed` ჩიპები, Safari-ში `role="list"`; ქართული ხმა (F4 #6).
2. iPhone Safari: ელემენტის სრული ეკრანი არ არსებობს → ღილაკი იმალება (`fullscreenEnabled`); native `webkitEnterFullscreen` საკუთარ სუბტიტრს ვერ აჩვენებს — გადაწყვეტა (ნატიური `<track>` ამ რეჟიმში?) ღიაა.
3. ჟესტური ენის / აუდიოაღწერის სინქრონი ნელ ქსელზე (ლოკალურად 0.06–0.09 წმ); `waiting`-ზე მიმყოლი ჩერდება, მაგრამ მიმყოლის საკუთარი ბუფერი მთავარს არ აჩერებს.
4. ერთი სუბტიტრის ენა (ka): რამდენიმე ბილიკის არჩევა (`subtitles` en) UI-ში არ არის.
5. დაფების გასწორება (project-context §9.18).

**P3**
1. `/__kit` 200%-იან შრიფტზე ჰორიზონტალურად სქროლავს (სამი თემის სვეტი media query-ით; მხოლოდ dev).
2. ფლეიერის პარამეტრები (`mc-player`) თავსებადობის მენიუში არ ჩანს — UX-ის გადაწყვეტილება.
3. მთავარი JS 123.71 kB gzip: mock (11.1 kB) და ლოგოს ნიშნები ჯერ bundle-შია (F2 #6, F4 #9).
4. ტრანსკრიპტი მიმდინარე სტრიქონზე თავისით არ სქროლავს (განზრახ — ფოკუსს და გვერდს არ ამოძრავებს).

### დარჩენილი `[placeholder]`-ები

**გვერდებზე ნაჩვენები** (Chromium, 9 გვერდი + 404, ტექსტი + `alt` / `aria-label`; უნიკალური — 230):

| ტიპი | რაოდენობა | მაგალითი |
|---|---|---|
| ფოტო / ვიდეოს კადრი | 41 | „[ვიდეოს კადრი: თვალის დონე, მოქმედების მომენტი — …]“ |
| სახელი | 18 | „[ავტორის სახელი გვარი]“, „[პარტნიორი 01]“ |
| თარიღი / დრო | 7 | „[00:00–00:00]“, „[2 სამუშაო დღეში]“ |
| კონტაქტი | 5 | „[ელფოსტა]“, „[მისამართი]“, „[@მეტიჩართულობა]“ |
| რიცხვი | 1 | „[00 KB]“ |
| ბმული / URL | 1 | „[ბმული მზადდება]“ |
| ტექსტი (სათაური, აღწერა, ტექსტის ბლოკი) | 157 | სტატიების / სერიების / ვიდეოების ტექსტები |

გვერდების მიხედვით: `/` 44 · `/about` 53 · `/articles` 34 · სტატია 41 · `/development` 33 · `/videos` 36 · `/news` 43 · სიახლე 12 · `/contact` 26 · 404 4.

**წყაროში** (`npm run placeholders`; mock + ka.js + UI, ტესტებისა და en.js-ის გარეშე): 277 უნიკალური / 302 შემთხვევა — ფოტო / კადრი 11, სახელი 8, თარიღი / დრო 7, კონტაქტი 5, ბმული 2, რიცხვი 2, ფაილი 1, ტექსტი 241 (mock 221, i18n 5, UI 17). ფოტოს აღწერების დიდი ნაწილი mock-ის დამხმარე ფუნქციით იქმნება, ამიტომ წყაროში ნაკლებია, ვიდრე გვერდზე.

### შექმნილი ფაილები

- `src/components/media/`: `index.js`, `Slider.jsx`, `useSwipe.js`, `VideoPlayer.jsx`, `ProgressSlider.jsx`, `Transcript.jsx`, `transcript-utils.js`, `NativeMedia.jsx`, `sources.js`, `native-controller.js`, `player-prefs.js`, `usePlayback.js`, `media.css`, `__tests__/{fake-source.jsx,slider.test.jsx,player.test.jsx,controller.test.js}`; წაიშალა `.gitkeep`.
- `src/features/development/`: `SeriesDeck.jsx`, `SeriesGrid.jsx`, `series-links.js`, `development.css`, `__tests__/development.test.jsx`.
- `src/features/videos/`: `VideoStage.jsx`, `VideoGrid.jsx`, `ShareStoryBand.jsx`, `useVideoParam.js`, `videos.css`, `__tests__/videos.test.jsx`.
- `scripts/audit.py`, `scripts/placeholders.mjs`.
- შეიცვალა: `pages/{Development,Videos,Kit,NewsItem}Page.jsx`; `components/ui/{Button,Card}.jsx`, `cards/{Video,Event,News}Card.jsx`; `features/articles/ShareButton.jsx`; `features/contact/ContactForm.jsx`; `content/taxonomy.js` (`story`); `i18n/{ka,en,format,index}.js`; `assets/icons/icons.svg` (+10); `styles/{components,sections}.css`; ტესტები: `routes.test.jsx`, `features/__tests__/{page-helpers.jsx,pages.test.jsx}`, `ui/__tests__/components.test.jsx`, `news/__tests__/news.test.jsx`, `articles/__tests__/article.test.jsx`; `eslint.config.js`, `package.json` (`placeholders`, `audit`), `.gitignore` (`.audit-fixtures`, `audit.json`), `CLAUDE.md` (რუკა + F7 კონვენციები), `docs/project-context.md` (§2, §5, §6, §7, §9, §10).

### საჯარო API

**მედია** (`@/components/media/index.js`):

| ექსპორტი | API |
|---|---|
| `Slider` | `slides: Slide[]`, **`title`**, `tone: SeriesTone` = navy, `handle`, `ratio: 'auto' \| '1:1' \| '4:5'` = auto, `initialIndex` = 0, `onChange(index)`, `headingLevel` = h3, `className` |
| `VideoPlayer` | **`video: Video`**, `source: VideoSourceAdapter` (ნაგულისხმევი `resolveSource()`), `layout: 'full' \| 'compact'` (ნაგულისხმევად სიგანით), `playerRef` (ფოკუსისთვის), `transcriptHeadingLevel` = h3, `className` |
| `ProgressSlider` | `currentTime`, `duration`, `onSeek(seconds)`, `disabled`, `describedBy`, `className` |
| `Transcript` | `id`, `lines: TranscriptLine[]`, `currentTime`, `highlight`, `onSeek \| null`, `hidden`, `headingLevel`, `className` |
| `VideoSourceAdapter` | `{ id, canPlay(video) → boolean, Media: ComponentType<{ video, onController(controller \| null), signVisible }> }`; `nativeSource`, `resolveSource()` |
| `PlaybackController` | `getState() → PlaybackState`, `subscribe(fn) → unsubscribe`, `onCaption(fn(text)) → unsubscribe`, `play()`, `pause()`, `seek(s)`, `setVolume(0…1)`, `setMuted(b)`, `setRate(r)`, `setCaptions(b)`, `setSignLanguage(b)`, `setAudioDescription(b)`, `destroy()` |
| `PlaybackState` | `{ ready, started, paused, ended, waiting, currentTime, duration, volume, muted, rate, error }`; `IDLE_STATE` |
| `createNativeController({ video, sign?, audio?, fallbackDuration? })` | native რეალიზაცია; `cueText(track)`, `stripCueTags(text)` |
| hook-ები | `usePlayback(controller \| null) → PlaybackState`; `usePlayerLayout(ref, forced?) → 'full' \| 'compact'`, `playerLayoutFor(widthPx, remPx)`, `PLAYER_COMPACT_REM` 34; `usePlayerPrefs() → [prefs, update(patch)]`; `useSwipe({ onPrev, onNext }) → pointer handlers`, `SWIPE_MIN` 48 |
| კონსტანტები | `SEEK_STEP` 5, `PAGE_STEP` 30, `DRIFT_TOLERANCE` 0.3, `RATES` [0.5, 0.75, 1, 1.25, 1.5, 2], `PLAYER_STORAGE_KEY` 'mc-player', `DEFAULT_PLAYER_PREFS` `{ captions: true, sign: true, audioDescription: false, rate: 1 }`, `parsePlayerPrefs(raw)`, `durationAttribute(s)` → „PT1M23S“, `currentLineIndex(lines, t)` |
| ტესტი / kit | `createFakeSource(options) → { controller, source }`, `createFakeController`, `withFiles(video)` — `__tests__/fake-source.jsx` |

**ფიჩერები:** `SeriesDeck({ state, empty, handle, headingRef })`, `PdfButton({ pdf })`, `TextVersion({ slides })`, `DECK_HEADING_ID` 'deck-title', `SeriesGrid({ state, currentSlug })`, `OTHER_HEADING_ID`, `seriesHref(slug)`; `VideoStage({ state, empty, headingRef, playerRef })`, `STAGE_HEADING_ID` 'video-title', `VideoGrid({ state, category, onCategory, currentSlug })`, `GRID_HEADING_ID`, `ShareStoryBand`, `SHARE_STORY_HREF` '/contact?topic=story', `useVideoParam() → slug | null` (`?v=` → `?video=`, replace), `videoHref(slug, category?)`.

**UI ნაკრები (+):** `Button` — `disabledReason` (`disabled`-თან: `aria-disabled`, ფოკუსი, ხილული მიზეზი `aria-describedby`; ბმული — `<a role="link" tabindex="0">`); `Card` — `current` (`aria-current="true"` + 4px ჩარჩო); `VideoCard` — `current` („▶ ფლეიერში“); `ShareButton` — `path` (query-ით); `Chip`-ს `aria-disabled` / `aria-expanded` სტილი.

**ფორმატი:** `formatFileSize(bytes)` → „240 KB“ / „1,5 MB“ ('' — უცნობი).

**ტაქსონომია:** `CONTACT_TOPICS` + `story` („ისტორიის გაზიარება“).

**ხატულები (+10):** `pause`, `volume-off`, `fullscreen`, `fullscreen-exit`, `audio-description`, `transcript`, `more`, `chevron-left`, `chevron-right`, `download` (ხმა — არსებული `listen`).

**ტოკენები:** ახალი არ არის. `media.css`-ის HEX — §2-ის ფიქსირებული წყვილები (სლაიდი, სუბტიტრი, კადრი).

**CSS კლასები:** `media.css` — `.mc-slider`, `__viewport`, `__controls`, `__status`, `__dots`, `__dot`, `__pip`, `__hint`, `.mc-slide`, `--ratio-auto | -square | -tall`, `--from-next | -prev`, `__deco`, `__brand`, `__content`, `__kicker`, `__num`, `__title`, `__body`, `__foot`, `.mc-player-wrap`, `.mc-player` (`data-layout`), `__stage`, `__video`, `__poster`, `__surface`, `__big-play`, `__sign`, `__captions`, `__caption`, `__controls`, `__row(--main | --tools | --pending)`, `__time`, `__pending`, `__play`, `__chip`, `__volume`, `__select`, `__more`, `__notes`, `__hint`, `.mc-progress*`, `.mc-transcript*`; `sections.css` — `.mc-pills`; `components.css` — `.mc-btn-pending*`, `.mc-card--current`; გვერდებისა — `.mc-deck*`, `.mc-text-version*`, `.mc-video-stage*`, `.mc-story*`.

**i18n (+):** `development.{carousel,slideRole,slideOf,dotTitle,dotsLabel,prevSlide,nextSlide,slideWord,keyboardHint,pdfMeta,pdfSizeUnknown,shareLabel,tools,textVersionLead,loadingTitle,errorTitle,notFoundTitle,notFoundText,backToFeatured,seriesEmpty,otherEmpty}`, `videos.{nowPlaying,person,languageKa,loadingTitle,errorTitle,notFoundTitle,notFoundText,backToWeekly,listEmpty}`, `player.{region,stage,captionsShort,pendingText,mediaError,captionsMissing,signMissing,adMissing,moreLabel,transcriptTitle,transcriptHint,transcriptPendingHint,speaker,volumeValue,keyboardHint,announce.*}`, `taxonomy.contactTopic.story`.

**სკრიპტები:** `npm run placeholders` (`--json`), `npm run audit` (`python3 scripts/audit.py --out audit.json [--only axe,keyboard,motion,reflow,placeholders,media,bundle] [--fixtures DIR]`; build უნდა იყოს; fixture-ებს ffmpeg-ით თავად ქმნის).

**ბანდლი:** მთავარი JS 421.21 / **123.71 kB gzip** (F6: 124.00), CSS 71.17 / 14.15 kB gzip (F6: 13.83 — `.mc-pills`, `.mc-btn-pending`, ჩიპის მდგომარეობები); `media` chunk 21.63 / 7.22 kB + CSS 2.72 kB (მხოლოდ `/development`, `/videos`, `/__kit`); DevelopmentPage 1.95 kB + CSS 0.49, VideosPage 2.03 kB + CSS 0.62 kB.

### დიზაინიდან და prompt-იდან გადახვევები

1. **ვიდეოს პარამეტრი `?video=`** (prompt: `?v=`) — F5-ის VideoCard და §9.13; `?v=` მიიღება და `replace`-ით გადაიწერება.
2. **`/development`-ის თემის ჩიპები ამოღებულია** — თითო თემას ერთი სერია აქვს (ჩიპი ბარათების ბადეს იმეორებდა), „ყველა“ კი ერთ სლაიდერზე აზრს კარგავდა; სერიას ბადე ირჩევს.
3. **სლაიდის ფერები** (SlidesPage): kicker #FFB81C → tone-ის აქცენტი, ტექსტი #DCE6F1 → tone-ის ტექსტი (§2 „მედია“); წერტილი #C8D2DF (1.41:1) → `--mc-border`, მუქში ოქროსფერი → ink; ჩარჩო #2B4A70 → `--mc-border`; რადიუსი 28 → 32.
4. **წერტილები ღილაკების რიგის ქვემოთ** (დაფაზე შუაში): Tab-ის რიგი = ვიზუალური, 9+ სლაიდი და 200% შრიფტი ეტევა; მრიცხველი („სლაიდი 3 / 6“) ღილაკებს შორისაა.
5. **„წინა“ / „შემდეგი“ 44px** (prompt; დაფაზე 52), ბოლოებში `aria-disabled` (დაფაზე `disabled` + opacity — ფოკუსი იკარგებოდა).
6. **სლაიდის დეკორი ზედა კუთხეშია** (დაფაზე ქვედა, ტექსტისა და მრიცხველის ქვეშ — < 3:1), ვიწრო სლაიდზე არ ჩანს.
7. **სლაიდი იზრდება** დიდ შრიფტზე (1:1 / 4:5 მინიმუმია) — ტექსტი არ იჭრება; ვიწრო კონტეინერში ავტომატურად 4:5.
8. **ფლეიერის ფერები** (VideosPage): პროგრესი #FFB81C → `--mc-graphic`, სუბტიტრი rgba(0,0,0,.82) → #0A1D38, დაკვრის rgba-ნათება ამოღებულია, გადამრთველის რადიუსი 10 → 999 (ჩიპი, ✓-ით), ჩარჩო მუქში `--mc-card-border`.
9. **ფლეიერის განლაგება:** სრული — ორი რიგი (დაკვრა · პროგრესი · დრო · ხმა / ხელმისაწვდომობის ჩიპები · სიჩქარე · სრული ეკრანი; დაფაზე ერთი რიგი — 8fr-ში არ ეტეოდა); კომპაქტური — §10 + ხმის გათიშვა „მეტში“; ზღვარი ფლეიერის სიგანით (34rem), არა ეკრანით.
10. **ტრანსკრიპტის გადამრთველი ფლეიერის ზოლშია** (დაფაზე ინფორმაციის სვეტში) — prompt-ის მიხედვით ფლეიერის კონტროლია და 390-ზე „მეტშია“; ფაილის გარეშე ღიაა.
11. **აუდიოაღწერა = ცალკე სრული მიქსის ფაილი** (ჩართვისას მთავარი ვიდეო ჩუმდება).
12. **ჟესტური ენა ნაგულისხმევად ჩართულია** (VideosPage-ის საწყისი მდგომარეობა); არჩევანი ინახება (`mc-player`).
13. **მალსახმობები `KeyboardEvent.code`-ით** — ქართულ განლაგებაზე „კ“ / „მ“ / „ც“-ც მუშაობს; Space — მხოლოდ რეგიონზე / კადრზე.
14. **„ფლეიერში“ ბარათზე** (დაფაზე არ არის) — მიმდინარე ვიდეო სიაში რჩება და `aria-current`-ით ინიშნება.
15. **ისტორიის ზოლის CTA ისრის გარეშე** (შიდა ბმულია); მუქში ფონი `--mc-hero` (F5-ის წესი).
16. **ახალი კონტაქტის თემა `story`** — prompt-ის `/contact?topic=story`-სთვის.
17. **მიუწვდომელი მოქმედება ფოკუსს იღებს** (F3-ის „გათიშული ბმული ფოკუსს არ იღებს“ შეიცვალა) — F6 #6.

### ღია საკითხები

1. P2 1–5 და P3 1–4 (ზემოთ) — project-context §9.18–19.
2. **ვიდეოს პლატფორმა** (§9.4): YouTube-ის adapter `VideoSource`-ს `provider` / `id` ველებს და ჟესტური ენის ცალკე ვიდეოს საჭიროებს.
3. **აუდიოაღწერის ფორმატი** (სრული მიქსი თუ მხოლოდ აღწერის ბილიკი) — გადაღების გუნდთან.
4. **სერიის PDF** — ატვირთული ფაილი `DocumentFile.size`-ით (F2 #5 დახურულია ამ გადაწყვეტილებით); ფაილის ზომა CMS-მა უნდა შეავსოს.
5. **`[@მეტიჩართულობა]`** — სოციალური ქსელის სახელი სლაიდზე (`SiteSettings.socialHandle`).
6. **დახურულია:** §9.13 (`?video=`), §9.15 (Safari-ს სიები), F2 #3 (ნაწილობრივ — adapter-ის ფენა), F2 #5, F3 #5 (VideoCard-ის ბმული), F6 #2, #6, #7. ძალაშია: F1 5, 7; F2 4, 6–11; F3 1, 6, 7; F4 1–3, 6–11; F5 1, 2, 5, 7–9; F6 1, 3–5, 8–11.

### შემდეგი: F8 — ადმინ პანელი

შესვლა / რეგისტრაცია (მოწვევის კოდით), `AdminShell` (sidebar 268 + header 76), დაფა, სიები, რედაქტორი ხელმისაწვდომობის ჩეკლისტით (`validateContent`-ის წესები: alt, სათაურები, ბმულები, სუბტიტრი + ტრანსკრიპტი + აუდიოაღწერა, ჟესტური ენა — გაფრთხილება), ბიბლიოთეკა (მედია, დოკუმენტები: `DocumentFile.size`). Gate: ადმინის კოდი საჯარო bundle-ში არ ხვდება; alt-ის გარეშე გამოქვეყნება შეუძლებელია. F7-იდან: `Button disabledReason`, `role="list"`, `npm run audit` (ადმინის როუტები დასამატებელია), `npm run placeholders` (კონტენტის ჩეკლისტი).

## F8 — ადმინ პანელი ✅ (2026-10-27)

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (34 ფაილი, 623 ტესტი: F7-ის 537 + F8-ის 86) · `npm run build` ✓ + check-dist ✓ (42 JS chunk; Vite manifest-ით: საჯარო 29 chunk-ში ადმინის მოდული, `mc-admin`, TipTap / ProseMirror, სატესტო პაროლი და validate-ის dev-ანგარიში **არ არის**; ადმინის chunk — 13) · **Chromium 141 + axe-core 4.14.0** (`npm run audit -- --only admin`):
- ადმინის 32 მდგომარეობა × light / dark / contrast × 1440 / 390 = **189 გაშვება — 0 დარღვევა, 0 incomplete**, ჰორიზონტალური სქროლი 0. გამონაკლისი: გახსნილი compact-მენიუ (390) — WCAG-ის წესებით 0, best-practice `landmark-one-main` / `page-has-heading-one` ვარდება, რადგან `main` განზრახ `inert`-ია (F4-ის იგივე);
- ცხრილის სქროლ-რეგიონში ხილვის არეს გარეთ მყოფ უჯრას axe „incomplete“-ად ნიშნავს — ასეთი უჯრები computed style-ით იზომება (`audit.py` → `scrollContrast`): მინიმუმი 6.12 / 8.6 / 16.57:1 (ღია / მუქი / კონტრასტი);
- **ალტ-ის / სუბტიტრის გარეშე გამოქვეყნება შეუძლებელია** — mock adapter-ი (`validation` + ველის გზები) და რედაქტორი (შეცდომების ჯამი, ფოკუსი მასზე, ბმული ველზე) — ტესტებით და Chromium-ში;
- **მთელი პანელი კლავიატურით:** Tab-ით გავლა 16 ეკრანზე × 1440 / 390 — რგოლი ყველგან ჩანს, არაფერი იფარება, სამიზნე ≥ 24px (ცხრილი ქვემოთ).

### აუდიტის მატრიცა — ადმინის როუტები (prompt 7-ის მატრიცის გაგრძელება)

| როუტი / მდგომარეობა | axe (3 თემა × 1440 / 390) | Tab-გაჩერება 1440 / 390 | 390 | მუქი | კონტრასტი | reduced-motion |
|---|---|---|---|---|---|---|
| `/admin/login` (+ `?tab=register&invite=`, `?reason=expired`, ჯამი, უარყოფა) | ✓ 0/0 | 9 / 9 | ✓ | ✓ | ✓ | ✓ |
| `/admin` | ✓ | 33 / 20 | ✓ | ✓ | ✓ | ✓ |
| `/admin/:type` (articles + status / check, videos, events, pages) | ✓ | 49 / 36 (articles) | ✓ | ✓ | ✓ | ✓ |
| `/admin/articles/:id` (+ გამოქვეყნების ბლოკერი), `/admin/articles/new` | ✓ | 38 / 25 | ✓ | ✓ | ✓ | ✓ |
| `/admin/news/:id`, `/admin/series/:id`, `/admin/events/:id`, `/admin/pages/:id` | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| `/admin/videos/:id` | ✓ | 88 / 75 | ✓ | ✓ | ✓ | ✓ |
| `/admin/:type/:id/preview` (სტატია, სერია) | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| `/admin/media` (+ `?filter=missing-alt`) | ✓ | 243 / 230 | ✓ | ✓ | ✓ | ✓ |
| `/admin/documents` | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| `/admin/users` (ადმინისტრატორი; რედაქტორი → 403) | ✓ | 27 / 14 | ✓ | ✓ | ✓ | ✓ |
| `/admin/settings` | ✓ | 97 / 84 | ✓ | ✓ | ✓ | ✓ |
| `/admin/a11y`, `/admin/search?q=`, 404 | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| გახსნილი compact-მენიუ (390) | WCAG ✓ (best-practice — იხ. ზემოთ) | ციკლი ✓, Esc → ღილაკი | ✓ | ✓ | ✓ | ✓ |

reduced-motion: ადმინს ახალი ანიმაცია არ აქვს — მხოლოდ ფერის transition (`--mc-dur-chip`, reduce-ში 0 + `transition: none`).

### როუტი → როლი → დაფა

| როუტი | როლი | დაფა |
|---|---|---|
| `/admin/login` (`?tab=register&invite=…`, `?next=`, `?reason=expired \| logged-out`) | ყველა | AdminAuth |
| `/admin` | რედაქტორი, ადმინისტრატორი | AdminPanel — დაფა |
| `/admin/:type` (articles, series, videos, news, events, pages) | რედაქტორი, ადმინისტრატორი | AdminPanel — სია; events — სიახლეების ქვეპუნქტი, დაფაზე არ არის |
| `/admin/:type/:id` (`id = new` — ახალი) | რედაქტორი, ადმინისტრატორი | AdminPanel — რედაქტორი |
| `/admin/:type/:id/preview` | რედაქტორი, ადმინისტრატორი | — (საჯარო შაბლონი) |
| `/admin/media`, `/admin/documents` | რედაქტორი, ადმინისტრატორი | — (sidebar-ის „ბიბლიოთეკა“) |
| `/admin/users`, `/admin/settings` | ადმინისტრატორი (სხვას — 403 გარსის შიგნით) | — |
| `/admin/a11y` | რედაქტორი, ადმინისტრატორი | დაფის „სრული ანგარიში“ |
| `/admin/search?q=` | რედაქტორი, ადმინისტრატორი | „ძიება პანელში“ |
| `/admin/*` | რედაქტორი, ადმინისტრატორი | 404 გარსის შიგნით |

### როლი × უფლება

| უფლება (`permissions.js`) | ადმინისტრატორი | რედაქტორი |
|---|---|---|
| `content.read` / `content.write` / `content.publish` | ✓ | ✓ |
| `media.read` / `media.write` | ✓ | ✓ |
| `a11y.read` | ✓ | ✓ |
| `users.manage` | ✓ | — |
| `settings.manage` | ✓ | — |

frontend-ის guard (`RequireAuth`, `RequireRole`) მხოლოდ UX-ია; mock-იც იგივე ცხრილით 403-ს აბრუნებს.

### ჩეკლისტის წესი → ბლოკავს / აფრთხილებს → სად მოწმდება

| წესი (`editor/checklist.js` → `checks.*`) | დონე | სად |
|---|---|---|
| სავალდებულო ველები და ფორმატი (required, slug, excerptLength ≤ 160, date, ratio, eventTime…) | ბლოკავს | `validate.js` — რედაქტორი (ცოცხლად) + mock `publish` / `schedule` |
| alt ყველა ფოტოზე (ყდა, პოსტერი, ტექსტის ფოტო, სლაიდი, გუნდი, პარტნიორი) | ბლოკავს | იგივე + მედიის ბიბლიოთეკა („ხარვეზის“ ნიშანი) |
| სათაურების იერარქია (H3 მხოლოდ H2-ის შემდეგ) | ბლოკავს | `validate.js` (`body`) |
| ბმულის ტექსტი აღწერითია („აქ“, „აქ დააჭირე“, „ბმული“, „მეტი“ — არა) + არარსებული სტატია | ბლოკავს | `validate.js` (`GENERIC_LINK_TEXT`; ბმული — მხოლოდ საჯარო slug-ებთან) |
| ვიდეო: სუბტიტრები | ბლოკავს | `validateVideo` |
| ვიდეო: ტრანსკრიპტი (თანმიმდევრული, ≤ duration) | ბლოკავს | `validateVideo` |
| ვიდეო: აუდიოაღწერა — ან „ვიზუალური ინფორმაცია აუდიოშიცაა“ (`visualInAudio`) | ბლოკავს | `validateVideo` (F8: + `visualInAudio`) |
| სლაიდის მარტივი ენის ვერსია | ბლოკავს | `validateSeries` |
| ღონისძიების ხელმისაწვდომობა (ეტლი, თარჯიმანი, სუბტიტრები, ფორმატი) | ბლოკავს | `validateEvent` |
| ჟესტური ენის ვერსია; ქართული სუბტიტრი ნაგულისხმევად | აფრთხილებს | `validateVideo` |
| PDF tagged-ად (PDF/UA) დადასტურებული | აფრთხილებს | `validateSeries` (F8: `pdfUntagged`, მხოლოდ ატვირთულ PDF-ზე) |
| კონტრასტი ≥ 7:1 (ფერის არჩევა არ არსებობს) | ინფორმაციული | — |
| ხმოვანი ვერსია გამოქვეყნების შემდეგ | ინფორმაციული | — |

### ფერების გადახვევები (კონტრასტით)

| სად | დაფაზე | კოდში | კონტრასტი |
|---|---|---|---|
| სტატუსის ფონი | ტინტები #E3F6EE, #FFF1E0, #FDECEA / #0A2E22, #33280B, #3A1515 | surface + ხატულა + ტექსტი + 2px ჩარჩო | — |
| „გამოქვეყნებული“ (✓) | ტინტზე #08704C | #08704C / #3DDC97 / #FFFFFF | 6.1 / 8.8 / 21:1 |
| „დაგეგმილი“ (საათი) | მუქში #FFD166 (CTA-ს hover) | #A8430C / #FF8A4C / #FFE600 | 6.1 / 6.7 / 16.6:1 |
| ხარვეზი, შეცდომა | ტინტზე #B3261E | #B3261E / #F2B8B5 | 6.5 / 9.1:1 |
| sidebar-ის ტექსტი | #DCE6F1 | #EAF0F7 | 14.69 (#0A1D38) / 17.22:1 (#030B16) |
| „გასვლის“ ჩარჩო | #3A5A80 (2.4:1) | #8FA3BC | 6.53:1 |
| აქტიური პუნქტი | rgba(255,184,28,.18) | #2B4A70 + 4px #FF8A4C ხაზი + 800 წონა | ტექსტი 7.90:1, ხაზი ≈ 3.9:1 |
| „ადმინი“ | #FFB81C | #FF8A4C | ≥ 6.59:1 |
| ავატარი | ოქროსფერი წრე | ink-ის შევსება | 15.9:1 |
| ჯგუფის სათაური | #8FA3BC | #B8C7D9 | 9.80:1 |
| სიმტკიცის ზოლი | მწვანე | ink / #6B7B91 კონტური | კონტური 4.31:1 |
| ხელსაწყოს აქტიური ფორმატი | — | ink-ის შევსება + `aria-pressed` | 15.39 / 13.59 / 21:1 |

### შექმნილი ფაილები

- `src/admin/`: `AdminRoot.jsx`, `routes.jsx`, `content-types.js`, `a11y-rules.js`, `format.js`, `admin.css`; `api/{adminAdapter,mock,http,permissions}.js`; `auth/{AuthProvider.jsx,auth-context.js,auth-forms.js,RequireAuth.jsx,RequireRole.jsx}`; `shell/{AdminShell.jsx,AdminNav.jsx,admin-nav.js,admin-page.js,useAdminLayout.js,initials.js}`; `components/{Dialog,ConfirmDialog,StatusBadge,PasswordField}.jsx`; `pages/{LoginPage,DashboardPage,ListPage,A11yReportPage,SearchPage,MediaPage,DocumentsPage,UsersPage,SettingsPage,Forbidden,AdminNotFound,AdminRouteError,AdminRootError}.jsx`; `editor/{EditorPage.jsx,EntityEditor.jsx,PreviewPage.jsx,RichTextEditor.jsx,extensions.js,serialize.js,checklist.js,path.js,datetime.js,vtt.js,autosave.js,editor.css}`, `editor/fields/FieldRenderer.jsx`; `schemas/{index,common,articles,news,events,series,videos,pages}.js`; `i18n/{ka,index}.js`; `__tests__/{admin-helpers.jsx,auth.test.jsx,screens.test.jsx,api.test.js,editor-units.test.js,editor.test.jsx}`.
- `src/content/mock/store.js` (საერთო in-memory საცავი).
- შეიცვალა: `src/routes.jsx` (`createRouterOptions`, `ADMIN_PATH`), `src/main.jsx`, `src/content/{adapter,errors,validate,model}.js`, `src/content/mock/index.js`, `src/i18n/{ka,en}.js` (`errors.unauthorized|forbidden|conflict|rate-limited`, `checks.pdfUntagged`), `src/assets/icons/icons.svg` (+14), `vite.config.js` (`build.manifest`), `eslint.config.js` (`no-noninteractive-tabindex` → region), `scripts/check-dist.mjs` (საჯარო ↔ ადმინის chunk-ები), `scripts/audit.py` (`admin` ნაწილი), `package.json` (+ `@tiptap/{core,react,pm,starter-kit,extension-image,extension-blockquote}` 3.31.4, exact), `CLAUDE.md`, `docs/project-context.md`.

### საჯარო API

**როუტინგი** (`@/routes.jsx`): `createRouterOptions() → { patchRoutesOnNavigation }` — ადმინის როუტები `/admin`-ზე პირველი გადასვლისას ემატება (lazy route discovery, ერთხელ, ერთდროული გადასვლები ერთ ჩატვირთვას ელოდება); `ADMIN_PATH` (`/admin`, `/admin/…`, არა `/administration`). `createRouterOptions()` გადაეცემა `createBrowserRouter`-ს (main.jsx) და ტესტების `createMemoryRouter`-ს. `@/admin/routes.jsx`: `createAdminRoutes()`; `handle.admin = { title: i18n-key | (params) => string, crumbs?: (params) => Crumb[], root?, editor? }`.

**adminAdapter** (`@/admin/api/adminAdapter.js`; ყველა → Promise, შეცდომა → `ContentError`):
- `auth`: `login({ email, password, remember })`, `register({ name, email, invite, password })`, `logout()`, `me() → Session`, `extendSession()`; `Session = { user: AdminUser, expiresAt }`, `AdminUser = { id, name, email, role: 'admin' | 'editor', status: 'active' | 'invited' | 'deactivated' }`.
- `content`: `list({ type: ContentType | 'all', status, q, page, limit = 10, check }) → { items: ContentRow[], total, page, pages, limit }`, `get(id) → ContentRecord` (+ `working` — გამოქვეყნებულის სამუშაო ასლი), `create(type, data)`, `update(id, data, { version, autosave })` (ძველი ვერსია → `conflict`; `autosave` გამოქვეყნებულზე/დაგეგმილზე → სამუშაო ასლი, საიტი არ იცვლება), `checkSlug(type, slug, id) → { available }`, `remove(id)` (F8.1: სამუდამო წაშლა — ჩანაწერი, ვერსიები და სამუშაო ასლი; 7 გვერდი → `bad-request`), `publish(id, { version, data })`, `schedule(id, at, { version, data })` (ბლოკერი → `validation` + `fields` — ველის გზა → `{ code, message }`), `versions(id) → VersionInfo[]`, `restoreVersion(id, version)`, `search(q) → ContentRow[]`. id ტიპის პრეფიქსითაა (`a-001`, `s-`, `v-`, `n-`, `e-`, `p-`).
- `media`: `list({ kind: 'image' | 'document', missingAlt })`, `upload(file, meta)`, `updateAlt(id, alt)` (ყველა გამოყენებაში აისახება), `update(id, patch)` (დოკუმენტი: `title`, `lang`, `tagged`), `remove(id)` (გამოყენებული → `conflict`), `usage(id)`. `MediaItem = { id, kind, src, alt, title, ratio, size, lang, tagged, usage: { type, id, title, field }[] }`.
- `users`: `list()`, `invite({ email?, role }) → { code, link: '/admin/login?tab=register&invite=…', expiresAt, role }`, `setRole(id, role)`, `deactivate(id)` (საკუთარ თავზე → `bad-request`).
- `settings`: `get() → { site: SiteSettings, featured: { weeklyVideo, featuredArticle, featuredSeries, featuredNews } }` (id-ები), `update(patch)` — ახალი რჩეული წინას ხსნის.
- `stats() → { published, draft, scheduled, nextScheduledAt, a11yIssues, counts: Record<ContentType, n>, library: { images, documents } }`, `a11yReport() → { totals, groups: { code, severity, count, types }[], items }`.
- `setAdminAdapter(adapter | null)`, `UNAUTHORIZED_EVENT` ('mc-admin:unauthorized' — სესიის გარეთ 401 → შესვლის გვერდი).
- mock: `createMockAdminAdapter({ store, delay, sessionTtl })`, `adminState(store)`, `MOCK_PASSWORD`, `MOCK_INVITE`, `SESSION_TTL_MS` (30 წთ), `PAGE_DEFS`. HTTP: `createHttpAdminAdapter({ baseUrl, fetch })` — `credentials: 'include'`, CSRF double-submit (`mc-csrf` cookie → `X-CSRF-Token`), `readCsrfToken()`; ჩაირთვება `VITE_ADMIN_API`-ით.

**საერთო mock-საცავი** (`@/content/mock/store.js`, რეექსპორტი `mock/index.js`-იდან): `createMockStore({ now, data }) → MockStore` (`records`, `find`, `findBySlug`, `insert`, `replace` (ვერსია → `conflict`), `setMeta`, `remove`, `snapshot()` — საჯარო ნაკრები, `setSettings`, `setOrg({ team, partners })`, `extra`, `subscribe`), `getSharedMockStore()`, `setSharedMockStore()`, `ID_PREFIX`, `COLLECTIONS`. `createMockAdapter({ store })` — საჯარო adapter-ი საცავს ყოველ მოთხოვნაზე კითხულობს (`snapshot` — getter).

**შეცდომის კოდები (+):** `unauthorized` (401), `forbidden` (403), `conflict` (409), `rate-limited` (429).

**ავტორიზაცია:** `<AuthProvider warningMs expireMarginMs now>`; `useAuth() → { status: 'loading' | 'authenticated' | 'anonymous', user, expiresAt, reason: 'expired' | 'logged-out' | null, login, register, logout, extend, addFlush }`; `useSessionFlush(fn)` — ავტოშენახვა სესიის ამოწურვამდე; `SESSION_WARNING_MS` 120 000, `EXPIRE_MARGIN_MS` 5 000; `auth-forms.js`: `validateLogin`, `validateRegister`, `passwordStrength(pw) → { level 0–3, key, tip }`, `safeNext(next)`, `loginHref(next, reason)`, `PASSWORD_MIN` 12.

**გარსი:** `<AdminShell>` (layout route), `useAdminPage({ title, crumbs, type, editor })`, `useAdminLayout(ref) → 'wide' | 'compact'` (`ADMIN_WIDE_REM` 75, `adminLayoutFor`), `ADMIN_NAV`, `initials(name)`.

**კომპონენტები:** `<Dialog open onClose title description actions role="dialog | alertdialog" initialFocus>` (ნატიური `<dialog>` + `showModal`), `<ConfirmDialog open title description confirmLabel cancelLabel onConfirm onCancel busy>` (ფოკუსი „გაუქმებაზე“), `<StatusBadge status>`, `<IssueBadge count>`, `<PasswordField label hint error strength value …input>`.

**რედაქტორი:** `<EntityEditor type routeId>`; სქემა — `EntitySchema = { type, sections: { id, title, fields: FieldSchema[] }[], defaults(now), rules: string[] }`, `FieldSchema = { name (გზა), kind: 'text' | 'slug' | 'textarea' | 'select' | 'radio' | 'richtext' | 'image' | 'file' | 'repeater' | 'datetime' | 'checkbox' | 'duration', label, hint?, required?, max?, taxonomy? + ids?, options?, ratio?, accept?, template?, fields?, newItem?, itemLabel?, itemTitle?, addLabel?, importVtt?, inputType?, lang? }`; `SCHEMAS`, `schemaFor(type)`, `ABOUT_SECTIONS`. `checklist.js`: `RULES`, `validateEntity(type, values, articleSlugs)`, `validatePage(page)`, `buildChecklist(rules, issues) → { items, done, total, blocking }`. `serialize.js`: `blocksToDoc(blocks)`, `docToBlocks(doc)`, `mergeRuns(runs)`. `path.js`: `parsePath`, `getIn`, `setIn`, `fieldId(path)` (`cover.alt` → `f-cover-alt`), `resolveFieldId(path)`, `sameValue`. `datetime.js`: `splitTbilisi`, `joinTbilisi` (ISO `+04:00`), `toClock`, `fromClock`. `vtt.js`: `parseVtt(text)`, `parseTimestamp`. `autosave.js`: `autosaveDelay()`, `setAutosaveDelay(ms)` (ტესტები). `EDITOR_EXTENSIONS` (TipTap).

**ტოკენები:** ახალი არ არის. **ხატულები (+14):** `dashboard`, `article`, `news`, `pages`, `image`, `document`, `users`, `settings`, `lock`, `clock`, `pencil`, `eye`, `trash`, `logout`.

**i18n:** ადმინის ტექსტი — ცალკე ლექსიკონი `@/admin/i18n/ka.js` + `ta()` (ადმინის chunk-შია, ka.js-ში არა); ჯგუფები: meta, brand, types, pageNames, roles, nav, header, user, auth, fieldErrors, session, status, issues, dashboard, list, a11y, search, errors, common, editor, preview, library, documents, users, settings.

**CSS:** `admin.css` (გარსი, sidebar, header, ცხრილი, სტატუსი, დიალოგი, შესვლა, ჩანართები, პაროლი), `editor/editor.css` (რედაქტორი, ველები, TipTap, ბიბლიოთეკა, მომხმარებლები, პარამეტრები, გადახედვა) — ორივე lazy chunk-თან, HEX-ის გარეშე (ტესტი).

**სკრიპტები:** `npm run audit -- --only admin` (`ADMIN_THEMES`, `ADMIN_WIDTHS`, `ADMIN_SKIP_KEYBOARD`, `ADMIN_KEYBOARD` — ნაწილ-ნაწილ გაშვებისთვის). **სატესტო ანგარიშები (mock):** `admin@example.org` / `editor@example.org`, პაროლი `mc-dev-password`, მოწვევა `MC-INVITE-0001`.

**ბანდლი (gzip):** მთავარი JS 125.19 kB (F7: 123.71 — ხატულები, შეცდომის კოდები, `createRouterOptions`), CSS 14.19 kB; ადმინი — `routes` 13.19 kB + CSS 3.43, admin mock 5.48, EditorPage 7.30, **TipTap (`RichTextEditor`) 131.10 kB** — მხოლოდ რედაქტორში, MediaPage 1.85, SettingsPage 1.65, UsersPage 1.52, DocumentsPage 1.28, PreviewPage 0.96.

### დიზაინიდან და prompt-იდან გადახვევები

1. **ადმინი საჯარო გარსს არ იყენებს:** `AdminShell` — sidebar 268px (16.75rem) + header 76px (prompt).
2. **თავსებადობის მენიუ ადმინის header-ში** და შესვლის გვერდზეც (დაფაზე არ არის) — რედაქტორებსაც სჭირდებათ შრიფტი, განლაგება და კონტრასტი.
3. **სტატუსის ტინტები → ხატულა + ტექსტი + 2px ჩარჩო** surface-ზე (კონტრასტი — ცხრილში ზემოთ); მუქის warn #FFD166 → #FF8A4C.
4. **sidebar:** ტექსტი #DCE6F1 → #EAF0F7; „გასვლის“ ჩარჩო #3A5A80 → #8FA3BC; აქტიური პუნქტი, ავატარი და „ადმინი“ ოქროსფრის გარეშე; პუნქტები `<button aria-current>` → `NavLink`.
5. **რადიუსები** 20 / 22 / 16 / 10 → 24 ბარათი, 32 ბლოკი / ფორმა, 12–14 ველი, 999 ღილაკი / ჩიპი.
6. **„გამოქვეყნებულს“ ✓ ახლავს**, ▲ ზრდის მეტრიკისთვის რჩება.
7. **რედაქტორზე ერთადერთი ოქროსფერი CTA — „გამოქვეყნება“**; header-ის „ახალი მასალა“ იქ secondary-ა.
8. **შესვლის გვერდი:** h1 = ფორმის სათაური (დაფაზე — ბრენდ-პანელზე); პანელი DOM-ში ფორმის შემდეგაა ორივე ზომაზე; „ადმინისტრირება“ / „ადმინი“ ოქროსფერი → #FF8A4C; უპირატესობების მწვანე ✓ → ink; „პაროლის ჩვენება“ 40 → 44px, მუდმივი სახელი + `aria-pressed`; ორფაქტორიანი კოდი, „[15] წუთით ბლოკი“, „რედაქტორის წესებზე“ თანხმობა და როლი „ავტორი“ — ამოღებულია / `[ფრჩხილებშია]`; „პაროლის აღდგენა“ — „[ბმული მზადდება]“; რეგისტრაციის შემდეგ შესვლა პირდაპირ (დაფაზე — „დამადასტურებელი ბმული გაიგზავნა“).
9. **ძიება header-იდან sidebar-ში** (compact-ში — მენიუში), ხილული ლეიბლით: თავსებადობის მენიუს დამატების შემდეგ header 1440-ზე ერთ რიგში აღარ ეტეოდა.
10. **დაფა:** 8fr | 4fr მხოლოდ ≥ 84rem შიგთავსზე — 1440-ზე ერთ სვეტადაა, რომ „ბოლო ცვლილებების“ ხუთი სვეტი სქროლის გარეშე დაეტიოს; ბილიკი დაფაზე არ არის.
11. **სია:** კატეგორიის ჩიპები, სტატუსის select, მასობრივი მონიშვნა — არ არის (prompt-ში არ იყო); ღილაკები 40 → 44px; გვერდზე 10 სტრიქონი.
12. **„საიტის ნახვა“:** საიტის ერთიანი ფორმულირება „(იხსნება ახალ ჩანართში)“ და არა „(ახალ ფანჯარაში)“.
13. **გამოქვეყნების radio:** სამიანის (მონახაზი / დაგეგმილი / გამოქვეყნებული) ნაცვლად „როდის: ახლავე / დაგეგმვა“; მონახაზი — ცალკე ღილაკი „მონახაზად შენახვა“ (გამოქვეყნებულზე — დადასტურებით, მასალას საიტიდან ხსნის). Doc-ის კომენტარში დასადასტურებელია.
14. **Ctrl/⌘+S = ახლავე შენახვა** (prompt: „მონახაზად შენახვა“) — გამოქვეყნებულ მასალას საიტიდან არ ხსნის.
15. **გამოქვეყნებულის ავტოშენახვა = სამუშაო ასლი** (`working`) — საიტზე „გამოქვეყნებამდე“ არ ჩანს.
16. **`/admin/:type/new` → `:type/:id`, `id = new`** — შექმნისას იგივე როუტი რჩება, რედაქტორი თავიდან არ იხატება.
17. **ხელსაწყოები:** დაფის „B“ → „მუქი“, „• სია“ → „სია“ + „დანომრილი“, „„ ““ → „ციტატა“ (label-in-name); ღილაკები 40 → 44px. ბმული-ბლოკი (`LinkBlock`) და `lang` ფრაგმენტი რედაქტორში ინახება, ღილაკი არ აქვს.
18. **ველიდან გასვლა (blur) ავტოშენახვას იწვევს** — „შეუნახავი ცვლილების“ დიალოგი ჩანს მხოლოდ მაშინ, როცა გადასვლა ფოკუსის დაკარგვის გარეშე ხდება (ბრაუზერის „უკან“, მალსახმობი).
19. **ვერსიების შედარება** (დაფაზე) — არ არის (prompt: სია + აღდგენა).
20. **ინიციალები მხედრულად** — `toUpperCase()` მთავრულს (ᲡᲒ) აბრუნებდა.
21. **გადახედვა** საჯარო კომპონენტებით (`ArticleBody`, `Slider`, `VideoPlayer`, `EventCard`) ადმინის გარსში, h2 სათაურით (h1 header-შია).

### ღია საკითხები

1. **mock-ავტორიზაცია წარმოებაში:** CMS-მდე სატესტო ანგარიშები ადმინის chunk-შია; რეალურ გაშვებამდე `VITE_ADMIN_API` (backend) აუცილებელია.
2. **სერვერის TODO:** `X-Robots-Tag: noindex, nofollow` ყველა `/admin` პასუხზე (SPA-ს index.html meta-ს JS-ის გარეშე არ შეიცავს); შესვლის / რეგისტრაციის rate limit (`[N]` მცდელობა, `[ვადა]`); სესიის ვადა (mock — 30 წთ) და მოწვევის ვადა (mock — 14 დღე) — `[ვადა]`, სერვერის პოლიტიკა; ფაილის ზომისა და ტიპის ზღვარი.
3. **გამოქვეყნების radio** — ორი თუ სამი არჩევანი (Doc-ის კომენტარი).
4. **გვერდების ველები** (სათაური, შესავალი, აღწერა) ინახება, მაგრამ საჯარო გვერდები ტექსტს ჯერ i18n-დან კითხულობს — CMS-თან ერთად; „ჩვენ შესახებ“-ის გუნდი და პარტნიორები საიტზე უკვე აისახება (`setOrg`).
5. **TipTap 131 kB gzip** — მხოლოდ რედაქტორში; შემცირება (ProseMirror-ის მოდულების tree-shaking, StarterKit-ის ნაცვლად ცალკე გაფართოებები) — საჭიროებისას.
6. **mock-ში გადატვირთვა სესიას და ცვლილებებს შლის** (მეხსიერება); რეალურ API-ზე სესია httpOnly cookie-შია.
7. **ადმინის მობილური დიზაინი** დაფაზე არ არის — 390 აწყობილია შიდა პატერნებით (compact-მენიუ, ცხრილი სქროლ-რეგიონში); დიზაინის დადასტურება ღიაა.
8. **ეკრანის მკითხველი რეალურ მოწყობილობაზე:** TipTap-ის `role="textbox"` + toolbar, `<dialog>` / `alertdialog`, ცხრილის სქროლ-რეგიონი — NVDA / VoiceOver (P2, F7 #1-ის გაგრძელება).
9. **ადმინს ინგლისური ლექსიკონი არ აქვს.**
10. **დაფები გასასწორებელია:** AdminAuth / AdminPanel — ტინტები, ოქროსფერი „ადმინისტრირება“ / აქტიური პუნქტი / ავატარი, #DCE6F1, #3A5A80, რადიუსები, 40px ღილაკები, „B“, სტატუსის select, მასობრივი მონიშვნა.
11. **დახურულია:** F6 #1 (რჩეული ერთია — `settings.update`), F2 #8 (CMS-ზე შემოწმება — ადმინის ჩეკლისტი, ბმული მხოლოდ საჯარო slug-ებთან), project-context §9.12 (ნაწილობრივ — „ჩვენ შესახებ“ რედაქტორში). ძალაშია: F1 5, 7; F2 4, 6, 7, 9–11; F3 1, 6, 7; F4 1–3, 6–11; F5 1, 2, 5, 7–9; F6 3–5, 8–11; F7 1–5.

### შემდეგი

8 ნაბიჯი დასრულებულია. შემდეგი ეტაპი — backend / CMS-ის არჩევა (§9.4): `ContentAdapter` + `AdminAdapter`-ის რეალიზაცია, ჰოსტინგი (`X-Robots-Tag`, rate limit, prerender), რეალური კონტენტი `[ფრჩხილების]` ნაცვლად (`npm run placeholders`).


## F8.1 — წაშლა არქივის ნაცვლად (2026-10-27)

**მოთხოვნა:** კონტენტის სიაში „არქივი“ → სამუდამო „წაშლა“.

- `content.archive(id)` → **`content.remove(id)`** (mock: `store.remove` + ვერსიები + სამუშაო ასლი; HTTP: `DELETE /items/:id`). წაშლილი მასალა ქრება ადმინის სიიდან, საჯარო საიტიდან, ძიებიდან და მედიის ბიბლიოთეკიდან (მისი ჩადგმული ფოტო / PDF); მასზე სხვა მასალის ბმული ჩეკლისტში „არარსებულ მასალად“ ჩნდება. 7 საჯარო გვერდი არ იშლება (`bad-request`, ღილაკი არ ჩანს).
- `RecordMeta.archived` და საცავის / adapter-ის არქივის ფილტრები ამოღებულია; `TYPE_CONFIG[type].archivable` → `deletable`.
- სია: ღილაკი „წაშლა: [სათაური]“ (ხატულა `trash`, `archive` სპრაიტიდან ამოღებულია); დადასტურება — ნატიური `<dialog>` „წაშლა: „[სათაური]““, აღწერა „სამუდამოდ წაიშლება … დაბრუნება შეუძლებელია“, ფოკუსი „გაუქმებაზე“, დადასტურების ღილაკი — „სამუდამოდ წაშლა“; შედეგი — `role="status"` „„[სათაური]“ წაიშალა.“, ფოკუსი ცხრილზე.
- უფლება — `content.write` (რედაქტორი და ადმინისტრატორი, როგორც არქივზე იყო).
- **Gate:** lint ✓ · test ✓ (34 ფაილი, 624; არქივის ორი ტესტი → წაშლის სამი) · Chromium axe — სია გახსნილი წაშლის დიალოგით, 3 თემა × 1440 / 390: 0 დარღვევა; 390-ზე დიალოგის სათაური და აღწერა axe-ს „incomplete“-ია (top-layer `<dialog>`-ის გადაფარვა — `bgOverlap`), computed style-ით: 15.39 / 13.59 / 21:1 · build + check-dist ✓.
- **ღია საკითხი:** წაშლა შეუქცევადია — რეალურ backend-ზე „სანაგვე“ (რბილი წაშლა N დღით) ან წაშლის უფლება მხოლოდ ადმინისტრატორს — დასადასტურებელია.

## F9 — ინგლისური ვერსია ✅ (2026-10-28)

**მოთხოვნა:** საიტის ყველა გვერდი, ადმინ პანელის ჩათვლით, ინგლისურადაც ხელმისაწვდომი.

**Gate:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (38 ფაილი, 641 ტესტი; F9-ის ახალი — 17) · `npm run build` ✓ + check-dist ✓ (43 JS chunk; საჯარო 30 chunk-ში ადმინი / TipTap არ არის; ინგლისური ლექსიკონი — ცალკე dynamic chunk, `/`-ზე არ იტვირთება — Chromium-ში შემოწმდა; ადმინის ინგლისური ლექსიკონი ადმინის chunk-შია) · **Chromium 141 + axe-core 4.14.0** (`npm run audit -- --only en`): ინგლისური ვერსიის 17 მდგომარეობა (11 საჯარო როუტი `/en`-ით + `/en/admin` შესვლა, დაფა, სია, რედაქტორი English ჩანართით, პარამეტრები, მედია) × light / dark / contrast × 1440 / 390 = **102 გაშვება — 0 დარღვევა, 0 incomplete, ჰორიზ. სქროლი 0, `<html lang="en">` ყველგან**. რეგრესია ქართულზე: საჯარო axe 74 / 74 სუფთა, ადმინი (light 1440) 31 / 31.

### გადაწყვეტილებები

- **მისამართები:** ქართული — ძირი (`/articles`), ინგლისური — `/en` (`/en/articles`, `/en/admin/…`). main.jsx ენას URL-იდან იღებს და `createBrowserRouter`-ს `basename: '/en'` გადასცემს — ყოველი შიდა ბმული (`Link to="/articles"`) თავისთავად `/en`-ს იღებს; ადმინის lazy discovery `/en/admin`-ზეც მუშაობს (`stripLocale`).
- **ენის გადამრთველი** (`LanguageSwitch`): საჯარო ჰედერის ზედა ზოლში, ადმინის header-სა და შესვლის ზოლში — „English“ / „ქართული“ (`lang`, `hreflang`), იგივე გვერდი (query-ით, hash-ით) მეორე ენაზე. ჩვეულებრივი `<a>` — სრული გადასვლა (სხვა basename); mock-ში ადმინის სესია და შეუნახავი მონაცემი ამით იკარგება (რეალურ API-ზე სესია cookie-შია). `EN_HREF` ამოღებულია.
- **ენის მონიშვნა:** `<html lang>` — mc-boot სკრიპტით პირველ რენდერამდე და `setLocale`-ით; `<head>` — `<link rel="alternate" hreflang="ka|en|x-default">` (RootLayout).
- **ინგლისური ლექსიკონი ცალკე chunk-ია** (`en-*.js`, 7.6 KB gzip): main.jsx მას მხოლოდ `/en`-ზე ტვირთავს (`registerDictionary('en', …)`) და მერე ხატავს — ქართველ მომხმარებელს არ ჩამოეტვირთება. საწყისი JS (ქართული): 137.3 KB gzip (main 120.9 + საერთო chunk-ები 16.4; Python gzip-9, entry + სტატიკური import-ები). ადმინის ინგლისური ლექსიკონი ადმინის chunk-შია.
- **ინტერფეისის ტექსტი:** `src/i18n/en.js` (~520 სტრიქონი) და `src/admin/i18n/en.js` (~600) — სრული თარგმანი, იგივე გასაღებები (ტესტი: გასაღებები, ცვლადები, `[EN` placeholder არ არის). `t()` / `ta()` მიმდინარე ენით; დაკარგული ინგლისური გასაღები → ქართული. მრავლობითი: `{ one, other }` (`Intl.PluralRules`). ტონი — ძალა და მოქმედება, სოციალური მოდელი („persons with disabilities“, „the barrier is in the environment“), სიბრალულის ენის გარეშე.
- **ფორმატი:** თარიღი en-GB-ის რიგით, თბილისის დროით („5 March 2026“, „Thursday, 5 March“, „5 March 2026, 10:00“), რიცხვი en-GB („12,500“). ICU-ის ქართული ლოკალის გარეშე მუშაობის წესი (F6) უცვლელია.
- **ხმოვანი რეჟიმი:** ხმა მიმდინარე ენისაა (`findVoice(list, 'ka' | 'en')`, `utterance.lang` = `ka-GE` / `en-GB`); ინგლისურ ტექსტებში — „English voice“.
- **კონტენტის თარგმანი:** მოდელში `translations.en` (ნაწილობრივი ასლი იმავე ფორმით — მხოლოდ ტექსტი). `localize.js`: საჯარო პასუხი მიმდინარე ენაზე — თარგმანი ზემოდან (ცარიელი სტრიქონი → ქართული; მასივი ინდექსით, `body` — მთლიანად), `translations` პასუხში არ ხვდება, ემატება `lang`. ძიება ინგლისურ ტექსტშიც მუშაობს.
- **თარგმანის გარეშე მასალა ინგლისურ საიტზე ქართულად ჩანს** (ნაგულისხმევი — კითხვაზე პასუხი არ იყო): `lang="ka"` სათაურზე, ტექსტზე და მედიაზე (WCAG 3.1.2) + ნიშანი „In Georgian“ (ბარათის მეტა, სტატიის / სიახლის შესავალი). მასალა არ იმალება.
- **რედაქტორი:** „ქართული / English“ ჩანართები (WAI-ARIA tabs); English ჩანართში მხოლოდ თარგმნადი ველები (`translations.en.<გზა>`, `lang="en"`): text / textarea / richtext, ფოტოს alt, repeater-ის ტექსტური ქვეველები — სტრუქტურის გარეშე; მინიშნება — ქართული ორიგინალი. ჩეკლისტი არჩეული ენის ვერსიას აჩვენებს; ინგლისური ვერსიის ბლოკერი (alt, სათაურების რიგი, ბმულის ტექსტი, მოკლე აღწერა, მარტივი ენა) გამოქვეყნებას აჩერებს რედაქტორშიც და adapter-შიც, თუ თარგმანი არის.
- **პარამეტრები:** სექცია „ინგლისური ვერსია“ — პასუხის ვადა, მისამართი, „როგორ მოგვაგნო“, ვიდეოზარის განრიგი, მესენჯერის სახელი, საათები, ოფისის ხელმისაწვდომობა (ტელეფონი, ელფოსტა, ბმულები — საერთო).
- **mock:** `src/content/mock/translations.js` — ინგლისური ვერსია ნაწილი მასალისა (3 სტატია, 2 სიახლე, 1 სერია, 1 ვიდეო, 2 ღონისძიება, გუნდის 3 წევრი, პარამეტრები) — `[placeholder]`-ის თარგმანი, ფაქტის გარეშე; დანარჩენი — ქართულად („In Georgian“). 7 გვერდის სახელი ორივე ენაზე.

### შექმნილი / შეცვლილი ფაილები

- ახალი: `src/i18n/locale.js`, `src/content/localize.js` (+ ტესტი), `src/content/mock/translations.js`, `src/components/layout/LanguageSwitch.jsx` (`LanguageSwitch`, `AlternateLinks`), `src/admin/i18n/en.js`, `src/admin/editor/TranslationFields.jsx`, `src/admin/editor/translation.js`, `src/i18n/en-pages.test.jsx`, `src/admin/__tests__/{i18n,english}.test.js(x)`.
- შეცვლილი: `src/i18n/{index,format,ka,en,i18n.test}.js`, `src/test/setup.js` (ინგლისური ლექსიკონის რეგისტრაცია), `src/main.jsx` (basename, ლექსიკონის lazy-ჩატვირთვა), `src/routes.jsx`, `index.html` (mc-boot: lang), `src/features/a11y/speech.js`, `src/content/{model,mock/index,mock/data}.js`, `src/components/ui/Card.jsx` + 7 ბარათი, `src/features/articles/ArticleBody.jsx`, `src/pages/{ArticlePage,NewsItemPage,RootError}.jsx`, `src/components/media/{Slider,Transcript,VideoPlayer}.jsx`, `src/features/{development/SeriesDeck,videos/VideoStage}.jsx`, `src/components/layout/{SiteHeader,RootLayout,site-nav}.js(x)`, `src/styles/components.css`, ადმინი — `i18n/{ka,index}.js`, `shell/AdminShell.jsx`, `pages/{LoginPage,SettingsPage}.jsx`, `editor/{EntityEditor,RichTextEditor,checklist,PreviewPage}.js(x)`, `editor/fields/FieldRenderer.jsx`, `editor/editor.css`, `admin.css`, `api/mock.js`; `scripts/{i18n-stub.mjs,audit.py}`; `CLAUDE.md`, `docs/project-context.md`.

### საჯარო API (+)

- `@/i18n/locale.js` (რეექსპორტი `@/i18n/index.js`-იდან): `LOCALES`, `DEFAULT_LOCALE`, `EN_PREFIX` ('/en'), `LANG_TAG` ({ ka: 'ka-GE', en: 'en-GB' }), `getLocale()`, `setLocale(locale)` (+ `<html lang>`), `isLocale`, `localeFromPath(pathname)`, `stripLocale(pathname)`, `localizePath(path, locale?)` (`/admin`, გარე, `#`, `?` უცვლელია), `alternatePath(location, locale)`, `storedLocale()` / `storeLocale()` (`mc-lang`, მომავლისთვის).
- `@/i18n/index.js`: `registerDictionary('en', dict)` — ინგლისური ლექსიკონის ჩართვა (main.jsx — დინამიკური import `/en`-ზე, ტესტები — `src/test/setup.js`); რეგისტრაციამდე `t()` ქართულს აბრუნებს; `t()` — მიმდინარე ენით; `createT(dict, { fallback, lang })` — მრავლობითი `{ one, other }`, სარეზერვო ლექსიკონი; `createLocalizedT(kaDict, enDict)` (ადმინის `ta`); `getLang()`. `LANG` ამოღებულია.
- `@/i18n/format.js`: `MONTHS_EN`, `MONTHS_SHORT_EN`, `WEEKDAYS_EN`; ფორმატი მიმდინარე ენით. `LOCALE` — მოძველებული.
- `@/content/localize.js`: `overlay(base, patch, key)`, `isTranslated(item, locale)`, `localize(item, locale)` → `{ …, lang }`, `localizeSnapshot(snapshot, locale)`, `contentLang(item, locale?)`.
- მოდელი: `translations?: { en?: DeepPartial }` ყველა კონტენტის ერთეულზე და `SiteSettings`-ზე; საჯარო პასუხში `lang: 'ka' | 'en'`.
- `<Card contentLang>` (სათაური / ტექსტი / მედია `lang` + ნიშანი), `<ArticleBody lang>`, `<Slider contentLang>`, `<Transcript contentLang>`; `<LanguageSwitch className>`, `<AlternateLinks />`.
- speech: `findVoice(list, lang)`, `syncSpeechLocale()`; `SPEECH_LANG` — მოძველებული.
- ადმინი: `ta()` — მიმდინარე ენით; `adminDictionaryEn`; `<TranslationFields sections ctx headingLevel>`, `EN_PREFIX` ('translations.en'), `isTranslatable(field)` (`translate: false` — გამონაკლისი); `checklist.js`: `EN_CODES`, `validateTranslation(type, values, slugs)`.
- i18n-ის ახალი გასაღებები: `nav.otherLanguage` (`nav.english`-ის ნაცვლად), `common.inLanguage.{ka,en}`; ადმინი — `editor.lang.*`, `settings.sections.english`, `settings.hints.english`.
- `npm run audit -- --only en` (`EN_THEMES`, `EN_WIDTHS`); `npm run i18n:stub` — ორივე წყვილი (საიტი, ადმინი), თარგმანს და მრავლობითს ინარჩუნებს.

### ღია საკითხები

1. **ორგანიზაციის ოფიციალური ინგლისური სახელი** — ახლა თარგმანი „More Participation for Development and Social Change“ (მოკლე — „More Participation“).
2. **ჰოსტინგი:** `/en/*` → index.html (SPA fallback); prerender (hreflang-იანი HTML JS-ის გარეშეც); `X-Robots-Tag` `/en/admin`-ზეც.
3. **ენის გადართვა სრული გადატვირთვაა** — mock-ში ადმინის სესია იხურება (რეალურ API-ზე — არა).
4. **ვიდეოს ინგლისური სუბტიტრები / აუდიოაღწერა** — ფაილები (VTT) ენის მიხედვით, კონტენტის გეგმა; ინგლისური ტრანსკრიპტი ტექსტად უკვე ითარგმნება.
5. **გვერდების სტრუქტურირებული ველები და FAQ** საჯარო გვერდებზე ჯერ i18n-დან / mock-იდან მოდის — CMS-თან ერთად; FAQ-ის რედაქტირება პარამეტრებში არ არის.
6. **ადმინის სიაში თარგმანის სტატუსის სვეტი / ფილტრი** („თარგმანის გარეშე“) — საჭიროებისას.
7. **ეკრანის მკითხველით შემოწმება** ორენოვან გვერდზე (`lang` ცვლილებები) — NVDA / VoiceOver რეალურ მოწყობილობაზე.

## F9.1 — ენის გადამრთველი ადმინში (2026-10-28)

**ხარვეზი (მომხმარებლის შეტყობინება):** ადმინში „English“ ღილაკზე დაჭერა ენას არ ცვლიდა — წარწერები ქართულად რჩებოდა.

**მიზეზი:** `localizePath()` `/admin`-ის გზებს გამონაკლისად ტოვებდა (F9-ის თავდაპირველი იდეით ადმინის ენა პარამეტრი იყო), ამიტომ ადმინში გადამრთველის ბმული იმავე ქართულ გვერდზე (`/admin/…`) მიდიოდა. საპირისპირო მიმართულება (`/en/admin` → `/admin`) მუშაობდა, ამიტომ ტესტმა ხარვეზი ვერ დაიჭირა.

**გასწორება:**
- `localizePath('/admin/…', 'en')` → `/en/admin/…` (გამონაკლისი ამოღებულია); ადმინის გადამრთველი იმავე ეკრანზე გადაჰყავს, query-ით.
- mock: სესიის ჩანაწერი (მომხმარებლის id + ვადა, არა token) `sessionStorage`-ში (`mc-admin-mock-session`, `createMockAdminAdapter({ persist: true })` — მხოლოდ აპლიკაციის mock-ში) — ენის გადართვა (სრული გადატვირთვა) ანგარიშიდან აღარ გამოიყვანს. რეალურ API-ზე სესია httpOnly cookie-შია, JS-ში არაფერი ინახება. ტესტებში `persist` გამორთულია.
- ინგლისურ ადმინში მასალის სათაური ინგლისურად ჩანს, თუ თარგმანი არის (`ContentRow.titleEn` — სია, დაფა, ძიება, ანგარიში); თუ არა — ქართულად `lang="ka"`-ით (WCAG 3.1.2). რედაქტორის header-ის h1 (მასალის სათაური) — `lang="ka"` ინგლისურ პანელში (`useAdminPage({ titleLang })`).
- ტესტები (+3): ქართული ადმინის გადამრთველი → `/en/admin/articles?status=draft`; ინგლისური სიის სათაურები; mock-ის სესიის აღდგენა / წაშლა.

**შემოწმება:** lint ✓ · test 644 / 644 · build + check-dist ✓ · Chromium (build-ი და dev-სერვერი): `/articles` → „English“ → `/en/articles` (ნავიგაცია ინგლისურად); ადმინი `/admin/articles` → „English“ → `/en/admin/articles` (სესია რჩება, მენიუ, სათაური და CTA ინგლისურად) → „ქართული“ → უკან. ინგლისური ვერსიის ეკრანებზე ქართული ტექსტის სკანი: ინტერფეისის წარწერა ქართულად აღარ რჩება — ქართული მხოლოდ მასალაა (სათაურები, alt, სახელები, `[placeholder]`). axe (en: light 1440, dark 390, contrast 390; ka ადმინი light 390) — 0.

**API (+):** `rowTitle(row) → { text, lang }`, `baseLang()` (`src/admin/display.js`); `ContentRow.titleEn`; `AdminPageInfo.titleLang`; `MOCK_SESSION_KEY`; `createMockAdminAdapter({ persist })`.

**ღია:** ინგლისურ პანელში ბილიკის (breadcrumb) ბოლო ელემენტი — მასალის ქართული სათაური — `lang`-ის გარეშეა (Breadcrumbs-ის `label` სტრიქონია); mock-ში ენის გადართვა მასალის შეუნახავ ცვლილებებს მაინც კარგავს (მეხსიერების საცავი გადატვირთვაზე თავიდან იქმნება).

## F10 — ვიდეო YouTube-ის ბმულით (დაგეგმილი, ჯერ არ არის აწყობილი) (2026-10-28)

**მოთხოვნა:** ადმინიდან ვიდეო ემატება YouTube-ის ბმულის ჩასმით. **სათაური და აღწერა YouTube-იდან არ მოდის** — რედაქტორი წერს ადმინში. გადაწყვეტილება — project-context §10 „ვიდეო YouTube-დან“, ღია საკითხები — §9 #23.

### რა იცვლება (გეგმა)

| სად | ცვლილება |
|---|---|
| მოდელი (`model.js`) | `Video.youtube?: { id: string }` — ფაილის `sources[]`-ის ალტერნატივა; ინახება მხოლოდ id |
| ბმულის ამოცნობა (`src/content/youtube.js`, ახალი) | `parseYouTube(url) → id | null`: `watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `youtube-nocookie.com/embed/`; `t=`, `list=` და სხვა პარამეტრი იშლება; id — 11 სიმბოლო `[A-Za-z0-9_-]`; ტესტი ≥ 10 ფორმით (მათ შორის არასწორი) |
| ადმინის სქემა (`schemas/videos.js`) | ახალი ველის სახე `youtube` (ბმულის ველი, ლეიბლი „YouTube-ის ბმული“, მინიშნება „ჩასვი ვიდეოს მისამართი — სათაური და აღწერა აქ იწერება“); ფაილის ველი — ალტერნატივა („ან ვიდეო ფაილი“). **`title` და `excerpt` ხელითაა** (როგორც ახლა) — ბმულის ჩასმა მათ არ ავსებს და არ ცვლის; ქსელური მოთხოვნა YouTube-თან (oEmbed / Data API) არ ხდება |
| შეცდომა / გაფრთხილება | არასწორი ბმული — ველის შეცდომა ტექსტით და ხატულით; სხვა ვიდეოში უკვე გამოყენებული id — გაფრთხილება ბმულით იმ მასალაზე |
| ჩეკლისტი (`validate.js`, `checklist.js`) | „ვიდეოს წყარო: YouTube-ის ბმული ან ფაილი“ (ბლოკავს); სუბტიტრი YouTube-ის ვიდეოზე — რედაქტორის დადასტურება („ქართული სუბტიტრი YouTube-ზე ატვირთულია“) ან ჩვენი VTT (ბლოკავს); ტრანსკრიპტი და აუდიოაღწერა / `visualInAudio` — უცვლელად ბლოკავს |
| საჯარო ფლეიერი | `VideoSourceAdapter`-ის YouTube-adapter: ჯერ პოსტერი + „ვიდეოს ჩართვა“ (facade), დაჭერის შემდეგ `youtube-nocookie.com/embed/{id}` iframe (`title` = „ვიდეო: {ჩვენი სათაური}“, `rel=0`, `playsinline=1`, `cc_load_policy=1`, `cc_lang_pref=ka`, autoplay-ის გარეშე); IFrame Player API — დრო ტრანსკრიპტის მიმდინარე სტრიქონისთვის და „გადასვლა: 01:23“-ისთვის |
| ინგლისური ვერსია (F9) | სათაური / აღწერა — რედაქტორის English ჩანართში; YouTube-ის id საერთოა; `cc_lang_pref` გვერდის ენით |
| ჰოსტინგი | CSP `frame-src https://www.youtube-nocookie.com`; `script-src` — IFrame API (`https://www.youtube.com/iframe_api`) |
| mock | 1–2 ვიდეო `youtube.id`-ით (`[YouTube-ის id]` — placeholder, რეალური id არ ვიცით) |

### მიღების კრიტერიუმები

- ბმულის ჩასმის შემდეგ სათაურისა და აღწერის ველი უცვლელია (ტესტი); ქსელური მოთხოვნა YouTube-თან ადმინში არ ხდება (ტესტი fetch-ის spy-ით).
- iframe გვერდზე დაჭერამდე არ არის (facade); ავტოდაკვრა არ ხდება.
- ჩეკლისტი ბლოკავს YouTube-ის ვიდეოს სუბტიტრის დადასტურების / ტრანსკრიპტის / აუდიოაღწერის გარეშე.
- axe 0 სამ თემაში × 1440 / 390, ფლეიერი კლავიატურით იმართება.

### ღია საკითხები (გადაწყვეტამდე აწყობა ვერ დასრულდება)

1. **ჟესტური ენა:** YouTube-ის ორი პლეიერის სინქრონი არასაიმედოა — ცალკე YouTube-ვერსია თარჯიმნით (გადამრთველი „ჟესტური ენის ვერსია“) თუ თარჯიმნის საკუთარი ფაილი ჩვენს PiP-ში.
2. **აუდიოაღწერა:** ცალკე YouTube-ვერსია (სრული მიქსი) თუ საკუთარი ფაილი.
3. **სუბტიტრები:** YouTube-ზე ატვირთული ქართული ბილიკი თუ ჩვენი VTT ჩვენს overlay-ში.
4. **პოსტერი:** საკუთარი ატვირთვა 16:9 + alt (რეკომენდებული: კონტროლი, alt, კონფიდენციალურობა) თუ YouTube-ის thumbnail.
5. **ფლეიერის მართვა:** YouTube-ის ჩაშენებული (iframe-ში ჩვენი ფოკუსის რგოლი და 44px სამიზნეები არ მოქმედებს) თუ ჩვენი მართვა `controls=0` + IFrame API.
6. **ხანგრძლივობა:** ხელით (ახლანდელი ველი) თუ IFrame API-ის `getDuration()` ჩართვის შემდეგ.
7. **ვიდეოს სტატუსი YouTube-ზე:** საჯარო / ბმულით (unlisted); წაშლილი / შეზღუდული ვიდეოს მდგომარეობა საიტზე („ვიდეო მიუწვდომელია“ + ტრანსკრიპტი).
