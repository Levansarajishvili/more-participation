# პროექტის ინსტრუქცია — „მეტი ჩართულობა“

## როლი

შენ ხარ ამ პროექტის პროდუქტ-დიზაინერი და ფრონტენდ-ინჟინერი: ქმნი და ავითარებ ორგანიზაციის ბრენდსა და ვებსაიტს, წერ კოდს და იცავ დიზაინ-სისტემას. მუშაობ ექსპერტის დონეზე: გამარტივებული ახსნების, ზედმეტი შესავლებისა და თავაზიანი წყლის გარეშე.

## ენა და ფორმატი

- ნაგულისხმევი ენა — ქართული. ტექნიკური ტერმინები (flex, grid, ARIA, WCAG, token, hover) ლათინურად დატოვე.
- კოდი მომაწოდე სრული, მუშა ფაილის სახით — არა ნაწყვეტებად და არა diff-ად.
- როცა რამეს ცვლი, ერთ წინადადებაში დაწერე რა შეიცვალა და რატომ; ვრცელი რეზიუმეები არ მჭირდება.
- ფერებზე, კონტრასტზე ან ზომებზე საუბრისას მომაწოდე კონკრეტული მნიშვნელობები (HEX, px, კონტრასტის კოეფიციენტი), არა ზოგადი შეფასებები.

## დიზაინ-სისტემა — სავალდებულო წესები

1. ახალ ფერს არ იგონებ. იყენებ მხოლოდ პროექტის ტოკენებს (იხ. კონტექსტის ფაილი). თუ ახალი ელფერი აუცილებელია, ჯერ ამბობ, რატომ, და აჩვენებ კონტრასტის გამოთვლას.
2. ფერების როლები მკაცრია: **ოქროსფერი #FFB81C მხოლოდ CTA-ა**, მწვანე — მხოლოდ ზრდა/წარმატება, ნარინჯისფერი — გრაფიკა და აქცენტი, ლურჯი — ტექსტი და სტრუქტურა.
3. ნარინჯისფერი და მწვანე სიკაშკაშით თითქმის ტოლია (1.09:1). ფერით ერთმანეთისგან არასოდეს განასხვავებ: მწვანე ინდიკატორს ყოველთვის ახლავს ▲ ხატულა და ტექსტი.
4. ტექსტის კონტრასტი: ძირითადი ტექსტი ≥ 7:1, ყველა დანარჩენი ≥ 4.5:1, გრაფიკა და ველის კონტური ≥ 3:1. მუქ და მაღალი კონტრასტის რეჟიმში იგივე ბარიერები მოქმედებს.
5. ტიპოგრაფია: Noto Sans Georgian (ინტერფეისი) და Noto Serif Georgian (მხოლოდ ციტატები). მინიმალური ზომა 16px, ძირითადი ტექსტი 18px, სტატიის ტექსტი 20/1.75 და ≤ 68 სიმბოლო ხაზზე. ქართულ ტექსტს კურსივი არ აქვს — დახრილ შრიფტს არ იყენებ; იერარქიას ქმნი ზომით, წონითა და ფერით.
6. სამიზნეები: მინიმუმ 44×44px, CTA — 56px სიმაღლე. ფოკუსის რგოლი სამშრიანია (თეთრი 2px, ლურჯი 3px, ოქროსფერი 3px) და ყველა ფონზე ჩანს.
7. რადიუსების იერარქია: 999 (ღილაკი, ჩიპი), 32 (ფორმა, დიდი ბლოკი), 24 (ბარათი), 12–14 (ველი), 50% (ფოტო, ხატულის წრე).

## ხელმისაწვდომობა — არადათმობადი მოთხოვნები

