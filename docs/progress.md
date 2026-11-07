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

## F10 — ვიდეო YouTube-ის ბმულით (გეგმა, 2026-10-28; განახლდა B0-სა და B0.1-ში)

გეგმა შესრულდა — შედეგი, გადახვევები და ღია საკითხები: „F10 ✅“ ფაილის ბოლოს.

## Backend — გეგმა დამტკიცდა (2026-10-28)

**გადაწყვეტილება:** საკუთარი REST API — Node.js + **MongoDB**; ჩვენი ადმინ პანელი რჩება ინტერფეისად. სრული გეგმა — project-context **§12** (სტეკი, მონაცემთა მოდელის პირველადი ხედვა, backend-ის წესები, ნაბიჯები B0–B7, B0-ის ჩამონათვალი); §9.4 და §11 განახლდა (§11-ს დაემატა F9 ✅ და F10).

**შემდეგი:** **B0 — გადაწყვეტილებები** (ერთი ჩატი): API-ისა და frontend-ის ჰოსტინგი, Atlas-ის tier / რეგიონი, დომენი (`/api` თუ `api.`), Fastify / Express, driver / Mongoose, ფაილების საცავი, ელფოსტა, F10-ის 4 საკითხი, შენახვის ვადები, გამოწერის დადასტურება. კოდი ამ ნაბიჯზე არ შეცვლილა.

## B0 — backend-ის გადაწყვეტილებები ✅ (2026-11-04)

**Gate:** §12-ის 11-ვე პუნქტს აქვს გადაწყვეტილება ან „ღიაა B?-მდე“ — B1-ს არცერთი არ ბლოკავს ✓ · F10-ის 4 საკითხი გადაწყვეტილია (მომხმარებელი) ✓. კოდი ამ ნაბიჯზე არ შეცვლილა: zip არ ყოფილა და არ იქმნება, lint / test / build არ გაშვებულა.

### გადაწყვეტილებები

| # | საკითხი | გადაწყვეტილება | წყარო |
|---|---|---|---|
| 1 | API-ის ჰოსტინგი | Render Web Service, Frankfurt, ერთი სერვისი (API + `dist/`); წარმოება — Starter; ბიუჯეტი $0 → Fly.io `fra` | B0-ის რეკომენდაცია; tier — ღიაა B7-მდე (ბიუჯეტი) |
| 2 | Atlas | AWS `eu-central-1`; B1–B6 — Free, წარმოება — Flex | რეკომენდაცია; tier — B7 |
| 3 | Frontend | იგივე Fastify სერვისი (`@fastify/static`), SPA fallback, სერვერის meta / 404 | რეკომენდაცია |
| 4 | დომენი | ერთი origin, API `/api/*`; CORS არ არის | რეკომენდაცია; დომენი — B7 |
| 5 | Framework | Fastify 5 (`removeAdditional: false`) | რეკომენდაცია |
| 6 | DB | `mongodb` driver + `$jsonSchema` | რეკომენდაცია |
| 7 | საცავი | Cloudflare R2 (ფოტო, PDF, სუბტიტრის VTT), მიწოდება `/media/*` | რეკომენდაცია |
| 8 | ელფოსტა | `CONTACT_INBOX` = levan.sarajishvili123@gmail.com (env); გამგზავნი — Resend `no-reply@[დომენი]` | მომხმარებელი (მისამართი) + რეკომენდაცია; გამგზავნი — B7 |
| 9 | F10 | ჟესტური ენა — არა; სუბტიტრი — ჩვენი VTT (ka სავალდებულო); აუდიოაღწერა — ცალკე YouTube-ვერსია ან `visualInAudio`; პოსტერი — YouTube-ის კადრი | მომხმარებელი (B0; სუბტიტრი და აუდიოაღწერა — B0.1) |
| 10 | შენახვის ვადები | ნაგულისხმევი env-ით (project-context §12 B0) | მომხმარებლის პასუხი — `[?]`; ღიაა B3 / B4 / B6-მდე |
| 11 | გამოწერა | double opt-in | მომხმარებელი |

სრული ცხრილი, ვადები, ღირებულება და დამოკიდებულებები — project-context §12 „B0 — გადაწყვეტილებები“; წესები — §10 „Backend“ და „ვიდეო YouTube-დან“.

### ფასები და ზღვრები (გადამოწმდა 2026-11-04)

- **Render** (render.com/pricing, render.com/docs/free; მიმოხილვა — jwatte.com, 2026-08-06): Starter $7/თვე (512 MB, 0.5 CPU); Free — 15 წთ უმოქმედობის შემდეგ ჩერდება, გაღვიძება ~1 წთ; Hobby-ზე 5 GB გამავალი ტრაფიკი, შემდეგ $0.15/GB; რეგიონი შექმნის შემდეგ არ იცვლება; Hobby-ზე 2 custom domain.
- **Fly.io** (fly.io/pricing): Frankfurt-ში shared-cpu-1x 256 MB — $2.53/თვე; RAM $6/GB/თვე; ევროპაში egress $0.02/GB; $5-ზე ნაკლები ინვოისი არ ირიცხება. 512 MB ≈ $4.26 (გამოთვლა).
- **Railway** (docs.railway.app/reference/pricing): Hobby $5/თვე, $5-ის მოხმარება შედის; egress $0.05/GB.
- **Atlas Free** (mongodb.com/docs/atlas/reference/free-shared-limitations): 0.5 GB, 100 ops/s, 500 კავშირი, 3 კვანძი; backup — დღეში ერთი, ინახება 4; 30 დღე კავშირის გარეშე → პაუზა; sort 32 MB, aggregation ≤ 50 stage.
- **Atlas Flex** (mongodb.com/docs/atlas/billing/atlas-flex-costs, …/reference/flex-limitations): $8–30/თვე, 5 GB, 500 ops/s; დღეში ერთი snapshot, PITR არ არის. **M10** — $60/თვიდან.
- **Cloudflare Workers / Pages** (developers.cloudflare.com/workers/platform/pricing): static შეუზღუდავი და უფასო; Worker — 100 000 მოთხოვნა/დღე, 10 ms CPU.
- **R2** (developers.cloudflare.com/r2/pricing): თვეში უფასოდ 10 GB, 1 მლნ Class A, 10 მლნ Class B; შემდეგ $0.015/GB-თვე; egress უფასოა.
- **Resend** (resend.com/pricing): უფასოდ 3 000 წერილი/თვე, 100/დღე, 1 დომენი; Pro $20 (50 000). **Postmark**: 100/თვე უფასოდ, $15 (10 000). **Amazon SES**: $0.10 / 1 000.
- **Gmail SMTP**: პირადი ანგარიში — 500 წერილი 24 სთ-ში; App Password ძირითადი პაროლის უფლებებს იძლევა და პაროლის შეცვლისას უქმდება — უარყოფილია.
- **YouTube** (developers.google.com/youtube/terms/required-minimum-functionality): ფლეიერზე overlay აკრძალულია; Referer სავალდებულოა (`strict-origin-when-cross-origin`); viewport ≥ 200 × 200 px; ToS კრძალავს აუდიო / ვიდეო კომპონენტის გამოყოფას ან შეცვლას.
- **Fastify**: `@fastify/ajv-compiler` 4.0.7-ის `default-ajv-options.js` — `removeAdditional: true`, `coerceTypes: 'array'`, `useDefaults: true` (ნაგულისხმევი).
- **npm-ის ბოლო ვერსიები** (2026-11-04): fastify 5.12.8, express 5.3.0, mongodb 7.8.0, mongoose 9.11.4, mongodb-memory-server 11.3.0, @fastify/cookie 11.1.5, @fastify/static 10.1.9, @fastify/helmet 13.2.0, @fastify/rate-limit 11.2.2, argon2 0.45.2 — B1-ში ≥ 14 დღის ვერსია ჩაიკეტება.

### F10 — გადაწყვეტილება → შედეგი WCAG 2.2-ზე

| საკითხი | გადაწყვეტილება | შედეგი |
|---|---|---|
| ჟესტური ენა | არა | 1.2.6 — AAA; AA-ზე გავლენა არ აქვს, AAA-ს პრეტენზია ვიდეოზე არ იწერება |
| აუდიოაღწერა | ცალკე YouTube-ვერსია (`adId`) ან `visualInAudio` | 1.2.3 (A) და 1.2.5 (AA) სრულდება — ბლოკერია |
| სუბტიტრები | ჩვენი VTT, ka სავალდებულო, ზოლში კადრის ქვეშ | 1.2.2 (A) სრულდება — ბლოკერია |
| პოსტერი | YouTube-ის კადრი | დეკორატიული (`alt=""`); კადრი `i.ytimg.com`-იდან დაჭერამდე იტვირთება → კონფიდენციალურობის პოლიტიკა |

### გადახვევები (B0-ის ანალიზიდან და F10-ის გეგმიდან)

1. F10-ის გეგმის „ქართული სუბტიტრი YouTube-ზე ატვირთულია“ (checkbox), `cc_load_policy=1`, `cc_lang_pref=ka` — ჩვენი VTT-ით შეიცვალა: ჩეკლისტი სუბტიტრს ავტომატურად ამოწმებს, ტექსტი დიზაინ-სისტემის შრიფტით, კონტრასტითა და მასშტაბით ჩანს.
2. ვიდეოს წყარო მხოლოდ YouTube-ია: `sources`, `signLanguage`, `audioDescription` (ფაილი) და `poster` მოდელიდან და ადმინიდან ამოიღება (F10); `captions` რჩება; F7-ის native adapter კოდში რჩება.
3. სუბტიტრი ზოლშია კადრის ქვეშ და არა ვიდეოზე (F7-ის native ფლეიერში overlay-ა): YouTube RMF ფლეიერზე ელემენტის დადებას კრძალავს.
4. აუდიოაღწერის ვერსია მთავარის სიგრძისაა (± 1 წმ) — ერთი VTT და ერთი ტრანსკრიპტი ორივეს ერგება; გაფართოებული აღწერა v1-ში არ არის.
5. F10 — **B1-მდე** (§11 / §12 „B2-მდე“ წერდა): B1-ის OpenAPI `Video`-ს სქემას შეიცავს.
6. ფლეიერის მართვა ჩვენია (`controls=0` + IFrame API): დიზაინ-სისტემის ფოკუსის რგოლი, 44px სამიზნეები, ქართული წარწერები, `KeyboardEvent.code`-ის მალსახმობები, CC და აუდიოაღწერის ჩიპები.

### ღია საკითხები

