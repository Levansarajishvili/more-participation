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
  placeholders.mjs        F7: [placeholder]-ები ტიპების მიხედვით (`npm run placeholders`, `--json`)
  audit.py                F7: Chromium-ის აუდიტი (`npm run build && npm run audit`; Python Playwright,
                          axe-core node_modules-იდან, ffmpeg — fixture-ები `.audit-fixtures/`-ში)
src/
  main.jsx                შრიფტები, სტილები, RouterProvider
  routes.jsx              createRoutes() (ყოველ router-ს საკუთარი lazy-ობიექტები), routes, pageRoutes;
                          handle.title — i18n-ის გასაღები; /__kit მხოლოდ DEV
  styles/
    index.css             შესასვლელი: tailwindcss → tokens → theme → base → components → layout → focus → motion
    tokens.css            --mc-* სამ თემაზე
    theme.css             @theme: შკალები, breakpoint-ები, რადიუსები, ხანგრძლივობები; @theme inline: ფერის უტილიტები
    base.css              ტიპოგრაფია, --mc-font-scale, --mc-leading, data-size / data-spacing
    components.css        F3: UI ნაკრების სტილები (@layer components, mc-*), reduced-motion; F4: Switch
    layout.css            F4: გარსი — ზედა ზოლი, მენიუ, ჰედერი (data-layout), მობ. პანელი, ფუტერი (container query)
    sections.css          F5: PageSection / PageHero, ბადე (mc-grid, --4, --6), ორბიტა (CSS mask), PendingLink
    focus.css             სამშრიანი რგოლი (layer-ის გარეშე) + ბარათის რგოლი (:has) + data-force;
                          F4: #main და [data-route-focus] — რგოლის გარეშე
    motion.css            prefers-reduced-motion; F4: [data-theme-switching] — თემის ფერების გადასვლა 200ms
    tokens.test.js        HEX მხოლოდ §2-იდან + კონტრასტის ბარიერები
  features/
    a11y/
      prefs.js            mc-a11y-ის კონტრაქტი: parse/serialize, stepFontSize, read/writeStoredPrefs, applyRootAttributes
      PreferencesProvider.jsx  state → <html data-*>, OS-ის თემა, storage event, თემის გადასვლა
      usePreferences.js   PreferencesContext + usePreferences()
      speech.js           speechSynthesis-ის store: ქართული ხმა, readElement, cancelSpeech, useSpeech (Esc აჩერებს)
      A11yMenu.jsx        თავსებადობის მენიუ (არამოდალური პანელი)
      __tests__/          მენიუ: შენახვა/აღდგენა, Esc, OS-ის თემა, ხმოვანი რეჟიმი; speech.js
    home/                 F5: მთავარის სექციები — HomeHero, HomeAbout, HomeArticles, HomeDevelopment,
                          HomeVideos, HomeNews; useHomeContent.js (4 მოთხოვნა, splitVideos); home.css
    about/                F5: AboutHero, AboutMission, AboutValues, AboutPath, AboutTeam (#team),
                          AboutPartners (#partners); PillarList (+ pillars.css, მთავარიც იყენებს);
                          about-media.js (ჰეროს ფოტოები); about.css
    articles/             F6: ArticleFilters (<search>, ჩიპები, დალაგება), FeaturedArticle, ArticleList
                          (სტატუსი, ბადე, LoadMore), filter-summary.js; სტატიის შაბლონი — ReadingHeader,
                          ArticleBody (ბლოკები), ListenControl (audio / speech.js), ShareButton,
                          RelatedArticles; articles.css (ძიება), reading.css (სვეტი, .mc-prose)
    news/                 F6: NewsFilters (ტიპი + წელი), FeaturedNews, NewsList (<ol>), UpcomingEvents; news.css
    contact/              F6: ContactChannels (+ contact-channels.js), ContactForm, ContactConfirmation,
                          OfficeInfo (რუკა, ოფისი, საათები), ContactFaq, contact-fields.js; contact.css
    subscribe/            F6: SubscribeForm (dark | card) + subscribe.css — სტატიები და სიახლეები
    development/          F7: SeriesDeck (სერია სლაიდერში, PdfButton, TextVersion), SeriesGrid
                          („სხვა სერიები“), series-links.js (seriesHref); development.css
    videos/               F7: VideoStage (ფლეიერი + ინფორმაცია), VideoGrid (კატეგორიები + 6 ბარათი),
                          ShareStoryBand (/contact?topic=story), useVideoParam.js (?video= / ?v=); videos.css
    __tests__/            F5: page-helpers.jsx (renderPage, adapter-ები: ok/failing/empty/pending/
                          switchable, headingTree, unbracketedFacts), pages.test.jsx (CSS, gate-ის თვითტესტი)
  components/
    ui/                   F3: index.js (შესასვლელი), Button, Chip, Card, Media, Accordion, SaveToggle,
                          A11yBadge, GrowthStat, SectionHeading, Quote, Icon (+ icon-sprite.js), Logo
                          (+ logo-geometry.js), VisuallyHidden, LiveRegion, UiLink, Switch (F4), utils.js;
                          F5: ContentState, Skeleton (+ SkeletonGroup), Breadcrumbs, DateTile, PendingLink;
                          F6: LoadMore, fields/ErrorSummary (+ focusField — field-utils.js)
      cards/              Article, Series, Video, News, Event, Team, PartnerCard
      fields/             TextField, TextArea, Select, Checkbox, RadioGroup, Field.jsx, field-utils.js
      __tests__/          axe, კლავიატურა, ლოგო, components.css (fixtures.jsx — mock-ის summary-ები)
    layout/               F4: RootLayout (Provider + PageShell + ScrollRestoration), PageShell, SiteHeader,
                          SiteFooter, site-nav.js (ბმულები), useShellLayout.js, usePageTitle.js, __tests__/;
                          F5: PageSection, PageHero; F6: PageIntro (ღია თავი)
    media/                F7: index.js (შესასვლელი), Slider (+ useSwipe.js), VideoPlayer, ProgressSlider,
                          Transcript (+ transcript-utils.js), NativeMedia + sources.js (VideoSourceAdapter),
                          native-controller.js (PlaybackController), player-prefs.js (mc-player),
                          usePlayback.js (usePlayback, usePlayerLayout), media.css (lazy, გვერდთან ერთად);
                          __tests__/fake-source.jsx — ტესტისა და /__kit-ის წყარო
  pages/                  თითო გვერდი = ერთი lazy chunk; KitPage — /__kit (მხოლოდ DEV)
  admin/                  F8: ადმინ პანელი — საჯარო bundle-ში არ ხვდება (routes.jsx იტვირთება
                          src/routes.jsx-ის patchRoutesOnNavigation-ით)
    routes.jsx            createAdminRoutes(); handle.admin = { title, crumbs, root, editor }
    AdminRoot.jsx         PreferencesProvider + AuthProvider + noindex meta; admin.css
    api/                  adminAdapter.js (ერთადერთი შესასვლელი), mock.js (საერთო საცავზე; სატესტო
                          ანგარიშები), http.js (VITE_ADMIN_API, cookie + CSRF), permissions.js (როლები)
    auth/                 AuthProvider (სესია, alertdialog, ავტოშენახვის flush), auth-context.js
                          (useAuth, useSessionFlush), auth-forms.js, RequireAuth, RequireRole
    shell/                AdminShell (sidebar + header + compact-მენიუ), AdminNav, admin-nav.js,
                          admin-page.js (useAdminPage), useAdminLayout.js (75rem), initials.js
    components/           Dialog (ნატიური <dialog>), ConfirmDialog, StatusBadge (+ IssueBadge), PasswordField
    pages/                Login, Dashboard, List, A11yReport, Search, Media, Documents, Users, Settings,
                          Forbidden, AdminNotFound, AdminRouteError, AdminRootError
    editor/               EditorPage (lazy) → EntityEditor; RichTextEditor (TipTap, lazy chunk) +
                          extensions.js; serialize.js (JSON ↔ ბლოკები), checklist.js (validate.js-ზე),
                          fields/FieldRenderer.jsx (ყველა ველის სახე), path.js, datetime.js (Tbilisi),
                          vtt.js, autosave.js, PreviewPage; editor.css
    schemas/              ველების კონფიგი თითო ტიპზე (articles, news, events, series, videos, pages)
    i18n/                 ადმინის ლექსიკონი (ka.js) + ta()
    content-types.js      ტიპები, სვეტი „კატეგორია“, საჯარო გზა, creatable / archivable
    __tests__/            admin-helpers.jsx (setupAdmin, signInDirect, renderAdmin, fillLogin), ტესტები
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
    mock/                 createMockAdapter, createMockData; ყველა ფაქტი [ფრჩხილებში];
                          F8: store.js — საერთო in-memory საცავი (საჯარო + ადმინის adapter)
  hooks/
    useContent.js         ერთი მოთხოვნა → { data, status, error, reload }
    useLoadMore.js        cursor-ით „მეტის ჩატვირთვა“, firstNewIndex ფოკუსისთვის
    useUrlFilters.js      category / q (300ms) / year / series / sort URL-ში
    useSaved.js           localStorage['mc-saved'], ტაბებს შორის სინქრონი
    useLoadMoreFocus.js   F6: „მეტის“ შემდეგ ფოკუსი პირველ ახალ ელემენტზე + „დაემატა {n}, სულ {n}“
    useHeadingRefocus.js  F6: ასინქრონული გვერდის h1 — ჩატვირთვის შემდეგ ფოკუსი (ან #hash-ის სამიზნე)
  i18n/
    ka.js                 ინტერფეისის ყველა სტრიქონი
    en.js                 იგივე გასაღებები, [EN] placeholder-ები (გენერირდება)
    index.js              t(), createT(), formatDurationLabel + format.js-ის რეექსპორტი
    format.js             ka-GE, Asia/Tbilisi: formatDate, formatTimeRange, formatDuration… (F6: თვეები
                          და დღეები ფაილშია — ICU-ის ქართულ ლოკალზე აღარ არის დამოკიდებული)
  assets/logo/            ლოგო LogoSynergy-დან: mark-{3d,flat,tiny}[-inverse], mark-mono, wordmark-{horizontal,vertical}
  assets/icons/icons.svg  ხატულების ერთადერთი წყარო (<symbol>, class main | accent | dot | fill)
  test/
    setup.js              jest-dom, axe matcher, matchMedia / scrollTo stub, localStorage + <html> გასუფთავება
    media.js              installMatchMedia({ width, dark }) — მართვადი matchMedia + innerWidth
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

## კოდის კონვენციები (F4)

- გარსი ერთია: ყოველი საჯარო როუტი (404-ისა და გვერდის შეცდომის ჩათვლით) `PageShell`-ში ეხვევა. გვერდი
  `<header>`, `<nav>`, `<footer>`-ს, თავსებადობის მენიუს ან რეჟიმის გადამრთველს არ ხატავს; გვერდზე
  `<main>` არ არის — მას PageShell იძლევა (`id="main"`, `tabIndex={-1}`). ადმინი (F8) — `AdminShell`.
- გვერდი `<h1>`-ს პირველივე რენდერზე ხატავს (ჩატვირთვის მდგომარეობაშიც) — როუტის შეცვლისას
  ფოკუსი მასზე გადადის. `<title>` გვერდში აღარ იწერება: სტატიკური სათაური — როუტის
  `handle: { title: 'nav.about' }` (i18n-ის გასაღები; `null` — მხოლოდ საიტის სახელი), დინამიკური —
  `usePageTitle(article.title)`.
- სათაური და ფოკუსი მხოლოდ pathname-ის ცვლილებაზე იცვლება; ფილტრი (`?category=`) მათ არ ეხება.
  hash (`/about#team`) → ფოკუსი სამიზნეზე. ScrollRestoration ახალ გვერდზე ზემოთ ადის, „უკან“ აღადგენს.
- თავსებადობის პარამეტრები მხოლოდ `usePreferences()`-ით: `prefs`, `theme` (მოქმედი), `fontScale`,
  `setTheme`, `stepSize`, `setSpacing`, `setVoice`, `reset`. `localStorage['mc-a11y']`-ს და `<html data-*>`-ს
  კომპონენტი პირდაპირ არ ეხება.
- თემაზე დამოკიდებული JS (ლოგოს ტონი) — `theme`-იდან: light → `color`, dark → `inverse`,
  contrast → `mono`. მუქი ფონის ზოლები (ზედა ზოლი, ფუტერი): ფონი `--mc-footer` ძირეული თემიდან,
  შიგთავსი `data-theme="dark"` ქვეხე; ამ ქვეხიდან ამომხტარი პანელი ძირეულ თემას `data-theme={theme}`-ით აბრუნებს.
- breakpoint-ი `data-size`-ს არ მიჰყვება (media query-ის rem = ბრაუზერის შრიფტი). შრიფტის მასშტაბზე
  დამოკიდებული განლაგება — container query-ით (`container: name / inline-size`; მისი rem `<html>`-ის
  ზომაა) ან, როცა DOM-ის რიგი იცვლება, JS-ით რეალური სიგანიდან (`useShellLayout`).
- გრძელი ქართული სიტყვა ვიწრო ბლოკში: `overflow-wrap: anywhere` (min-content-საც ამცირებს).
- სანავიგაციო ბმულები მხოლოდ `site-nav.js`-დან (`NAV_ITEMS`, `JOIN_HREF`, `EN_HREF`, `FOOTER_*`).
- URL-ი, რომელიც ჯერ არ არსებობს: `SiteSettings.links.*` = null → ტექსტი „[ბმული მზადდება]“, ბმული
  არა. ტელეფონი/ელფოსტა ბმული ხდება მხოლოდ `isPhone` / `isEmail`-ის შემდეგ.
- ორობითი პარამეტრი — `<Switch>` (`role="switch"`); მიუწვდომელი — `disabled` + `disabledReason`
  (`aria-disabled`, ფოკუსს იღებს, მიზეზი ხილულია). ზღვარზე მისული ღილაკი — `aria-disabled`, არა `disabled`.
- ტესტებში router — `createMemoryRouter(createRoutes(), …)`; სიგანე და OS-ის თემა — `installMatchMedia()`.

## კოდის კონვენციები (F5)

- გვერდი = ჰერო + სექციები: `PageHero` (h1 გვერდისაა, `id={headingId}`) და `PageSection` (`headingId`,
  `title`, `eyebrow`, `lead`, `action`, `tone: default | alt | dark`, `split`). `<section>` და `<h2>`-ს
  გვერდი ხელით არ აწყობს; სექციის შიგნით სათაური h3-ით იწყება. hash-ის სამიზნე (`#team`) — h2-ის id.
- მუქი ზოლი: `tone="dark"` (ფონი `--mc-hero`, შიგთავსი `data-theme="dark"`). თეთრი ბარათი ლურჯ ფონზე —
  ძირეულ თემაში (`PageHero` `asideTheme="root"`).
- ყოველი მონაცემიანი ბლოკი `ContentState`-შია: `status`, `error`, `onRetry={reload}`, `label` (სექციის
  სახელი), `skeleton` (`SkeletonGroup` იმავე ბადის კლასით), `empty` + `emptyText`, `focusId` (h2-ის id);
  შიგთავსი — ფუნქცია `{() => …}` (მხოლოდ `success`-ზე იძახება). ჩონჩხი ანიმაციას არ იღებს.
- სია — `<ul className="mc-grid …">` + `<li>` + ბარათი. სვეტები: `mc-grid` (3), `mc-grid--4`,
  `mc-grid--6`, `mc-grid--tight`; ვიწრო row-ბარათები — `mc-row-list` (საკუთარი კონტეინერი).
- მრავალსვეტიანი განლაგება — container query (`@container (min-width: …rem)`), რომ შრიფტის მასშტაბს
  მიჰყვეს; ბლოკის ტექსტს `overflow-wrap: anywhere` (`.mc-section__inner`) აქვს. რაოდენობის შეზღუდვა
  მობილურზე — media query (ეკრანი, არა მასშტაბი).
- გვერდის CSS lazy chunk-თან ერთად იტვირთება (`import './home.css'` გვერდიდან / კომპონენტიდან),
  `@layer components`, მხოლოდ `--mc-*`; HEX, `var(--mc-cta)` და ანიმაცია გვერდის CSS-ში არ არის
  (ამოწმებს `src/features/__tests__/pages.test.jsx`).
- ფოტოს ჩანაცვლება — „[ფოტო: თვალის დონე, მოქმედების მომენტი — …]“; მრავალფეროვნება მოქმედებით
  (ჟესტური ენა, ეკრანის მკითხველი, ბრაილი, მარტივი ენა), არასოდეს შეზღუდვის წარწერით პირად ბარათზე.
  ეტლის სიმბოლო დეკორაციად არ გამოიყენება.
- გვერდის ტესტი: `renderPage(path, adapter)` + `settle(main)`; სამი მდგომარეობა (`pendingAdapter`,
  `failingAdapter` + `switchableAdapter` → ფოკუსი h2-ზე, `emptyAdapter`), `skippedLevels(headingTree(main))`
  = `[]`, `unbracketedFacts(main)` = `[]`, axe (jsdom). Chromium-ის axe — gate (1440 / 390 × 3 თემა).

## კოდის კონვენციები (F6)

- გვერდის ღია თავი (ArticlesPage / NewsPage / ContactPage დაფები) — `PageIntro` (`<section aria-labelledby>`
  h1-ზე; h1-ს, ბილიკს, lead-ს და ფილტრებს გვერდი ხატავს). მუქი თავი — F5-ის `PageHero`.
- ფილტრი = `useUrlFilters`: ჩიპი / select — push, ძიება — 300ms + replace; სიახლის ტიპი `?category=`-ითაა
  (§10-ის პარამეტრები). შედეგის რაოდენობა — ხილული `LiveRegion` სიის სათაურის გვერდით; ტექსტი მხოლოდ
  ახალ შედეგზე იცვლება (ჩატვირთვისას ძველი რჩება), ფოკუსი ფილტრზე რჩება. ცარიელ შედეგზე და ჩართულ
  ფილტრზე — „ფილტრების გასუფთავება“, დაჭერის შემდეგ ფოკუსი სიის h2-ზე.
- „მეტის ჩატვირთვა“ — `LoadMore` + `useLoadMoreFocus(list, listRef)` (ფოკუსი ახალი გვერდის პირველ
  ბმულზე, დამალული სტატუსი „დაემატა {n}, სულ {n}“). „მეტის“ შეცდომისას ბლოკი `success`-ად რჩება.
- ფილტრის გარეშე რჩეული ცალკე ბლოკია (`featured: true, limit: 1`), სია — `featured: false`; ფილტრისას
  რჩეული ჩვეულებრივ შედეგშია.
- ასინქრონული გვერდი (სტატია, სიახლე): h1 პირველივე რენდერზე („… იტვირთება…“) და ერთი DOM-კვანძია
  ყველა მდგომარეობაში; `useHeadingRefocus(headingRef, status)` — ჩატვირთვის შემდეგ ფოკუსი (#hash →
  სამიზნეზე). `<main>`-ში `<header>` არ იწერება (banner) — `div[data-heading-scope]`.
- სტატიის / სიახლის ტექსტი — `ArticleBody` (`.mc-prose`: 20/1.75, 36em, H2 28/1.3); სვეტი
  `.mc-reading__column` (45rem). გაზიარება — `ShareButton` (Web Share → კოპირება → ხელით, მისამართი
  როუტერიდან: `useHref`). მოსმენა — `ListenControl` (audio ფაილი ან `speech.js`).
- ფორმა: `noValidate` + ვალიდაცია მხოლოდ გაგზავნისას (`validateContact` / `validateSubscribe` — adapter-ის
  იგივე წესი); რამდენიმე ველზე — `ErrorSummary` ფორმის თავში (`key={attempt}`, ბმულები ველის id-ებზე,
  `focusField`) + ველის `error`. ერთველიან ფორმაში ჯამი არ ჩნდება — ფოკუსი ველზე. სავალდებულო ველი
  `required`-ით ავტომატურად იღებს „(სავალდებულო)“-ს, არასავალდებულო — `optional`. placeholder არ არის.
- ფორმის წარმატება — დადასტურება ფორმის ადგილას (`role="status"`, ფოკუსი h3-ზე, `--mc-growth` ჩარჩო +
  ✓); ქსელის შეცდომა — `role="alert"` ღილაკის ზემოთ, მონაცემი რჩება. spam — honeypot (`.mc-hp`,
  `aria-hidden`, `tabindex="-1"`), CAPTCHA და დროის ლიმიტი არ არის.
- რუკის iframe მხოლოდ `address.embedUrl` + `address.directions`-ით (ტექსტური ალტერნატივა ხილულია
  `figcaption`-ში); placeholder-ი `aria-hidden`.
- user-event-ში `[` და `{` გასაღების აღწერაა — `[ფრჩხილებიანი]` ტექსტი ტესტში `literal()`-ით იკრიფება
  (`[[`). `getByLabelText` aria-hidden-ს არ ითვალისწინებს — დამალულის შესამოწმებლად `getByRole`.
- `unbracketedFacts` ბლოკს (p, li, h…, dd) მთლიანად ამოწმებს, თუ ის რამდენიმე ფრაგმენტისგანაა;
  გამოთვლილი მნიშვნელობა (`time`, `.mc-card__time`, წლის `option`) — არ ითვლება ფაქტად.

## კოდის კონვენციები (F7)

- სლაიდერი და ფლეიერი მხოლოდ `@/components/media/index.js`-დან. `media.css` კომპონენტთან ერთად
  იტვირთება (გვერდის lazy chunk); HEX მხოლოდ §2-იდან, ოქროსფერი — მხოლოდ დაკვრაზე (ტესტი).
- სლაიდერი = WAI-ARIA APG carousel, ავტოდაკვრის გარეშე: `<section aria-roledescription="კარუსელი">`,
  სლაიდი `role="group"` „3 / 6“, DOM-ში მხოლოდ მიმდინარე; ← → Home End — მხოლოდ შიგნიდან (listener
  root-ზე, `useEffectEvent`); ბოლოებში `aria-disabled`; მრიცხველი — `LiveRegion` („სლაიდი 3 / 6: …“);
  სხვა სერია = `key={series.slug}`. ყდა `tone`-ის ფიქსირებული წყვილია (თემით არ იცვლება); ზომები
  `cqi` × `--mc-font-scale`-ით rem-ის ფარგლებში, `aspect-ratio` მინიმუმია (დიდ შრიფტზე იზრდება).
- ფლეიერი მედიას პირდაპირ არ ეხება: `VideoSourceAdapter { id, canPlay(video), Media }` → `Media`
  `onController`-ით `PlaybackController`-ს აბრუნებს (play / pause / seek / setVolume / setMuted / setRate /
  setCaptions / setSignLanguage / setAudioDescription / subscribe / onCaption). ახალი პლატფორმა (YouTube) —
  ახალი adapter `sources.js`-ში, UI უცვლელია. ტესტში — `createFakeSource()`.
- ფლეიერის მალსახმობები `KeyboardEvent.code`-ით (ქართულ განლაგებაზეც), მხოლოდ ფლეიერის შიგნით; Space
  — მხოლოდ რეგიონზე / კადრზე (ღილაკზე ღილაკისაა); ველსა და ჩამოსაშლელში — არაფერი.
- განლაგება, რომელიც DOM-ს ცვლის (ფლეიერის „მეტი“), — JS-ით რეალური სიგანიდან და rem-იდან
  (`usePlayerLayout`, ზღვარი 34rem), არა media query-ით.
- ფაილის გარეშე (`src: null`) ფლეიერი ჩანაცვლების ჩარჩოს, „ვიდეო ფაილი მზადდება“-ს და ღია ტრანსკრიპტს
  აჩვენებს; ფუნქციის ფაილი აკლია → ღილაკი `aria-disabled` + ხილული მიზეზი (`aria-describedby`).
- მიუწვდომელი მოქმედება (PDF, „რეგისტრაცია“, „განაცხადი“) — `Button disabled disabledReason`:
  ფოკუსს იღებს, მიზეზი ხილულია და ისმის. უბრალო `disabled` მხოლოდ დროებით მდგომარეობაზე (ფორმა იგზავნება).
- სტილიანი სია (`list-style: none`) — `role="list"` (Safari / VoiceOver); ESLint ul / ol-ზე ამას უშვებს.
- query-ით არჩეული ობიექტი (`?series=`, `?video=`): ჩატვირთვის შემდეგ ფოკუსი ბლოკის h2-ზე / ფლეიერზე,
  მხოლოდ მომხმარებლის ცვლილებისას (პირველ ჩატვირთვაზე — არა); h2 ერთი კვანძია ყველა მდგომარეობაში.
- ხელმისაწვდომი სახელი ხილულ ტექსტს თავში შეიცავს: `{ხილული}{' '}<VisuallyHidden>{დანართი}</VisuallyHidden>`
  (ჰარი span-ის გარეთ — jsdom და Chromium ერთნაირად ითვლის).
- აუდიტი: `npm run build && npm run audit` → audit.json (axe ყველა როუტზე × 3 თემა × 1440 / 390, Tab-ით
  გავლა, reduced-motion, reflow 320 / 720 / შრიფტი 200%, ფლეიერი ფაილით, bundle). Gate — axe 0 / 0.


## კოდის კონვენციები (F8)

- ადმინის კოდი მხოლოდ `src/admin/`-შია და საჯარო ხიდან მხოლოდ `createRouterOptions()`-ით იტვირთება.
  საჯარო მოდული `@/admin/*`-ს არასოდეს იმპორტებს (check-dist ამოწმებს manifest-ით). ადმინის ტექსტი —
  `ta()` (`src/admin/i18n/ka.js`), საჯარო ka.js-ში არა; ზოგადი შეცდომის კოდები (`errors.*`) — ka.js-შია.
- backend-თან მხოლოდ `@/admin/api/adminAdapter.js` (`auth`, `content`, `media`, `users`, `settings`,
  `stats`, `a11yReport`); შეცდომა — `ContentError` (`unauthorized` → შესვლის გვერდი, `forbidden` → 403,
  `conflict` → კონფლიქტის დიალოგი, `validation` + `fields` → შეცდომების ჯამი). token არსად ინახება.
- ეკრანი h1-ს არ ხატავს — ის header-შია: სტატიკური სათაური `handle.admin.title`-ით, დინამიკური —
  `useAdminPage({ title, crumbs, type, editor })`. ეკრანის სექცია — `.mc-admin-panel` + h2.
- უფლება — `can(user, permission)`; როუტი — `<RequireRole permission>` (403 გარსის შიგნით).
- დიალოგი — `Dialog` / `ConfirmDialog` (ნატიური `<dialog>`, `showModal`); დადასტურებაზე ფოკუსი
  ნაკლებად სახიფათო ღილაკზე; მოთხოვნა, რომელიც პასუხს ითხოვს (სესია, შეუნახავი ცვლილება) — `alertdialog`.
- ახალი კონტენტის ტიპი / ველი = სქემა `src/admin/schemas/`-ში (ველის `name` = მოდელის გზა); ახალი ველის
  სახე — `FieldRenderer`-ში, UI ნაკრების ველებზე, id — `fieldId(path)` (შეცდომების ჯამი მასზე მიდის).
- ჩეკლისტის წესი = `validate.js`-ის კოდი + `RULES` (`checklist.js`) + სქემის `rules`; ტექსტი —
  `editor.checklist.rules.*`. ბლოკერი გამოქვეყნებას აჩერებს რედაქტორშიც და adapter-შიც.
- TipTap-ის სქემა მხოლოდ მოდელის ბლოკებია (`extensions.js`); ახალი ფორმატი = მოდელი + serializer + ტესტი.
- ცხრილი — `<table>` + `<caption>` + `scope="col"`, სქროლ-რეგიონში (`role="region"`, `tabindex="0"`,
  სახელით); ბარათებად არ იქცევა. მოქმედების ღილაკის სახელი სათაურს შეიცავს (დამალული ნაწილით).
- ტესტები: `setupAdmin()` (საერთო საცავი + ორივე adapter), `signInDirect(admin, role)`, `renderAdmin(path)`;
  ავტოშენახვა — `setAutosaveDelay(ms)`; Chromium — `npm run audit -- --only admin` (`ADMIN_THEMES`,
  `ADMIN_WIDTHS`, `ADMIN_SKIP_KEYBOARD`, `ADMIN_KEYBOARD`).