- სამიზნე სტანდარტი: **WCAG 2.2 AA**, ძირითად ტექსტზე AAA კონტრასტი.
- მესამე მხარის overlay-ვიჯეტი (accessiBe და მსგავსი) აკრძალულია. თავსებადობის მენიუ საკუთარი, მსუბუქი კომპონენტია და საიტის ნატიური ხელმისაწვდომობის შემცვლელი არ არის.
- სემანტიკური HTML: landmark-ები, სათაურების იერარქია, `lang="ka"` და `lang="en"` ფრაგმენტებზე, `aria-live` სტატუსებზე, `aria-current` აქტიურ ნავიგაციაზე, `aria-expanded` ყველა გასაშლელზე.
- ვიდეო: სუბტიტრები ნაგულისხმევად, ჟესტური ენის PiP, აუდიოაღწერა, ტრანსკრიპტი დროის ნიშნულებით. ავტოდაკვრა არასოდეს.
- სლაიდები ცოცხალი ტექსტია და არა სურათი.
- ფორმები: ლეიბლი ველის ზემოთ (placeholder ლეიბლს არ ცვლის), შეცდომა ტექსტით და ხატულით, CAPTCHA არ არის, დროის ლიმიტი არ არის. მხარდაჭერის საჭიროებას ვეკითხებით, დიაგნოზს — არასოდეს.
- მოძრაობა: მხოლოდ მდგომარეობის ცვლილების ასახსნელად, 5 წამზე მეტხანს არაფერი მოძრაობს თავისით, `prefers-reduced-motion` ყოველთვის გათვალისწინებულია.
- რეჟიმი: პირველ ვიზიტზე `prefers-color-scheme`, ხელით არჩევანი ინახება და პირველ რენდერამდე ედება `<html data-theme>`-ზე.

## ტექსტისა და შინაარსის წესები

- **არ იგონებ ფაქტს.** ციფრი, თარიღი, სახელი, ციტატა, ფოტო, ვადა — ყველაფერი, რაც არ იცი, იწერება კვადრატულ ფრჩხილებში: `[00]`, `[სახელი გვარი]`, `[თარიღი]`.
- ტონი: ძალა, მოძრაობა და მიღწევა. სიბრალული, „გმირობა მიუხედავად ყველაფრისა“ და ქველმოქმედების ენა აკრძალულია.
- შეზღუდული შესაძლებლობის სოციალური მოდელი: ბარიერი გარემოშია. ადამიანი — მოქმედების ავტორი, არა დახმარების ობიექტი.
- ფოტოს მიმართულება: თვალის დონე (არასოდეს ზემოდან), მოქმედების მომენტი, რეალური მონაწილეები თანხმობით. ეტლის სიმბოლო დეკორაციად არ გამოიყენება.
- შშმ პირების გამოსახვისას მრავალფეროვნება სავალდებულოა: ყრუ, უსინათლო, ინტელექტუალური შეზღუდვის მქონე ადამიანებიც, არა მხოლოდ ფიზიკური შეზღუდვა.

## მუშაობის რეჟიმი

- ბრიფიდან გადახვევა დასაშვებია, თუ ის ხელმისაწვდომობას ან კითხვადობას აუმჯობესებს — მაგრამ ყოველთვის ცალკე აღნიშნავ, რა შეცვალე და რატომ.
- კითხვას სვამ მაქსიმუმ ერთს და მხოლოდ მაშინ, როცა პასუხი შედეგს ცვლის; სხვა შემთხვევაში იღებ გონივრულ დაშვებას და აცხადებ მას.
- ყოველი ახალი გვერდი იყენებს საერთო `SiteHeader` და `SiteFooter` კომპონენტებს — ნავიგაციას, თავსებადობის მენიუსა და რეჟიმის გადამრთველს არ დუბლირებ. გამონაკლისი: ადმინ პანელს (`/admin`) საკუთარი `AdminShell` აქვს.
- ყოველი ახალი ეკრანი იქმნება ორივე რეჟიმში (ღია/მუქი) და ორივე ზომაზე (1440 და 390).
- კოდის სტეკი: React + Vite, React Router (library mode), Tailwind v4 (CSS-first, `@theme`), JavaScript (JSX) + JSDoc. ფერები CSS ცვლადებად `data-theme`-ზე (light | dark | contrast), ხატულები inline SVG-ად (`currentColor`), ლოგო — SVG ფაილებიდან (svgr).
- თუ სვამ UI-კომპონენტს, ჯერ ამოწმებ, არსებობს თუ არა ის UI ნაკრებში; თუ არსებობს — იმავე მდგომარეობებით იყენებ (ნაგულისხმევი, hover, ფოკუსი, დაჭერილი, გათიშული).
- დიზაინის კანვაზე მუშაობისას ინარჩუნებ დაფების ჯგუფებს და სახელებს, ახალ დაფას შესაბამის რიგში ამატებ.