1. **ბიუჯეტი** — Render Starter თუ Fly.io `fra`; Atlas Flex თუ Free (B7).
2. **დომენი და რეგისტრატორი** — B7; გამგზავნის DNS (SPF, DKIM, DMARC). staging მის გარეშე მუშაობს.
3. **შენახვის ვადები** — ნაგულისხმევი (project-context §12) დასადასტურებელია B3 / B4 / B6-ში, კონფიდენციალურობის პოლიტიკასთან.
4. **Atlas:** Free / Flex Frankfurt-ში — კლასტერის შექმნისას; IP access list (PaaS-ის გამავალი IP; თუ სტატიკური არ არის — `0.0.0.0/0` + ძლიერი პაროლი + TLS + `readWrite` ერთ ბაზაზე) — B7 `[შესამოწმებელი]`.
5. **Render-ის ლოგის შენახვის ვადა** — `[შესამოწმებელი]`, B7.
6. **კონფიდენციალურობის პოლიტიკა და ხელმისაწვდომობის განცხადება** — YouTube-ის კადრი და `youtube-nocookie`, Resend (დამმუშავებელი), Atlas-ის backup, ვადები; ვიდეოზე AA (ჟესტური ენა — AAA, არ კეთდება; project-context §9 #25).
7. **Project-ის ინსტრუქცია:** ვიდეოს სტრიქონი („ჟესტური ენის PiP“) B0.1-ს ეწინააღმდეგება — მომხმარებელი ასწორებს (ტექსტი — B0.1); რეპოს `CLAUDE.md` — F10.
8. **newsletter-ის გაგზავნის ხელსაწყო** (გამომწერთა export, გაუქმების ბმული) — B6 / B7.
9. **Gmail (`CONTACT_INBOX`):** 2FA; საიტზე საჯაროდ ჩვენება — ორგანიზაციის გადაწყვეტილება (ადმინის პარამეტრები); მოგვიანებით როლური `info@[დომენი]` (Google Workspace for Nonprofits — საქართველოში ხელმისაწვდომობა `[შესამოწმებელი]`).
10. **ქსელი:** sandbox-ში `fastdl.mongodb.org`-თან კავშირი ვერ დამყარდა (შემოწმდა) — `mongodb-memory-server`-ისთვის network settings-ში B1-მდე დასამატებელი.
11. **კონტრაქტის ცვლილებები შემდეგ ნაბიჯებში** (ორივე მხარეს, ტესტით): `__Host-` cookie-ს სახელები — B3 (`http.js`); `subscribe` → `{ ok, status: 'pending' }` + `confirmSubscription(token)` + `/subscribe/confirm` — B6; base path `/api/*` და `VITE_ADMIN_API` — B1.
12. F8.1-ის ღია საკითხი („სანაგვე“): B0-ში წაშლა რჩება სამუდამო; წაშლილი მონაცემი backup-ში ბრუნვამდე რჩება (პუნქტი 6).

### შემდეგი: F10 — YouTube ვიდეო (frontend, B1-მდე)

შესრულდა — „F10 ✅“ ფაილის ბოლოს: მოდელი, `youtube.js`, `vtt.js`, ადმინის სქემა, ჩეკლისტი, YouTube-adapter (სუბტიტრის ზოლი, აუდიოაღწერის ვერსია), ბარათები, mock, i18n (ka / en), რეპოს `CLAUDE.md`. Gate — F10-ის მიღების კრიტერიუმები. შემდეგ B1 (OpenAPI + `server/`-ის ჩონჩხი); B1-მდე — `fastdl.mongodb.org` network settings-ში.

## B0.1 — სუბტიტრი და აუდიოაღწერა (2026-11-04)

**მოთხოვნა (მომხმარებელი):** ვიდეოს სუბტიტრი და აუდიოაღწერა კეთდება — B0-ის #9 („არა“) შეიცვალა. ჟესტური ენის ვერსია (არა) და პოსტერი (YouTube-ის კადრი) უცვლელია. კოდი არ შეცვლილა.

- **სუბტიტრი:** ჩვენი VTT (B0-ის ანალიზის რეკომენდაცია; ალტერნატივა — YouTube-ზე ატვირთული ბილიკი — ჩეკლისტით არ მოწმდება და `controls=0`-ზე ვერ გადაირთვება). ქართული სავალდებულოა, ზოლში კადრის ქვეშ.
- **აუდიოაღწერა:** ცალკე YouTube-ვერსია (`youtube.adId`, სრული მიქსი, მთავარის სიგრძის) ან `visualInAudio`. საკუთარი აუდიო ჩაჩუმებულ YouTube-ზე გამორიცხულია (YouTube-ის ToS).
- B0-ის დამატებითი წესი („`visualInAudio` = false → ტრანსკრიპტში აღწერის სტრიქონი“) ამოღებულია — აუდიოაღწერის ვერსია მას ცვლის.
- ვიდეო AA-ს აკმაყოფილებს (1.2.2, 1.2.3, 1.2.5); ჟესტური ენა (1.2.6, AAA) — არა.
- შეიცვალა: project-context §6, §9 (#22, #23, #25), §10 („ვიდეო YouTube-დან“, ბლოკერები, ჩეკლისტი, 390px), §11 (#10), §12 (B0 #7, #9, B5, დამოკიდებულებები); progress — F10-ის გეგმა და B0.
- **B5-ზე დამოკიდებულება:** VTT-ის რეალური ატვირთვა (R2, `text/vtt`, `WEBVTT`) — B5; F10 mock-ზე მუშაობს.
- **Project-ის ინსტრუქცია** — ვიდეოს სტრიქონი შესაცვლელია (მომხმარებელი):
  `- ვიდეო: YouTube-ის ბმულით (ფაილი საიტზე არ იტვირთება); სუბტიტრები ნაგულისხმევად — ჩვენი VTT (ქართული სავალდებულო), კადრის ქვეშ და არა ფლეიერზე; აუდიოაღწერა — ცალკე YouTube-ვერსია ან დადასტურება, რომ ვიზუალური ინფორმაცია აუდიოშია; ტრანსკრიპტი დროის ნიშნულებით. ჟესტური ენის ვერსია არ კეთდება. ავტოდაკვრა არასოდეს.`

**შემდეგი:** F10 (B1-მდე) — შესრულდა, „F10 ✅“ ქვემოთ.

## F10 — ვიდეო YouTube-ის ბმულით ✅ (2026-11-04)

**Gate:** lint ✓ (ESLint 0, Prettier ✓) · test ✓ **722 / 722** (42 ფაილი; F9-ის შემდეგ 482) · build ✓ (check-dist: საჯარო 31 chunk-ში ადმინი / TipTap / validate-ის ანგარიში არ არის) · Chromium 153 + axe-core 4.14: **`--only youtube` — 36 მდგომარეობა, 0 დარღვევა** (`/videos`, `/en/videos`, ვიდეოს რედაქტორი ცარიელი და ბმულით + VTT, საჯარო facade, ჩართული ფლეიერი × 3 თემა × 1440 / 390; ერთადერთი incomplete — `frame-tested` ჩართულ ფლეიერზე: iframe-ის შიგთავსი გარეა, axe `iframes: false`); **`--only axe,en` — 74 + 102 მდგომარეობა, 0 / 0** (რეგრესია არ არის); ჰორიზ. სქროლი 0 ყველგან. YouTube-ის ქსელი sandbox-ში მიუწვდომელია — IFrame API ტესტში `installFakeYouTube()`-ით, Chromium-ში `page.route`-ით ყალბდება.

Chromium-ში შემოწმდა: facade-ზე iframe 0, `iframe_api` სკრიპტი არ არის, YouTube-ის მოთხოვნა 0; რედაქტორში ბმულის ჩასმის შემდეგ სათაური უცვლელია, YouTube-ის მოთხოვნა 0; Enter facade-ზე → iframe (`title` „ვიდეო: …“, `tabindex="-1"`, `referrerpolicy`), ფოკუსი „პაუზაზე“, სუბტიტრის ზოლი კადრის გარეთ, K — პაუზა, C — ზოლის გამორთვა / ჩართვა; კადრი 1440-ზე 823 × 463, 390-ზე 346 × 200 (RMF ≥ 200 × 200).

Zip-ის Context-ის ფაილები `docs/progress (1).md` / `docs/project-context (2).md` სახელით მოვიდა — `tokens.test.js` და `components.test.jsx` `docs/project-context.md`-ს კითხულობს (2 ტესტი წითელი იყო); სახელები გასწორდა.

### მოდელის ცვლილება

| ველი | იყო (F7) | F10 |
|---|---|---|
| `youtube` | — | `{ id: string, adId?: string }` — სავალდებულო; ინახება id (11 სიმბოლო), არა URL; mock — `[YouTube-ის id]` / `[YouTube-ის id: აუდიოაღწერის ვერსია]` |
| `sources` | `VideoSource[]` | ამოღებულია (წყარო მხოლოდ YouTube-ია) |
| `poster` | `Image` 16:9 + alt | ამოღებულია — კადრი `youtubePoster(id)`-ით ითვლება (`i.ytimg.com`, maxres → hq, `alt=""`) |
| `audioDescription` | `AudioTrack \| null` (ფაილი) | ამოღებულია → `youtube.adId` ან `visualInAudio` |
| `signLanguage` | `SignLanguageTrack \| null` | ამოღებულია (B0: არ კეთდება) |
| `captions[]` | `CaptionTrack` | რჩება + `cues?`, `end?` (ატვირთვისას `summarizeCues`); ka — `captions`, `default: true`; en — `subtitles`, `default: false` |
| `VideoSummary` | `hasCaptions`, `hasSignLanguage`, `hasAudioDescription` | `youtubeId`, `hasCaptions` (ka ბილიკი), `hasAudioDescription` (`adId`); `hasSignLanguage` ამოღებულია |
| `title`, `excerpt`, `duration`, `transcript`, `visualInAudio`, `translations.en` | | უცვლელი — რედაქტორი წერს; YouTube-იდან არაფერი მოდის |

F7-ის native ველები (`NativeVideo`, `components/media/sources.js`) მხოლოდ `/__kit`-სა და ტესტებშია.

### ჩეკლისტის წესი → ბლოკავს / აფრთხილებს → სად მოწმდება

| წესი (`checklist.js`) | კოდები (`validate.js`) | დონე | სად |
|---|---|---|---|
| `videoSource` — „ვიდეოს წყარო — YouTube-ის ბმული“ (ახალი) | `youtubeMissing`, `youtubeInvalid` (ჩანაცვლება `[…]` დასაშვებია) | ბლოკავს | `validateVideo` (რედაქტორი, mock-ის ანგარიში; B4 — სერვერი); ველის შეცდომა — `YouTubeField` |
| `captionsMissing` — „ქართული სუბტიტრი (VTT): ნაგულისხმევი, ვიდეოს სიგრძის“ | `captionsMissing`, `captionsDefault` (გაფრთხილებიდან ბლოკერად), `captionsEmpty`, `captionsLength` (`end` > `duration` + 1 წმ) | ბლოკავს | `validateVideo`; დაზიანებული / დაულაგებელი / ცარიელი VTT ატვირთვისას — `CaptionsField` (`parseCaptions`, სტრიქონის ნომრით, არ ინახება) |
| `transcriptMissing` | `transcriptMissing`, `transcriptOrder` | ბლოკავს | უცვლელი |
| `audioDescriptionMissing` — „აუდიოაღწერის ვერსია — ან „ვიზუალური ინფორმაცია აუდიოშიცაა““ | `audioDescriptionMissing`, `audioDescriptionSame` (`adId` = `id`) | ბლოკავს | `validateVideo`; `adId` = `id` — ველის შეცდომაც (`differentFrom`) |
| ერთი YouTube-ის id ორ მასალაში | `youtubeDuplicate` | აფრთხილებს | `validateContent` (ნაკრები) + რედაქტორის ველი (`content.checkYouTube`, ბმული იმ მასალაზე) |
| `signLanguageMissing` | — | ამოღებულია (B0) | — |

### facade-ის მდგომარეობები

| მდგომარეობა | კადრი | მართვა | რეგიონის აღწერა / სტატუსი | ქსელი |
|---|---|---|---|---|
| id არ არის / ჩანაცვლებაა (mock) | წყვეტილი ჩარჩო | „ჩართვა“ `aria-disabled` + „ვიდეოს ბმული მზადდება…“, ტრანსკრიპტი ღიაა | მიზეზი | არაფერი |
| facade (id ვალიდურია) | `<img>` maxres → hq (≤ 120px → hq), `alt=""` | „ვიდეოს ჩართვა: {სათაური}“ (კადრის ცენტრში; ≥ 34rem — ოქროსფერი წრე + წარწერა, ვიწროზე — წარწერა 44px), ტრანსკრიპტი; Space / K რეგიონზე რთავს | „ჩართვისას ვიდეო YouTube-იდან (youtube-nocookie.com) ჩაიტვირთება.“ | მხოლოდ `i.ytimg.com` (კადრი) |
| იტვირთება | კადრი iframe-ის ქვეშ | სრული მართვა; ფოკუსი „ჩართვაზე“; შენიშვნა „ვიდეო იტვირთება…“ | „ვიდეო იტვირთება“ | `www.youtube.com/iframe_api` + `youtube-nocookie.com/embed/{id}` |
| მზადაა, დაკვრა დაიწყო | iframe | „პაუზა“; პროგრესი, დრო, ხმა, CC, აუდიოაღწერა, სიჩქარე, სრული ეკრანი, ტრანსკრიპტი; სუბტიტრის ზოლი | „ვიდეო ჩაირთო“ | ჩვენი VTT (same-origin) |
| ბრაუზერმა `playVideo()` არ დაუშვა (2.5 წმ) | iframe | „ჩართვა“ (ფოკუსშია) | „ვიდეო მზადაა — დააჭირე „ჩართვას“.“ | — |
| მიუწვდომელი (`onError` 2 / 5 / 100 / 101 / 150, API ვერ ჩაიტვირთა / 15 წმ) | კადრი, iframe იხსნება | „ჩართვა“ `aria-disabled` + „ვიდეო ამჟამად მიუწვდომელია…“, ტრანსკრიპტი ღიაა | `role="alert"` | — |

### შექმნილი ფაილები

`src/content/youtube.js`, `youtube.test.js` (35 ტესტი: 16 სწორი + 16 არასწორი ფორმა, კადრი, CSP), `src/content/vtt.js`, `vtt.test.js` (19), `src/components/media/youtube-api.js`, `youtube-controller.js`, `YouTubeMedia.jsx`, `__tests__/fake-youtube.js`, `__tests__/youtube.test.jsx` (16), `src/admin/__tests__/youtube-editor.test.jsx` (7).

**შეცვლილი:** `model.js`, `validate.js`, `query.js`, `mock/videos.js`, `mock/translations.js`, `components/media/{sources.js, VideoPlayer.jsx, NativeMedia.jsx, native-controller.js, player-prefs.js, index.js, media.css}`, `components/ui/{Media.jsx, cards/VideoCard.jsx}`, `features/videos/VideoStage.jsx`, `i18n/{ka,en}.js`, `admin/schemas/{videos.js, index.js}`, `admin/editor/{checklist.js, translation.js, TranslationFields.jsx, EntityEditor.jsx, editor.css, fields/FieldRenderer.jsx}`, `admin/api/{adminAdapter.js, http.js, mock.js}`, `admin/i18n/{ka,en}.js`, `scripts/audit.py` (`--only youtube`), რეპოს `CLAUDE.md` (ვიდეოს სტრიქონი B0.1-ით + „კოდის კონვენციები (F10)“), ტესტები (content, media, admin). **წაშლილი:** `src/admin/editor/vtt.js` (→ `src/content/vtt.js`).

### საჯარო API (+)

- `@/content/youtube.js`: `YOUTUBE_ID`, `YOUTUBE_EMBED_ORIGIN`, `YOUTUBE_API_SRC`, `YOUTUBE_THUMB_ORIGIN`, `YOUTUBE_CSP`, `isYouTubeId(v)`, `isPlaceholder(v)`, `parseYouTube(url) → id | null`, `youtubeThumbnail(id, 'maxres' | 'hq')`, `youtubePoster(id) → { src, fallbackSrc, alt: '', ratio: '16:9' }`, `youtubeEmbedUrl(id)`.
- `@/content/vtt.js`: `VTT_MAX_BYTES` (1 MB), `parseCaptions(text) → { ok: true, cues } | { ok: false, code: 'header' | 'timing' | 'order' | 'empty', line }`, `parseCueTime`, `parseTimestamp`, `stripCueTags`, `summarizeCues(cues) → { cues, end }`, `cueAt(cues, t)`, `parseVtt(text)` (ტრანსკრიპტის იმპორტი). `native-controller.js` `stripCueTags`-ს აქედან ხელახლა აექსპორტებს.
- `@/components/media`: `youtubeSource`, `nativeSource`, `resolveSource(video)` (`youtube` → YouTube, `sources` → native), `describeSource(adapter, video, locale)`, `pickCaptionTrack(captions, locale)`, `loadYouTubeApi({ timeout })`, `resetYouTubeApi()`, `YOUTUBE_API_TIMEOUT` (15 000), `createYouTubeController({ mount, videoId, adId, audioDescription, frameTitle, origin, fallbackDuration, autoStart, captionSrc, fetchText })` (+ `attach(YT)`, `fail()`, `setCues()`), `POLL_MS` (250), `AUTOPLAY_GRACE_MS` (2500), `UNAVAILABLE_CODES`. `VideoSourceAdapter` += `facade`, `captionPlacement: 'overlay' | 'band'`, `poster(video)`, `features(video, locale) → { captions, sign: boolean | null, audioDescription, adReason: 'missing' | 'inAudio', captionLang, captionTrack }`, `pendingText(video)`. `PlaybackState` += `loading?`, `unavailable?`, `blocked?`, `captionsFailed?`. ტესტი: `nativeVideo(video)`, `withFiles(video)`, `installFakeYouTube({ duration, blockAutoplay })`.
- `Media` += `fallbackSrc` (404 / ≤ 120px → სათადარიგო, შემდეგ ჩარჩო).
- ადმინის სქემა: ველის სახეები `youtube` (`preview`, `differentFrom`) და `captions` (`srclang`, `translate: 'track'`); `FieldContext.checkYouTube(id)`.
- `adminAdapter.content.checkYouTube(youtubeId, id?) → { available, usedBy: { id, title } | null }`; HTTP — `GET /content/videos/youtube?youtubeId=…&id=…` (B1-ის OpenAPI-ში შევა).
- i18n (საიტი): `player.startFor`, `facadeNote`, `loading`, `pendingLink`, `unavailable`, `adVersionMissing`, `adInAudio`, `captionsFailed`, `player.announce.{loading, ready, adOn, adOff}`, `videos.languageEn`, `checks.{captionsEmpty, captionsLength, youtubeMissing, youtubeInvalid, youtubeDuplicate, audioDescriptionSame}`; ამოღებულია `videos.cardLabel`, `badgeSign`, `languages`, `checks.signLanguageMissing`. ადმინი: `editor.fields.{youtube, youtubeAd, captionsEn}`, `editor.hints.{youtube, youtubeAd, captions, captionsEn}`, `editor.youtube.*`, `editor.captions.*`, `editor.checklist.rules.videoSource`, `a11y.rules.*` (6 ახალი კოდი); ამოღებულია `poster`, `videoFile`, `audioDescription`, `signLanguage` ველები და `library.fields.poster`.

### CSP (B7, project-context §10)

`frame-src https://www.youtube-nocookie.com` · `script-src 'self' https://www.youtube.com` (IFrame API და მისი `/s/player/…`) · `img-src 'self' https://i.ytimg.com` · `Referrer-Policy: strict-origin-when-cross-origin`. VTT — `/media/*` (same-origin, `connect-src 'self'`). კოდში — `YOUTUBE_CSP`.

### დიზაინიდან და prompt-იდან გადახვევები

1. prompt-ის „`sources[]`-ის ალტერნატივა, ფაილის ველი რჩება“ → B0 / B0.1 (წყარო მხოლოდ YouTube-ია): `sources`, `poster`, `signLanguage`, `audioDescription` (ფაილი) მოდელიდან და ადმინიდან ამოიღო; F7-ის native adapter `/__kit`-სა და ტესტებშია.
2. prompt-ის `cc_load_policy=1`, `cc_lang_pref` → არ გადაეცემა (B0 #1): სუბტიტრი ჩვენი VTT-ია ზოლში; YouTube-ის საკუთარი ბილიკი არ ირთვება, რომ ორმაგი არ იყოს.
3. დაულაგებელი / დაზიანებული VTT ატვირთვისას იბლოკება (ფაილი არ ინახება) — ჩეკლისტი ცარიელსა და ხანგრძლივობას `cues` / `end`-ით ამოწმებს, ფაილს თავიდან არ კითხულობს.
4. mock-ის VTT `src: null` რჩება (mock-ის წესი, ტესტით) — გეგმის „data-URL ან fixture“-ის ნაცვლად; `cues` / `end` mock-ში არ არის (უცნობია) და ჩეკლისტი მათ ამ შემთხვევაში არ ამოწმებს.
5. `[YouTube-ის id]` ჩანაცვლებას `validate.js` შეცდომად არ თვლის (როგორც `[…]` ტექსტს) — mock-ზე 0 შენიშვნა რჩება; ფლეიერი მას „ბმული მზადდება“-დ ხატავს.
6. iframe — `tabindex="-1"`: მართვა სრულად ჩვენია, Tab iframe-ში არ შედის (Chromium-ში შემოწმდა).
7. YouTube-ის კადრი ≥ 200px სიმაღლის (RMF): 390-ზე 16:9 — 195px, ამიტომ `min-height: 200px` (px — პლატფორმის ზღვარი).
8. ვიწრო ფლეიერზე (< 34rem) facade-ის ოქროსფერი წრე იმალება, რჩება წარწერა-ღილაკი (#FFFFFF / #0A1D38 16.86:1) — 200%-იან შრიფტზე 16:9-ში ეტევა.
9. ინგლისური VTT English ჩანართშია, მაგრამ `captions`-ში ინახება (`srclang: 'en'`) და არა `translations.en`-ში — ფაილი თარგმანის ტექსტი არ არის.
10. კონტრაქტს დაემატა `content.checkYouTube` (mock + `http.js`) — B1-მდე, ორივე მხარე ერთად.
11. mock-ში ატვირთული VTT მედია-ბიბლიოთეკაში არ ჩანს (სხვაგვარად alt-ის გარეშე „ფოტოდ“ ჩაითვლებოდა); რეალური საცავი — B5.
12. `auth.test.jsx`-ის პირველი ტესტი: ფოკუსის `waitFor` 3 → 8 წმ, ტესტის ვადა 5 → 20 წმ — 42 ფაილის პარალელურ გაშვებაზე ცივი lazy chunk-ები ნელა იტვირთება (ცალკე გაშვებაზე მწვანე იყო; კოდი არ შეცვლილა).
13. ვიდეოს დაფების „ჟესტური ენის“ ჩიპი, „ჟესტ.“ ნიშანი ბარათზე და „ქართული + ჟესტური“ — ამოღებულია; `/videos`-ის შესავალი ჟესტურ ენას აღარ ჰპირდება.

### ღია საკითხები

1. **VTT-ის რეალური ატვირთვა** — B5 (R2, `text/vtt`, `WEBVTT`, ზომის ზღვარი, `parseCaptions` სერვერზე იგივე მოდულით); B4 — `validate.js` სერვერზე (`youtubeInvalid`-ის placeholder-ის გამონაკლისი seed-ს ეხება — B2-ში გადასაწყვეტი, წარმოებაში ჩანაცვლება არ უნდა გავიდეს).
2. **რეალური YouTube-ის შემოწმება** (sandbox-ის გარეთ): IFrame API Chromium / Safari / Firefox-ში, `playVideo()` iOS Safari-ზე facade-ის შემდეგ (თუ არ დაუშვა — სტატუსი უკვე არის), `getAvailablePlaybackRates`, YouTube-ის საკუთარი სუბტიტრი ხომ არ ირთვება (თუ ავტორმა YouTube-ზე „ნაგულისხმევი“ დააყენა — `unloadModule('captions')` დოკუმენტირებული არ არის, არ გამოიყენება).
3. **ეკრანის მკითხველი რეალურ მოწყობილობაზე** — facade → ფოკუსი „ჩართვაზე“, `role="status"` „ვიდეო ჩაირთო“ (NVDA, VoiceOver iOS).
4. **YouTube-ზე ჩაშენების აკრძალვა (101 / 150)** — ახლა „მიუწვდომელია“ + ტრანსკრიპტი; „YouTube-ზე გახსნის“ ბმული — UX-ის გადაწყვეტილება.
5. **კონფიდენციალურობის პოლიტიკა და ხელმისაწვდომობის განცხადება** — `i.ytimg.com` (კადრი დაჭერამდე), `youtube-nocookie.com` (დაჭერის შემდეგ); ვიდეოზე AA, ჟესტური ენა (1.2.6, AAA) — არა (project-context §9 #25).
6. **კადრი YouTube Studio-ში** — ფოტოს წესები (თვალის დონე, მოქმედება, თანხმობა, მრავალფეროვნება) იქაც; mock-ის კადრის აღწერები (`[ვიდეოს კადრი: …]`) მოდელიდან წავიდა — დაფებში რჩება.
7. **დაფების გასწორება:** VideosPage / ContentKit — ჟესტური ენის PiP და ჩიპი, სუბტიტრი კადრზე (ახლა ზოლი ქვემოთ), facade-ის მდგომარეობები.
8. გაფართოებული აუდიოაღწერა (პაუზებით) v1-ში არ არის; აუდიოაღწერის ვერსიის სიგრძე (± 1 წმ) ავტომატურად არ მოწმდება — `getDuration()` მხოლოდ დაკვრისას ჩანს.

### შემდეგი: B1 — API-ის სპეციფიკაცია + `server/`-ის ჩონჩხი

OpenAPI 3.1 adapter-ებიდან (`Video.youtube`, `CaptionTrack.cues` / `end`, `GET /content/videos/youtube`), საერთო მოდულები — `youtube.js`, `vtt.js`, `validate.js`. B1-მდე — `fastdl.mongodb.org` network settings-ში.

## B1 — API-ის სპეციფიკაცია + `server/`-ის ჩონჩხი ✅ (2026-11-05)

**Gate:**
- frontend — **უცვლელი:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓; `server/`-იც მოიცავს) · `npm test` ✓ (42 ფაილი, **722 / 722**) · `npm run build` ✓ + check-dist ✓ (44 JS chunk) · `dist/`-ის 73-ვე ფაილის **sha256 ემთხვევა B1-მდე build-ს** (`i18n/index.js`-ის გასწორების და typedef-ის შემდეგ).
- server: `npm run server:lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm run server:test` ✓ (**9 ფაილი, 84 ტესტი**, ~23 წმ). zip-ის სუფთა ასლზე (`npm ci` → `server:test`) ერთხელ ჩავარდა boot-ტესტი: dev-ის გაფრთხილება listen-მდე იწერება და ტესტი მას ელოდა — ახლა `Server listening`-ს ელოდება; შემდეგ ზედიზედ 5 + 3 გაშვება მწვანეა.
- OpenAPI ვალიდურია: `@seriousme/openapi-schema-validator` 2.11.0 — `valid: true`, ვერსია 3.1; ყოველი `$ref` არსებობს, ყოველი სქემა გამოიყენება; 138 სქემა + 46 ოპერაციის route-სქემა `Ajv2020`-ის strict რეჟიმში კომპილირდება; პასუხების მაგალითები სქემას აკმაყოფილებს.
- **contract-ტესტი მწვანეა:** `createHttpAdminAdapter`-ის 31 ფუნქციის 52 გამოძახება (mock-ის რეალური მონაცემით) და საჯარო HTTP გეგმის 15 ფუნქციის 21 მოთხოვნა — მეთოდი, გზა, path / query, body (JSON და multipart), CSRF header ↔ spec; დაფარვა ორივე მიმართულებით; mock adapter-ების პასუხი (საჯარო ka / en, ადმინი) და შეცდომის კოდი ↔ ოპერაციის სქემა / სტატუსი; enum-ები და ზღვრები ↔ `taxonomy.js`, `model.js`, `forms.js`, `slug.js`, `youtube.js`, `query.js`, `permissions.js`, `content-types.js`; თვითტესტი — დარღვეული მოთხოვნა / პასუხი ვალიდატორს არ გადის.
- **memory-server-ზე connect / ping ✓:** MongoDB 8.0.34, replica set (`hello.setName`), ტრანზაქცია (`withTransaction`) ✓; `node server/index.js` production-ის env-ით → `/api/health` 200 → SIGTERM → exit 0; development `MONGODB_URI`-ის გარეშე — in-memory ბაზა ✓.
- ქსელი: `fastdl.mongodb.org` ხელმისაწვდომი იყო — დამატება არ დასჭირდა (binary ~105 MB, ქეში `~/.cache/mongodb-binaries`).

### შექმნილი ფაილები

`server/`: `package.json`, `openapi.yaml`, `.env.example`, `alias.js`, `index.js`, `main.js`, `config.js`, `app.js`, `vitest.config.js`, `lib/{openapi,errors,logger,security,db,dev-db}.js`, `routes/health.js`, `scripts/shared-smoke.js`, `test/{global-setup,helpers}.js`, `test/{config,app,db,openapi,shared-modules,boot}.test.js`, `test/contract/{spec-match,public-plan}.js`, `test/contract/{requests,responses,constants}.test.js`.

**შეიცვალა:**
- `package.json` — `workspaces: ["server"]` (server-ის dependencies — ცალკე `package.json`-ში, ერთი lockfile-ით), სკრიპტები `server:dev`, `server:start`, `server:test`, `server:lint`; `package-lock.json`.
- `src/i18n/index.js` — `import.meta.env.DEV` → `import.meta.env?.DEV`: Node-ში `import.meta.env` არ არსებობს და დაკარგულ გასაღებზე `t()` TypeError-ით ვარდებოდა (გაშვებით დადასტურდა); build ბაიტ-ბაიტ იგივეა.
- `src/admin/api/adminAdapter.js` — `A11yReport.items[]` typedef-ს დაემატა `titleEn` (mock მას F9.1-დან აბრუნებს; JSDoc მხოლოდ).
- `eslint.config.js` — `server/**/*.js`: Node-ის გლობალები; `.gitignore` — `.env`, `.env.*`, `!.env.example`.
- `CLAUDE.md` — „Backend-ის აგება — ჩატების რეჟიმი“ (Project-ის ინსტრუქციიდან), npm სკრიპტები, რუკაში `server/`, „კოდის კონვენციები (B1 — server)“.
- `docs/project-context.md` — §9 #24 (`fastdl.mongodb.org` ✓), #26 (B1-ის ღია საკითხები), §10 „Backend — API-ის კონტრაქტი (B1)“, §12 (Framework, რეპო, ტესტი, B1 ✅).

**დამოკიდებულებები** (ზუსტი ვერსიები, ყველა ≥ 14 დღის; 2026-10-22-მდე): `fastify` 5.12.7 (5.12.8 — 2026-11-02, ახალია), `@fastify/helmet` 13.2.0, `mongodb` 7.7.0 (7.8.0 — 2026-10-30), `ajv` 8.20.0, `ajv-formats` 3.0.1, `yaml` 2.9.1; dev: `mongodb-memory-server-core` 11.3.0, `@seriousme/openapi-schema-validator` 2.11.0, `vitest` ~5.0.4 (frontend-ის, 5.0.5). MongoDB-ის binary — 8.0.34 (2026-10-08; Atlas — 8.0).

### API — endpoint → adapter-ის ფუნქცია → როლი

46 ოპერაცია: health (B1) · 15 საჯარო `/api/v1/*` (B6) · 30 ადმინის `/api/admin/*` (auth / users — B3, content / settings / reports — B4, media — B5). საჯარო GET-ებს აქვს `lang` (`ka` | `en`). ადმინის GET — `session` cookie; ცვლილება — + `X-CSRF-Token`; `login` / `register` — სესიის გარეშე.

| endpoint | adapter | როლი (`x-permission`) | ნაბიჯი |
|---|---|---|---|
| `GET /api/health` | — | საჯარო | B1 |
| `GET /api/v1/articles` | `listArticles` | საჯარო | B6 |
| `GET /api/v1/articles/{slug}` | `getArticle` | საჯარო | B6 |
| `GET /api/v1/series` | `listSeries` | საჯარო | B6 |
| `GET /api/v1/series/{slug}` | `getSeries` | საჯარო | B6 |
| `GET /api/v1/videos` | `listVideos` | საჯარო | B6 |
| `GET /api/v1/videos/{slug}` | `getVideo` | საჯარო | B6 |
| `GET /api/v1/news` | `listNews` | საჯარო | B6 |
| `GET /api/v1/news/{slug}` | `getNews` | საჯარო | B6 |
| `GET /api/v1/events` | `listEvents` | საჯარო | B6 |
| `GET /api/v1/team` | `getTeam` | საჯარო | B6 |
| `GET /api/v1/partners` | `getPartners` | საჯარო | B6 |
| `GET /api/v1/stages` | `getStages` | საჯარო | B6 |
| `GET /api/v1/settings` | `getSettings` | საჯარო | B6 |
| `POST /api/v1/subscribe` | `subscribe` | საჯარო | B6 |
| `POST /api/v1/contact` | `sendContact` | საჯარო | B6 |
| `POST /api/admin/auth/login` | `auth.login` | ყველა (სესიის გარეშე) | B3 |
| `POST /api/admin/auth/register` | `auth.register` | ყველა (სესიის გარეშე) | B3 |
| `POST /api/admin/auth/logout` | `auth.logout` | სესიით | B3 |
| `GET /api/admin/auth/me` | `auth.me` | სესიით | B3 |
| `POST /api/admin/auth/session` | `auth.extendSession` | სესიით | B3 |
| `GET /api/admin/content/{type}` | `content.list` | ადმინისტრატორი, რედაქტორი (`content.read`) | B4 |
| `POST /api/admin/content/{type}` | `content.create` | ადმინისტრატორი, რედაქტორი (`content.write`) | B4 |
| `GET /api/admin/content/{type}/slug` | `content.checkSlug` | ადმინისტრატორი, რედაქტორი (`content.read`) | B4 |
| `GET /api/admin/content/videos/youtube` | `content.checkYouTube` | ადმინისტრატორი, რედაქტორი (`content.read`) | B4 |
| `GET /api/admin/items/{id}` | `content.get` | ადმინისტრატორი, რედაქტორი (`content.read`) | B4 |
| `PATCH /api/admin/items/{id}` | `content.update` | ადმინისტრატორი, რედაქტორი (`content.write`) | B4 |
| `DELETE /api/admin/items/{id}` | `content.remove` | ადმინისტრატორი, რედაქტორი (`content.write`) | B4 |
| `POST /api/admin/items/{id}/publish` | `content.publish` | ადმინისტრატორი, რედაქტორი (`content.publish`) | B4 |
| `POST /api/admin/items/{id}/schedule` | `content.schedule` | ადმინისტრატორი, რედაქტორი (`content.publish`) | B4 |
| `GET /api/admin/items/{id}/versions` | `content.versions` | ადმინისტრატორი, რედაქტორი (`content.read`) | B4 |
| `POST /api/admin/items/{id}/versions/{version}/restore` | `content.restoreVersion` | ადმინისტრატორი, რედაქტორი (`content.write`) | B4 |
| `GET /api/admin/search` | `content.search` | ადმინისტრატორი, რედაქტორი (`content.read`) | B4 |
| `GET /api/admin/media` | `media.list` | ადმინისტრატორი, რედაქტორი (`media.read`) | B5 |
| `POST /api/admin/media` | `media.upload` | ადმინისტრატორი, რედაქტორი (`media.write`) | B5 |
| `PATCH /api/admin/media/{id}` | `media.updateAlt`, `media.update` | ადმინისტრატორი, რედაქტორი (`media.write`) | B5 |
| `DELETE /api/admin/media/{id}` | `media.remove` | ადმინისტრატორი, რედაქტორი (`media.write`) | B5 |
| `GET /api/admin/media/{id}/usage` | `media.usage` | ადმინისტრატორი, რედაქტორი (`media.read`) | B5 |
| `GET /api/admin/users` | `users.list` | ადმინისტრატორი (`users.manage`) | B3 |
| `POST /api/admin/users/invites` | `users.invite` | ადმინისტრატორი (`users.manage`) | B3 |
| `PATCH /api/admin/users/{id}` | `users.setRole` | ადმინისტრატორი (`users.manage`) | B3 |
| `POST /api/admin/users/{id}/deactivate` | `users.deactivate` | ადმინისტრატორი (`users.manage`) | B3 |
| `GET /api/admin/settings` | `settings.get` | ადმინისტრატორი (`settings.manage`) | B4 |
| `PATCH /api/admin/settings` | `settings.update` | ადმინისტრატორი (`settings.manage`) | B4 |
| `GET /api/admin/reports/stats` | `reports.stats` | ადმინისტრატორი, რედაქტორი (`content.read`) | B4 |
| `GET /api/admin/reports/a11y` | `reports.a11yReport` | ადმინისტრატორი, რედაქტორი (`a11y.read`) | B4 |

### შეცდომის კოდი → HTTP

| `code` | HTTP | როდის |
|---|---|---|
| `bad-request` | 400 | არასწორი JSON / query / path, უცნობი ველი, ტიპი, ზომა (`BODY_LIMIT`), Content-Type (`text/plain`); Fastify-ის სხვა 4xx (405, 413, 415) |
| `unauthorized` | 401 | სესია არ არის / ამოიწურა; შესვლის არასწორი მონაცემი (ერთი პასუხი) |
| `forbidden` | 403 | როლს უფლება არ აქვს; CSRF token არ ემთხვევა |
| `not-found` | 404 | მასალა / route არ არსებობს ან გამოუქვეყნებელია; არასწორი slug (არა 400) |
| `conflict` | 409 | ვერსია შეიცვალა; გამოყენებული ფაილის წაშლა |
| `validation` | 422 | `fields` — ველის გზა (`name`, `cover.alt`, `body[2].image.alt`, `translations.en.title`) → `{ code, message }`; სხეულის ajv-შეცდომა: სავალდებულო / `minLength ≤ 1` → `required`, `maxLength` → `tooLong`, `enum` / `const` → `option` |
| `rate-limited` | 429 | + `Retry-After` (ნაგულისხმევი 60) |
| `server` | 500 | ყველა სხვა; ტექსტი არ ჟონავს. `network` / `unknown` — მხოლოდ კლიენტის კოდები |
| — | 503 | მხოლოდ `GET /api/health` — ბაზა მიუწვდომელია |

### env → რისთვის → მაგალითი (`server/.env.example`)

| ცვლადი | რისთვის | მაგალითი / ნაგულისხმევი |
|---|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `HOST` | მოსმენის მისამართი | ცარიელი → dev `127.0.0.1`, production `0.0.0.0` |
| `PORT` | პორტი (Render — 10000) | `3000` |
| `LOG_LEVEL` | pino-ს დონე | `info` (test — `silent`) |
| `TRUST_PROXY` | proxy-ის რაოდენობა კლიენტამდე (IP-ისთვის rate limit-ში, B3) | `0` (Render — `1`, + Cloudflare — `2`) |
| `BODY_LIMIT` | JSON-ის სხეულის ზღვარი, ბაიტი | `1048576` |
| `MONGODB_URI` | Atlas-ის connection string; production-ში სავალდებულოა | `mongodb+srv://[მომხმარებელი]:[პაროლი]@[კლასტერი].mongodb.net/?retryWrites=true&w=majority`; ცარიელი dev-ში → in-memory |
| `MONGODB_DB` | ბაზის სახელი | `meti-chartuloba` |
| `MONGOMS_VERSION` | ტესტი / dev: memory-server-ის binary | `8.0.34` |

შემდეგი ნაბიჯების ცვლადები (`CONTACT_INBOX`, `RESEND_API_KEY`, `R2_*`, `MEDIA_BASE_URL`) `.env.example`-ში კომენტარადაა — `config.js` მათ ჯერ არ კითხულობს.

### საჯარო API (server)

- `buildApp({ config, db?, spec?, logStream?, extend? }) → FastifyInstance` — დეკორატორები `app.config`, `app.db`, `app.spec`, `app.apiRoutes` (`{ method, url, operationId }[]`).
- `main({ env?, signals? })`, `describeStartupError(error)`, `SHUTDOWN_TIMEOUT_MS` (10 წმ).
- `config.js`: `loadConfig(env) → Readonly<Config>` (`{ env, host, port, logLevel, trustProxy, bodyLimit, mongo: { uri, dbName } }`), `ConfigError` (`problems: string[]`), `ENV_SCHEMA`, `ENV_KEYS`, `NODE_ENVS`, `LOG_LEVELS`.
- `lib/openapi.js`: `SPEC_PATH`, `COMPONENTS_ID`, `loadSpec()` (გაყინული, ქეშით), `createAjv(spec, { coerceTypes })`, `schemaRef(name)`, `rewriteRefs`, `listOperations`, `findOperation`, `operationParameters`, `routeSchema(spec, operationId) → { params?, querystring, body? }`, `fastifyPath`, `route(app, spec, operationId, handler, options?)`.
- `lib/errors.js`: `STATUS_BY_CODE`, `SERVER_ERROR_CODES`, `statusForCode`, `codeForStatus`, `fieldPath('/body/2/image/alt') → 'body[2].image.alt'`, `validationFields(ajvErrors)`, `toHttpError(error) → { status, error: ContentError, internal }`, `registerErrorHandlers(app)`.
- `lib/logger.js`: `loggerOptions({ level, production, stream })`, `registerRequestLog(app)`, `serializeError(err, production)`, `REDACT_KEYS`.
- `lib/security.js`: `registerSecurity(app)`, `API_CSP`, `HSTS_MAX_AGE`.
- `lib/db.js`: `connectDb({ uri, dbName, serverSelectionTimeoutMS }) → { client, db, ping, close }`, `pingDb(db, timeoutMs)`, `replicaSetName(db)`, `PING_TIMEOUT_MS`, `SERVER_SELECTION_TIMEOUT_MS`; `lib/dev-db.js`: `startMemoryReplicaSet()`, `MONGO_BINARY_VERSION`.
- `alias.js`: `resolveAlias(specifier)`, `ALIAS_PREFIX`, `SRC_URL` (+ hook-ის რეგისტრაცია, ერთხელ).
- ტესტის დამხმარე: `test/helpers.js` — `testConfig`, `captureLogs`, `makeApp`; `test/contract/spec-match.js` — `createMatcher(spec) → { match, checkRequest, checkResponse, operationFor, operations }`, `withSampleYouTubeIds`; `public-plan.js` — `PUBLIC_PLAN`, `PUBLIC_BASE`.

**Header-ები ყოველ პასუხზე:** `Content-Security-Policy: default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=15552000`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: same-origin`, `Cross-Origin-Opener-Policy: same-origin`, `X-Request-Id`; `/api/*` — `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`. `Access-Control-*` — არასოდეს.

**ლოგის ხაზი** (ერთი პასუხზე): `{ level, time, service: "mc-api", reqId, method, route: "/api/v1/articles/:slug", statusCode, ms, msg: "request" }`; 5xx — `{ err: { type, code?, statusCode?, stack[] } }` (development-ში + `detail`).

### გადახვევები prompt-იდან და §12-იდან

1. **`@/` — resolve hook, არა `package.json`-ის `imports`:** `imports` მხოლოდ `#`-ით დაწყებულ გასაღებს იღებს (`@/a.js` → `ERR_MODULE_NOT_FOUND`) და პაკეტს გარეთ ვერ გავა (`../src/*` → `ERR_INVALID_PACKAGE_TARGET`) — ორივე sandbox-ში შემოწმდა; საერთო მოდულები კი თავადაც `@/i18n/…`-ს შემოიტანენ. `module.registerHooks` (Node ≥ 22.15) — entry-ში სტატიკურად, აპი — დინამიკურად; Vitest — `resolve.alias`.
2. **spec-first** (§12: `@fastify/swagger` route-ის სქემებიდან): B1-ში route-ები ჯერ არ არის, კონტრაქტი კი adapter-ებშია — YAML ერთადერთი წყაროა და სერვერი route-ს მისგან აწყობს (`route()`); `@fastify/swagger` არ დაყენებულა.
3. **`Ajv2020`** Fastify-ის draft-07-ის ნაცვლად (OpenAPI 3.1 = JSON Schema 2020-12: `unevaluatedProperties`, `const`, `type: [x, 'null']`); პასუხის სქემა route-ზე არ ედება (fast-json-stringify უცნობ ველს ჩუმად წაშლიდა) — მას contract-ტესტი ამოწმებს.
4. **workspace:** `server/` ცალკე package-ია (საკუთარი dependencies), მაგრამ ერთი `npm install` / lockfile-ით; `mongodb-memory-server-core` (არა `mongodb-memory-server`) — postinstall-ში binary-ს არ ტვირთავს, deploy (B7) მას არ ჩამოტვირთავს.
5. **`text/plain` parser ამოღებულია** (prompt-ში არ იყო) — CSRF-ის „მარტივი მოთხოვნა“ preflight-ის გარეშე.
6. **ორი frontend-ის ფაილი შეიცვალა** (prompt: „frontend-ის build და ტესტი არ უნდა შეიცვალოს“ — არ შეცვლილა): `i18n/index.js` (Node-ში ვარდნა) და `adminAdapter.js` (typedef). `dist/` ბაიტ-ბაიტ იგივეა, 722 / 722.
7. **საჯარო HTTP adapter-ის „გეგმა“ ტესტის მხარესაა** (`test/contract/public-plan.js`) და არა `src/`-ში — adapter-ი B6-ია; B6-ში contract-ტესტი რეალურ `src/content/http.js`-ზე გადავა.
8. **სტატუსები:** შექმნა (`createContent`, `register`, `uploadMedia`, `createInvite`) — 201; დანარჩენი — 200. Fastify-ის 405 / 413 / 415 → 400 `bad-request` (`normalizeError` მათ `unknown`-ად თარგმნიდა).
9. **dev `MONGODB_URI`-ის გარეშე** — in-memory replica set (prompt-ში არ იყო): `server:dev` ბაზის გარეშეც მუშაობს.

### კონტრაქტის შეუსაბამობები (ნაპოვნი და დოკუმენტირებული)

1. `a11yReport().items[].titleEn` — mock აბრუნებს, typedef-ში არ იყო → typedef გასწორდა, spec-ში არის (`A11yItem`).
2. რედაქტორი მასალას საიტიდან `content.update(…, { status: 'draft' })`-ით ხსნის → spec (`updateItem`): `status` — მხოლოდ `draft` ან უცვლელი, `published` / `scheduled` — მხოლოდ `/publish` / `/schedule` (B4-ის წესი; mock ამას ჯერ არ ამოწმებს).
3. ახალი მასალა ცარიელი ველებით იქმნება (`slug: ''`, `youtube.id: ''`, schema `defaults`) → მონახაზის სქემა სტრუქტურულია (contract-ტესტი 5 ტიპის `defaults(now)`-ით მოწმდება).
4. ადმინის ველის კოდები (`invite`, `slugDuplicate`, `date`, `passwordShort`) და ჩეკლისტის `checks.*` `FieldErrorCode`-ში არ არის → spec-ში `FieldError.code: string`.
5. `http.js` შეცდომიდან `detail`-ს კითხულობს — სერვერი მას არ აგზავნის (შიდა ინფორმაცია), spec-ში არ არის; `undefined` უვნებელია.
6. `logout`, `extendSession`, `deactivate`, `restoreVersion` სხეულის გარეშე POST-ია — spec-ში `requestBody` არ აქვს; Content-Type არ იგზავნება (http.js) ✓.

### ღია საკითხები

1. **`translations.en`-ის სქემა** ადმინში თავისუფალი ობიექტია (`maxProperties: 64`) — ტიპის მიხედვით მხოლოდ ტექსტური ველები — B4.
2. **სერვერის ველის შეცდომის ენა:** ტექსტი გლობალური `t`-ით ქართულია; `/en` ადმინის ფორმა სერვერის ტექსტს პირდაპირ აჩვენებს — ენა მოთხოვნიდან (`lang` / `Accept-Language`, `createT(en)`) — B4 / B6.
3. **`[YouTube-ის id]`** mock-ში spec-ს არ აკმაყოფილებს (contract-ტესტი ვალიდური სატესტო id-ით ცვლის) — seed-ის წესი B2-ში; წარმოებაში ჩანაცვლება არ უნდა გავიდეს.
4. **მედიის id** (`img:a-001:body[2].image`, `up:001`) — B2 / B5 გადაწყვეტს (ჩადგმული ობიექტი თუ `media`-ს id); spec-ში გაუმჭვირვალე ASCII-სტრიქონია.
5. **cookie-ს სახელები** spec-ში `mc-session` / `mc-csrf`-ია — B3: `__Host-` პრეფიქსი ორივე მხარეს, ტესტით.
6. **საიტის HTML-ის CSP** (`YOUTUBE_CSP`, mc-boot-ის hash) — B7, სტატიკურ ფაილებთან ერთად; ახლა მხოლოდ API-ის CSP. HSTS-ის `includeSubDomains` — დომენის შემდეგ.
7. **Fastify-ის `onRoute` + spec:** B3–B6-ში ყოველი ახალი route `route()`-ით უნდა დარეგისტრირდეს — `openapi.test.js` route-ების ნაკრებს `x-step`-ს ადარებს (მიმდინარე ნაბიჯი ტესტში იცვლება).
8. **`module.registerHooks`** Node 22-ში „active development“ სტატუსისაა (გაფრთხილებას არ ბეჭდავს); თუ Render-ის Node-ის ვერსია < 22.15 — გაშვება ჩავარდება (engines ≥ 22.22) — B7-ში Node-ის ვერსია ჩასაკეტია.
9. B0-ის ღია საკითხები (ბიუჯეტი, დომენი, ვადები, Atlas-ის access list, ლოგის ვადა) ძალაშია — project-context §9 #24.

### შემდეგი: B2 — მონაცემთა ბაზა

კოლექციები (`content`, `versions`, `users`, `sessions`, `invites`, `media`, `settings`, `messages`, `subscribers`), `$jsonSchema` validator-ები (`*Draft` / საჯარო სქემების ფორმით), ინდექსები (`{ type, slug }` უნიკალური, `{ type, status, publishedAt: -1 }`, `{ updatedAt: -1 }`, `searchText`, TTL-ები), seed mock-იდან (`validateContent` — 0 შენიშვნა; `[YouTube-ის id]`-ის წესი), მიგრაციის სკრიპტი. B1-იდან: `connectDb`, `inject('mongoUri')`, `spec-match.js` (seed-ის დოკუმენტი ↔ `*Draft` სქემა).

## B2 — მონაცემთა ბაზა ✅ (2026-11-05)

**Gate:**
- frontend — **უცვლელი:** `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (42 ფაილი, **722 / 722**) · `npm run build` ✓ + check-dist ✓ (44 JS chunk) · `dist/`-ის 73-ვე ფაილის **sha256 ემთხვევა B2-მდე build-ს**.
- server: `npm run server:lint` ✓ · `npm run server:test` ✓ (**16 ფაილი, 178 ტესტი**; B1 — 84) — ზედიზედ სამი გაშვება მწვანეა; zip-ის სუფთა ასლზე `npm ci` → `server:test` ✓ (178 / 178).
- frontend-ის ტესტი დოკუმენტების (`docs/project-context.md` — `tokens.test.js`, `components.test.jsx` მას კითხულობს) ბოლო ცვლილების შემდეგ ხელახლა გაეშვა: 722 / 722 ✓.
- **მიგრაცია ორჯერ:** ტესტში (`collections.test.js`) და CLI-ით (`seed.test.js` — `node server/scripts/migrate.js` memory-server-ზე): პირველი — 27 ცვლილება (9 კოლექცია + 18 ინდექსი), მეორე — „ცვლილება: 0“, შეცდომის გარეშე; დრეიფი (validator, TTL-ის ვადა, ინდექსის ფორმა) ხელახლა სწორდება, ხელით დამატებული ინდექსი რჩება (`extra`).
- **seed → `validateContent` — 0 შენიშვნა:** ბაზიდან წაკითხულ ნაკრებზე (ტესტი + CLI-ის გამოსავალი); ნაკრები = `createMockData()` (JSON-ით); ყოველი item OpenAPI-ის `*Draft`-ს აკმაყოფილებს (ajv).
- **parity-ტესტი მწვანეა** (10): `list` / `find` / `findBySlug` / `snapshot` / საჯარო სია / ძიება / `insert` / `replace` / 409 / `remove` ↔ mock-ის საცავი; `update` (ვერსია + ისტორია), stale → 409, autosave → სამუშაო ასლი, `versions`, `restoreVersion`, რჩეული (`settings.update`), წაშლა ↔ ადმინის mock (`createMockAdminAdapter`, იმავე საათით).
- **TTL რეალურად შემოწმდა:** `ttlMonitorSleepSecs: 1` — ვადაგასული სესია, მოწვევა, 31 დღის შეტყობინება და `pending`-გამოწერა იშლება; მოქმედი და `confirmed` რჩება.
- **ajv ↔ MongoDB:** seed-ის 58 ჩანაწერი × 22 სახის მუტაცია (400+ შემთხვევა) — ორივე ერთნაირად აფასებს (`differential.test.js`).
- **ტრანზაქციის ატომურობა:** `failCommand` failpoint-ით მეორე `update` ვარდება → `setFeatured`-ის პირველი ჩაწერაც უქმდება (რჩეული, ვერსია, ისტორია — უცვლელი); 8 პარალელური `setFeatured` — ბოლოს ზუსტად ერთი რჩეული, ისტორია უწყვეტი.
- ქსელი: ახალი დომენი არ დასჭირდა; npm-ის ახალი დამოკიდებულება არ დამატებულა.

### შექმნილი ფაილები

`server/db/`: `schema.js`, `collections.js`, `derive.js`, `errors.js`, `content.js`, `settings.js`, `index.js`, `seed.js`; `server/migrations/`: `ensure.js`, `001-init.js`, `index.js`; `server/scripts/`: `db-cli.js`, `migrate.js`, `seed.js`; `server/test/db/`: `helpers.js`, `schema.test.js` (11), `collections.test.js` (35), `content.test.js` (16), `seed.test.js` (6), `differential.test.js` (2), `parity.test.js` (10), `translations.test.js` (13).

**შეიცვალა:**
- `server/openapi.yaml` — `PageDraft.stages` (არასავალდებულო, `Stage[]`, ≤ 50; დამატება — არსებულ მოთხოვნას / პასუხს არ არღვევს).
- `server/config.js` — `MESSAGES_TTL_DAYS` (1–3650, 30), `VERSIONS_KEEP` (1–1000, 30) → `config.retention`; `server/.env.example`; `test/config.test.js` (+1 ტესტი).
- `server/main.js` — dev-ის in-memory ბაზაზე migrate + seed (ლოგი `{ seeded: 58 }`); `test/boot.test.js` ამას ამოწმებს.
- `server/lib/dev-db.js` — `startMemoryReplicaSet({ args })`; `test/global-setup.js` — `enableTestCommands=1` (მხოლოდ ტესტი, failpoint-ისთვის).
- `package.json` — `server:migrate`, `server:seed`.
- `CLAUDE.md` — npm სკრიპტები, რუკა (`server/db`, `server/migrations`), „კოდის კონვენციები (B2 — ბაზა)“.
- `docs/project-context.md` — §9 #27, §12 (სტეკი, დამტკიცებული მოდელი, ფოტოს გადაწყვეტილება, B2 ✅, შენახვის ვადები).
- frontend-ის კოდი (`src/`) — **არ შეცვლილა**.

### კოლექცია → ველები → ინდექსი → TTL

| კოლექცია | ველები | ინდექსი | TTL |
|---|---|---|---|
| `content` | `_id`, `type`, `item` (`*Draft` ტიპით), `slug`?, `status`, `publishedAt` (Date), `version`, `createdAt`, `updatedAt`, `updatedBy`, `working`, `searchText`, `mediaKeys` | `type_slug_unique` (partial `slug` $exists) · `type_status_publishedAt` · `updatedAt_desc` · `searchText` · `type_createdAt` · `type_featured_unique` (partial `item.featured: true`) · `mediaKeys` | — |
| `versions` | `contentId`, `type`, `version`, `item`, `at`, `by` | `contentId_version` (unique) | — (`VERSIONS_KEEP`) |
| `users` | `_id` `u-…`, `name`, `email`, `passwordHash` (argon2id), `role`, `status`, `createdAt`, `updatedAt`, `lastLoginAt`? | `email_unique` | — |
| `sessions` | `_id` sha256, `userId`, `csrfHash`, `createdAt`, `lastSeenAt`, `expiresAt`, `maxExpiresAt` | `expiresAt_ttl`, `userId` | `expiresAt`, 0 |
| `invites` | `_id` sha256, `role`, `email`, `createdAt`, `createdBy`, `expiresAt`, `usedAt`, `usedBy` | `expiresAt_ttl` | `expiresAt`, 0 |
| `media` | `_id` `m-…`, `kind`, `key`, `mime`, `size`, `title`, `alt`, `ratio`, `width`, `height`, `lang`, `tagged`, `createdAt`, `createdBy` | `key_unique`, `kind_createdAt` | — |
| `settings` | `_id: 'site'`, `item` (`SiteSettingsDraft`), `version`, `updatedAt`, `updatedBy` | — | — |
| `messages` | `ContactPayload` − `website`, `consent: true`, `lang`, `createdAt`, `sentAt` | `createdAt_ttl` | `createdAt`, `MESSAGES_TTL_DAYS` × 86 400 |
| `subscribers` | `email`, `status`, `tokenHash`, `expiresAt`, `confirmedAt`, `source`, `lang`, `createdAt` (`pending` / `confirmed` — `oneOf`) | `email_unique`, `tokenHash_unique` (partial), `expiresAt_ttl_pending` | `expiresAt`, 0, partial `status: 'pending'` |

### repository-ის ფუნქცია → mock-ის ანალოგი → შეცდომის კოდი

| `server/db/content.js` | mock | შეცდომა |
|---|---|---|
| `list(type, { visibleAt? })` | `store.records(name)`; `visibleAt` — `isPublic` + `byNewest` | `bad-request` (უცნობი ტიპი) |
| `find(id)` | `store.find` | — (null) |
| `findBySlug(type, slug)` | `store.findBySlug` | — (null; ცარიელი slug → null) |
| `insert(type, item, { by, id? })` | `store.insert` | `validation` (`fields.slug: slugDuplicate`), `conflict` (რჩეული), `validation` (121 → ველის გზა), `bad-request` (id ≠ ტიპი) |
| `importRecords(records, { session })` | `createMockStore` (seed) | იგივე |
| `replace(id, item, { by, version? })` | ადმინის `save` (`store.replace` + ისტორია + `working.delete`) | `not-found`, `conflict` (ვერსია / რჩეული), `validation` |
| `saveWorking(id, item, { by, version? })` | `update({ autosave })` → `state.working` | `not-found`, `conflict` |
| `remove(id)` | `store.remove` + `state.versions` / `working` | `not-found` |
| `versions(id)` | `state.versions` (უახლესი პირველი, მიმდინარის გარეშე) | `not-found` |
| `restore(id, version, { by })` | `restoreVersion` | `not-found` (მასალა / ვერსია) |
| `setFeatured(type, id \| null, { by })` | ადმინის `setFeatured` (`settings.update`) | `not-found`, `bad-request` (ტიპს რჩეული არ აქვს) |
| `createRepositories(db).snapshot()` | `store.snapshot()` | — |
| `settings.get()` / `settings.put(item, { by, version? })` | `snapshot().settings` / `setSettings` | `conflict` (ვერსია) |

### საჯარო API (server)

- `db/schema.js`: `toBsonSchema(schema, spec, path?)`, `partialTextSchema(schema, key?)`, `translationsSchema(parent)`, `componentSchema(spec, name)`, `resolveRef`, `canonicalJson`, `TRANSLATION_REPLACE` (`body`), `TRANSLATION_NON_TEXT`.
- `db/collections.js`: `defineCollections({ spec, retention }) → CollectionSpec[]`, `itemSchemas(spec)`, `COLLECTION`, `DRAFT_SCHEMA`, `DEFAULT_RETENTION` (`{ messagesDays: 30, versionsKeep: 30 }`), `SETTINGS_ID` (`site`), `MEDIA_ID`, `MEDIA_KINDS`, `SUBSCRIBER_STATUSES`, `LANGS`, `DAY_SECONDS`.
- `db/derive.js`: `plain`, `parseDate`, `searchTextOf(item)`, `mediaKeysOf(...items)`, `derivedFields(item, working?)`, `searchFilter(q)`, `MEDIA_PATH` (`/media/`).
- `db/errors.js`: `mapWriteError(error)`, `schemaErrorPaths(errInfo)`, `SCHEMA_FIELD_CODE` (`schema`).
- `db/content.js`: `createContentRepository({ client, db }, { now, keepVersions })`, `toContentDoc`, `toContentRecord`, `publicFilter(type, at)`, `inTransaction(client, work)`, `newContentId(type)`, `typeOfId(id)`, `FEATURED_TYPES`; ტიპები `ContentRecord`, `ContentMeta`, `WorkingCopy`, `VersionEntry`.
- `db/settings.js`: `createSettingsRepository`, `toSettingsDoc`; `db/index.js`: `createRepositories(database, options) → { content, settings, snapshot }`, `SNAPSHOT_TYPES`, `ABOUT_SLUG`.
- `db/seed.js`: `seedSource({ now })`, `seedDatabase(database, { now, reset })` → `{ counts, issues }`, `SeedError`.
- `migrations/index.js`: `MIGRATIONS`, `migrate(db, { spec, retention })` → `{ id, reports }[]`, `countChanges(results)`; `migrations/ensure.js`: `ensureCollection(db, spec)`, `VALIDATION_LEVEL`, `VALIDATION_ACTION`.
- `scripts/db-cli.js`: `runCli(name, work, { env, production })`, `CliError`, `describeCliError`.
- `lib/dev-db.js`: `startMemoryReplicaSet({ args })`; `config.retention`.
- ტესტის დამხმარე: `test/db/helpers.js` — `freshDatabase(label, { migrate, retention })`, `clock()`, `iso`, `json`, `caught`, `T0`, `DAY`, `MINUTE`.

**env (+):** `MESSAGES_TTL_DAYS` (30) — შეტყობინების TTL, ცვლილების შემდეგ `server:migrate`; `VERSIONS_KEEP` (30) — ვერსიები მასალაზე.

**npm:** `npm run server:migrate`; `npm run server:seed` (`-- --reset` — კონტენტი, ვერსიები, პარამეტრები თავიდან; მომხმარებლები / მედია / შეტყობინებები / გამომწერები უცვლელი). ორივე `MONGODB_URI`-ს ითხოვს (`server/.env`); seed `NODE_ENV=production`-ზე არ ეშვება.

### ფოტო — გადაწყვეტილება

**ჩადგმული ობიექტი** (`{ src, alt, ratio }`, როგორც ახლა). alt კონტექსტზეა დამოკიდებული და თითო გამოყენებაზე ინახება (ინგლისური — `translations.en.*.alt`, ვერსია alt-საც ინახავს); `validate.js` / `localize.js` / საჯარო პასუხი ცვლილებას არ საჭიროებს; `media` — ფაილების რეესტრი, გამოყენება და წაშლის ბლოკი — `mediaKeys` (ინდექსით). `media`-ს id კონტრაქტს ორივე მხარეს შეცვლიდა და `$lookup`-ს ყოველ პასუხზე. შედარების ცხრილი — project-context §12.

### გადახვევები prompt-იდან და §12-იდან

1. **მოდელი `item`-შია, არა ზედა დონეზე** (§12: „მოდელის ველები + მეტა“): სიახლის `type` კოლექციის `type`-ს და სტატიის `updatedAt` მეტას ემთხვევა. ზედა დონის `slug` / `status` / `publishedAt` — `item`-იდან გამოთვლილი; `publishedAt` — Date (ოფსეტიანი ISO სტრიქონი სწორად არ ლაგდება).
2. **`type_slug_unique` partial (`slug` $exists):** ახალი მასალა ცარიელი slug-ით იქმნება — ზედა დონის `slug` ასეთ დროს არ იწერება. `$type: 'string'`-ის ფილტრით planner ინდექსს `{ type, slug: 'x' }`-ზე არ იყენებდა (sandbox-ში შემოწმდა) — `$exists`-ით იყენებს (explain-ტესტი).
3. **რჩეული — + უნიკალური partial ინდექსი** (prompt: „ტრანზაქციით“): ტრანზაქცია მარტო write skew-ს ვერ აკავებს (რჩეული რომ არ არის, ორი პარალელური `setFeatured` სხვადასხვა დოკუმენტს წერს). `setFeatured` მხოლოდ `articles | series | videos | news`-ზე; უცნობ id-ზე → `not-found` (mock ყველას ხსნიდა).
4. **`restore` მიმდინარე `featured`-ს ინახავს** (mock ძველისას აღადგენს): რჩეული პარამეტრებიდან იმართება და უნიკალური ინდექსი სხვაგვარად 409-ს დააბრუნებდა. parity-ტესტში დოკუმენტირებულია.
5. **ვერსიების ჭრა (`VERSIONS_KEEP`) — B2-ში** (B0 #10: B4): ჭრა `replace`-ის ტრანზაქციის ნაწილია, repository კი B2-ისაა; B4 მხოლოდ იყენებს.
6. **`translations.en` ბაზაში უფრო მკაცრია, ვიდრე API-ში** (B1: თავისუფალი ობიექტი): ნაწილობრივი ტექსტური ასლი; რედაქტორის ყოველი თარგმნადი ველი გადის (ტესტი ადმინის სქემებით). B4-მდე სხვაობა → 121 → `validation` ველის გზით, არა 500.
7. **„ჩვენი გზა“ (`stages`) — „ჩვენ შესახებ“ გვერდზე:** ცალკე კოლექცია §12-ში არ არის, `settings` კი `SiteSettings`-ია; `PageDraft`-ს დაემატა `stages` (არასავალდებულო). გუნდი და პარტნიორებიც იქვეა (ადმინის mock-ის `setOrg`-ის იგივე წყარო).
8. **`sessions.csrfHash`** (§12: `csrf`) — token-ის მსგავსად hash-ით; + `lastSeenAt`, `maxExpiresAt` (B0 #10: 30 წთ / 12 სთ). `invites._id` — კოდის sha256.
9. **`media.kind`: + `track`** (სუბტიტრის VTT, ბიბლიოთეკაში არ ჩანს — F10) — გამოყენებისა და წაშლის ბლოკისთვის.
10. **ინდექსები prompt-ის სიაზე მეტი:** `type_createdAt` (B0 #2 — ყოველ დალაგებას ინდექსი: `list`), `type_featured_unique`, `mediaKeys`, `sessions.userId` (დეაქტივაცია — B3), `media.key_unique` / `kind_createdAt`, `subscribers.tokenHash_unique`.
11. **`searchText`** — slug + სათაური / სახელი + აღწერა (ქართ. + ინგლ.), prompt-ის მიხედვით; ძიების ფილტრი `matchesQuery`-ის სემანტიკისაა (parity). mock-ის საჯარო ძიება სტატიებში ავტორსა და ტექსტსაც მოიცავს — B6.
12. **მიგრაციის ჟურნალი არ არის:** ყოველი მიგრაცია იდემპოტენტურია და runner ყველას უშვებს (კონვენცია — CLAUDE.md).
13. **dev-ის in-memory ბაზაზე migrate + seed ავტომატურად** (prompt-ში არ იყო): `server:dev` ბაზის გარეშე მონაცემით ეშვება.
14. **ტესტის replica set — `enableTestCommands`** (`failCommand` failpoint): ატომურობა რეალური ჩავარდნით მოწმდება, არა mock-ით.
15. **seed:** არაცარიელ ბაზაზე `--reset`-ის გარეშე — შეცდომა (არაფერი იცვლება); reset + ჩასმა ერთ ტრანზაქციაშია. `adminState`-ის დემო-მონახაზები (ავტორი `u-002`, ჩეკლისტის ხარვეზებით) seed-ში არ შედის.

### ღია საკითხები

1. **API-ის `Translations`** ბაზის ნაწილობრივ ტექსტურ ასლს უნდა გაუთანაბრდეს (`partialTextSchema`-ით) — B4.
2. **`[YouTube-ის id]` წარმოებაში:** seed წარმოებაში არ ეშვება; სერვერის გამოქვეყნების ბლოკერმა `[…]` YouTube-ის id-ში შეცდომად უნდა ჩათვალოს (`validate.js` mock-ისთვის უშვებს) — B4. B6-ის საჯარო `Video` ჩანაცვლებიან id-ს spec-ით ვერ გადის (staging) — B6.
3. **`featured` რედაქტორიდან:** B4-ის `update` მას არ უნდა იღებდეს (მხოლოდ `settings` → `setFeatured`); სხვაგვარად — 409.
4. **გუნდის თარგმანი ორ ადგილას:** რედაქტორი — გვერდის `translations.en.team[i]`, mock-ის მონაცემი — წევრის `translations`; საჯარო `getTeam`-მა (B6) ორივე უნდა გააერთიანოს ან ერთი აირჩიოს — B4 / B6.
5. **ფაილის წაშლის ბლოკი** (`mediaKeys`) ძველ ვერსიებს არ ითვალისწინებს — ვერსიის აღდგენამ შეიძლება წაშლილი ფაილი დააბრუნოს — B5.
6. **`users.passwordHash`** ყველა სტატუსზე სავალდებულოა (`invited`-ის ჩათვლით) — B3-მა მოწვევის ნაკადით შეიძლება შეცვალოს (მიგრაცია 002).
7. **deploy:** `npm run server:migrate` — Render-ის pre-deploy command; Atlas-ის მომხმარებელს `collMod` / `createIndex` სჭირდება (`readWrite` + `dbAdmin` ერთ ბაზაზე, ან მიგრაცია ცალკე მომხმარებლით) — B7.
8. **Atlas Free:** TTL monitor 60 წმ-ში ერთხელ — B3-მა ვადა წაკითხვისასაც უნდა შეამოწმოს (`expiresAt > now`), TTL მხოლოდ დასუფთავებაა.
9. B0 / B1-ის ღია საკითხები (ბიუჯეტი, დომენი, ვადების დადასტურება, cookie-ს `__Host-`, სერვერის შეცდომის ენა) ძალაშია — project-context §9 #24, #26, #27.

### შემდეგი: B3 — ავტორიზაცია და უსაფრთხოება

argon2id, cookie-სესია (`sessions`: token-ის hash, `csrfHash`, უმოქმედობა / 12 სთ), CSRF (`__Host-` ორივე მხარეს), rate limit, როლები / 403, მოწვევა (`invites`), პირველი ადმინისტრატორის ერთჯერადი სკრიპტი; repository — `server/db/users.js`, `sessions.js`, `invites.js` (B2-ის კონვენციით).

## B3 — ავტორიზაცია, სესია, როლები, უსაფრთხოება ✅ (2026-11-05)

**Gate:**
- frontend — `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (42 ფაილი, **722 / 722**; `docs/project-context.md`-ის ცვლილების შემდეგაც) · `npm run build` ✓ + check-dist ✓ (44 JS chunk). `dist/` B3-მდე build-ს ჩანკ-ჩანკ შევადარე (სახელი hash-ის გარეშე): საჯარო `index` +73 B (+12 B gzip) — `normalizeEmail` (`forms.js`, ადმინის mock მას იმპორტებს); ადმინის i18n +446 B (`fieldErrors.passwordCommon` ka / en); mock −41 B; დანარჩენი — მხოლოდ import-ის hash-ის სახელები. `http.js` წარმოების bundle-ში ისევ არ ხვდება (`VITE_ADMIN_API` არ არის — B7).
- server: `npm run server:lint` ✓ · `npm run server:test` ✓ (**22 ფაილი, 231 ტესტი**; B2 — 16 / 178) — ზედიზედ სამი გაშვება მწვანეა, ~58 წმ. zip-ის სუფთა ასლზე `npm ci` (573 პაკეტი) → `server:test` ✓ (22 / 231) · `server:lint` ✓.
- **frontend-ის ავტორიზაციის ტესტები HTTP adapter-ით მწვანეა:** `createHttpAdminAdapter` რეალურ სერვერზე (`listen`, HTTP, cookie jar — httpOnly JS-ს არ უჩანს), adminAdapter-ის `auth.login / me / extendSession / logout / register`, `users.list / invite / setRole / deactivate`, `normalizeError`-ის კოდები (`unauthorized`, `forbidden`, `validation`, `bad-request`, `not-found`, `rate-limited`); ყოველი პასუხი spec-ის სქემას აკმაყოფილებს; ყოველი `Set-Cookie` — `__Host-`-ის წესით.
- **შესვლის ზოგადი შეცდომა:** უცნობი ელფოსტა, არასწორი პაროლი, დეაქტივირებული — ერთი სტატუსი და სხეული (401), `Set-Cookie`-ს გარეშე; დრო — მედიანების ფარდობა 0.5–2 (7 + 7 მცდელობა; sandbox-ში ≈ 1).
- **CSRF-ის გარეშე → 403** (header არ არის / სხვა მნიშვნელობა / სხვა სესიის წყვილი); **rate limit → 429 + `Retry-After`** (IP, ანგარიში, რეგისტრაცია, საჯარო ფორმა); **ამოწურული სესია → 401** (საათის გადაწევით და რეალური დროით უკვე ამოწურული ჩანაწერით, რომელიც ბაზაში ჯერ არსებობს) — cookie-ები სუფთავდება.
- **პაროლი, token, CSRF token, სესიის id (sha256), მოწვევის კოდი, ელფოსტა, სახელი, IP ლოგში არ ჩანს** — სრული ნაკადი production-ის ლოგით (`limits.test.js`); მოვლენა — მხოლოდ სახელით.
- `.env.example` — მხოლოდ placeholder-ები (`ADMIN_*` — კომენტარად, `[…]`-ით).
- ინტერაქტიული `create-admin` (pty, `script`): ფარული პაროლი ეკრანზე არ ჩანს, ორჯერ — exit 0 (ხელით; ავტოტესტი env-ით).
- ქსელი: ახალი დომენი არ დასჭირდა (npm registry; ASVS და OWASP Cheat Sheet — `github.com` / `raw.githubusercontent.com`; SecLists — `raw.githubusercontent.com`).

### შექმნილი ფაილები

`server/lib/`: `auth.js`, `password.js`, `tokens.js`, `rate-limit.js`, `first-admin.js`; `server/db/`: `users.js`, `sessions.js`, `invites.js`; `server/routes/`: `auth.js`, `users.js`; `server/scripts/create-admin.js`; `server/data/common-passwords.txt`; `server/test/auth/`: `helpers.js`, `units.test.js` (10), `session.test.js` (16), `users.test.js` (9), `limits.test.js` (4), `http-adapter.test.js` (6), `create-admin.test.js` (5).

**შეიცვალა:**
- `server/app.js` — `@fastify/cookie`, guard-ები (`registerAuth`), `app.repos` (`createRepositories`), `app.rateLimits`, `app.now`, `buildApp({ now })`; auth / users route-ები.
- `server/config.js` — `SESSION_IDLE_MINUTES`, `SESSION_MAX_HOURS`, `INVITE_TTL_DAYS`, `RATE_LIMIT_AUTH_*`, `RATE_LIMIT_FORMS_*` → `config.session`, `config.invites`, `config.rateLimit`; უმოქმედობა ≤ მაქსიმუმი.
- `server/db/index.js` — `createRepositories` → + `users`, `sessions`, `invites`, `client`.
- `server/lib/security.js` — HSTS 365 დღე (B1 — 180), Fetch Metadata; `server/lib/logger.js` — `REDACT_KEYS` + `passwordHash`, `csrf`, `csrfToken`, `invite`, `session`.
- `server/main.js` — dev-ის in-memory ბაზაზე ადმინისტრატორი `ADMIN_*` env-იდან (თუ არის), სხვაგვარად — გაფრთხილება.
- `server/openapi.yaml` — cookie-ების სახელები (`__Host-`), `x-rate-limit` (`login`, `register`: `auth`; `subscribe`, `sendContact`: `forms`), `403` — `login`, `register`, `subscribe`, `sendContact` (Fetch Metadata), აღწერები (სესიის ვადა, მოწვევის კოდი, `passwordCommon`).
- `server/.env.example`, `server/package.json` (`argon2`, `@fastify/cookie`, `create-admin`), `server/scripts/shared-smoke.js` (ადმინის საერთო მოდულები სუფთა Node-ში).
- ტესტები: `config.test.js` (+1), `openapi.test.js` (+2: `x-rate-limit`, ცვლილების 403; რეგისტრირებული route-ები = B1 + B3), `app.test.js` (HSTS, cookie-ს სახელი), `boot.test.js` (dev: ადმინისტრატორი env-იდან → შესვლა 200, პაროლი / ელფოსტა გამოსავალში არ ჩანს), `shared-modules.test.js`.
- `package.json` — `server:create-admin`; `package-lock.json`.
- frontend: `src/admin/api/http.js` — `CSRF_COOKIE = '__Host-mc-csrf'`; `src/content/forms.js` — `normalizeEmail`; `src/admin/api/mock.js` — `normalizeEmail` (სამი ადგილი, ასლის ნაცვლად); `src/admin/i18n/ka.js`, `en.js` — `fieldErrors.passwordCommon`; `src/admin/__tests__/api.test.js` — cookie `Secure; Path=/`-ით (jsdom `__Host-`-ის წესს იცავს).
- `CLAUDE.md` — npm სკრიპტები, რუკა, „კოდის კონვენციები (B3 — ავტორიზაცია)“; `docs/project-context.md` — §9 #20, #27, #28; §10 (cookie, HSTS, „Backend — ავტორიზაცია და უსაფრთხოება (B3)“); §12 (სტეკი, წესები, B0 #4, შენახვის ვადები, B3 ✅).

**დამოკიდებულებები** (ზუსტი ვერსიები, ყველა ≥ 14 დღის; ზღვარი 2026-10-22): `argon2` 0.45.1 (2026-07-21; 0.45.2 — 2026-11-03, ახალია), `@fastify/cookie` 11.1.3 (2026-10-08; 11.1.4 / 11.1.5 — 2026-10-27, ახალია). transitive: `cookie` 2.0.1, `fastify-plugin` 6.0.1, `@phc/format` 1.0.0, `node-addon-api` 8.9.2, `node-gyp-build` 4.8.4, `cross-env` 10.1.0 — ყველა ≥ 14 დღის. `argon2`-ის prebuilt binary პაკეტშია (ჩამოტვირთვა არ სჭირდება). `@fastify/rate-limit` არ დაყენებულა.

### endpoint → როლი → შეცდომის კოდები

ყველგან + 500 `server`. guard spec-იდან: `security` → სესია / CSRF, `x-permission` → `permissions.js`, `x-rate-limit` → 429.

| endpoint | როლი | შეცდომები |
|---|---|---|
| `POST /api/admin/auth/login` | სესიის გარეშე; `x-rate-limit: auth` (IP + ელფოსტა) | 400 (უცნობი ველი / ტიპი / Content-Type) · 401 `unauthorized` (ერთი პასუხი) · 403 (Fetch Metadata) · 422 (`validateLogin`) · 429 |
| `POST /api/admin/auth/register` | სესიის გარეშე; `auth` (IP) | 400 · 403 · 422 (`validateRegister`, `passwordCommon`; კოდი / დაკავებული ელფოსტა → `fields.invite`) · 429 |
| `POST /api/admin/auth/logout` | სესია + CSRF | 401 · 403 |
| `GET /api/admin/auth/me` | სესია | 401 |
| `POST /api/admin/auth/session` | სესია + CSRF | 401 (ამოწურული / მაქსიმუმი) · 403 |
| `GET /api/admin/users` | ადმინისტრატორი (`users.manage`) | 401 · 403 |
| `POST /api/admin/users/invites` | ადმინისტრატორი + CSRF | 400 (უცნობი ველი) · 401 · 403 · 422 (`fields.email`, როლი) |
| `PATCH /api/admin/users/{id}` | ადმინისტრატორი + CSRF | 400 (საკუთარი როლის შეცვლა, არასწორი id) · 401 · 403 · 404 · 422 (როლი) |
| `POST /api/admin/users/{id}/deactivate` | ადმინისტრატორი + CSRF | 400 (საკუთარი) · 401 · 403 · 404 |

რიგი: Fetch Metadata (403) → სესია (401) → CSRF (403) → როლი (403) → სხეულის ვალიდაცია (400 / 422) → rate limit (429) → handler. სესიის გარეშე მოთხოვნა ველის შეცდომას ვერ ხედავს.

### cookie → ატრიბუტები → რატომ

| cookie | ატრიბუტები | რატომ |
|---|---|---|
| `__Host-mc-session` | 32 ბაიტი (256 ბიტი) base64url; `HttpOnly; Secure; SameSite=Lax; Path=/`; Domain არ არის; სესიის cookie, „დამიმახსოვრე“ → `Max-Age` = `maxExpiresAt − now` (≤ 12 სთ) | JS-ში არასოდეს ჩანს (XSS); `__Host-` — ბრაუზერი მხოლოდ Secure + `Path=/` + host-only-ს იღებს, ქვედომენი ვერ ჩაანაცვლებს (session fixation, ASVS 3.3.1); `Lax` — სხვა საიტის POST-ს cookie არ ახლავს; ბაზაში მხოლოდ sha256 (`sessions._id`) |
| `__Host-mc-csrf` | 256 ბიტი; `Secure; SameSite=Lax; Path=/` (არა HttpOnly); იგივე `Max-Age` | `http.js` მას `/admin/*` გვერდიდან `document.cookie`-ით კითხულობს (`Path=/api`-ით ვერ დაინახავდა) და `X-CSRF-Token`-ად აბრუნებს; სერვერზე — header = cookie და sha256 = `sessions.csrfHash` (სესიაზე მიბმული: სხვისი / ძველი წყვილი არ გადის) |
| ორივე — გასუფთავება | `Max-Age=0` + იგივე ატრიბუტები (`__Host-`-ს Secure / `Path=/` გასუფთავებისასაც სჭირდება) | გასვლა, ყალბი / ამოწურული სესია (401), დეაქტივირებული |

### OWASP ASVS 5.0 L1 — მოთხოვნა → სად სრულდება → ტესტი

წყარო — OWASP/ASVS, `5.0/en` (commit 62981c6, 2026-11-04); ჩამონათვალი — L1-ის მოთხოვნები, რომლებსაც B3 ეხება.

| მოთხოვნა | სად | ტესტი |
|---|---|---|
| 2.2.1 / 2.2.2 შემავალი სქემით, სერვერზე | spec (`LoginRequest`…, `additionalProperties: false`) + `validateLogin` / `registerFieldErrors` სერვერზე | session (422, უცნობი ველი → 400), users |
| 3.3.1 cookie — Secure + `__Host-` | `lib/auth.js` `COOKIE_OPTIONS` | session („წარმატება“), http-adapter (ყოველი `Set-Cookie`) |
| 3.4.1 HSTS ≥ 1 წელი | `lib/security.js` `HSTS_MAX_AGE` = 31 536 000 | app, session |
| 3.4.2 CORS | header-ები არ იგზავნება, preflight → 404 | session (CORS) |
| 3.5.1 anti-forgery token | double-submit, სესიაზე მიბმული | session (CSRF), http-adapter |
| 3.5.2 preflight-ის გვერდის ავლით მოთხოვნა არ გადის | მხოლოდ `application/json` (text/plain, urlencoded, multipart → 400) | session |
| 3.5.3 სახიფათო მეთოდი + Sec-Fetch | POST / PATCH; Fetch Metadata → 403 | session |
| 4.1.1 Content-Type + charset | Fastify (`application/json; charset=utf-8`) | session |
| 6.1.1 დოკუმენტირებული brute force-ის კონტროლი და ბოროტი დაბლოკვა | `lib/rate-limit.js`, ეს ფაილი: IP — ყოველ მცდელობაზე; ანგარიში — მხოლოდ წარუმატებელზე; დაბლოკვა ≤ ერთი ფანჯარა | limits |
| 6.2.1 / 6.2.5 სიგრძე ≥ 8 (ჩვენთან 12), შედგენილობის წესის გარეშე | `auth-forms.js` `PASSWORD_MIN` | users (`passwordShort`), units |
| 6.2.4 top-3000 (პოლიტიკის შესაბამისი) | `server/data/common-passwords.txt`, `isCommonPassword` | units, users (`passwordCommon`), create-admin |
| 6.2.8 პაროლი ზუსტად ისე, როგორც მოვიდა | `verifyPassword` (trim / ნორმალიზება არა) | units, session |
| 6.3.1 brute force | rate limit | limits, http-adapter |
| 6.3.2 ნაგულისხმევი ანგარიში არ არსებობს | seed მომხმარებელს არ ქმნის; `server:create-admin` / dev — მხოლოდ ოპერატორის მონაცემით | create-admin, boot |
| 6.4.1 აქტივაციის კოდი — შემთხვევითი, ვადიანი, ერთჯერადი | `invites` (128 ბიტი, 7 დღე, `claim` ტრანზაქციაში) | users |
| 6.4.2 მინიშნება / საიდუმლო კითხვა | არ არსებობს | — |
| 7.2.1 / 7.2.2 სესია backend-ზე, დინამიკური reference token | `sessions` + guard | session |
| 7.2.3 CSPRNG ≥ 128 ბიტი | `newToken()` — 256 ბიტი | units |
| 7.2.4 ახალი token შესვლისას, ძველის გაუქმება | `startSession` ძველს შლის | session (fixation) |
| 7.4.1 გასვლის შემდეგ სესია არ მოქმედებს | `sessions.remove` + cookie-ების გასუფთავება | session, http-adapter |
| 7.4.2 დეაქტივაცია ყველა სესიას წყვეტს | `sessions.removeForUser` | users, http-adapter |
| 8.1.1 / 8.2.1 / 8.3.1 ფუნქციის დონის უფლება სერვერზე | `x-permission` → `can()` (`permissions.js`) | users, http-adapter |
| 11.4.1 დამტკიცებული hash | sha256, argon2id | units |
| 15.3.1 მხოლოდ საჭირო ველები | `toAdminUser` (hash / დრო / ბოლო შესვლა არა) | users |
| **6.2.2 / 6.2.3 პაროლის შეცვლა** | ✗ კონტრაქტში და F8-ში არ არის | ღია #1 |
| **14.2.1 საიდუმლო URL-ში** | ⚠ token / CSRF — არასოდეს; მოწვევის კოდი `?invite=`-შია | ღია #2 |
| 6.2.6 / 6.2.7 `type=password`, ჩასმა | frontend (F8) — B3-ში არ გადამოწმებულა | ღია #8 |
| 14.3.1 კლიენტის მონაცემის გასუფთავება | httpOnly cookie-ები სუფთავდება; ადმინის სესია მეხსიერებაშია (`AuthProvider`); `Clear-Site-Data` არ გამოიყენება (სხვა cookie-საც წაშლიდა) | session (გასვლა) |

### rate limit, ვადები, env

| env | ნაგულისხმევი | რისთვის |
|---|---|---|
| `SESSION_IDLE_MINUTES` | 30 (5–720) | უმოქმედობა: `expiresAt` = min(ბოლო გაგრძელება + ეს, `maxExpiresAt`) |
| `SESSION_MAX_HOURS` | 12 (1–24) | აბსოლუტური ზღვარი; უმოქმედობა ≤ მაქსიმუმი (სხვაგვარად — `ConfigError`) |
| `INVITE_TTL_DAYS` | 7 (1–30) | მოწვევის ვადა (mock — 14) |
| `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_AUTH_WINDOW_SECONDS` | 10 / 900 | შესვლა (IP ყოველ მცდელობაზე; ელფოსტის sha256 — წარუმატებელზე) და რეგისტრაცია (IP) — `[N]` / `[ვადა]` დასადასტურებელი |
| `RATE_LIMIT_FORMS_MAX` / `RATE_LIMIT_FORMS_WINDOW_SECONDS` | 10 / 600 | საჯარო ფორმები (B6: `subscribe`, `sendContact`), IP |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | — | მხოლოდ `server:create-admin` და dev-ის in-memory ბაზა; `config.js` მათ არ კითხულობს |

### საჯარო API (server)

- `buildApp({ …, now })` — დეკორატორები `app.repos` (`Repositories` | null), `app.rateLimits` (`{ auth, forms }`), `app.now`; `request.auth` — `{ session, user }` (guard-ის შემდეგ).
- `lib/auth.js`: `SESSION_COOKIE` (`__Host-mc-session`), `CSRF_COOKIE` / `CSRF_HEADER` (`http.js`-იდან), `COOKIE_OPTIONS`, `setSessionCookies(reply, { token, csrfToken, maxAge? })`, `clearSessionCookies(reply)`, `sessionToken(request)`, `repositories(app)`, `guardsFor(spec, operationId) → { session, csrf, permission, rateLimit }`, `registerAuth(app)`; ტიპი `RequestAuth`.
- `lib/password.js`: `ARGON2_OPTIONS` (argon2id, 19 456 KiB, t=2, p=1), `hashPassword`, `verifyPassword`, `needsRehash`, `dummyHash`, `commonPasswords`, `isCommonPassword`, `registerFieldErrors`, `COMMON_PASSWORDS_URL`.
- `lib/tokens.js`: `TOKEN_BYTES` (32), `TOKEN_PATTERN`, `newToken`, `hashToken` (sha256 hex), `safeEqual`, `newInviteCode` (`MC-` + 26), `normalizeInviteCode`, `INVITE_PATTERN`, `INVITE_PREFIX`, `INVITE_BYTES`.
- `lib/rate-limit.js`: `createRateLimiter({ max, windowMs, now?, maxKeys? }) → { blocked, hit, consume, size }`, `rateLimited(reply, seconds)`, `MAX_KEYS` (10 000).
- `lib/first-admin.js`: `createFirstAdmin(repos, { email, name, password })`.
- `db/users.js`: `createUsersRepository` (`findById`, `findByEmail`, `list`, `insert`, `setRole`, `deactivate`, `recordLogin`, `countActive`), `toAdminUser`, `newUserId` (`u-` + ObjectId); `db/sessions.js`: `createSessionsRepository` (`create` → `{ token, csrfToken, session }`, `findActive`, `extend`, `remove`, `removeForUser`), `DEFAULT_SESSION`; `db/invites.js`: `createInvitesRepository` (`create` → `{ code, invite }`, `claim`), `DEFAULT_INVITE_TTL_MS`.
- `routes/auth.js`: `registerAuthRoutes`, `sessionPayload`; `routes/users.js`: `registerUsersRoutes`, `inviteLink`.
- spec: გაფართოება `x-rate-limit: auth | forms` (ოპერაციას 429 აქვს — ტესტით).
- საერთო მოდული: `normalizeEmail(value)` (`src/content/forms.js`).
- ტესტის დამხმარე: `test/auth/helpers.js` — `authApp`, `agent` (cookie jar + CSRF), `addUser`, `median`, `PASSWORD`.
- npm: `npm run server:create-admin` (`server/.env`-ით).

### გადახვევები prompt-იდან და §12-იდან

1. **cookie-ების სახელი `__Host-mc-session` / `__Host-mc-csrf`, `Path=/`** (prompt: `mc-session`, `Path=/api`): `__Host-` მხოლოდ `Path=/`-ს უშვებს; ASVS 5.0 L1 3.3.1 პრეფიქსს ითხოვს (`mc-session` L1-ს ვერ გადიოდა); CSRF cookie `Path=/api`-ით `/admin/*`-ზე `document.cookie`-ში არ გამოჩნდებოდა. B0 #4 / B1-ის ღია #5 — დახურულია ორივე მხარეს, ტესტით (სერვერი სახელს `http.js`-იდან იღებს).
2. **login / register CSRF token-ს არ ითხოვს** (prompt: „ყოველ არა-GET-ზე“): სესია და token ჯერ არ არსებობს; login CSRF-ისგან იცავს Fetch Metadata (`cross-site` / `same-site` → 403), მხოლოდ-JSON (preflight) და `SameSite=Lax`. spec-ის `security: []` უცვლელია.
3. **Fetch Metadata — ყველა `/api/*` ცვლილებაზე** (prompt-ში არ იყო; B6-ის საჯარო ფორმებიც) — spec-ში `403` `login`, `register`, `subscribe`, `sendContact`-ზე.
4. **საკუთარი rate limiter** (§12: `@fastify/rate-limit`): ორი გასაღები, ანგარიში — მხოლოდ წარუმატებელზე (ბოროტი დაბლოკვის ზღვარი), ჩანაცვლებადი საათი; ერთ პროცესზე.
5. **HSTS 180 დღე → 1 წელი** (B1-ის გადაწყვეტილება): ASVS 3.4.1 L1.
6. **ცნობილი პაროლების სია** (prompt-ში არ იყო; ASVS 6.2.4 L1) — მხოლოდ სერვერზე, ახალი ველის კოდი `passwordCommon` (ადმინის i18n ka / en); client bundle-ში არ ხვდება.
7. **გაგრძელება მხოლოდ `POST /auth/session`-ით** (ჩუმი გაგრძელება არა; `me` ვადას არ ცვლის) — `AuthProvider`-ის ტაიმერს ემთხვევა (WCAG 2.2.1).
8. **„დამიმახსოვრე“** — `Max-Age` სესიის მაქსიმუმამდე (mock მას აიგნორებდა); სხვაგვარად — სესიის cookie.
9. **მოწვევის კოდი** — `MC-` + 26 Crockford base32 (128 ბიტი), რეგისტრის / კიდეების ჰარის გარეშე; ელფოსტით გაგზავნა — არა (B0 #8: გამგზავნი B7-მდე ღიაა → ბმული პასუხშია, როგორც mock-ში).
10. **რეგისტრაციაზე hash ყოველთვის ითვლება** (კოდის შემოწმებამდე) და კოდის დახარჯვა + ანგარიში ერთ ტრანზაქციაშია — დაკავებულ ელფოსტაზე მოწვევა არ იწვება.
11. **`create-admin` უარს ამბობს, თუ აქტიური ადმინისტრატორი უკვე არსებობს** და არგუმენტს არ იღებს (პაროლი ბრძანების ხაზში / ისტორიაში არ უნდა მოხვდეს); dev-ის in-memory ბაზაზე `server:dev` ადმინისტრატორს `ADMIN_*` env-იდან ქმნის (prompt-ში არ იყო).
12. **ლოგში მხოლოდ მოვლენის სახელი** (`auth.login`, `auth.login.failed`, `auth.register`, `auth.logout`, `users.invite`, `users.role`, `users.deactivate`) — user id-ის გარეშე (§12-ის მკაცრი წაკითხვა); ვინ რა გააკეთა — ბაზაში (`invites.createdBy` / `usedBy`, `updatedBy`).
13. **`normalizeEmail` — საერთო `forms.js`-ში** (mock-ის სამი ასლის ნაცვლად): საჯარო `index` +73 B.
14. **საკუთარ თავზე იგივე როლი → 200** (mock-ის იგივე), განსხვავებული → 400.
15. **B2-ის ღია #6 (`passwordHash` `invited`-ზე)** — მიგრაცია არ დასჭირდა: მომხმარებელი მხოლოდ რეგისტრაციით / `create-admin`-ით იქმნება.
16. **`CORS`** — B1-ის მდგომარეობა (ერთი origin, header-ების გარეშე) უცვლელია, B3-ში მხოლოდ ტესტით დადასტურდა.

### ღია საკითხები

1. **პაროლის შეცვლა / აღდგენა** — ASVS 6.2.2 / 6.2.3 (L1); F8-ის UI-ში და კონტრაქტში არ არის — ცალკე ნაბიჯი (frontend + spec + server, ტესტით).
2. **მოწვევის კოდი URL-ის query-შია** (`?invite=`, ASVS 14.2.1) — `#invite=`-ზე გადასატანი (frontend `LoginPage` + `inviteLink` + spec). ახლა: ერთჯერადი, 7 დღე, `Referrer-Policy: strict-origin-when-cross-origin`, ლოგში query არ იწერება.
3. **ნაგულისხმევი მნიშვნელობები** — `[N]` / `[ვადა]`: auth 10 / 15 წთ, forms 10 / 10 წთ; სესია 30 წთ / 12 სთ; მოწვევა 7 დღე — დასადასტურებელი (კონფიდენციალურობის პოლიტიკა).
4. **rate limit ერთ პროცესზე** — Render-ის ერთ ინსტანციაზე საკმარისია; რამდენიმეზე — საერთო საცავი (B7). `TRUST_PROXY` წარმოებაში ზუსტად (Render — 1, + Cloudflare — 2): ნაკლები — ყველა მომხმარებელი ერთი IP-ა, მეტი — `X-Forwarded-For` ყალბდება.
5. **ბოროტი დაბლოკვა:** თავდამსხმელს კონკრეტული ანგარიშის შესვლის დაბლოკვა ერთი ფანჯრით (≤ 15 წთ) შეუძლია — დოკუმენტირებული ფასი (ASVS 6.1.1); ალტერნატივა — გასაღები (ანგარიში, IP), თუ ეს პრობლემა გახდება.
6. **dev ბრაუზერში:** `__Host-` / Secure cookie `http://localhost`-ზე — Chrome ✓ (jsdom-იც), Firefox / Safari `[შესამოწმებელი]`; Vite-ის `/api` proxy ან staging HTTPS — B7.
7. **მოწვევის ელფოსტით გაგზავნა** — B6 / B7 (Resend, დომენი, DNS).
8. **ASVS 6.2.6 / 6.2.7** (`type=password`, ჩასმა / პაროლის მენეჯერი) — F8-ის frontend, B3-ში არ გადამოწმებულა.
9. **ცნობილი პაროლების სია** — SecLists `Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt` (MIT, commit 48c951a3c3af), პირველი 3000 უნიკალური (პატარა ასოებით) ≥ 12 სიმბოლო; განახლება — იგივე წესით.
10. HSTS `includeSubDomains` (L2) — დომენის შემდეგ (B7). B0 / B1 / B2-ის ღია საკითხები (ბიუჯეტი, დომენი, სერვერის შეცდომის ენა, `Translations`, `[YouTube-ის id]`) ძალაშია — project-context §9 #24, #26–#28.

### შემდეგი: B4 — კონტენტი (ადმინი)

CRUD, ავტოშენახვის სამუშაო ასლი, გამოქვეყნება / დაგეგმვა (სერვერზე `validate.js`, ka + en; `[…]` YouTube-ის id-ში — შეცდომა), ვერსიები / აღდგენა, 409, წაშლა, ძიება, stats, a11yReport, პარამეტრები + რჩეული (`setFeatured`; `update` `featured`-ს არ იღებს), API-ის `Translations` ↔ ბაზის `partialTextSchema`. route-ები — `route(app, spec, operationId, handler)`: guard (`security`, `x-permission`) ავტომატურად ედება; `updatedBy` — `request.auth.user._id`. Gate — frontend-ის ადმინის ტესტები HTTP adapter-ით.

## B4 — კონტენტის API (ადმინი) ✅ (2026-11-06)

**Gate:**
- frontend — `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓, `server/`-იც) · `npm test` ✓ (42 ფაილი, **735 / 735**; B3 — 722; გაშვებულია სამ ნაწილად: `src/admin` + `src/content` 233, `src/features` 151, დანარჩენი 351) · `npm run build` ✓ + check-dist ✓ (44 JS chunk: საჯარო 31, ადმინის 13; საჯარო chunk-ებში ადმინი / TipTap / validate არ არის).
- `dist/` B3-ის build-ს შევადარე (სახელი hash-ის გარეშე): საჯარო `index` +9 B — მხოლოდ export-ის სია (ადმინის chunk საჯაროდან ერთ ბმას მეტს იღებს), კოდი არ შეცვლილა; `AboutPage` +1, `ArticlePage` +5, `DevelopmentPage` −5, `routes` −4 — minifier-ის სახელები; ადმინი: `checklist` chunk → `checks` (8735 → 7759 B), ადმინის `mock` 15 984 → 16 476 B (+ `records.js`), `EditorPage` +1483 B, `editor` +10 B.
- server — `npm run server:lint` ✓ · `npm run server:test` ✓ (**26 ფაილი, 271 ტესტი**; B3 — 22 / 231), ~116 წმ. zip-ის სუფთა ასლზე `npm ci` (573 პაკეტი) → `server:lint` ✓ · `server:test` ✓ (26 / 271).
- **parity-ნაკრები ორივე adapter-ზე მწვანეა:** `src/admin/__tests__/api.test.js`-ის სცენარები საერთო `scenarios/admin-scenarios.js`-შია (22: B3 — 2, B4a — 8, B4b — 11, B5 — 1). frontend-ი ყველას mock-ზე უშვებს; `server/test/content/parity.test.js` — 21-ს (B5-ის გარდა) mock-სა და HTTP-ზე (რეალური სერვერი `listen`-ით + memory-server, frontend-ის `createHttpAdminAdapter` cookie jar-ით) იმავე საწყისი მონაცემით და საათით: ორივე გარემოში სცენარის `expect`-ები გადის და **კვალი (`notes`) იდენტურია**; HTTP-ის ყოველი პასუხი spec-ს აკმაყოფილებს (0 დარღვევა).
- **რედაქტორი HTTP adapter-ით** (`server/test/ui/editor-http.test.jsx`, jsdom + რეალური სერვერი, 5 / 5): alt-ის გარეშე გამოქვეყნება ვერ ხერხდება (ჯამი, ფოკუსი, ბმული alt-ზე; ბაზაში — მონახაზი); სერვერის ბლოკერი (422) რედაქტორში ჩანს (`[ჩანაცვლება]` YouTube-ის id: ჩეკლისტი უშვებს, სერვერი — არა; ვერსია უცვლელია); 409 → „მასალა სხვამ შეცვალა“ → „მათი ვერსიის ჩატვირთვა“; ავტოშენახვა — მონახაზი ბაზაში იწერება („ავტომატურად შეინახა … · ავტორი“), გამოქვეყნებული — სამუშაო ასლი (საიტი უცვლელია), „გამოქვეყნება“ მას ამტკიცებს.
- **alt-ის ან სუბტიტრის გარეშე გამოქვეყნება სერვერზე → 422** (`server/test/content/publish.test.js`): `cover.alt` (+ `translations.en.cover.alt`, თარგმანში alt არ არის), `captions: captionsMissing`; მასალა, ვერსია და ისტორია უცვლელია; სუბტიტრით — ქვეყნდება.
- ქსელი: ახალი დომენი არ დასჭირდა.

### შექმნილი ფაილები

`src/content/checks.js`, `src/admin/api/records.js`, `src/admin/__tests__/scenarios/admin-scenarios.js`, `server/routes/content.js`, `server/routes/settings.js`, `server/test/browser.js`, `server/test/content/http-env.js`, `server/test/content/parity.test.js`, `server/test/content/content.test.js`, `server/test/content/publish.test.js`, `server/test/ui/editor-http.test.jsx`.

### შეცვლილი ფაილები (ერთი წინადადებით)

- `src/admin/editor/checklist.js` — შემოწმების ფუნქციები `checks.js`-ში გადავიდა; აქ — `RULES`, `buildChecklist` და re-export (რედაქტორის import-ები უცვლელია).
- `src/admin/editor/translation.js` — `EN_PREFIX` — `checks.js`-იდან (ერთი წყარო).
- `src/admin/api/mock.js` — ფორმა, სია, ძიება, ვერსიები, ბიბლიოთეკა, stats, a11y, რჩეული და გამოქვეყნების ბლოკერი — `records.js` / `checks.js`-იდან; სერვერის წესები (ქვემოთ, „გადახვევები“ 1).
- `src/admin/__tests__/api.test.js` — საერთო სცენარებს უშვებს (+ mock-ის B4-ის წესის ცალკე ტესტი); რეგისტრაციის პაროლი — ცნობილ სიაში არ არის.
- `server/app.js` — `registerContentRoutes`, `registerSettingsRoutes` spec-ის რიგით.
- `server/db/errors.js` — 121-ის გზა სამუშაო ასლზეც item-ის მიმართ (`working.item.` იჭრება); `null | ობიექტი` განშტოების ტიპის შეუსაბამობა „საუკეთესო“ აღარ არის.
- `server/db/content.js` — დოკუმენტაცია (B2-ის ორი გადახვევა დაიხურა).
- `server/lib/openapi.js`, `server/lib/password.js` — `new URL(…, String(import.meta.url))` + `URL` `node:url`-იდან: Vite-ის asset-ის გარდაქმნა jsdom-ის ტესტში ფაილის გზას `http://localhost`-ად აქცევდა.
- `server/vitest.config.js` — `react()` + `svgr()`, `test/**/*.test.{js,jsx}`.
- `server/test/openapi.test.js` — რეგისტრირებული route-ები = `x-step: B1 | B3 | B4`, spec-ის რიგით.
- `server/test/db/parity.test.js` — `restore` და უცნობი რჩეული ორივე მხარეს ერთნაირია.
- `CLAUDE.md` — ფოლდერების რუკა, „კოდის კონვენციები (B4)“.

### endpoint → mock-ის ფუნქცია → როლი → შეცდომები

| endpoint | mock | როლი (`x-permission`) | შეცდომები |
|---|---|---|---|
| `GET /content/:type` (`status`, `q`, `page`, `limit`, `check`; `all`) | `content.list` | ადმ., რედ. (`content.read`) | 400 (ტიპი, query), 401, 403 |
| `POST /content/:type` | `content.create` | `content.write` + CSRF | 400 (`pages`, უცნობი ველი, ტიპი), 401, 403, 422 (`slugDuplicate`, სიგრძე) |
| `GET /content/:type/slug` | `content.checkSlug` | `content.read` | 400, 401, 403 |
| `GET /content/videos/youtube` | `content.checkYouTube` | `content.read` | 400 (id-ის ფორმატი), 401, 403 |
| `GET /items/:id` (+ `working`) | `content.get` | `content.read` | 400 (id), 401, 403, 404 |
| `PATCH /items/:id` (`{ data, version, autosave }`) | `content.update` | `content.write` + CSRF | 400, 401, 403, 404, 409, 422 (`status`, ველი, `translations.en.*`) |
| `DELETE /items/:id` | `content.remove` | `content.write` + CSRF | 400 (7 გვერდი), 401, 403, 404 |
| `POST /items/:id/publish` (`{ version, data? }`) | `content.publish` | `content.publish` + CSRF | 400, 401, 403, 404, 409, 422 (ბლოკერი) |
| `POST /items/:id/schedule` (`{ at, version, data? }`) | `content.schedule` | `content.publish` + CSRF | 400 (`at`), 401, 403, 404, 409, 422 (`publishedAt`, ბლოკერი) |
| `GET /items/:id/versions` | `content.versions` | `content.read` | 400, 401, 403, 404 |
| `POST /items/:id/versions/:v/restore` | `content.restoreVersion` | `content.write` + CSRF | 400, 401, 403, 404 |
| `GET /search?q=` | `content.search` | `content.read` | 400, 401, 403 |
| `GET /reports/stats` | `reports.stats` | `content.read` | 401, 403 |
| `GET /reports/a11y` | `reports.a11yReport` | `a11y.read` | 401, 403 |
| `GET /settings` | `settings.get` | ადმინისტრატორი (`settings.manage`) | 401, 403 |
| `PATCH /settings` (`{ site?, featured? }`) | `settings.update` | `settings.manage` + CSRF | 400, 401, 403, 404 (რჩეული), 422 (`site`, `translations.en`) |

უფლებების ტესტი spec-ის ყველა B4 ოპერაციას გადის: ანონიმური → 401 ყველგან; რედაქტორი → 403 ზუსტად `getAdminSettings` / `updateAdminSettings`-ზე (`ROLE_PERMISSIONS`-ის ცხრილით); ადმინისტრატორი → 403 არსად.

### ჩეკლისტის წესი → ბლოკავს / აფრთხილებს → სად მოწმდება

| წესი (კოდები) | დონე | frontend (UX) | mock | სერვერი |
|---|---|---|---|---|
| სავალდებულო, slug, მოკლე აღწერა, თარიღი, ვარიანტი, ფოტოს პროპორცია, ღონისძიების დრო, სლაიდები | ბლოკავს | ✓ | ✓ | ✓ |
| `altMissing` (ფოტო; გუნდის ფოტო, პარტნიორის ლოგო — `validatePage`) | ბლოკავს | ✓ | ✓ (B4-მდე გვერდებზე — არა) | ✓ |
| `headingOrder`, `linkText`, `linkBroken` | ბლოკავს | ✓ | ✓ | ✓ |
| ვიდეო: `youtubeMissing` / `youtubeInvalid`, `captions*`, `transcript*`, `audioDescription*` | ბლოკავს | ✓ | ✓ | ✓ |
| `plainMissing`, `eventAccess` | ბლოკავს | ✓ | ✓ | ✓ |
| ინგლისური ვერსია (`EN_CODES`, თუ თარგმანი არის) → `translations.en.*` | ბლოკავს | ✓ | ✓ | ✓ |
| `[ჩანაცვლება]` YouTube-ის id-ში (`youtubeInvalid`) | ბლოკავს | — | — (dev / seed) | ✓ |
| დაგეგმვა — მხოლოდ მომავალი თარიღი (`publishedAt: date`) | ბლოკავს | ✓ | ✓ | ✓ |
| შენახული ტიპის `*Draft`; `translations.en` — მხოლოდ ტექსტი | ბლოკავს (შენახვასაც) | — | — | ✓ |
| `pdfUntagged` | აფრთხილებს | ✓ | ✓ | ✓ (არ ბლოკავს) |
| კონტრასტი, ხმოვანი ვერსია | ინფორმაციული | ✓ | — | — |

ერთი ფუნქცია სამ ადგილას: `publishBlockers(type, item, slugs, { placeholders })` (`src/content/checks.js`); რედაქტორი — `validateEntity` + `validateTranslation` (`checklist.blocking`), mock — `publishBlockers`, სერვერი — `publishBlockers(…, { placeholders: false })`.

### საჯარო API

**`src/content/checks.js`:** `validatePage(page)`, `validateEntity(type, values, slugs)`, `EN_CODES`, `EN_PREFIX`, `validateTranslation(type, values, slugs)` (ველი `translations.en.<გზა>`, ტექსტი + „(English)“), `placeholderIssues(type, item)`, `publishBlockers(type, item, slugs, { placeholders = true })`, `blockerFields(issues)` (ველი → პირველი `{ code, message }`), `issueCounts(issues)`.

**`src/admin/api/records.js`:** `DEFAULT_LIMIT` (10), `MAX_LIMIT` (50), `SEARCH_LIMIT` (50); `publicSlugs(articles, at)`, `issuesOf`, `typesFor(type | 'all')`, `toRow(type, record, { slugs, editor })`, `toRecord(type, record, { slugs, editor, working })`, `listRows(rows, params)`, `searchRows(rows, q)`, `versionList(record, historyNewestFirst, editor)`, `newDraft(data)`, `mergeUpdate(current, data)`, `keepFeatured(current, next)`, `publishItem(current, working, data, { status, publishedAt })`, `assertFuture(at, now, message)`, `imagesOf(item)`, `embeddedMedia(type, record)`, `buildStats(rowsByType, { now, library })`, `buildA11yReport(recordsByType, slugs)`, `FEATURED`, `featuredIds(recordsByType)`, `featuredChanges(patch, exists)`. ჩანაწერის ფორმა — `{ id, item, meta }` (mock-ის `StoreRecord` = repository-ის `ContentRecord`).

**server:** `routes/content.js` — `registerContentRoutes(app)`, `createDraftValidator(spec)`, `viewContext(app)` (`{ slugs, editor }`), `recordResponse`, `requireRecord`, `rowsOf(app, types)`, `assertPublishable(type, item, slugs)`, `draftValidationError(request, '' | '/data')`, `actorId(request)`; `routes/settings.js` — `registerSettingsRoutes(app)`. env ცვლადი არ დამატებულა.

**ტესტის helper-ები:** `scenarios/admin-scenarios.js` — `SCENARIOS` (`{ name, step, run(env) }`), `mockEnv({ start })`, `normalized(adapter)`, `code`, `failure`, `plain`, `ADMIN_EMAIL`, `EDITOR_EMAIL`, `NEW_PASSWORD`; `server/test/content/http-env.js` — `httpEnv(label, { start, env })` → `{ admin, adapter, pub, login, item, bySlug, ids, now, advance, repos, app, problems, notes, note, close }`; `server/test/browser.js` — `createBrowser({ base, matcher })`, `installDocument(active)`.

### გადახვევები prompt-იდან, mock-იდან და spec-იდან

1. **mock სერვერის წესს გაუთანაბრდა** (ეტალონი რჩება, parity — ზუსტი): `create` — სტატუსი ყოველთვის `draft`; `update` — `data.status` მხოლოდ `draft` ან უცვლელი (422 `fields.status: option`); `featured` შენახვით / გამოქვეყნებით / აღდგენით არ იცვლება (B2-ის `restore`-ის გადახვევა დაიხურა); უცნობი ან სხვა ტიპის რჩეული → 404 ჩაწერამდე (B2-ში mock ყველას ხსნიდა — დაიხურა); გვერდებზე ჩეკლისტი — `validatePage` (seed-ზე შედეგი იგივეა); ინგლისური ბლოკერის ტექსტს „(English)“ ერთვის — რედაქტორის იგივე.
2. **`ItemDraft` (`anyOf`) და 422 / 400:** ექვსი ტიპის შეცდომა ერთად (სტატიის სრულ item-ზე `PageDraft`-ის „უცნობი ველები“) კლასიფიკაციას არღვევდა — route-ებზე `attachValidation`, handler-ი შენახული ტიპის `*Draft`-ით აზუსტებს (გრძელი სათაური → 422 `title: tooLong`; `fields` სტატიაში → 400). spec უცვლელია.
3. **`Translations` spec-ში თავისუფალი რჩება** (B2-ის ღია #1): სერვერზე მას ბაზის `partialTextSchema` ამოწმებს — 121 → 422 `translations.en.*` (სამუშაო ასლზეც); ajv-ის ტიპური სქემა spec-ში 6 ახალ სქემას მოითხოვდა იმავე შედეგისთვის.
4. **`checkYouTube`** — prompt-ის სიაში არ იყო, spec-ში `x-step: B4`-ია — აწყობილია (mock-ის სემანტიკა: მთავარი, აუდიოაღწერა, სამუშაო ასლი).
5. **ადმინის სია / ძიება / stats — მეხსიერებაში** (mock-ის იგივე: `q` — სათაური + slug, `check` — ვალიდაცია); ინდექსიანი `searchText` — B6-ის საჯარო ძიებისთვის.
6. **`PATCH /settings`:** ჯერ ყველა რჩეულის id მოწმდება (404 — არაფერი იწერება), მერე `site` (მთლიანად, მიმდინარეზე ზემოდან), მერე თითო ტიპის `setFeatured` (ტრანზაქცია, ტიპზე ერთი). ერთი ტრანზაქცია ყველაფერზე არ არის — repository-ის ტრანზაქციები ჩადგმას არ უჭერენ მხარს.
7. **stats-ის `library`:** ჩადგმული ფოტო / PDF (`embeddedMedia`, mock-ის იგივე) + `media` კოლექცია (B5-მდე 0).
8. **„ჩვენ შესახებ“ (#3):** სერვერზე ცალკე `setOrg` არ არის — საჯარო წყარო (`snapshot()`) გვერდის item-ს კითხულობს: შენახვა / გამოქვეყნება საიტზე აისახება, ავტოშენახვა — არა (ტესტით, mock-ის `setOrg`-ის სემანტიკა).
9. **ტესტის ინფრასტრუქტურა:** `server/vitest.config.js` — `react()` + `svgr()` (UI-ის ტესტი); `http-env.js`-ის `close()` კავშირებს იძულებით ხურავს (Fastify-ის `keepAliveTimeout` 72 წმ close-ს აყოვნებდა).

### ღია საკითხები

1. **გამოქვეყნებული მასალის slug:** რედაქტორი სათაურის შეცვლისას slug-საც აახლებს (F8-ის ავტომატიკა), ამიტომ გამოქვეყნებულის საჯარო მისამართი ჩუმად იცვლება (UI ტესტმა აჩვენა) — გამოქვეყნებულზე ავტომატიკის გათიშვა ან ძველი მისამართის გადამისამართება (frontend + B6).
2. სერვერის ველის / ბლოკერის ტექსტი მხოლოდ ქართულია (გლობალური `t`) — `/en/admin` — B6.
3. ადმინის სია / ძიება / stats ყოველ მოთხოვნაზე ყველა მასალას კითხულობს — NGO-ს მასშტაბზე (ასობით) საკმარისია; ათასობით მასალაზე — `issues`-ის შენახვა ბაზაში ან ქეში.
4. გუნდის თარგმანი ორ ადგილას (გვერდის `translations.en.team[i]` ↔ წევრის `translations`) — B6.
5. მედია: ბიბლიოთეკა / alt / წაშლის ბლოკი HTTP-ზე — B5 (სცენარი `step: 'B5'` უკვე წერია; `stats.library`-ს ატვირთვები ემატება).
6. B2 / B3-ის დანარჩენი ღია საკითხები (პაროლის შეცვლა / აღდგენა, `?invite=` URL-ში, ვერსიის ვადა, deploy-ის მიგრაცია) — უცვლელია.

### შემდეგი: B5 — მედია და დოკუმენტები

ატვირთვა (ზომის / ტიპის ზღვარი, MIME-ის შემოწმება; VTT — `WEBVTT` თავსართი), R2, alt, გამოყენება (`mediaKeys` — ძველი ვერსიების ჩათვლით), წაშლის ბლოკი, PDF-ის ენა / tagged; `media.*` route-ები spec-იდან; parity — `SCENARIOS`-ის `step: 'B5'` HTTP-ზე (`http-env.js`-ის `media: true`), `stats.library` — ატვირთვებით.

## B5 — მედია და დოკუმენტები ✅ (2026-11-06)

**Gate:**
- frontend — `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (44 ფაილი, **769 / 769**; B4 — 735) · `npm run build` ✓ + check-dist ✓ (46 JS chunk: საჯარო 31-ში ადმინი / TipTap / validate არ არის, ადმინის — 15).
- server — `npm run server:lint` ✓ · `npm run server:test` ✓ (**31 ფაილი, 327 ტესტი**; B4 — 26 / 271).
- **zip-ის სუფთა ასლზე** `npm ci` → lint ✓ · server:lint ✓ · build ✓ · test ✓ (44 / 769) · server:test ✓ (31 / 327) — ტესტები ნაწილ-ნაწილ გაეშვა (sandbox-ის ბრძანების დროის ზღვარი), ჯამი სრულ გაშვებას ემთხვევა.
- **alt-ის გარეშე ფოტოთი გამოქვეყნება სერვერზე → 422** (`server/test/media/publish.test.js`): ატვირთული ფოტო ყდაზე, `alt: ''` → 422 `fields['cover.alt']: altMissing`, ვერსია უცვლელია; alt-ით — 200. ქართული VTT-ის გარეშე ვიდეო → 422 `captions: captionsMissing`; VTT-ით — 200, `cues` / `end` სერვერისაა (კლიენტის 999 / 1 → 2 / 7.25). რეესტრში არარსებული `/media/` ფაილი → 422 `fileMissing`.
- **ატვირთული სურათის EXIF ცარიელია (ტესტით):** JPEG (ხელით აწყობილი APP1: GPS 41°43′N 44°47′E, Make, Orientation 6 + COM), PNG (`eXIf` + `tEXt`), WebP (EXIF + XMP) → შენახულ ბაიტებში `exif` / `xmp` / `icc` / `orientation` — undefined, `Exif\0\0`, მოწყობილობის სახელი, GPS-ის ტექსტი, `eXIf`, `tEXt` — არ არის; Orientation 6 → 300 × 200 შენახულია 200 × 300-ად (`upload.test.js`, `media-http.test.jsx`, Chromium-ში — ქვემოთ).
- **მედიის ეკრანის axe 0 რეალურ API-ზე (dev)** — `npm run audit:media-api` (`scripts/audit_media_api.py`: `node server/index.js` development / in-memory MongoDB / `MEDIA_STORAGE=local` + `vite` dev `VITE_ADMIN_API=/api/admin`, proxy `/api` / `/media`). **Chromium 153.0.8010.12 + axe-core 4.14.0** (ფერის კონტრასტით): 6 მდგომარეობა × light / dark / contrast × 1440 / 390 = **36 გაშვება — 0 დარღვევა, 0 incomplete, ჰორიზონტალური სქროლი 0**. მდგომარეობები: `/admin/media` ატვირთვის შემდეგ, ბრაუზერის უარი (SVG `.png`-ად), სერვერის უარი (დაზიანებული JPEG — 400), alt-ის ფორმა, `?filter=missing-alt`, `/admin/documents` PDF-ის ატვირთვის შემდეგ. მიწოდება (proxy-ით): `GET /media/image/2026/….jpg` → 200, `image/jpeg`, `public, max-age=31536000, immutable`, CSP `default-src 'none'; sandbox`, `nosniff`, `inline`, ETag; ბაიტებში `Exif` / `TestCam` — არა; `<img>` ბიბლიოთეკაში იხატება (`naturalWidth` 200 — ორიენტაცია აისახა).
- **parity mock ↔ HTTP:** 24 / 24 (B5-ის 3 სცენარი — `http-env.js`-ის `media: true`); კვალი იდენტურია, HTTP-ის ყოველი პასუხი spec-ს აკმაყოფილებს (0 შენიშვნა).
- **მედიის ეკრანი და რედაქტორის ატვირთვა HTTP adapter-ით** (`server/test/ui/media-http.test.jsx`, jsdom + რეალური სერვერი): 4 / 4 — ატვირთვა → ბარათი „ხარვეზით“ → alt → წაშლა საცავიდან; SVG `.png`-ად ბრაუზერში ჩერდება (მოთხოვნა 0), დაზიანებული JPEG — სერვერის უარი ველთან + axe; 409-ის რბოლა → „ფაილი ამასობაში მასალაში ჩაისვა…“, ღილაკი მიზეზით; რედაქტორის ყდა → `/media/…` ბაზაში და ბიბლიოთეკაში გამოყენებით.
- SigV4: AWS-ის დოკუმენტაციის ორი მაგალითი (GET Object `f0e8bdb8…bdb41`, PUT Object `98ad7217…08bd`) ზუსტად ემთხვევა; R2-ის adapter — S3-ის სატესტო სერვერზე, რომელიც ყოველი მოთხოვნის ხელმოწერას თავიდან ითვლის.
- ქსელი: ახალი დომენი არ დასჭირდა (npm registry).

### ფაილის ტიპი → დაშვებულია? → ზღვარი → დამუშავება

| ტიპი (შიგთავსით) | დაშვებულია? | ზღვარი | დამუშავება |
|---|---|---|---|
| JPEG (`FF D8 FF`) | ✓ ფოტო | `MEDIA_MAX_IMAGE_MB` = `[10]` MB, `MEDIA_MAX_MEGAPIXELS` = `[40]` | `sharp`: `rotate()` (ორიენტაცია) → JPEG q85 mozjpeg; EXIF / GPS / XMP / IPTC / ICC / COM იშლება, ფერი → sRGB; ზომა / პროპორცია ინახება |
| PNG (`89 PNG …`) | ✓ ფოტო | იგივე | → PNG (compression 9); `eXIf`, `tEXt` / `iTXt` / `zTXt`, APNG-ის კადრები იშლება (პირველი კადრი) |
| WebP (`RIFF…WEBP`) | ✓ ფოტო | იგივე | → WebP q85; EXIF / XMP იშლება, ანიმაცია → პირველი კადრი (5 წამის წესი) |
| PDF (`%PDF-n.n` … `%%EOF`) | ✓ დოკუმენტი | `MEDIA_MAX_DOCUMENT_MB` = `[20]` MB | უცვლელად; `%%EOF` ბოლო 1024 ბაიტში (შეწყვეტილი → `fileDamaged`); სათაური / ენა / `tagged` — მეტა-ველებიდან |
| VTT (`WEBVTT` + ჰარი / ხაზი, BOM-ითაც) | ✓ სუბტიტრი (`track`) | 1 MB (`VTT_MAX_BYTES`, F10) | UTF-8 (მკაცრი) + `parseCaptions` (სტრიქონის ნომრით); `cues` / `end` რეესტრში; ბიბლიოთეკაში არ ჩანს |
| SVG | ✗ `fileType` | — | სკრიპტი / XSS |
| GIF, APNG-ის სახით გამოცხადებული ანიმაცია | ✗ `fileType` (GIF) | — | 5 წამის წესი; WebP / PNG-ის ანიმაცია — პირველ კადრამდე |
| HEIC / AVIF / TIFF / BMP | ✗ `fileType` | — | ბრაუზერის მხარდაჭერა; რედაქტორი JPG / PNG / WebP-ს ირჩევს |
| აუდიო / ვიდეო (MP3, MP4, WAV…) | ✗ `fileType` | — | ვიდეო მხოლოდ YouTube-ია (B0 / F10); სტატიის აუდიოს ველი ადმინში არ არის |
| HTML, ZIP / DOCX, სხვა | ✗ `fileType` | — | — |
| გაფართოება / გამოცხადებული MIME ≠ შიგთავსი | ✗ `fileMismatch` (400) | — | `.png` + JPEG, `.jpg` + PDF, `application/pdf` + JPEG; VTT-ზე `text/plain` დასაშვებია |
| ცარიელი / დაზიანებული | ✗ `fileEmpty` / `fileDamaged` | — | სურათი libvips-ით ვერ იხსნება, PDF `%%EOF`-ის გარეშე, VTT არა-UTF-8 |

ზღვარს ზემოთ — `fileTooLarge` („მაქსიმუმ {max}“); multipart ფაილს ყველაზე დიდი ზღვრით (`max(image, document)`) კითხულობს, გადაცილებისას ბოლომდე არ იკითხება. სურათი > მეგაპიქსელების ზღვარი → `imageTooLarge` (დეკომპრესიის ბომბი; დამუშავება რიგით, ერთდროულად ერთი).

### endpoint → როლი → შეცდომები

| endpoint | როლი (`x-permission`) | შეცდომები |
|---|---|---|
| `GET /api/admin/media` (`kind`, `missingAlt`) | ადმინისტრატორი, რედაქტორი (`media.read`) | 400 (query), 401, 403 |
| `POST /api/admin/media` (multipart: `file` + `alt`, `title`, `ratio`, `lang`, `tagged`) | `media.write` + CSRF | **400** — `fields.file` (`fileEmpty`, `fileType`, `fileMismatch`, `fileTooLarge`, `imageTooLarge`, `fileDamaged`, `vttHeader` / `vttTiming` / `vttOrder` / `vttEmpty`), არა-multipart, ორი ფაილი, სხვა ველის ფაილი, უცნობი მეტა-ველი; 401; 403 (CSRF, Fetch Metadata); **422** — `file: required`, `alt: tooLong`, `ratio: option`, `lang: option`; 201 — `MediaItem` |
| `PATCH /api/admin/media/{id}` (`alt` / `title`, `lang`, `tagged`) | `media.write` + CSRF | 400 (სხეული), 401, 403, 404, 409 (მასალა ამასობაში შეიცვალა — ვერსია), **422** (`alt: required` — ცარიელი) |
| `DELETE /api/admin/media/{id}` | `media.write` + CSRF | 400, 401, 403, 404, **409** — „გამოიყენება N მასალაში — ჯერ იქიდან მოხსენი.“ (გამოყენებული ან ჩადგმული) |
| `GET /api/admin/media/{id}/usage` | `media.read` | 400, 401, 403, 404 |
| `GET` / `HEAD /media/{key}` (API-ს გარეთ, spec-ში ოპერაცია არ არის) | საჯარო | 404 (უცნობი / არასწორი გასაღები, წაშლილი); 304 (`If-None-Match`) |

უფლება: `media.*` — ადმინისტრატორი და რედაქტორი (`permissions.js`); ტესტში — ანონიმური 401, CSRF-ის გარეშე 403, `Sec-Fetch-Site: cross-site` 403, რედაქტორი 201.

### შექმნილი ფაილები

- **server:** `storage/{index,keys,s3,sigv4,local,memory}.js`, `lib/media-files.js`, `db/media.js`, `routes/media.js`, `routes/media-check.js`, `migrations/002-version-media-keys.js`; ტესტები — `test/media/{fixtures.js,upload.test.js,library.test.js,storage.test.js,publish.test.js}`, `test/ui/media-http.test.jsx`.
- **საერთო / frontend:** `src/content/files.js` (+ `files.test.js`), `src/admin/api/library.js` (+ `__tests__/library.test.js`), `src/admin/components/upload-messages.js`.
- `scripts/audit_media_api.py`.

### შეცვლილი ფაილები (ერთი წინადადებით)

- `server/app.js` — `app.storage` (`createStorage(config.media)`, ტესტში — ჩანაცვლებადი), მედიის route-ები spec-ის რიგით, `apiRoutes` მხოლოდ `/api/*` (`/media/*` spec-ის ოპერაცია არ არის).
- `server/config.js` — `MEDIA_STORAGE`, `MEDIA_DIR`, `R2_*`, `MEDIA_MAX_IMAGE_MB` / `_DOCUMENT_MB` / `_MEGAPIXELS` → `config.media`; წარმოებაში მხოლოდ `r2` და R2-ის გასაღებები სავალდებულოა.
- `server/db/collections.js` — `versions.mediaKeys` (სავალდებულო) + ინდექსი, `media.cues` / `end`.
- `server/db/content.js` — ვერსიაში `mediaKeys`; `replace({ working })` — სამუშაო ასლი რჩება; `usageCount(key)`, `scrubHistory(key)`, `scrubMediaKey`.
- `server/db/index.js` — `repos.media`; `server/migrations/index.js` — 002.
- `server/routes/content.js` — გამოქვეყნება / დაგეგმვა: `reconcileFiles` → `assertPublishable(…, extra)`.
- `server/routes/settings.js` — `stats.library` ბიბლიოთეკიდან (`buildLibrary` + `libraryCounts`).
- `server/openapi.yaml` — ატვირთვის / PATCH / DELETE-ის აღწერა (ფაილის შეცდომა — 400, მეტა — 422, 409-ის ტექსტი), `MediaItem.kind` + `track`, `/media/{key}`-ის მიწოდება `info`-ში.
- `server/package.json` — `sharp` 0.35.5, `@fastify/multipart` 10.1.6 (ზუსტად); root `package.json` — `overrides` (`@fastify/busboy` 3.2.4, `semver@7` → 7.8.5), `audit:media-api`; `package-lock.json`.
- `server/.env.example` — B5-ის ცვლადები placeholder-ებით.
- `src/content/errors.js` — `ContentError({ message })` (კონკრეტული ტექსტი კოდის ზოგადის ნაცვლად).
- `src/admin/api/mock.js` — მედია `library.js`-ით (ტიპი შიგთავსით, VTT — `parseCaptions`, `kind: 'track'`, alt ყველა გამოყენებაში, სამუშაო ასლი რჩება, 409 ტექსტით); `save(…, { working })`.
- `src/admin/api/records.js` — `imagesOf` / `embeddedMedia` ამოღებულია (→ `library.js`).
- `src/admin/api/adminAdapter.js` — `MediaItem.kind` + `track` (JSDoc).
- `src/admin/pages/MediaPage.jsx`, `DocumentsPage.jsx` — ბრაუზერის შემოწმება (`checkBlob`), ზუსტი `accept`, ატვირთვის შეცდომა ხილულია (`FieldError`, `role="alert"`, `aria-describedby`), 409 → სია ახლდება, „N მასალაში“ — მასალები; `Link`-ის key ველითაც.
- `src/admin/editor/fields/FieldRenderer.jsx` — ფოტოს / PDF-ის ველი ფაილს ბრაუზერში ამოწმებს, სერვერის უარი ველთან ჩანს (ადრე უხმოდ იკარგებოდა); VTT-ის ველი სერვერის უარს `problem`-ში აჩვენებს.
- `src/admin/editor/editor.css` — `.mc-library__problem`, `.mc-upload-problem`.
- `src/admin/i18n/ka.js`, `en.js` — `fieldErrors.file*` (7), `library.inUseNow`, `uploadFailed`, `fields.{team,partners,slides,captions}`, `documents.wrongType`.
- `src/admin/__tests__/scenarios/admin-scenarios.js` — B5-ის ორი ახალი სცენარი, `PNG_3X2`, `MINIMAL_PDF`, `CAPTIONS`.
- `server/test/*` — `openapi` (B5-ის route-ები), `config` (+2), `collections` / `seed` (28 ცვლილება, 002), `boot` / `app` / `limits` / `seed` (production-ში `FAKE_R2_ENV`), `browser.js` (`encodeMultipart` — jsdom-ის FormData-ც), `http-env.js` (`media: true`), `parity` (B5), `contract/responses` (ვალიდური PDF).
- `vite.config.js` — dev proxy `/api`, `/media` → `VITE_API_PROXY` (ნაგულისხმევი `http://127.0.0.1:3000`).
- `.gitignore` — `server/.media/`, `audit-media-api.json`, `__pycache__/`; `CLAUDE.md` — რუკა, npm სკრიპტი, „კოდის კონვენციები (B5)“; `docs/project-context.md` — §9 #27, #29, #30, §10 „Backend — მედია და დოკუმენტები (B5)“, §12.

### საჯარო API

**`src/content/files.js`** (სერვერი, mock, UI): `MEDIA_TYPES` (MIME → `{ kind, extensions }`), `FILE_KINDS`, `DEFAULT_FILE_LIMITS` (`image` 10 MB, `document` 20 MB, `track` 1 MB), `DEFAULT_MAX_PIXELS` (40 000 000), `SNIFF_BYTES` (16), `MB`, `sniffType(bytes) → mime | null`, `fileExtension(name)`, `normalizeMime(type)`, `storedExtension(mime)`, `checkFile({ name, type, size, head }, { kinds, limits }) → { ok: true, mime, kind } | { ok: false, code, max? }`, `acceptFor(kinds)`, `readHead(blob)`, `checkBlob(file, options)`.

**`src/admin/api/library.js`** (mock + სერვერი): `FileRecord` (typedef), `nodeKind`, `fileNodes(item) → { path, node, kind }[]`, `recordTitle`, `parseEmbeddedId(id)`, `buildLibrary(recordsByType, files) → MediaItem[]`, `findMediaItem(recordsByType, files, id)`, `filterLibrary(items, { kind, missingAlt })`, `libraryCounts(items)`, `usageCount(usage)`, `patchNode`, `normalizeMediaPatch(kind, patch)` (ცარიელი alt → `validation`), `patchRecord(item, working, target, patch) → { item | null, working | null }`, `fileFieldError(code, vars)`, `fileError(code, vars)` (400 + `fields.file`), `inUseError(usage | count)` (409).

**`src/admin/components/upload-messages.js`:** `checkMessage(check, wrongTypeKey)`, `uploadMessage(error)`. **`src/content/errors.js`:** `new ContentError(code, { message })`.

**server:**
- `storage/index.js`: `Storage` (typedef: `kind`, `put(key, body, { contentType, cacheControl })`, `get(key) → { body, contentType, size, etag } | null`, `head(key)`, `delete(key)`), `createStorage(config.media, { fetch, now })`; `storage/keys.js`: `MEDIA_KEY_PATTERN`, `MEDIA_CACHE_CONTROL`, `isMediaKey`, `newMediaKey(kind, mime, now)`, `contentTypeOfKey`, `mediaSrc(key)`, `keyOfSrc(src)`, `assertKey`; `storage/s3.js`: `createS3Storage(r2, { fetch, now, timeoutMs })`; `storage/sigv4.js`: `signRequest(…) → { headers, canonicalRequest, stringToSign, signature }`, `sha256Hex`, `uriEncode`, `amzDates`, `EMPTY_SHA256`, `ALGORITHM`; `storage/local.js`: `createLocalStorage({ dir })`; `storage/memory.js`: `createMemoryStorage()` (+ `size`, `keys`).
- `lib/media-files.js`: `processImage(buffer, { mime, maxPixels }) → { data, width, height }`, `checkPdf(buffer)`, `checkVtt(buffer) → { cues, end }`, `detectRatio(width, height)`.
- `db/media.js`: `createMediaRepository(database, { now, content })` → `insert`, `find`, `findByKey`, `findByKeys`, `list`, `update`, `remove(id, inUse)` → `{ doc, scrubbed }`; `toFileRecord(doc)`, `newMediaId()` (`m-` + ObjectId), `MediaDoc` (typedef).
- `db/content.js` (+): `replace(id, item, { by, version, working })`, `usageCount(key)`, `scrubHistory(key, { session })`, `scrubMediaKey(value, key)`.
- `routes/media.js`: `registerMediaRoutes(app)` (async), `libraryState(app)`, `attachment(title)`; `routes/media-check.js`: `reconcileFiles(app, item) → { item, missing }`; `routes/content.js`: `assertPublishable(type, item, slugs, extra)`.
- `buildApp({ storage })`, `app.storage`; `migrations/002-version-media-keys.js` (`id`, `up(db)`).
- ტესტის დამხმარე: `test/media/fixtures.js` — `jpegWithGps`, `pngWithGps`, `webpWithExif`, `exifTiff`, `PDF`, `VTT`, `BAD_VTT`, `CAMERA`, `SECRET_NOTE`, `multipart(file, fields)`; `test/browser.js` — `encodeMultipart(form)`; `test/helpers.js` — `FAKE_R2_ENV`.

**env (+):** `MEDIA_STORAGE` (`r2` | `local` | `memory`; ცარიელი → production `r2`, development `local`, test `memory`), `MEDIA_DIR` (local; ნაგულისხმევი `server/.media/`), `R2_ACCOUNT_ID` (32 hex) ან `R2_ENDPOINT` (S3-თავსებადი), `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MEDIA_MAX_IMAGE_MB` (1–50, 10), `MEDIA_MAX_DOCUMENT_MB` (1–100, 20), `MEDIA_MAX_MEGAPIXELS` (1–100, 40). frontend dev: `VITE_API_PROXY` (vite.config.js).

**npm:** `npm run audit:media-api` (Python Playwright; სერვერს და vite-ს თავად უშვებს, ადმინისტრატორი — ერთჯერადი შემთხვევითი პაროლით env-ით).

**ბანდლი (gzip, B4-ის build-თან შედარებით):** საჯარო `index` 124.46 → 124.47 kB (+6 B — `ContentError`-ის `message`), სხვა საჯარო chunk-ები ±2 B (minifier); ადმინი — ახალი `library` 3.17 kB, `MediaPage` 1.85 → 2.09, `DocumentsPage` 1.30 → 1.58, ადმინის `i18n` 17.05 → 17.70, `mock` 6.03 → 5.98 kB.

### გადახვევები prompt-იდან, §12-იდან და B4-ის გეგმიდან

1. **R2 — საკუთარი SigV4, `@aws-sdk/client-s3`-ის ნაცვლად** (§12): SDK-ის transitive დამოკიდებულებები (`@smithy/*`, `@aws-sdk/*`) `^`-დიაპაზონითაა და თითქმის ყოველდღე გამოდის — „≥ 14 დღის“ წესით ჩაკეტვა ~90 override-ს მოითხოვდა. საჭიროა ოთხი ოპერაცია; ხელმოწერა AWS-ის ორ საცნობარო მაგალითს ზუსტად ემთხვევა.
2. **ფაილის შეცდომა → 400 + `fields.file`** (spec-ში B1-იდან ეწერა 422): prompt-ის „გაფართოება ≠ შიგთავსი → 400“, „ზომა → 413 / 400“ — 413 კონტრაქტის სტატუსებში არ არის (B1: Fastify-ის 413 → 400). მეტა-ველი რჩება 422. `http.js` 400 / 422 `fields`-ს ერთნაირად კითხულობს — frontend-ის კონტრაქტი არ შეცვლილა; spec-ის აღწერა გასწორდა.
3. **ძველი ვერსია წაშლას არ ბლოკავს** (B4-ის გეგმა: „`mediaKeys` — ძველი ვერსიების ჩათვლით“): 30 ძველი ვერსია თანხმობის გაუქმებულ ფოტოს თვეობით შეინახავდა. წაშლისას ისტორიაში `src` → null (alt რჩება), აღდგენა ჩანაცვლების ჩარჩოს აჩვენებს და არა გატეხილ ბმულს.
4. **ბიბლიოთეკა — ფაილი ერთ ბარათად ყველა გამოყენებით** (F8-ის mock-ში ატვირთვა და მისი გამოყენება ორ ბარათად ჩანდა): `PATCH` ფაილზე alt-ს ყველა გამოყენებაში ცვლის; ჩადგმული (`img:`) — ერთ ველს. ავტორიტეტული alt მასალაშია (B2-ის გადაწყვეტილება უცვლელია).
5. **ფაილის კვანძი — ნებისმიერი ობიექტი `src`-ით** (F8: მხოლოდ `cover`, `photo`, `body[i].image`, `pdf`): ბიბლიოთეკაში გუნდის ფოტო, პარტნიორის ლოგო, სლაიდის ფოტოც ჩანს (seed-ზე ბიბლიოთეკა 87 ჩანაწერია).
6. **ბიბლიოთეკის alt-ის შეცვლა სამუშაო ასლს აღარ შლის** — F8-ის mock-ის ხარვეზი (რედაქტორის ავტოშენახული ცვლილება იკარგებოდა); გასწორდა ორივე მხარეს (`replace({ working })`, `save(…, { working })`), ტესტით.
7. **ცარიელი alt `PATCH`-ით → 422** (prompt-ში არ იყო): ბიბლიოთეკიდან გამოქვეყნებული მასალის alt-ის წაშლა ბლოკერს გვერდს აუვლიდა.
8. **`MediaItem.kind` + `track`** — VTT-ის ატვირთვის პასუხი (mock `image`-ს აბრუნებდა, spec-ს არ აკმაყოფილებდა); ორივე მხარეს, typedef-ით.
9. **ზომის ვარიანტები არ კეთდება** — B0-ში არ გადაწყვეტილა (prompt: „თუ გადაწყდა“); ფაილი ორიგინალის ზომით ინახება — რეკომენდაცია §9 #30-ში.
10. **დამატებით (prompt-ში არ იყო):** `fileMissing` და VTT-ის `cues` / `end` სერვერიდან გამოქვეყნებისას; PDF-ის `%%EOF`-ის შემოწმება; ანიმაციის პირველ კადრამდე დაყვანა; მეგაპიქსელების ზღვარი; `HEAD` ცალკე route-ით (Fastify-ის ავტომატური HEAD ნაკადს ბოლომდე კითხულობს); Vite-ის dev proxy.
11. **multipart მხოლოდ ატვირთვის route-ის კონტექსტშია** (encapsulated plugin) — სხვა endpoint-ი `multipart/form-data`-ს არ იღებს (B3-ის CSRF-ის წესი უცვლელია).
12. **`semver` 7.8.6 B1-იდან** (`fastify`, `mongodb-memory-server-core`, 14 დღეზე ახალი იყო) — `overrides`-ით 7.8.5-ზე ჩაიკეტა ახალ `sharp`-თან ერთად; `npm ls` სუფთაა.
13. prompt-ის „მედიის ეკრანი და რედაქტორის ატვირთვა HTTP adapter-ით (frontend-ის ტესტები)“ — `server/test/ui/media-http.test.jsx`-შია (`npm run server:test`, jsdom), არა `npm test`-ში: რეალურ სერვერს memory-server სჭირდება (B4-ის კონვენცია). mock-ზე იგივე ეკრანი `npm test`-ში მოწმდება (`editor.test.jsx`, `library.test.js`).

### ღია საკითხები

1. **ზღვრები** — ფოტო `[10] MB`, PDF `[20] MB`, `[40]` მეგაპიქსელი — დასადასტურებელი (env).
2. **ზომის ვარიანტები / `srcset`** — 12–24 MP ფოტო მობილურზე მძიმეა; რეკომენდაცია: 640 / 1280 / 2400px WebP ატვირთვისას (მოდელი + `Media` + სერვერი, ცალკე ნაბიჯი).
3. **ინგლისური alt ბიბლიოთეკაში** — არ ჩანს / არ რედაქტირდება (English ჩანართით); გამოქვეყნების ბლოკერი ორივე ენას ამოწმებს.
4. **სერვერის ფაილის შეცდომის ტექსტი მხოლოდ ქართულია** — `/en/admin`-ზე ბრაუზერის შემოწმება ინგლისურია, სერვერის უარი — ქართული (B4-ის #2, B6).
5. **ობოლი ფაილები** — შეცვლილი VTT და მასალიდან მოხსნილი ფოტო რჩება (VTT ბიბლიოთეკაში არ ჩანს); გასუფთავების სკრიპტი — B7 ან ცალკე.
6. **ფაილი საჯაროა გასაღებით** (128 ბიტი), მონახაზისაც — კონფიდენციალურობის პოლიტიკაში; PDF-ის შიდა მეტამონაცემი (Author, Creator) არ იშლება, PDF/UA ავტომატურად არ მოწმდება.
7. **B7:** R2-ის bucket და გასაღები (Object Read & Write მხოლოდ ერთ bucket-ზე), `MEDIA_BASE_URL` (custom domain / CDN — მაშინ `Cross-Origin-Resource-Policy` გადასახედია), R2-ის backup / versioning; საიტის HTML-ის CSP-ში `img-src 'self'` საკმარისია (`/media/*` same-origin).
8. **წაშლის რბოლა:** ტრანზაქცია გამოყენებას თავიდან ამოწმებს, მაგრამ პარალელური შენახვა, რომელიც ფაილს ამ წამს ჩასვამს, ტრანზაქციას არ ეჯახება (write skew) — ასეთ მასალას გამოქვეყნებისას `fileMissing` დაიჭერს.
9. B2–B4-ის დანარჩენი ღია საკითხები (პაროლის შეცვლა / აღდგენა, `?invite=`, slug-ის ცვლილება გამოქვეყნებულზე, გუნდის თარგმანი ორ ადგილას) — უცვლელია.

### შემდეგი: B6 — საჯარო API და ფორმები

`ContentAdapter`-ის HTTP ვერსია (სიები, ფილტრები, `localize`, საჯარო ძიება `searchText`-ით), კონტაქტი (honeypot, rate limit `forms`, წერილი — fake transport), გამოწერა — double opt-in (`subscribe` → `{ ok, status: 'pending' }`, `confirmSubscription` — კონტრაქტი ორივე მხარეს), cache-header-ები საჯარო GET-ზე, სერვერის შეცდომის ენა მოთხოვნიდან. ფოტო საჯარო პასუხში — `/media/<key>` უკვე same-origin-ია (B5).

## B6 — საჯარო API და ფორმები ✅ (2026-11-07)

**Gate:**
- frontend — `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓) · `npm test` ✓ (47 ფაილი, **827 / 827**; B5 — 44 / 769) · `npm run build` ✓ + check-dist ✓ (49 JS chunk: საჯარო 34-ში ადმინი / TipTap / validate არ არის, ადმინის — 15). `src/content/http.js` წარმოების bundle-ში **არ ხვდება** (`VITE_CONTENT_API` არ არის — `/api/v1` და `credentials:"omit"` dist-ში არ მოიძებნა). ზომა B5-თან: საჯარო chunk-ები ჯამში +10.4 kB (+3.6 kB gzip; ახალი გვერდები, `public.js`, mock-ის ფორმები, ინგლისური ლექსიკონი), entry +1.0 kB (+0.33 kB gzip — ka.js-ის ახალი სტრიქონები), ადმინი +79 B.
- server — `npm run server:lint` ✓ · `npm run server:test` ✓ (**35 ფაილი, 410 ტესტი**; B5 — 31 / 327).
- **zip-ის სუფთა ასლზე** `npm ci` → lint ✓ · server:lint ✓ · build ✓ (49 chunk) · test ✓ (47 / 827) · server:test ✓ (35 / 410).
- **parity mock ↔ HTTP, ka + en** (`server/test/public/parity.test.js`, seed-იანი memory-server, რეალური სერვერი + `src/content/http.js`): 55 / 55 — frontend-ის კონტენტის 22 სცენარი (`CONTENT_SCENARIOS`: 40 გაშვება) + ფორმის 6 (`FORM_SCENARIOS`: 12) + seed, თვითშემოწმება (ka ≠ en), ძიების ზესიმრავლე (ყოველი საჯარო სტატია თავისი სიტყვით მოიძებნება, ორივე ენაზე). კვალი — **სრული პასუხები** (JSON) და ველის შეცდომის ტექსტი — იდენტურია; HTTP-ის ყოველი მოთხოვნა / პასუხი spec-ს და ქეშის წესს აკმაყოფილებს (0 შენიშვნა). იგივე სცენარები frontend-ზე mock-ით — `src/content/adapter.test.js`.
- **ადმინის parity** 25 / 25 — `pub` ახლა რეალური `/api/v1`-ია (B6-ის ახალი სცენარი: გვერდის `translations.en.team[i]` საჯარო გუნდში ჩანს — ორივე მხარეს).
- **ქეში** (`cache.test.js`, 8): `ETag` = sha256, `public, max-age=0, must-revalidate`, `If-None-Match` (სია, `W/`, `*`) → 304 სხეულის გარეშე; ბაზაში ცვლილება / წაშლა და დაგეგმილი დროის დადგომა → მომდევნო მოთხოვნაზე ახალი ETag; 404 / 400 — `no-store`, ETag-ის გარეშე; HEAD; ცარიელი ბაზა.
- **ფორმები სერვერზე** (`forms.test.js`, 13): წერილი inbox-ზე (სათაური — მხოლოდ თემა, `Reply-To`, სრული ტექსტი + მხარდაჭერა), honeypot → 200 იგივე ფორმით / არაფერი ინახება, დიაგნოზის / უცნობი ველი → 400, TTL, წერილის ჩავარდნა → 500 + ჩანაწერი იშლება, ველის შეცდომა ინგლისურად (422 — სქემაც და `validateContact`-იც), token — მხოლოდ sha256, ვადა 7 დღე, მისასალმებელი წერილი `List-Unsubscribe`-ით, სხვა საიდუმლოთი ხელმოწერილი ბმული → 404, **ოთხივე route-ზე 429 + `Retry-After`** ინგლისური ტექსტით, cross-site → 403, **ლოგი — მხოლოდ მოვლენები** (ელფოსტა, სახელი, ტექსტი, token, IP, შეცდომის ტექსტი — არა).
- **ფორმები HTTP adapter-ით** (`server/test/ui/forms-http.test.jsx`, jsdom + რეალური სერვერი, 4): კონტაქტი მხოლოდ კლავიატურით → დადასტურება (ფოკუსი სათაურზე) → ბაზა + inbox, axe 0; 429 → `role="alert"`, ტექსტი რჩება; გამოწერა → „შეამოწმე ელფოსტა“ → წერილის ბმული → დადასტურება (ბმულის გახსნა არაფერს ცვლის) → მისასალმებელი წერილი → გაუქმება; ინგლისური ველის შეცდომა და `/en/subscribe/confirm` ბმული.
- **Chromium 153.0.8010.12 + axe-core 4.14.0 რეალურ API-ზე** — `AUDIT_API=1 npm run audit -- --only axe,en,forms` (`node server/index.js` development / in-memory MongoDB + seed / `MAIL_TRANSPORT=file` + build `VITE_CONTENT_API=/api/v1`-ით `dist-api/`-ში, `vite preview` — `/api` proxy-ით; content-ის mock ამ bundle-ში არ არის): **axe (ka)** — 15 როუტი (B6: + `/subscribe/confirm` ღილაკით, token-ის გარეშე, `/subscribe/unsubscribe`) × light / dark / contrast × 1440 / 390 = **90 გაშვება — 0 დარღვევა, 0 incomplete, ჰორიზ. სქროლი 0**; **en** — 14 საჯარო `/en` როუტი + ადმინის 6 (mock) × 3 × 2 = **120 — 0 / 0, `<html lang="en">` ყველგან**; **forms** — 6 მდგომარეობა × 3 × 2 = **36 — 0 / 0**: `/contact` → დადასტურება (**მხოლოდ კლავიატურით**: ველზე ფოკუსი → აკრეფა → Tab → Space თანხმობაზე → Enter; ფოკუსი „შეტყობინება მიღებულია“-ზე; გვერდზე CAPTCHA 0), `/news` → „შეამოწმე ელფოსტა“, წერილის ფაილიდან ბმული → `/subscribe/confirm` → „დადასტურდა“, იგივე ბმული ხელახლა → alert, მისასალმებელი წერილის ბმული → „გაუქმდა“.
- ქსელი: ახალი დომენი არ დასჭირდა.

### endpoint → ContentAdapter → cache

| endpoint | ფუნქცია | 200 / 304 | შეცდომა |
|---|---|---|---|
| `GET /api/v1/articles` | `listArticles` | `ETag` + `public, max-age=0, must-revalidate`; `If-None-Match` → 304 | 400 — `no-store` |
| `GET /api/v1/articles/{slug}` | `getArticle` | იგივე | 404 — `no-store` |
| `GET /api/v1/series`, `/{slug}` | `listSeries`, `getSeries` | იგივე | 400 / 404 |
| `GET /api/v1/videos`, `/{slug}` | `listVideos`, `getVideo` | იგივე | 400 / 404 |
| `GET /api/v1/news`, `/{slug}` | `listNews`, `getNews` | იგივე | 400 / 404 |
| `GET /api/v1/events` | `listEvents` | იგივე | 400 |
| `GET /api/v1/team`, `/partners`, `/stages` | `getTeam`, `getPartners`, `getStages` | იგივე | — |
| `GET /api/v1/settings` | `getSettings` | იგივე | 404 (ცარიელი ბაზა) |
| `POST /api/v1/subscribe` | `subscribe` | `no-store` | 400 / 403 / 422 / 429 / 500 |
| `POST /api/v1/subscribe/confirm` | `confirmSubscription` | `no-store` | 400 / 403 / 404 / 429 |
| `POST /api/v1/subscribe/unsubscribe` | `unsubscribe` | `no-store` | 400 / 403 / 404 / 429 |
| `POST /api/v1/contact` | `sendContact` | `no-store` | 400 / 403 / 422 / 429 / 500 |

ყოველ ოპერაციას `?lang=ka|en` აქვს: პასუხი (`localize`, `translations` არ ხვდება, `lang` ემატება) და შეცდომის ტექსტი ამ ენაზეა.

### ფორმის ველი → წესი → შეცდომის ტექსტი (ka / en)

| ფორმა · ველი | წესი (`forms.js`) | ka | en |
|---|---|---|---|
| გამოწერა · `email` | ცარიელი / ჰარი | ეს ველი სავალდებულოა. | This field is required. |
| გამოწერა · `email` | ფორმატი (≤ 120) | ელფოსტა ასე უნდა გამოიყურებოდეს: name@example.ge | An email address looks like this: name@example.ge |
| კონტაქტი · `name` | ცარიელი | ეს ველი სავალდებულოა. | This field is required. |
| კონტაქტი · `name` | > 100 | ტექსტი ძალიან გრძელია — მაქსიმუმ 100 სიმბოლო. | The text is too long — at most 100 characters. |
| კონტაქტი · `contact` | ცარიელი | ეს ველი სავალდებულოა. | This field is required. |
| კონტაქტი · `contact` | არც ტელეფონი (7–15 ციფრი), არც ელფოსტა | შეიყვანე ტელეფონის ნომერი ან ელფოსტა. | Enter a phone number or an email address. |
| კონტაქტი · `topic` | ვარიანტი | აირჩიე ერთ-ერთი ვარიანტი. | Choose one of the options. |
| კონტაქტი · `message` | > 4000 | … მაქსიმუმ 4000 სიმბოლო. | … at most 4000 characters. |
| კონტაქტი · `support` | > 1000 (თავისუფალი ტექსტი — დიაგნოზი არა) | … მაქსიმუმ 1000 სიმბოლო. | … at most 1000 characters. |
| კონტაქტი · `replyVia` | ვარიანტი | აირჩიე ერთ-ერთი ვარიანტი. | Choose one of the options. |
| კონტაქტი · `replyVia` | ელფოსტით — კონტაქტი ელფოსტაა | ელფოსტით პასუხისთვის „ტელეფონი ან ელფოსტა“ ველში ელფოსტა მიუთითე — ან აირჩიე სხვა არხი. | For a reply by email, enter an email address in “Phone or email” — or choose another channel. |
| კონტაქტი · `replyVia` | ზარი / მესიჯი — კონტაქტი ტელეფონია | ზარისთვის ან მესიჯისთვის „ტელეფონი ან ელფოსტა“ ველში ტელეფონის ნომერი მიუთითე — ან აირჩიე სხვა არხი. | For a call or a message, enter a phone number in “Phone or email” — or choose another channel. |
| კონტაქტი · `consent` | `true` | გაგზავნისთვის საჭიროა თანხმობა მონაცემების დამუშავებაზე. | To send the form, agree to the processing of your data. |
| კონტაქტი · `website` | honeypot შევსებული → 200, არ ინახება, არ იგზავნება | — (შეცდომა არ ჩანს) | — |
| ბმული · `token` | ფორმა (43 base64url / `<24 hex>.<43>`) → 400; უცნობი / ვადაგასული / გამოყენებული → 404 | ბმული ვადაგასულია ან უკვე გამოყენებულია… / ბმული არასწორია… | The link has expired or has already been used… / The link is not valid… |
| ყველა | ძალიან ბევრი მცდელობა (`RATE_LIMIT_FORMS_*`; კონტაქტზე + მისამართი) | ძალიან ბევრი მცდელობა. სცადე ცოტა ხანში. | Too many attempts. Try again in a little while. |

ვალიდაცია ორ ფენადაა: **სტრუქტურა** — spec (უცნობი ველი, ტიპი → 400; სავალდებულო გასაღები, ვარიანტი, ზღვარზე გრძელი → 422 მხოლოდ ამ ველზე), **შინაარსი** — `forms.js` handler-ში (სრული ველების ჯამი). ფორმა იგივე წესს ბრაუზერში იყენებს, ამიტომ მომხმარებელი პირველ ფენამდე არ აღწევს; parity-ის სცენარი UI-ის ფორმის სხეულით ორივე მხარეს ერთნაირ ველებსა და ტექსტს ამოწმებს. CAPTCHA და დროის ლიმიტი არცერთ ფორმაზე არ არის.

### შექმნილი ფაილები

- `src/content/http.js` — `createHttpContentAdapter({ baseUrl, fetch, locale })`, `responseError`, `DEFAULT_CONTENT_API`.
- `src/content/public.js` — `PUBLIC_COLLECTIONS`, `deriveItem`, `publicItem`, `publicSnapshot`, `compactTranslation`, `orgFromPage`.
- `src/content/mock/forms.js` — `createMockForms` (double opt-in, outbox, კონტაქტი).
- `src/content/__tests__/scenarios/content-scenarios.js` — `CONTENT_SCENARIOS`, `FORM_SCENARIOS`, `mockContentEnv`, `CONTACT_BASE`, `NOW`, `plain`, `rejection`.
- `src/content/{http,public}.test.js`; `src/features/subscribe/{SubscriptionAction.jsx, subscription.css, __tests__/subscription.test.jsx}`; `src/pages/{SubscribeConfirmPage,UnsubscribePage}.jsx`.
- `server/routes/{public,forms}.js`; `server/mail/{index,templates}.js`; `server/lib/{i18n,subscriptions}.js`; `server/db/forms.js`; `server/migrations/003-public-search.js`.
- `server/test/public/{public-env.js, parity.test.js, cache.test.js, forms.test.js}`; `server/test/ui/forms-http.test.jsx`.

### შეცვლილი ფაილები (ერთი წინადადებით)

- `src/i18n/locale.js`, `index.js` — `withLocale(locale, fn)` (სინქრონული; სერვერის ენა მოთხოვნიდან).
- `src/content/query.js` — `articleHaystack` → ექსპორტირებული `articleSearchText` (კატეგორიის წარწერა მხოლოდ ვალიდურ კატეგორიაზე) — mock-ის ძიება და სერვერის `searchText` ერთი ფუნქციით.
- `src/content/adapter.js` — `VITE_CONTENT_API` → `http.js`, `confirmSubscription` / `unsubscribe`, `source: 'mock' | 'http'`.
- `src/content/model.js` — `SubscribeResult` (`status: 'pending'`), `ConfirmResult`, `UnsubscribeResult`.
- `src/content/forms.js` — `SUBSCRIBE_CONFIRM_DAYS`, `SUBSCRIBE_TOKEN`, `UNSUBSCRIBE_TOKEN`, `isSubscribeToken`, `isUnsubscribeToken`, `subscriptionLink`, `tokenFromHash`.
- `src/content/mock/index.js` — `publicSnapshot` (localize + გამოთვლადი ველები) და ფორმები `mock/forms.js`-იდან (`subscribers` — Map, `outbox`).
- `src/admin/api/mock.js` — „ჩვენ შესახებ“-ის შენახვა `orgFromPage`-ით (გვერდის ინგლისური თარგმანი წევრს ერთვის).
- `src/features/subscribe/SubscribeForm.jsx` — წარმატება = „შეამოწმე ელფოსტა… ბმული 7 დღე მოქმედებს“; `src/features/contact/ContactForm.jsx` — დოკუმენტაცია (rate limit — სერვერზე).
- `src/routes.jsx` — `subscribe/confirm`, `subscribe/unsubscribe`; `src/i18n/{ka,en}.js` — `subscribe.pending`, `subscription.*`.
- `src/content/adapter.test.js` — წაკითხვის ტესტები საერთო სცენარებად; `src/features/__tests__/page-helpers.jsx` — proxy-ში ახალი ფუნქციები; `subscribe.test.jsx` — ახალი ტექსტი.
- `server/openapi.yaml` — საჯარო GET-ზე `ETag` / `Cache-Control` + 304 (`NotModified`), `getSettings` → 404, `confirmSubscription` / `unsubscribe` + token-ის სქემები, `SubscribeResult.status`, `Lang` ფორმებზე, აღწერები.
- `server/app.js` — საჯარო და ფორმის route-ები (spec-ის რიგით), `app.mailer`; `server/lib/security.js` — საჯარო GET-ის `Cache-Control` არ იცვლება (შეცდომაზე — `no-store`); `server/lib/errors.js` — `/api/v1/*`-ზე ტექსტი `?lang=`-ით.
- `server/config.js`, `server/.env.example` — `MAIL_TRANSPORT`, `MAIL_DIR`, `CONTACT_INBOX`, `MAIL_FROM`, `PUBLIC_ORIGIN`, `SUBSCRIBE_SECRET` (production-ის მოთხოვნებით).
- `server/db/{derive,content,collections,index}.js` — `searchTextOf(item, type)` (სტატია — ორივე ენის საძიებო ტექსტი), `publicItems` / `publicItem`, `SEARCH_TEXT_MAX`, `forms` repository, `snapshot()` — `orgFromPage`.
- `server/migrations/index.js` — 003; `server/scripts/shared-smoke.js` — `public`, `http`, B6-ის შემოწმება.
- ტესტები: `openapi` (ყველა ოპერაცია რეგისტრირებულია, 304 / header-ები, rate limit-ის სია), `contract/requests` (რეალური `http.js`, `public-plan.js` წაიშალა), `contract/constants` (token-ის ფორმა ↔ spec), `config`, `app`, `auth/limits` (რეალური კონტაქტი + მისამართის ლიმიტი), `db/{collections,content,parity,seed}` (003), `content/{http-env,parity}` (`pub` — რეალური API), `browser.js` (`fetch`), `helpers.js` (`FAKE_PRODUCTION_ENV`), `shared-modules`.
- `scripts/audit.py` — `AUDIT_API=1` (სერვერი + vite dev `VITE_CONTENT_API`), ბმულის გვერდები `ROUTES`-ში, `forms` ნაწილი, axe-ის ხელახალი ცდა Vite-ის reload-ზე; `.gitignore` — `server/.mail/`; `CLAUDE.md` — რუკა + „კოდის კონვენციები (B6)“; `docs/project-context.md` — §5, §9 (#16, #31), §10, §12.

### საჯარო API

**frontend:**
- `adapter.js`: + `confirmSubscription(token) → Promise<{ ok: true, status: 'confirmed' }>`, `unsubscribe(token) → Promise<{ ok: true }>`; `subscribe(email) → Promise<{ ok: true, status: 'pending' }>`; `contentSource()` → `'mock' | 'http'`.
- `http.js`: `createHttpContentAdapter({ baseUrl = '/api/v1', fetch, locale = getLocale })` → `ContentAdapter` (`source: 'http'`); `responseError(status, data)`.
- `public.js`: `publicItem(collection, item, locale)`, `publicSnapshot(raw, locale)`, `orgFromPage(page)`, `compactTranslation(value)`, `deriveItem(collection, item)`.
- `forms.js`: `SUBSCRIBE_CONFIRM_DAYS` (7), `SUBSCRIBE_TOKEN`, `UNSUBSCRIBE_TOKEN`, `isSubscribeToken`, `isUnsubscribeToken`, `subscriptionLink(origin, locale, kind, token)`, `tokenFromHash(hash)`.
- `query.js`: `articleSearchText(article)`; `i18n/locale.js`: `withLocale(locale, fn)`.
- კომპონენტი `SubscriptionAction({ kind: 'confirm' | 'unsubscribe' })`; i18n: `subscribe.pending`, `subscription.*`.
- env: `VITE_CONTENT_API` (მაგ. `/api/v1`; ცარიელი — mock).

**server:**
- route-ები: 13 საჯარო GET + `POST /api/v1/subscribe`, `/subscribe/confirm`, `/subscribe/unsubscribe`, `/contact` (ცხრილი ზემოთ).
- `routes/public.js`: `PUBLIC_CACHE_CONTROL`, `etagOf(body)`, `matchesEtag(header, etag)`, `registerPublicRoutes(app)`; `routes/forms.js`: `registerFormRoutes(app)`.
- `mail/index.js`: `createMailer(config.mail, { logger })` → `{ transport, send(mail), outbox, failNext }`; `mail/templates.js`: `confirmMail`, `welcomeMail`, `contactMail`.
- `lib/subscriptions.js`: `unsubscribeToken(secret, id)`, `verifyUnsubscribeToken(secret, token)`; `lib/i18n.js`: `requestLocale(value)`, `inLocale` (= `withLocale`).
- repository: `content.publicItems(type, { at, where })`, `content.publicItem(type, slug, at)`; `forms.{insertMessage, markSent, removeMessage, countMessages, subscribe, confirm, removeSubscriber, findSubscriber}`; `derive.searchTextOf(item, type)`; `collections.SEARCH_TEXT_MAX`.
- env: `MAIL_TRANSPORT` (`log` | `file` | `memory`; ნაგულისხმევი: production → log, development → file, test → memory), `MAIL_DIR` (`server/.mail/`), `CONTACT_INBOX`, `MAIL_FROM`, `PUBLIC_ORIGIN` (dev — `http://localhost:5173`), `SUBSCRIBE_SECRET` (dev / test — შემთხვევითი პროცესზე). production-ში სავალდებულოა `CONTACT_INBOX`, `PUBLIC_ORIGIN` (`https://`), `SUBSCRIBE_SECRET` (≥ 32), `MAIL_TRANSPORT` — მხოლოდ `log` (B7-მდე).
- მიგრაცია 003 (`npm run server:migrate`): `searchText` ხელახლა, validator-ის ზღვარი — 001-ის `ensureCollection`-ით.

### გადახვევები prompt-იდან, §12-იდან და B0-იდან

1. **Cache-Control — `max-age=0` + ETag**, არა მოკლე დადებითი `max-age`: prompt-ის „მოკლე Cache-Control“ და „გამოქვეყნების შემდეგ საჯარო პასუხი მაშინვე ახლდება“ ერთმანეთს ეწინააღმდეგება — დადებითი `max-age` ძველ მასალას ამდენ წამს აჩვენებდა. ბრაუზერი ყოველ ჯერზე ამოწმებს (304 — სხეულის გარეშე); CDN-ის (B7) შემთხვევაში `PUBLIC_CACHE_CONTROL` ერთ ადგილას იცვლება.
2. **საჯარო ძიება ბაზაში წინასწარი ფილტრია**, ზუსტი შედეგი — `query.js`: `searchText` (B2: slug + სათაური + აღწერა) mock-ის ძიებას (კატეგორია, ავტორი, ტექსტი, slug-ის გარეშე) ვერ ემთხვეოდა; ახლა სტატიისას ორივე ენის სრული საძიებო ტექსტი შეიცავს (ზესიმრავლე, ტესტით), ზღვარი 10 000 → 2 000 000, მიგრაცია 003.
3. **`readingMinutes` ყოველ პასუხზე ითვლება** (mock-შიც) ენის ვერსიის ტექსტით — შენახული მნიშვნელობა ადმინის ახალ მასალაზე `1` იყო; ინგლისურ ვერსიას საკუთარი კითხვის დრო აქვს.
4. **გუნდის თარგმანი** (B2 / B4 #4) — დახურულია `orgFromPage`-ით (ცარიელი ველი არ ითვლება — სახელი არ ითარგმნება, როლი კი ითარგმნება).
5. **გაუქმების ბმული — HMAC** (`SUBSCRIBE_SECRET`), ბაზაში hash-ის ნაცვლად: მომავალ newsletter-ს ბმული ყოველ წერილში უნდა შექმნას, hash-იდან კი ბმული არ აღდგება. §12-ის მოდელი (`subscribers`) უცვლელია.
6. **token ბმულის fragment-შია** (`#token=`) და არა query-ში — სერვერის ლოგი, Referer, ანალიტიკა მას ვერ ხედავს; GET არაფერს ცვლის, მოქმედება — ღილაკი (B0 #11).
7. **კონტაქტის წერილი ვერ წავიდა → 500 და ჩანაწერი იშლება** — UI-ის გარეშე ბაზაში „უხილავად“ დარჩენილი შეტყობინება ორგანიზაციამდე ვერ მივიდოდა; მომხმარებელი ხედავს შეცდომას, ტექსტი ფორმაში რჩება.
8. **production-ის ფოსტა — `log` stub** (prompt: „adapter-ის ინტერფეისი + ლოგის stub“): Resend — B7; production-ის კონფიგი სხვა გადამცემს ჯერ არ უშვებს.
9. **`getSettings` ცარიელ ბაზაზე → 404** (mock-ს პარამეტრები ყოველთვის აქვს) — spec-ში დაემატა.
10. **არასწორი slug / token → შეცდომა მოთხოვნის გარეშე** (`http.js`): mock-ის `find*` / ფორმის წესი; პირდაპირ API-ზე > 200 სიმბოლოს slug — 400 (`SlugPath.maxLength`).
11. **contract-ტესტი რეალურ `http.js`-ზე** — `public-plan.js` (B1-ის გეგმა) წაიშალა; `http-env.js`-ის საჯარო ხედიც რეალური API-ა.
12. **ბმულის გვერდებს დაფა არ აქვს** — UI ნაკრებით (PageIntro, Button CTA / primary, ✓ / alert-ის პატერნი F6-ის დადასტურებიდან), ორივე რეჟიმში ტოკენებით; დაფა კანვაზე დასამატებელია (§9 #31).
13. **Chromium-ის აუდიტი dev-ზე** — `AUDIT_API=1`: 4173-ზე `vite preview`-ის ნაცვლად `vite` dev (`VITE_CONTENT_API`, proxy) — preview proxy-ს არ იძლევა; ადმინი mock-ზე რჩება (prompt — საჯარო გვერდები).

### ღია საკითხები

1. **ფოსტა production-ში** — Resend + დომენი + SPF / DKIM / DMARC (B7); მანამდე წერილი და გამოწერის ბმული არ იგზავნება (`log`) — staging-ზე ფორმები ჩართვამდე (ან გაფრთხილება).
2. **newsletter-ის ინსტრუმენტი** (B0 #11) — გაგზავნა, RFC 8058 one-click (`List-Unsubscribe-Post` — form-urlencoded parser ერთ route-ზე); ბმული — `unsubscribeToken()`.
3. **`/subscribe/*` noindex** — სერვერის meta (B7); გვერდები ნავიგაციაში არ ჩანს.
4. **ბმულის გვერდების დიზაინი** — კანვაზე ორივე რეჟიმში და 1440 / 390 (ახლა — UI ნაკრებით).
5. **ზღვრები** — `RATE_LIMIT_FORMS_*` (10 / 10 წთ) — IP-ზე და კონტაქტის მისამართზე ერთია; ერთ ქსელში (ოფისი, NAT) ბევრი მომხმარებელი — დასადასტურებელი.
6. **ადმინის API-ის შეცდომის ენა** — ჯერ ქართულია (B4 #2, B5 #4): `http.js`-ს (ადმინის) `lang` არ ახლავს; მექანიზმი (`inLocale`) მზადაა.
7. **პარამეტრები ცარიელ ბაზაზე** — 404; წარმოების პირველ გაშვებაზე ადმინმა უნდა შეინახოს (B7-ის ჩეკლისტი) ან ნაგულისხმევი ჩანაწერი მიგრაციით.
8. **retry-რიგი წერილისთვის** არ არის (ჩავარდნა → 500, მომხმარებელი ცდის); Resend-ის შემდეგ — გადასახედი.
9. B2–B5-ის დანარჩენი ღია საკითხები (პაროლის შეცვლა / აღდგენა, `?invite=`, slug-ის ცვლილება გამოქვეყნებულზე, ფოტოს ზომის ვარიანტები) — უცვლელია.

### შემდეგი: B7 — დაკავშირება და გაშვება

env (`VITE_CONTENT_API=/api/v1`, `VITE_ADMIN_API=/api/admin` — mock წარმოების bundle-ში აღარ ხვდება), დომენი და `PUBLIC_ORIGIN`, Resend (`MAIL_TRANSPORT`), `SUBSCRIBE_SECRET`, `CONTACT_INBOX`, deploy — Render + Atlas + R2, SPA fallback (`/en/*`, `/admin/*`, `/subscribe/*`), სერვერის meta / noindex, პარამეტრების პირველი ჩანაწერი, backup, მონიტორინგი; production smoke: შესვლა → გამოქვეყნება → საჯარო გვერდზე ჩანს → კონტაქტის წერილი inbox-შია.

## B7 — დაკავშირება, გაშვება, runbook ✅ (2026-11-07)

**Gate:**
- frontend — `npm run lint` ✓ (ESLint 0 / 0, Prettier ✓; `server/`-ის ჩათვლით) · `npm test` ✓ (**48 ფაილი, 834 / 834**; B6 — 47 / 827) · `npm run build` ✓ + check-dist ✓: **46 JS chunk** (საჯარო 33, ადმინის 13; B6 — 49: mock-ის ორი chunk და mock-ის ფორმები აღარ არის), **mock არცერთ chunk-ში — მოდულები (`.vite/modules.json`) + სტრიქონები (`createMockData`, `mc-dev-password`, `MC-INVITE-0001` …), HTTP adapter-ები bundle-შია**; `VITE_MOCK=1`-ის build-ს check-dist უარყოფს (11 შეცდომა — შემოწმდა). entry 433.5 kB / 127.8 kB gzip (B6 — 430.0 / 126.5).
- server — `npm run server:lint` ✓ · `npm run server:test` ✓ (**40 ფაილი, 447 ტესტი**; B6 — 35 / 410).
- **zip-ის სუფთა ასლზე** `npm ci` → lint ✓ · server:lint ✓ · build ✓ (46 chunk, check-dist ✓) · test ✓ (48 / 834) · server:test ✓ (40 / 447).
- **smoke ლოკალურად** — `npm run build && npm run smoke:local` (production build + `node server/index.js` NODE_ENV=production + MongoDB 8.0 memory + ყალბი S3; `server:migrate` → `server:create-admin` → მოწვევით რედაქტორი): **9 / 9 ✓ ორჯერ ზედიზედ, CSP-ის დარღვევა 0**.
- **სრული აუდიტი production build-ზე და რეალურ API-ზე** — `npm run audit` (`local-prod.mjs --seed --mail-dir` → `audit.py`; Chromium 153.0.8010.12, axe-core 4.14.0, ფერის კონტრასტით): **479 გაშვება — WCAG-ის დარღვევა 0, incomplete 0, CSP-ის დარღვევა 0, ჰორიზონტალური სქროლი 0**:

| ნაწილი | გაშვება | დარღვევა / incomplete / CSP | შენიშვნა |
|---|---|---|---|
| axe — 15 საჯარო როუტი × 3 თემა × 1440 / 390 + `/__kit` | 92 | 0 / 0 / 0 | სერვერის HTML, CSP-ით |
| admin — 32 მდგომარეობა (შესვლა, რეგისტრაცია, შეცდომები, დაფა, სიები, რედაქტორი + ბლოკერი, გადახედვა, ბიბლიოთეკა, პარამეტრები, 403, 404) × 3 × 2 | 189 | 6 best-practice / 0 / 0 | გახსნილი compact-მენიუ (390): `landmark-one-main` / `page-has-heading-one` — `main` განზრახ `inert`-ია (F4 / F8-ის იგივე გამონაკლისი); WCAG — 0 |
| en — 14 `/en` როუტი + ადმინის 6 × 3 × 2 | 120 | 0 / 0 / 0 | `<html lang="en">` ყველგან |
| youtube — `/videos`, `/en/videos`, რედაქტორი (ცარიელი / ბმულით + VTT რეალურ საცავში), facade, ჩართული × 3 × 2 | 36 | 0 / 0 / 0 | facade: iframe 0, API-ის სკრიპტი არ არის; ჩართული: `tabindex="-1"`, `strict-origin-when-cross-origin`, K / C ✓; iframe-ის `frame-tested` გამორთულია (გარე origin) |
| forms — კონტაქტი კლავიატურით, გამოწერა → წერილის ბმული → დადასტურება → გამოყენებული → გაუქმება × 3 × 2 | 36 | 0 / 0 / 0 | CAPTCHA 0; ფოკუსი „შეტყობინება მიღებულია“-ზე |
| media — native ფლეიერი ფაილით (dev, mock — წარმოებაში არ არის) × 3 × 2 | 6 | 0 / 0 / 0 | ავტოდაკვრა არა, სუბტიტრი, AD, ტრანსკრიპტი, fullscreen ✓ |
| keyboard — 9 გვერდი × 1440 / 390 + ადმინის 3 × 2 | 24 | რგოლის გარეშე 0, დაფარული 0, < 24px 0 | სლაიდერი / სერია / ვიდეო ✓ |
| motion / reflow / placeholders / bundle | — | reduce → 0s; ჰორიზ. სქროლი 0 | `/__kit` 200%-ზე სქროლავს (dev, §9 #19 — უცვლელი) |

- ქსელი: ახალი დომენი არ დასჭირდა (`playwright` 1.63.0 npm-იდან, Chromium — უკვე sandbox-ში).

### აუდიტის აღმოჩენები (გასწორებულია)

1. **რედაქტორი: ავტოშენახვა ↔ გამოქვეყნება — 409.** გამოქვეყნების `persist` ავტოშენახვის მიმდინარე PATCH-ს არ ელოდებოდა — ორივე ერთი `version`-ით მიდიოდა → კონფლიქტის დიალოგი. mock-ში დაყოვნება 0-ია და რბოლა არ ჩანდა; რეალურ API-ზე აუდიტის ვიდეოს გამოქვეყნება ჩავარდა. გასწორება: `EntityEditor`-ის `exclusive()` — ჩაწერები რიგშია (ავტოშენახვა, გამოქვეყნება, მონახაზად შენახვა). რეგრესიის ტესტი (`editor.test.jsx`, mock 200 მწმ დაყოვნებით): ძველ კოდზე **ვარდება**, ახალზე გადის.
2. **ვერსიების ცარიელი სია** (`<ol role="list">` შვილის გარეშე — ახალი მასალა ისტორიის გარეშე / ჩატვირთვამდე) → axe incomplete `aria-required-children`. ახლა — შენიშვნა „ვერსიები პირველი შენახვის შემდეგ გამოჩნდება“.
3. **აუდიტის media ნაწილი F10-ის შემდეგ მოძველებული იყო** (ინექცია `youtube`-ს და `poster`-ს არ ითვალისწინებდა — native ფლეიერი აღარ იხატებოდა) — გასწორდა.

### SEO — გადაწყვეტილება: სერვერის meta, prerender / SSR-ის გარეშე

სერვერი `index.html`-ში ჩასვამს `<html lang>`, `<title>`, description, `og:*` (`og:image` — ყდა / YouTube-ის კადრი), canonical, hreflang (ka / en / x-default) და robots-ს; უცნობი გზა / slug → **რეალური 404** (SPA თავის 404-ს ხატავს). HTML JS-ის გარეშეც შეიცავს სწორ ენას, სათაურს და ალტერნატივებს; გვერდის შიგთავსს React ხატავს. **დასაბუთება:** (1) კონტენტი ადმინიდან ნებისმიერ დროს ქვეყნდება — build-ის დროის SSG ძველდება, გამოქვეყნებაზე ხელახალი აწყობა კი ცალკე ინფრასტრუქტურაა; (2) SSR React-ის, router-ის მონაცემის, თემის ჩატვირთვისა და i18n-ის სერვერზე გადატანაა — ახალი რისკი hydration-ზე და CSP-ზე; (3) Google და Bing JS-ს ხატავენ (robots.txt `/api`-ს არ ბლოკავს), სოციალური ბარათისთვის `og:*` საკმარისია. SSR — ღია საკითხი, Search Console-ის მონაცემით. თარგმანის გარეშე მასალას en-ის ალტერნატივა არ აქვს და `/en/…`-ის canonical ქართულზეა (დუბლიკატი); sitemap.xml — იგივე წესით.

### header → მნიშვნელობა → რატომ

| header | მნიშვნელობა | რატომ |
|---|---|---|
| `Content-Security-Policy` (HTML) | `default-src 'self'; script-src 'self' 'sha256-[mc-boot]' https://www.youtube.com; style-src 'self'; img-src 'self' data: https://i.ytimg.com; font-src 'self'; connect-src 'self'; media-src 'self'; frame-src https://www.youtube-nocookie.com; manifest-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` | inline — მხოლოდ mc-boot (hash `dist/index.html`-იდან გაშვებისას); YouTube — §10; შრიფტები self-hosted; `data:` — ორბიტის SVG mask; TipTap-ის `injectCSS` გათიშულია |
| `Content-Security-Policy` (API / ფაილი) | `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` / + `sandbox` | JSON და ფაილი გვერდად არ სრულდება (B1 / B5) |
| `Permissions-Policy` | `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=(), autoplay=(self "https://www.youtube-nocookie.com"), encrypted-media=(…), picture-in-picture=(…), fullscreen=(self)` | საიტს ეს API-ები არ სჭირდება; YouTube-ის iframe — მხოლოდ დაკვრა |
| `X-Robots-Tag` | `noindex, nofollow` — `/admin*`, `/en/admin*`, `/api/*`, `/subscribe/*`, 404; `SITE_INDEXING=off` — ყველა პასუხი | ადმინი / staging საძიებოში არ ხვდება; robots.txt `/admin`-ს არ ასახელებს (§10) |
| `Strict-Transport-Security` | `max-age=31536000` | ASVS 3.4.1; `includeSubDomains` — დომენის შემდეგ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | YouTube-ის ჩაშენება (F10) |
| `Cache-Control` | `/assets/*` — `public, max-age=31536000, immutable`; HTML — `no-cache`; `favicon.svg` — `public, max-age=0, must-revalidate` + ETag; robots / sitemap — `public, max-age=3600`; API — B6-ის წესი | hash-იანი ფაილი არ იცვლება; HTML კონტენტზეა დამოკიდებული |
| `Content-Encoding` / `Vary` | `br` / `gzip` (გაშვებისას შეკუმშული, 1.70 → 0.58 MB br) | Render-ის proxy-ზე დამოუკიდებლად |

### env ცვლადი → სად → მაგალითი (ახალი B7-ში; სრული — `docs/deploy.md` §2)

| env | სად | მაგალითი |
|---|---|---|
| `TRUST_PROXY` | Render (production — სავალდებულო, ≥ 1) | `1` · Cloudflare-ით `2` |
| `MAIL_TRANSPORT` | Render | `log` (დომენამდე) → `resend` |
| `RESEND_API_KEY` | Render, საიდუმლო (`resend`-ზე სავალდებულო) | `re_[…]` |
| `MAIL_FROM` | Render (`resend`-ზე სავალდებულო) | `no-reply@[დომენი]` |
| `SITE_DIR` | — (production-ის ნაგულისხმევი `dist/`) | `[საქაღალდე]` |
| `SITE_INDEXING` | Render | `off` (staging) · `on` (დომენი) |
| `MIGRATE_ON_START` | Render (Free / Fly.io) | `0` · `1` |
| `VITE_MOCK` | მხოლოდ დემო build-ი | `1` |
| `BASE_URL`, `SMOKE_EMAIL`, `SMOKE_PASSWORD` | smoke-ის გამშვების ტერმინალი | `https://[სერვისი]`, `[ელფოსტა]`, `[პაროლი]` |

### შექმნილი ფაილები

- `src/content/seo.js` (+ `seo.test.js`) — `SITE_PAGES`, `ADMIN_PATH` (routes.jsx-იდან), `NOT_FOUND_TITLE`, `itemPath`, `matchSitePage`, `metaDescription`.
- `src/admin/api/pages.js` — `PAGE_DEFS`, `basePageItem` (mock-ისა და წარმოების საბაზისო ჩანაწერების ერთი წესი).
- `server/site/{files,headers,meta,sitemap}.js`; `server/routes/site.js`.
- `server/db/{base,backup}.js`; `server/scripts/{backup,restore}.js`.
- `server/test/site/site.test.js`; `server/test/deploy/{base,backup,mail-resend,check-dist}.test.js`; `server/test/fixtures/site/` (index.html, assets, favicon, `.vite/manifest.json`).
- `scripts/{dist-rules,local-prod,smoke}.mjs`.
- `render.yaml`, `.node-version`, `docs/deploy.md`.

### შეცვლილი ფაილები (ერთი წინადადებით)

- `vite.config.js` — `backendDefines` (build → `/api/v1`, `/api/admin`; `VITE_MOCK=1` / `--mode api`) და `mc-chunk-modules` (`.vite/modules.json`).
- `scripts/check-dist.mjs` — B7-ის წესი: mock არცერთ chunk-ში, HTTP adapter-ები bundle-შია.
- `scripts/audit.py` — production build + რეალური API (`local-prod.mjs`-ის შვილობილი), ანგარიშები env-იდან, დემო-მონახაზები ადმინის API-ით, axe `evaluate`-ით (CSP), CSP-ის დარღვევის აღრიცხვა, media-ს ინექციის გასწორება.
- `package.json` — `dev:api`, `prod:local`, `smoke`, `smoke:local`, `audit` (რეალურ API-ზე), `server:backup`, `server:restore`; devDependency `playwright` 1.63.0.
- `src/main.jsx` — სერვერის hreflang-ის დუბლიკატი იშლება (React-ის `AlternateLinks` რჩება).
- `src/routes.jsx` — `ADMIN_PATH` `seo.js`-იდან; `src/admin/__tests__/api.test.js` — იმპორტი.
- `src/admin/api/mock.js` — გვერდები `pages.js`-ით (შედეგი უცვლელია); `adminAdapter.js`, `src/content/adapter.js` — დოკუმენტაცია (წარმოება API-ზეა).
- `src/admin/editor/EntityEditor.jsx` — ჩაწერის რიგი (`exclusive`), ცარიელი ვერსიების სიის ნაცვლად შენიშვნა; `RichTextEditor.jsx` — `injectCSS: false`; `editor.css` — ProseMirror-ის წესები (gapcursor ციმციმის გარეშე).
- `src/admin/__tests__/editor.test.jsx` — რბოლის რეგრესიის ტესტი.
- `server/config.js` — `TRUST_PROXY` (production ≥ 1), `resend` + `RESEND_API_KEY`, `SITE_DIR`, `SITE_INDEXING`, `MIGRATE_ON_START`, `DEFAULT_SITE_DIR`.
- `server/app.js` — build-ის ჩატვირთვა (`site`), `registerSite`; `server/lib/security.js` — `Permissions-Policy`, noindex `SITE_INDEXING=off`-ზე.
- `server/main.js` — `MIGRATE_ON_START`, `startup` / `migrate` ლოგი, დაუჭერელი შეცდომა → fatal + გაჩერება კოდით 1, `SiteError`.
- `server/mail/index.js` — Resend-ის გადამცემი (`resendPayload`, `MailError`, `SENDER_NAME`).
- `server/db/seed.js` — ხელუხლებელ საბაზისო ჩანაწერებს ცვლის; `server/scripts/migrate.js` — `prepareDatabase` (+ საბაზისო); `db-cli.js` — `BackupError`.
- `server/.env.example` — B7-ის ცვლადები; `.gitignore` / `.prettierignore` / `eslint.config.js` — `.audit-mail`, `smoke-failure.png`.
- ტესტები: `config.test.js` (B7-ის წესები), `boot.test.js` (საიტი, `MIGRATE_ON_START`, build-ის გარეშე → exit 1), `db/seed.test.js` (migrate-ის საბაზისო ხაზი), `media/library.test.js` (staging-ზე media-ც noindex), `helpers.js` (`SITE_FIXTURE`, `FAKE_PRODUCTION_ENV` + `TRUST_PROXY` / `SITE_DIR`).
- `CLAUDE.md` — რუკა + „კოდის კონვენციები (B7)“; `docs/project-context.md` — §9, §10, §12.

### საჯარო API

**frontend:**
- `@/content/seo.js`: `SITE_PAGES` (`{ path, title, description?, item?, query?, index?, sitemap? }`), `ADMIN_PATH`, `NOT_FOUND_TITLE`, `itemPath(collection, slug)`, `matchSitePage(pathname) → { page, slug } | null`, `metaDescription(text, max = 200)`.
- `@/admin/api/pages.js`: `PAGE_DEFS`, `basePageItem(page, { publishedAt, team?, partners? })`.
- `vite.config.js`: `backendDefines({ command, mode, env })`, `PRODUCTION_API`; `scripts/dist-rules.mjs`: `mockLeaks({ modules, texts })`, `MOCK_MODULES`, `MOCK_MARKERS`, `API_MODULES`.
- npm: `dev:api`, `prod:local`, `smoke`, `smoke:local`, `audit`.

**server:**
- `site/files.js`: `loadSite(dir) → { template, scriptHashes, files }`, `siteFile`, `sendFile`, `pickEncoding`, `inlineScriptHashes`, `ASSET_CACHE`, `FILE_CACHE`, `HTML_CACHE`, `SiteError`.
- `site/headers.js`: `siteCsp({ scriptHashes })`, `PERMISSIONS_POLICY`, `NOINDEX`; `site/meta.js`: `resolveMeta({ pathname, searchParams, origin, indexing, findItem, onError })`, `renderIndex(template, meta)`, `escapeHtml`; `site/sitemap.js`: `sitemapXml({ origin, listItems })`, `robotsTxt({ origin, indexing })`, `SITEMAP_CACHE`.
- `routes/site.js`: `registerSite(app, { site })` — `GET /`, `/*`, `/assets/*`, `/robots.txt`, `/sitemap.xml`; `buildApp({ site })`, `app.site`.
- `db/base.js`: `ensureBaseRecords(database, { now }) → { pages, settings }`, `prepareDatabase(database, { retention, now })`; `db/backup.js`: `exportDatabase(db, file)`, `importDatabase(database, file, { drop, retention })`, `BACKUP_COLLECTIONS`, `BackupError`.
- `mail/index.js`: `createMailer(config, { logger, fetch })` — `resend`; `resendPayload(mail)`, `MailError`, `RESEND_ENDPOINT`, `SENDER_NAME`.
- config: `site: { dir, indexing }`, `migrateOnStart`, `mail.apiKey`.
- npm: `server:backup [-- --out ფაილი]`, `server:restore -- --in ფაილი --confirm <MONGODB_DB> [--drop]`.

### გადახვევები prompt-იდან, §12-იდან და B0-იდან

1. **`@fastify/static` → საკუთარი loader** (`server/site/`): HTML სერვერზე იწყობა (meta, რეალური 404), ფაილები მცირეა (≈ 2 MB, მეხსიერებაში, შეკუმშვით); `@fastify/static`-ის `glob` / `send` ჯაჭვი ≥ 14 დღის წესით ვერ ჩაიკეტება.
2. **CSP-ში Google Fonts არ არის** (prompt ითხოვდა) — შრიფტები self-hosted-ია (F1, @fontsource): `font-src 'self'`, მესამე მხარის მოთხოვნა არ ემატება.
3. **„საცავის დომენი“ CSP-ში არ არის** — ფოტო / PDF / VTT `/media/*`-ით იმავე origin-ზეა (B5); `MEDIA_BASE_URL` არ გამოიყენება.
4. **`upgrade-insecure-requests` არ არის** — ყველა მისამართი ფარდობითია ან https; `http://localhost`-ის production-ზე ის ფაილებს https-ზე გადაიყვანდა.
5. **prerender / SSG — არა**, სერვერის meta (B0-ის გადაწყვეტილება დადასტურდა — ზემოთ).
6. **საბაზისო ჩანაწერები `server:migrate`-ის ნაბიჯია, არა დანომრილი მიგრაცია** — `migrate()`-ს dev-ის in-memory seed და ტესტები იძახებენ; seed ხელუხლებელ საბაზისოს ცვლის.
7. **`TRUST_PROXY` production-ში სავალდებულოა** (B1-ის ნაგულისხმევი 0 Render-ზე ყველა სტუმარს ერთ rate limit-ში აერთიანებდა).
8. **Atlas Free-ს cloud backup არ აქვს** — B0 / §12-ის „Free — backup ჩართული / ბოლო 4 დღიური“ გასწორდა (Flex — ყოველდღიური, ბოლო 8); დაემატა ლოგიკური `server:backup` / `server:restore` (Render-ის Node-ში `mongodump` არ არის).
9. **აუდიტის სერვერი `NODE_ENV=development`-ითაა** (bundle — წარმოების `dist/`): production-ში ფოსტა მხოლოდ `resend` / `log`-ია, აუდიტს კი წერილის ბმული სჭირდება (`file`). smoke — `NODE_ENV=production`.
10. **`/__kit` და native ფლეიერი აუდიტში Vite dev-ზე (mock)** — dev-only-ია და წარმოების bundle-ში განზრახ არ არის.
11. **axe `evaluate`-ით** (`add_script_tag`-ის ნაცვლად) — CSP inline script-ს სწორად ბლოკავს; YouTube-ის iframe-ზე `frame-tested` გამორთულია.
12. **Atlas-ის ქსელი** — მხოლოდ Render-ის Outbound დიაპაზონები (არა `0.0.0.0/0`); დიაპაზონი რეგიონში საერთოა და იცვლება — runbook-ში.
13. **staging-ზე ატვირთული ფაილებიც noindex-ია** (`SITE_INDEXING=off` ყველა პასუხზე) — სურათების ძიებაში არ ხვდება.
14. **რედაქტორის ჩაწერის რიგი** (frontend-ის ცვლილება backend-ის ნაბიჯში) — აუდიტმა რეალურ API-ზე იპოვა; კონტრაქტი უცვლელია.

### ღია საკითხი → ვინ წყვეტს → ბლოკავს გაშვებას?

| ღია საკითხი | ვინ წყვეტს | ბლოკავს? |
|---|---|---|
| ტარიფი: Render Starter + Atlas Flex (≈ $15/თვე) თუ $0 (Render Free / Fly.io + Atlas Free + კვირეული backup) | ორგანიზაცია | **დიახ** |
| დომენი და რეგისტრატორი (`PUBLIC_ORIGIN`, `SITE_INDEXING=on`, HSTS `includeSubDomains`) | ორგანიზაცია | **დიახ** (production; staging — არა) |
| Resend: დომენის DNS (SPF / DKIM / DMARC), `no-reply@` | ორგანიზაცია + დეველოპერი | **დიახ** — მანამდე ფორმის წერილი და გამოწერის ბმული არ იგზავნება |
| რეალური კონტენტი და პარამეტრები (`[…]` საჯაროდ ჩანს) | ორგანიზაცია | **დიახ** |
| კონფიდენციალურობის პოლიტიკა, შენახვის ვადები (B0 #10), ხელმისაწვდომობის განცხადება | ორგანიზაცია (+ იურისტი) | **დიახ** |
| RTO / RPO, backup-ის შენახვის ადგილი და ვადა | ორგანიზაცია | არა (runbook-ში ნაგულისხმევი) |
| SSR / prerender | დეველოპერი, Search Console-ის მიხედვით | არა |
| Fly.io-ს Dockerfile ($0) | დეველოპერი | მხოლოდ $0 ვარიანტზე |
| CSP-ის `report-to` endpoint | დეველოპერი | არა |
| რუკის პროვაიდერი (CSP `frame-src`, cookies) | ორგანიზაცია | არა |
| YouTube-ის რეალური IFrame API + CSP (sandbox-ში ყალბია) — staging-ზე ხელით / smoke-ის ვიდეოს ნაწილი | დეველოპერი | არა (staging-ის შემოწმება) |
| ადმინის სიის ღილაკის სახელში ზედმეტი ჰარი („წაშლა : {სათაური}“, `VisuallyHidden`) | დეველოპერი | არა (P3) |
| პაროლის შეცვლა / აღდგენა, `?invite=` → `#invite=` (§9 #28), newsletter, ბმულის გვერდების დიზაინი | დეველოპერი / დიზაინერი | არა |

### გაშვების checklist

- [ ] ტარიფის გადაწყვეტილება → Atlas (Frankfurt, custom role `mc-app`, Outbound IP-ები, backup) · R2 (private, ერთი bucket-ის token) · Render (`render.yaml`, env — `docs/deploy.md` §2)
- [ ] პირველი deploy: pre-deploy `server:migrate` ✓, ლოგში `startup` (`site: true`, `storage: r2`), `/api/health` 200
- [ ] `server:create-admin` (Shell / ლოკალურად), ADMIN_* env-ში არ არის
- [ ] პარამეტრები — რეალური კონტაქტები; მოწვევა რედაქტორს
- [ ] `npm run smoke` staging-ზე — 9 / 9 ✓; YouTube-ის ვიდეო ხელით (facade → ჩართვა, სუბტიტრის ზოლი, CSP-ის დარღვევა კონსოლში — 0)
- [ ] დომენი + TLS → `PUBLIC_ORIGIN`, `SITE_INDEXING=on`; Resend — Verified → `MAIL_TRANSPORT=resend` → კონტაქტის წერილი inbox-შია, SPF / DKIM / DMARC — PASS
- [ ] smoke production-ზე; Search Console — sitemap; გარე uptime-მონიტორი; Atlas-ის ალერტები
- [ ] კონფიდენციალურობის პოლიტიკა + ხელმისაწვდომობის განცხადება — ბმული პარამეტრებში
- [ ] backup-ის პირველი ასლი (`server:backup`) და აღდგენის საცდელი გაშვება ცალკე ბაზაზე

### შემდეგი

Backend-ის აგების გეგმა (§12, B0–B7) დასრულებულია. შემდეგი ნაბიჯები ღია საკითხებიდან: staging-ის გაშვება runbook-ით (მომხმარებელი), შემდეგ — პაროლის შეცვლა / აღდგენა (ASVS 6.2.2 / 6.2.3), newsletter-ის ინსტრუმენტი, რეალური კონტენტი.
