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