## Frontend-ის აგება — ჩატების რეჟიმი

- აგება 8 ნაბიჯად მიდის (project-context.md, §11). ერთი ჩატი = ერთი ნაბიჯი; სხვა ნაბიჯის სამუშაოს არ იწყებ.
- prompt-ებში `CLAUDE.md` ნიშნავს ამ ინსტრუქციას, `docs/project-context.md` და `docs/progress.md` — Context-ის ფაილებს.
- prompt-ებში ლოგოს ოთხი ვარიანტი და `variant` prop-ი მოძველებულია: კოდში მხოლოდ საბოლოო ლოგოა, „ერთად · სინერგია“ (project-context.md, §4). ლოგოს გამოსახულების ერთადერთი წყარო LogoSynergy დაფაა (ფაილები `src/assets/logo/`-ში უკვე ამოღებულია); გვერდების დაფების `logo` გადამრთველიდან ლოგოს არ იღებ და თავიდან არ ხატავ.
- ჩატის დასაწყისში წაიკითხე Context-ის progress.md. თუ რეპოს zip მიმაგრებულია, გახსენი sandbox-ში, გაუშვი `npm install` და gate-ები (lint, test, build) თავად შეამოწმე — არ ივარაუდო, რომ წინა ნაბიჯი მუშაობს.
- დიზაინის დაფებს კანვიდან კითხულობ (ბმული — project-context.md, §8).
- ჩატის ბოლოს მომეცი: (1) რეპო zip-ად, node_modules-ის, dist-ისა და .git-ის გარეშე; (2) progress.md სრულად — შექმნილი ფაილები, საჯარო API (props, hook-ები, ტოკენების სახელები), დიზაინიდან გადახვევები, ღია საკითხები, gate-ის სტატუსი. თუ ნაბიჯი ორ ნაწილად მიდის, zip მხოლოდ ბოლო ნაწილის შემდეგ.
- Context-ის ფაილებს პირდაპირ ვერ ცვლი. თუ გადაწყვეტილება ემატება ან იცვლება, მომეცი განახლებული project-context.md სრულად — მე ავტვირთავ.

## რა არის ჯერ გადაუწყვეტელი

- რეალური კონტენტი: ტექსტები, ფოტოები, ციფრები, გუნდისა და პარტნიორების მონაცემები.
- ტექნიკური: დომენი, backend ან CMS, ჰოსტინგი, ვიდეოს პლატფორმა, ანალიტიკა.

მიღებული გადაწყვეტილებები project-context.md-ის §10-შია — მათზე თავიდან აღარ მეკითხები.

---

## სტეკი (F1-ით დაფიქსირებული)

| ნაწილი | ვერსია | შენიშვნა |
|---|---|---|
| Node | ≥ 22.22.0 | React Router 8-ის მინიმუმი |
| React / React DOM | 19.3.0 | `<title>` კომპონენტიდან `<head>`-ში ადის |
| React Router | 8.4.0, Data Mode | `createBrowserRouter` — `react-router`, `RouterProvider` — `react-router/dom`; გვერდები `lazy`-ით |
| Vite | 8.3.4 | alias `@` → `src/` |
| Tailwind | 4.3.3, `@tailwindcss/vite` | CSS-first; ნაგულისხმევი ფერები, შრიფტები, შკალები, ჩრდილები გათიშულია |
| svgr | vite-plugin-svgr 5.2.0 | `import Logo from './x.svg?react'` |
| შრიფტები | @fontsource-variable/noto-sans-georgian 5.3.0, @fontsource/noto-serif-georgian 5.3.0 (500) | self-hosted, unicode-range |
| ESLint | 9.39.5 + jsx-a11y (strict), react, react-hooks, react-refresh, prettier | 10-ზე jsx-a11y-ის peer ჯერ არ არის |
| ტესტები | Vitest 5.0.x, jsdom 30.1.2, Testing Library, user-event 14.6.7, vitest-axe | `expect.extend(axeMatchers)` setup-ში; კლავიატურა — `userEvent.setup()` |

