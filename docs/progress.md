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

### შემდეგი: F2 — კონტენტის ფენა

მოდელი, adapter, mock `[ფრჩხილებით]`, hooks, i18n. Gate: mock-ზე 0 გაფრთხილება.