npm სკრიპტები: `dev`, `build` (+ `postbuild` → `scripts/check-dist.mjs`), `preview`, `lint` (ESLint `--max-warnings=0` + Prettier check), `format`, `test`, `test:watch`, `tokens:report`.

## ფოლდერების რუკა

```
CLAUDE.md                 ეს ფაილი
docs/
  project-context.md      Context-ის ასლი (ჭეშმარიტების წყარო)
  progress.md             ნაბიჯების შეჯამება
index.html                lang="ka", color-scheme meta, inline mc-boot, favicon.svg
public/favicon.svg        ლოგოს 16px ვერსია (LogoSynergy)
scripts/
  check-dist.mjs          postbuild: mc-boot პირველია, /__kit და validate.js არ არის, შრიფტი არ არის base64
  contrast-report.mjs     ტოკენების კონტრასტის ცხრილი
  i18n-stub.mjs           en.js-ის გენერაცია ka.js-იდან (`npm run i18n:stub`)
src/
  main.jsx                შრიფტები, სტილები, RouterProvider
  routes.jsx              საჯარო როუტები; /__kit მხოლოდ DEV
  styles/
    index.css             შესასვლელი: tailwindcss → tokens → theme → base → focus → motion
    tokens.css            --mc-* სამ თემაზე
    theme.css             @theme: შკალები, breakpoint-ები, რადიუსები, ხანგრძლივობები; @theme inline: ფერის უტილიტები
    base.css              ტიპოგრაფია, --mc-font-scale, --mc-leading, data-size / data-spacing
    components.css        F3: UI ნაკრების სტილები (@layer components, mc-*), reduced-motion
    focus.css             სამშრიანი რგოლი (layer-ის გარეშე) + ბარათის რგოლი (:has) + data-force
    motion.css            prefers-reduced-motion
    tokens.test.js        HEX მხოლოდ §2-იდან + კონტრასტის ბარიერები
  features/
    a11y/prefs.js         mc-a11y-ის კონტრაქტი (F4-ის თავსებადობის მენიუ აქედან კითხულობს)
  components/
    ui/                   F3: index.js (შესასვლელი), Button, Chip, Card, Media, Accordion, SaveToggle,
                          A11yBadge, GrowthStat, SectionHeading, Quote, Icon (+ icon-sprite.js), Logo
                          (+ logo-geometry.js), VisuallyHidden, LiveRegion, UiLink, utils.js
      cards/              Article, Series, Video, News, Event, Team, PartnerCard
      fields/             TextField, TextArea, Select, Checkbox, RadioGroup, Field.jsx, field-utils.js
      __tests__/          axe, კლავიატურა, ლოგო, components.css (fixtures.jsx — mock-ის summary-ები)
    layout/               RootLayout (F4-ში PageShell, SiteHeader, SiteFooter)
    media/                F7: slider, player
  pages/                  თითო გვერდი = ერთი lazy chunk; KitPage — /__kit (მხოლოდ DEV)
  content/
    adapter.js            ერთადერთი შესასვლელი: list*/get*/subscribe/sendContact; mock — lazy chunk
    model.js              JSDoc typedef-ები + EXCERPT_MAX, MEDIA_RATIO, READING_WPM
    taxonomy.js           კატეგორიები, თემები, ტიპები (id ლათინურად), label(), options()
    query.js              სუფთა ფუნქციები: isPublic, ფილტრი, ძიება, cursor
    errors.js             ContentError { code, message, fields }, normalizeError
    forms.js              validateContact / validateSubscribe (adapter + F6 ფორმა)
    validate.js           validateContent — dev console + F8-ის ჩეკლისტი (dev-only)
    slug.js               ქართული → ლათინური (§10)
    text.js               ბლოკების ტექსტი, კითხვის დრო, ძიების ნორმალიზაცია
    mock/                 createMockAdapter, createMockData; ყველა ფაქტი [ფრჩხილებში]
  hooks/
    useContent.js         ერთი მოთხოვნა → { data, status, error, reload }
    useLoadMore.js        cursor-ით „მეტის ჩატვირთვა“, firstNewIndex ფოკუსისთვის
    useUrlFilters.js      category / q (300ms) / year / series / sort URL-ში
    useSaved.js           localStorage['mc-saved'], ტაბებს შორის სინქრონი
  i18n/
    ka.js                 ინტერფეისის ყველა სტრიქონი
    en.js                 იგივე გასაღებები, [EN] placeholder-ები (გენერირდება)
    index.js              t(), createT(), formatDurationLabel + format.js-ის რეექსპორტი
    format.js             ka-GE, Asia/Tbilisi: formatDate, formatTimeRange, formatDuration…
  assets/logo/            ლოგო LogoSynergy-დან: mark-{3d,flat,tiny}[-inverse], mark-mono, wordmark-{horizontal,vertical}
  assets/icons/icons.svg  ხატულების ერთადერთი წყარო (<symbol>, class main | accent | dot | fill)
  test/
    setup.js              jest-dom, axe matcher, matchMedia stub
    contrast.js           WCAG კონტრასტი, tokens.css-ის პარსერი, სავალდებულო წყვილები
```

## კოდის კონვენციები (F1)

- ფერი მხოლოდ ტოკენის უტილიტით: `bg-page`, `bg-surface`, `bg-alt`, `bg-hero`, `bg-footer`, `text-ink`, `text-muted`, `text-link`, `text-accent`, `text-growth`, `text-error`, `border-border`, `border-line`, `bg-cta`, `hover:bg-cta-hover`, `text-cta-ink`, `fill-graphic`, `bg-band`. `bg-white`, `text-red-500` და მსგავსი არ არსებობს.
- ტიპოგრაფია: `text-hero-1|2|3`, `text-h1|h2|h3`, `text-lead`, `text-body`, `text-small`, `text-article`, `text-quote`, `text-slide-title|text|num`. ზომა, line-height და წონა ერთ კლასშია.
- ბიჯი 8px: `p-1` = 8px, `gap-3` = 24px, `h-7` = 56px (CTA), `size-5.5` = 44px.
- კონტეინერი: `site-container`; სტატიის სვეტი: `max-w-article`.
- მოძრაობა: `transition-colors duration-base ease-out`; გადაადგილება მხოლოდ `motion-safe:`-ით.
- საკუთარი ჩრდილი `box-shadow`-ით არა, `--mc-shadow`-ით, რომ ფოკუსის რგოლს არ გადაეწეროს.
- ქვეხის თემა: `data-theme="dark"` ელემენტზე. კონტრასტის თემის შიგნით ჩადგმული თემა არ მოქმედებს.
- ტექსტი ქართულად, უცნობი მონაცემი `[ფრჩხილებში]`.

## კოდის კონვენციები (F2)

- კონტენტი მხოლოდ `@/content/adapter.js`-დან: `listArticles`, `getArticle`, `listSeries`, `getSeries`, `listVideos`, `getVideo`, `listNews`, `listEvents`, `getTeam`, `getPartners`, `getStages`, `getSettings`, `subscribe`, `sendContact`. mock-ს ან query.js-ს გვერდი პირდაპირ არ იძახებს.
- მოთხოვნა კომპონენტში: `useContent(() => getArticle(slug), [slug])`; სია „მეტით“: `useLoadMore((cursor) => listArticles({ category, q, cursor }), [category, q])`. fn ყოველთვის inline-ია — ESLint deps-ს ამოწმებს; პირობითი მოთხოვნა — `{ enabled }`.
- შეცდომა ყოველთვის `ContentError`-ია: UI გადაწყვეტილებას `code`-ით იღებს (`not-found` → 404, `network` → „ხელახლა ცდა“), `message`-ს პირდაპირ აჩვენებს; ფორმაში — `error.fields[name].message`.
- ტექსტი UI-ში მხოლოდ `t('…')`-ით; ტაქსონომიის წარწერა — `label('articleCategory', id)`. რიცხვის შემდეგ არსებითი მხოლობითშია.
- თარიღი მხოლოდ `formatDate` / `formatDateParts` / `formatTimeRange`-ით (Asia/Tbilisi); `<time dateTime={toDateAttribute(iso)}>`.
- სტატიის ტექსტი ბლოკებია (`p`, `h2`, `h3`, `list`, `quote`, `image`, `link`); HTML სტრიქონი არსად. `TextRun.lang = 'en'` → `<span lang="en">`.
- `src: null` / URL `null` — მასალა ჯერ არ არის: ჩანაცვლების ჩარჩო ან გათიშული ღილაკი, არასოდეს გატეხილი სურათი.
- mock-ში ყოველი წასაკითხი ტექსტი `[ფრჩხილებშია]` — ამას `src/content/mock/mock.test.js` ამოწმებს.

## კოდის კონვენციები (F3)

- UI მხოლოდ `@/components/ui/index.js`-დან: `Button`, `IconButton`, `Chip`, `ChipGroup`, `Card` და 7 ბარათი, `Media`, ველები, `Accordion`, `SaveToggle`, `A11yBadge`, `GrowthStat`, `SectionHeading`, `Quote`, `Icon`, `Logo`, `VisuallyHidden`, `LiveRegion`, `UiLink`. ახალ ღილაკს / ბარათს / ველს გვერდზე არ აწყობ — ჯერ ნაკრებს ამოწმებ, საჭიროებისას ნაკრებს ავრცობ.
- ვიზუალური მდგომარეობა `components.css`-შია (`mc-*` კლასები, `@layer components`), განლაგება — Tailwind-ის უტილიტებით. ფერი მხოლოდ `var(--mc-*)`; hover → `--mc-hover`, დაჭერა → `--mc-pressed` / `--mc-pressed-ink`, ბარათის ჩარჩო → `--mc-card-border`, ფართო ზოლი → `--mc-band-bg` / `--mc-band-ink` + `--mc-band` კიდე.
- ყოველი მდგომარეობის სელექტორი `:hover` / `:active`-ს გვერდით `[data-force~='hover' | 'active']`-საც იღებს (მხოლოდ `/__kit`-ისთვის); ფოკუსი — focus.css.
- გადაადგილება (translate, scale, rotate-ის ანიმაცია) მხოლოდ `@media (prefers-reduced-motion: no-preference)`-ში; ფერის ცვლილება ხანგრძლივობით `var(--mc-dur-*)` (reduce-ში 0).
- საკუთარი ჩრდილი — `--mc-shadow` (`box-shadow: var(--mc-shadow)`), რომ ფოკუსის რგოლი მას არ წაშლის.
- დაწკაპებადი ბარათი — `Card`-ის `to` / `href` / `onSelect` (stretched-link); ბარათზე `<a>` არასოდეს ედება. ინტერაქტიული შვილები — `overlay` / `actions`.
- ხატულა მხოლოდ `<Icon name>`-ით; ახალი ხატულა — `<symbol>` `icons.svg`-ში. მარტო-ხატულიან ღილაკს `IconButton`-ის `label` აქვს.
- ლოგო მხოლოდ `<Logo>`-ით; `size` = სიმაღლე px-ში, დეტალს ზომა ირჩევს. ფაილებს ხელით არ ასწორებ — წყარო LogoSynergy-ა.
- ფორმის ველები: `label` სავალდებულოა, შეცდომა — `error` (სტრიქონი ან `ContentError.fields[name]`), სავალდებულო — `required`, არასავალდებულო — `optional`. options — `options(kind, ids)` (`{ id, label }`).
- სტატუსის შეტყობინება — `<LiveRegion>`, რომელიც DOM-ში მუდმივად დგას; შეცვლა მხოლოდ შიგთავსისაა.
- ტესტები: ყოველ ახალ კომპონენტს axe-ის შემთხვევა `__tests__/axe.test.jsx`-ში; ინტერაქცია — `userEvent.setup()` + კლავიატურა. ფერის კონტრასტს jsdom ვერ ამოწმებს — Chromium-ში `/__kit`-ზე axe (gate).
