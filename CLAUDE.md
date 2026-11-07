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
- ვიდეო: YouTube-ის ბმულით (ფაილი საიტზე არ იტვირთება); სუბტიტრები ნაგულისხმევად — ჩვენი VTT (ქართული სავალდებულო), კადრის ქვეშ და არა ფლეიერზე; აუდიოაღწერა — ცალკე YouTube-ვერსია ან დადასტურება, რომ ვიზუალური ინფორმაცია აუდიოშია; ტრანსკრიპტი დროის ნიშნულებით. ჟესტური ენის ვერსია არ კეთდება. ავტოდაკვრა არასოდეს.
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

## Backend-ის აგება — ჩატების რეჟიმი

- აგება ნაბიჯებად მიდის (project-context.md, §12: B0–B7; F10 — B0-ის შემდეგ, B1-მდე). ერთი ჩატი = ერთი ნაბიჯი; სხვა ნაბიჯის სამუშაოს არ იწყებ.
- ამ ჩატებში ხარ backend-ინჟინერიც: Node.js 22 (ESM), JavaScript + JSDoc (TypeScript-ის გარეშე), MongoDB, Vitest + mongodb-memory-server. Framework და driver — B0-ის გადაწყვეტილებით (§12).
- frontend-ის კონტრაქტს (`src/content/adapter.js`, `src/admin/api/adminAdapter.js`, `http.js`) ცალმხრივად არ ცვლი: თუ endpoint ან პასუხის ფორმა უნდა შეიცვალოს, ჯერ ამბობ რატომ და ცვლი ორივე მხარეს ერთ ნაბიჯში, ტესტით.
- ერთი წესი ორივე მხარეს: ვალიდაცია, slug, ძიების ნორმალიზაცია, თარგმანი — `src/content/`-ის საერთო მოდულებიდან, ასლის გარეშე.
- §12-ის „Backend-ის წესები“ არადათმობადია (cookie-სესია, CSRF, სქემით ვალიდაცია, გამოქვეყნების ბლოკერი სერვერზე, როლები, rate limit CAPTCHA-ს გარეშე, დიაგნოზი არ გროვდება, ლოგში პერსონალური მონაცემი არ არის).
- საიდუმლო (პაროლი, connection string, API key) კოდში და zip-ში არასოდეს — მხოლოდ `.env.example` placeholder-ებით. სატესტო პაროლი არ იწერება კოდში — env-იდან ან ერთჯერადი სკრიპტით.
- რეალური ბაზა და ღრუბლის ანგარიშები ჩატიდან მიუწვდომელია: ტესტი mongodb-memory-server-ზეა, deploy — ინსტრუქციით (`docs/deploy.md`), რომელსაც მომხმარებელი ასრულებს.
- თუ sandbox-ში დომენი მიუწვდომელია (MongoDB-ის binary, npm-ის პაკეტი), ამბობ რომელი — მომხმარებელი network settings-ში დაამატებს.
- ჩატის ბოლოს: (1) რეპოს zip (node_modules, dist, .git-ის, `.env`-ის გარეშე); (2) progress.md სრულად — შექმნილი ფაილები, API (endpoint-ები, ფუნქციები, env ცვლადები), გადახვევები, ღია საკითხები, gate-ის სტატუსი; (3) თუ გადაწყვეტილება შეიცვალა — project-context.md სრულად.

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

npm სკრიპტები: `dev`, `build` (+ `postbuild` → `scripts/check-dist.mjs`), `preview`, `lint` (ESLint `--max-warnings=0` + Prettier check — `server/`-იც), `format`, `test`, `test:watch`, `tokens:report`; B1: `server:dev` (`--watch`, `server/.env`), `server:start`, `server:test` (`server/vitest.config.js`), `server:lint`; B2: `server:migrate` (მიგრაციები, იდემპოტენტური), `server:seed` (mock-ის მონაცემი, `-- --reset`; წარმოებაში არ ეშვება); B3: `server:create-admin` (პირველი ადმინისტრატორი — `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` env-ით ან ტერმინალიდან; ნაგულისხმევი პაროლი არ არსებობს); B5: `audit:media-api` (Chromium, რეალური API). dev-ში `vite` `/api` და `/media`-ს `server:dev`-ზე (3000) აგზავნის — `VITE_ADMIN_API=/api/admin`. B7: `dev:api` (`vite --mode api` — API-ზე, mock-ის გარეშე), `prod:local`, `smoke`, `smoke:local`, `audit` (production build + რეალური API), `server:backup`, `server:restore`; `npm run build` ყოველთვის `/api/v1` / `/api/admin`-ზეა (mock — მხოლოდ dev-სა და ტესტებში).

## ფოლდერების რუკა

```
CLAUDE.md                 ეს ფაილი
docs/
  project-context.md      Context-ის ასლი (ჭეშმარიტების წყარო)
  progress.md             ნაბიჯების შეჯამება
  deploy.md               B7: runbook — ანგარიშები, env, Atlas / R2 / Resend / Render, პირველი გაშვება,
                          განახლება, rollback, backup / აღდგენა, როტაცია, მონიტორინგი, header-ები
index.html                lang="ka", color-scheme meta, inline mc-boot, favicon.svg
render.yaml               B7: Render Blueprint (Frankfurt, Starter, pre-deploy migrate, /api/health)
.node-version             B7: Node 22 (Render)
public/favicon.svg        ლოგოს 16px ვერსია (LogoSynergy)
scripts/
  check-dist.mjs          postbuild: mc-boot პირველია, /__kit და validate.js არ არის, შრიფტი არ არის base64;
                          B7: mock არცერთ chunk-ში (`.vite/modules.json` + სტრიქონები), bundle API-ზეა
  contrast-report.mjs     ტოკენების კონტრასტის ცხრილი
  i18n-stub.mjs           en.js-ის სინქრონი ka.js-თან — საიტი და ადმინი (`npm run i18n:stub`; თარგმანს ინარჩუნებს)
  placeholders.mjs        F7: [placeholder]-ები ტიპების მიხედვით (`npm run placeholders`, `--json`)
  audit.py                F7: Chromium-ის აუდიტი (`npm run build && npm run audit`; Python Playwright,
                          axe-core node_modules-იდან, ffmpeg — fixture-ები `.audit-fixtures/`-ში)
                          B6: `AUDIT_API=1 npm run audit -- --only axe,en,forms` — საჯარო გვერდები რეალურ
                          API-ზე (server + build `VITE_CONTENT_API`-ით `dist-api/`-ში, preview proxy-ით),
                          `forms` — ფორმები კლავიატურით, double opt-in წერილის ფაილით (MAIL_DIR)
  audit_media_api.py      B5: `npm run audit:media-api` — მედიის ეკრანები რეალურ API-ზე (server:dev +
                          vite dev, proxy), ატვირთვის ნაკადი, axe × 3 თემა × 1440 / 390
                          B7: `npm run audit` — წარმოების build-ზე და რეალურ API-ზე (`local-prod.mjs --seed`
                          -ის შვილობილი პროცესი; ანგარიშები env-იდან; დემო-მონახაზები ადმინის API-ით;
                          axe-ი `evaluate`-ით — CSP inline-ს არ უშვებს; `csp` — დარღვევები ყოველ გვერდზე);
                          `/__kit` და native ფლეიერი — Vite dev (mock), წარმოებაში არ არის
  dist-rules.mjs          B7: `mockLeaks` — mock-ის მოდული / სტრიქონი bundle-ში (check-dist + ტესტი)
  local-prod.mjs          B7: `npm run prod:local` — dist + node server (production) + MongoDB (memory) +
                          ყალბი S3 + server:migrate / create-admin / მოწვევით რედაქტორი; `-- <ბრძანება>`
                          env-ით (BASE_URL, MC_ADMIN_*, MC_EDITOR_*, SMOKE_*); `--seed`, `--mail-dir`
  smoke.mjs               B7: `npm run smoke` (BASE_URL + SMOKE_EMAIL / SMOKE_PASSWORD) / `smoke:local` —
                          Playwright: header-ები → შესვლა → სტატია → alt-ის გარეშე 422 → გამოქვეყნება →
                          ka + en → წაშლა → 404; CSP-ის დარღვევა 0
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
    subscribe/            F6: SubscribeForm (dark | card) + subscribe.css — სტატიები და სიახლეები;
                          B6: SubscriptionAction (`/subscribe/confirm` | `/subscribe/unsubscribe`, token —
                          `#token=`, მოქმედება ღილაკით) + subscription.css
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
  pages/                  თითო გვერდი = ერთი lazy chunk; KitPage — /__kit (მხოლოდ DEV);
                          B6: SubscribeConfirmPage, UnsubscribePage
  admin/                  F8: ადმინ პანელი — საჯარო bundle-ში არ ხვდება (routes.jsx იტვირთება
                          src/routes.jsx-ის patchRoutesOnNavigation-ით)
    routes.jsx            createAdminRoutes(); handle.admin = { title, crumbs, root, editor }
    AdminRoot.jsx         PreferencesProvider + AuthProvider + noindex meta; admin.css
    api/                  adminAdapter.js (ერთადერთი შესასვლელი), mock.js (საერთო საცავზე; სატესტო
                          ანგარიშები), http.js (VITE_ADMIN_API, cookie + CSRF), permissions.js (როლები);
                          B4: records.js — პასუხის ფორმა და წესი ორივე მხარეს (სტრიქონი, ჩანაწერი,
                          სია / ძიება, ვერსიები, შენახვა / გამოქვეყნება, stats, a11y, რჩეული);
                          B5: library.js — ბიბლიოთეკა ორივე მხარეს (ფაილი + გამოყენება, ჩადგმული
                          `img:` / `doc:`, alt ყველა გამოყენებაში, fileError → 400, inUseError → 409)
    auth/                 AuthProvider (სესია, alertdialog, ავტოშენახვის flush), auth-context.js
                          (useAuth, useSessionFlush), auth-forms.js, RequireAuth, RequireRole
    shell/                AdminShell (sidebar + header + compact-მენიუ), AdminNav, admin-nav.js,
                          admin-page.js (useAdminPage), useAdminLayout.js (75rem), initials.js
    components/           Dialog (ნატიური <dialog>), ConfirmDialog, StatusBadge (+ IssueBadge), PasswordField;
                          B5: upload-messages.js (ატვირთვის შეცდომის ტექსტი — ბრაუზერი / სერვერი)
    pages/                Login, Dashboard, List, A11yReport, Search, Media, Documents, Users, Settings,
                          Forbidden, AdminNotFound, AdminRouteError, AdminRootError
    editor/               EditorPage (lazy) → EntityEditor; RichTextEditor (TipTap, lazy chunk) +
                          extensions.js; serialize.js (JSON ↔ ბლოკები), checklist.js (RULES + re-export
                          src/content/checks.js-იდან, B4),
                          fields/FieldRenderer.jsx (ყველა ველის სახე), path.js, datetime.js (Tbilisi),
                          vtt.js, autosave.js, PreviewPage; editor.css
    schemas/              ველების კონფიგი თითო ტიპზე (articles, news, events, series, videos, pages)
    i18n/                 ადმინის ლექსიკონი (ka.js + en.js) + ta() (მიმდინარე ენით)
    content-types.js      ტიპები, სვეტი „კატეგორია“, საჯარო გზა, creatable / deletable
    __tests__/            admin-helpers.jsx (setupAdmin, signInDirect, renderAdmin, fillLogin), ტესტები;
                          B4: scenarios/admin-scenarios.js — სცენარები mock-ისა და HTTP-ის adapter-ზე
  content/
    adapter.js            ერთადერთი შესასვლელი: list*/get*/subscribe/confirmSubscription/unsubscribe/
                          sendContact; `VITE_CONTENT_API` → http.js (B6), სხვაგვარად mock — lazy chunk
    http.js               B6: ContentAdapter-ის HTTP ვერსია (`/api/v1`, `lang`, ContentError, ქეში — ბრაუზერის)
    public.js             B6: საჯარო ხედი — publicItem / publicSnapshot (localize + readingMinutes ენის
                          ვერსიით), orgFromPage (გვერდის translations.en.team[i] → წევრი) — mock და სერვერი
    model.js              JSDoc typedef-ები + EXCERPT_MAX, MEDIA_RATIO, READING_WPM
    checks.js             B4: validateEntity / validatePage / validateTranslation / EN_CODES,
                          publishBlockers, blockerFields — რედაქტორი, ადმინის mock და სერვერი
    taxonomy.js           კატეგორიები, თემები, ტიპები (id ლათინურად), label(), options()
    query.js              სუფთა ფუნქციები: isPublic, ფილტრი, ძიება, cursor
    errors.js             ContentError { code, message, fields }, normalizeError
    files.js              B5: ტიპი შიგთავსით (sniffType), checkFile / checkBlob, ზღვრები, acceptFor —
                          სერვერი, ადმინის mock და UI (UX) ერთი წესით
    forms.js              validateContact / validateSubscribe (adapter + F6 ფორმა); B6: გამოწერის token-ის
                          ფორმა (SUBSCRIBE_TOKEN / UNSUBSCRIBE_TOKEN), SUBSCRIBE_CONFIRM_DAYS,
                          subscriptionLink, tokenFromHash
    validate.js           validateContent — dev console + F8-ის ჩეკლისტი (dev-only)
    slug.js               ქართული → ლათინური (§10)
    text.js               ბლოკების ტექსტი, კითხვის დრო, ძიების ნორმალიზაცია
    mock/                 createMockAdapter, createMockData; ყველა ფაქტი [ფრჩხილებში];
                          F8: store.js — საერთო in-memory საცავი (საჯარო + ადმინის adapter);
                          B6: forms.js — double opt-in (pending / confirmed, outbox), კონტაქტი
    __tests__/scenarios/  B6: content-scenarios.js — CONTENT_SCENARIOS + FORM_SCENARIOS (mock ↔ HTTP, ka + en)
  hooks/
    useContent.js         ერთი მოთხოვნა → { data, status, error, reload }
    useLoadMore.js        cursor-ით „მეტის ჩატვირთვა“, firstNewIndex ფოკუსისთვის
    useUrlFilters.js      category / q (300ms) / year / series / sort URL-ში
    useSaved.js           localStorage['mc-saved'], ტაბებს შორის სინქრონი
    useLoadMoreFocus.js   F6: „მეტის“ შემდეგ ფოკუსი პირველ ახალ ელემენტზე + „დაემატა {n}, სულ {n}“
    useHeadingRefocus.js  F6: ასინქრონული გვერდის h1 — ჩატვირთვის შემდეგ ფოკუსი (ან #hash-ის სამიზნე)
  i18n/
    ka.js                 ინტერფეისის ყველა სტრიქონი
    en.js                 ინგლისური (F9) — იგივე გასაღებები, მრავლობითი `{ one, other }`; ცალკე chunk,
                          main.jsx ტვირთავს მხოლოდ `/en`-ზე (`registerDictionary`)
    locale.js             ენა: getLocale / setLocale, localizePath, alternatePath, `/en` პრეფიქსი;
                          B6: withLocale(locale, fn) — სინქრონული (სერვერი: ენა მოთხოვნიდან)
    index.js              t(), createT(), formatDurationLabel + format.js-ის რეექსპორტი
    format.js             ka-GE, Asia/Tbilisi: formatDate, formatTimeRange, formatDuration… (F6: თვეები
                          და დღეები ფაილშია — ICU-ის ქართულ ლოკალზე აღარ არის დამოკიდებული)
  assets/logo/            ლოგო LogoSynergy-დან: mark-{3d,flat,tiny}[-inverse], mark-mono, wordmark-{horizontal,vertical}
  assets/icons/icons.svg  ხატულების ერთადერთი წყარო (<symbol>, class main | accent | dot | fill)
  test/
    setup.js              jest-dom, axe matcher, matchMedia / scrollTo stub, localStorage + <html> გასუფთავება
    media.js              installMatchMedia({ width, dark }) — მართვადი matchMedia + innerWidth
    contrast.js           WCAG კონტრასტი, tokens.css-ის პარსერი, სავალდებულო წყვილები
server/                   B1: API — ცალკე package (npm workspace), Node 22 ESM, Fastify 5, MongoDB
  package.json            server-ის dependencies (ვერსიები ზუსტად, ≥ 14 დღის)
  openapi.yaml            OpenAPI 3.1 — API-ის ერთადერთი წყარო (spec-first): /api/health, /api/v1/*, /api/admin/*
  .env.example            env ცვლადები placeholder-ებით (`.env` git-სა და zip-ში არ ხვდება)
  alias.js                `@/` → src/ (module.registerHooks) — frontend-ის საერთო მოდულები ასლის გარეშე
  index.js                entry: alias → main (`node server/index.js`)
  main.js                 config → ბაზა (ან dev-ში in-memory + migrate + seed) → buildApp → listen; SIGTERM / SIGINT
  config.js               env → Config (ajv-ის სქემა, ENV_SCHEMA); შეცდომა მნიშვნელობას არ იმეორებს
  app.js                  buildApp({ config, db, spec, logStream, extend }) — ვალიდაცია, header-ები, ლოგი, route-ები
  lib/
    openapi.js            loadSpec, createAjv (Ajv2020), routeSchema, route(app, spec, operationId, handler)
    errors.js             შეცდომის ერთი handler: ContentError / ajv → { code, message, fields? } + HTTP;
                          B6: `/api/v1/*`-ზე ტექსტი `?lang=`-ის ენაზე
    i18n.js               B6: ინგლისური ლექსიკონი სერვერზე, requestLocale, inLocale (= withLocale)
    subscriptions.js      B6: გაუქმების ბმული — HMAC-SHA256(SUBSCRIBE_SECRET), ბაზაში არ ინახება
    logger.js             pino-ს ოფციები PII-ის გარეშე, ერთი ხაზი პასუხზე
    security.js           helmet (CSP, Referrer-Policy, HSTS 1 წელი…), CORS-ის გარეშე, text/plain-ის გარეშე,
                          /api/* — no-store (B6: საჯარო GET-ის 200 / 304 — საკუთარი Cache-Control);
                          B3: Fetch Metadata (cross-site / same-site ცვლილება → 403)
    auth.js               B3: `__Host-` cookie-ები, guard-ები spec-იდან (security, x-permission, x-rate-limit)
    password.js           B3: argon2id (OWASP), dummy hash, ცნობილი პაროლები, registerFieldErrors
    tokens.js             B3: CSPRNG token (256 ბიტი), sha256, safeEqual, მოწვევის კოდი (MC- + base32)
    rate-limit.js         B3: fixed window მეხსიერებაში (IP / ანგარიში), 429 + Retry-After
    first-admin.js        B3: createFirstAdmin (CLI და dev-ის in-memory ბაზა)
    db.js                 connectDb / pingDb / replicaSetName (`mongodb` driver)
    media-files.js        B5: processImage (sharp: EXIF / GPS / XMP / ICC იშლება, ორიენტაცია, 1 კადრი,
                          რიგით), checkPdf, checkVtt, detectRatio
    dev-db.js             startMemoryReplicaSet (MongoDB 8.0.34) — dev და ტესტი
  routes/health.js        GET /api/health — 200 / 503
  routes/site.js          B7: frontend-ი იმავე სერვისზე — `/assets/*` (immutable, 404), root-ის ფაილები,
                          robots.txt, sitemap.xml, SPA fallback სერვერის meta-თი, რეალური 404, CSP, 301
  site/                   B7: files.js (dist მეხსიერებაში, br / gzip, mc-boot-ის hash), headers.js (siteCsp,
                          PERMISSIONS_POLICY), meta.js (resolveMeta, renderIndex), sitemap.js (sitemapXml,
                          robotsTxt)
  routes/public.js        B6: საჯარო GET /api/v1/* (13) — ბაზა → public.js → query.js; ETag +
                          `public, max-age=0, must-revalidate`, If-None-Match → 304
  routes/forms.js         B6: subscribe / subscribe/confirm / subscribe/unsubscribe / contact — forms.js-ის
                          ვალიდაცია, honeypot, rate limit (+ კონტაქტის მისამართი), ფოსტა
  mail/                   B6: index.js (createMailer: memory | file | log | B7: resend — ლოგში მხოლოდ მოვლენა),
                          templates.js (დადასტურება / მისასალმებელი ka · en, კონტაქტი — ქართულად)
  routes/auth.js          B3: login, register, logout, me, extendSession
  routes/users.js         B3: listUsers, createInvite, setUserRole, deactivateUser (users.manage)
  routes/content.js       B4: content / items — სია, შექმნა, slug / YouTube, მიღება, შენახვა, წაშლა,
                          გამოქვეყნება, დაგეგმვა, ვერსიები, აღდგენა, ძიება
  routes/settings.js      B4: პარამეტრები (settings.manage, რჩეული), stats, a11y
  routes/media.js         B5: ბიბლიოთეკა, ატვირთვა (multipart მხოლოდ ამ route-ზე), alt / დოკუმენტი,
                          წაშლა (409; საცავი + ისტორია), გამოყენება; `GET|HEAD /media/*` — მიწოდება
  routes/media-check.js   B5: reconcileFiles — გამოქვეყნებისას `fileMissing`, VTT-ის cues / end სერვერიდან
  storage/                B5: index.js (Storage typedef, createStorage), keys.js (გასაღები, src ↔ key),
                          s3.js (R2, S3 API), sigv4.js (AWS SigV4), local.js (დისკი, dev), memory.js (ტესტი)
  data/common-passwords.txt  B3: top-3000 ცნობილი პაროლი (≥ 12, SecLists) — ASVS 6.2.4
  db/                     B2: ბაზის ფენა
    schema.js             OpenAPI `*Draft` → `$jsonSchema` (toBsonSchema, partialTextSchema — translations.en)
    collections.js        9 კოლექცია: validator + ინდექსები (TTL), DEFAULT_RETENTION, DRAFT_SCHEMA
    derive.js             item → slug / status / publishedAt (Date) / searchText / mediaKeys; searchFilter
    errors.js             11000 / 121 → ContentError (slugDuplicate, conflict, validation + ველის გზა)
    content.js            content + versions repository (mock store-ის / ადმინის mock-ის სემანტიკა)
    settings.js           settings repository (`_id: 'site'`)
    users.js              B3: users repository (toAdminUser — hash API-ში არ გადის)
    sessions.js           B3: sessions (token / CSRF — მხოლოდ sha256; create, findActive, extend, remove)
    invites.js            B3: invites (კოდი — sha256; create, claim — ერთჯერადი, ტრანზაქციაში)
    media.js              B5: ფაილების რეესტრი (insert, list, update, remove — ტრანზაქციაში: 409 +
                          ისტორიის `src` → null), toFileRecord
    forms.js              B6: messages (insert, markSent, remove) + subscribers (subscribe — upsert,
                          confirm — findOneAndUpdate ვადით, removeSubscriber)
    index.js              createRepositories → { content, settings, users, sessions, invites, media, forms,
                          snapshot }
    seed.js               seedSource / seedDatabase (createMockData + adminState-ის გვერდები); B7: ხელუხლებელ
                          საბაზისო ჩანაწერებს ცვლის
    base.js               B7: ensureBaseRecords (7 გვერდი + პარამეტრები, რაც აკლია), prepareDatabase
                          (migrate + base — `server:migrate`, `MIGRATE_ON_START`)
    backup.js             B7: exportDatabase / importDatabase (EJSON NDJSON gzip, sessions-ის გარეშე)
  migrations/             B2: ensure.js (იდემპოტენტური DDL), 001-init.js, index.js (migrate, countChanges);
                          B5: 002-version-media-keys.js (`versions.mediaKeys` ძველ ჩანაწერებზე);
                          B6: 003-public-search.js (`searchText` — სტატიის ტექსტი ორივე ენაზე)
  scripts/shared-smoke.js საერთო მოდულები სუფთა Node-ში (Vite-ის გარეშე)
  scripts/migrate.js      B2: `npm run server:migrate`
  scripts/seed.js         B2: `npm run server:seed [-- --reset]`
  scripts/create-admin.js B3: `npm run server:create-admin` (env ან ტერმინალი, ფარული პაროლი)
  scripts/backup.js       B7: `npm run server:backup [-- --out ფაილი]`
  scripts/restore.js      B7: `npm run server:restore -- --in ფაილი --confirm <MONGODB_DB> [--drop]`
  scripts/db-cli.js       CLI-ების საერთო: config, კავშირი, შეცდომის ტექსტი საიდუმლოს გარეშე
  vitest.config.js        Node-ის გარემო, `@` alias, global setup (memory server); B4: react() + svgr(),
                          `*.test.jsx` (jsdom — ფაილის `@vitest-environment`)
  test/                   config, app, db, openapi, shared-modules, boot (`node server/index.js`);
    contract/             spec-match.js, requests (B6: რეალური `src/content/http.js`) / responses / constants
    db/                   B2: schema, collections (მიგრაცია, validator-ები, TTL), content, seed (+ CLI),
                          differential (ajv ↔ MongoDB), parity (↔ mock), translations (↔ რედაქტორი)
    auth/                 B3: units, session (შესვლა, CSRF, Fetch Metadata, header-ები), users (როლები,
                          მოწვევა, რეგისტრაცია), limits (429, ლოგი), http-adapter (createHttpAdminAdapter
                          რეალურ სერვერზე), create-admin (CLI)
    browser.js            B4: cookie jar + spec-ის შემოწმება (createBrowser), installDocument (Node / jsdom)
    content/              B4: http-env.js (mock-ის მონაცემი ბაზაში, HTTP adapter, საჯარო ხედი — B6-დან
                          რეალური `/api/v1`),
                          parity (საერთო სცენარები mock ↔ HTTP), content (ნაწილი ა-ს წესები),
                          publish (ბლოკერი 422, უფლებები, პარამეტრები)
    ui/                   B4: editor-http.test.jsx — რედაქტორი (jsdom) რეალურ სერვერზე;
                          B5: media-http.test.jsx — მედიის ეკრანი და რედაქტორის ატვირთვა;
                          B6: forms-http.test.jsx — კონტაქტი (კლავიატურით, 429), გამოწერის მთელი გზა
    site/                 B7: site.test.js — ფაილები, meta, CSP, sitemap / robots, 404, staging noindex
    deploy/               B7: base, backup, mail-resend, check-dist (vite.config.js + dist-rules)
    fixtures/site/        B7: build-ის fixture (`SITE_DIR` — FAKE_PRODUCTION_ENV)
    public/               B6: public-env.js (seed-იანი ბაზა, http.js, spec + ქეშის შემოწმება), parity
                          (CONTENT_ + FORM_SCENARIOS mock ↔ HTTP, ka + en), cache (ETag / 304), forms
    media/                B5: fixtures.js (GPS-იანი JPEG / PNG / WebP, PDF, VTT, multipart), upload,
                          library (გამოყენება, alt, 409, წაშლა, მიწოდება, მიგრაცია 002), storage
                          (SigV4-ის AWS მაგალითები, S3-ის სატესტო სერვერი), publish (alt / VTT → 422)
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

- კონტენტი მხოლოდ `@/content/adapter.js`-დან: `listArticles`, `getArticle`, `listSeries`, `getSeries`, `listVideos`, `getVideo`, `listNews`, `listEvents`, `getTeam`, `getPartners`, `getStages`, `getSettings`, `subscribe`, `confirmSubscription`, `unsubscribe`, `sendContact`. mock-ს ან query.js-ს გვერდი პირდაპირ არ იძახებს.
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
- ფლეიერი მედიას პირდაპირ არ ეხება: `VideoSourceAdapter { id, canPlay(video), Media, facade?,
  captionPlacement?, poster?, features?, pendingText? }` → `Media` `onController`-ით `PlaybackController`-ს
  აბრუნებს (play / pause / seek / setVolume / setMuted / setRate / setCaptions / setSignLanguage /
  setAudioDescription / subscribe / onCaption). კონტენტის ვიდეო — `youtubeSource` (F10), native — `/__kit`
  და ტესტები. ტესტში — `createFakeSource()` (native) და `installFakeYouTube()` (ყალბი IFrame API).
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

## კოდის კონვენციები (F9 — ორენოვნება)

- ტექსტი მხოლოდ `t()` / `ta()`-ით; ახალი გასაღები — ka.js-შიც და en.js-შიც (`npm run i18n:stub` ცარიელს
  `[EN: …]`-ით ავსებს — ტესტი მას არ ატარებს). რიცხვიანი ინგლისური — `{ one: '…', other: '…' }`.
- შიდა ბმული — `Link` / `UiLink` / `Button to` აბსოლუტური გზით (`/articles`): `/en` basename-ს თავად
  ამატებს. ჩვეულებრივი `<a href>` / `Button href` შიდა გზაზე — `localizePath(path)`. ენის გადამრთველი —
  `<LanguageSwitch>` (layout), სხვა ბმული მეორე ენაზე — `alternatePath(location, locale)`.
- თარიღი / რიცხვი — მხოლოდ `formatDate` / `formatNumber` (მიმდინარე ენით); `ka-GE` ხელით არ იწერება.
- კონტენტის ტექსტი, რომელიც გვერდის ენაზე არ არის: `lang={contentLang(item)}` (`@/content/localize.js`) —
  სათაურზე, ტექსტსა და მედიაზე, ბარათზე — `<Card contentLang>` (ნიშანი „In Georgian“ თავისით ჩნდება).
  UI-ის ტექსტი (ღილაკები, მეტა) `lang`-ს არ იღებს.
- ახალი თარგმნადი ველი რედაქტორში — სქემის ტექსტური ველი თავისით ითარგმნება (`isTranslatable`);
  არა-თარგმნადი ტექსტი (ნომერი, სახელი-ანგარიში) — `translate: false`.

## კოდის კონვენციები (F10 — YouTube ვიდეო)

- ვიდეოს წყარო მხოლოდ YouTube-ია: მოდელში `youtube: { id, adId? }` — ინახება id, არა URL. ბმული → id
  მხოლოდ `parseYouTube()`-ით (`@/content/youtube.js`); id-ის შემოწმება — `isYouTubeId()`, ჩანაცვლება
  (`[YouTube-ის id]`) — `isPlaceholder()`. კადრი — `youtubePoster(id)` (`<img>`, maxres → hq,
  `Media fallbackSrc`), `poster` ველი არ არსებობს.
- სათაური და აღწერა YouTube-იდან არ მოდის: oEmbed / Data API-ს და YouTube-თან სხვა მოთხოვნას ადმინი არ
  აგზავნის (ტესტი fetch-ის spy-ით). დუბლიკატი — `content.checkYouTube(id, itemId)` ჩვენს საცავში.
- facade: iframe და `iframe_api` მხოლოდ „ვიდეოს ჩართვა“-ს შემდეგ (`loadYouTubeApi()`), iframe —
  `youtube-nocookie.com`, `title` = „ვიდეო: {სათაური}“, `tabindex="-1"`, `referrerpolicy`
  `strict-origin-when-cross-origin`; `controls=0` — მართვა ჩვენია. iframe-ზე არაფერი დევს (RMF):
  სუბტიტრი — `.mc-player__band` კადრის ქვეშ; YouTube-ის კადრი ≥ 200px სიმაღლის.
- სუბტიტრი — ჩვენი VTT, ერთი პარსერი `@/content/vtt.js` (`parseCaptions` — მკაცრი, შეცდომა სტრიქონის
  ნომრით; `cueAt`; `parseVtt` — ტრანსკრიპტის იმპორტი). ატვირთვისას ბილიკს ემატება `cues` / `end`;
  დაზიანებული ფაილი არ ინახება. ქართული — `default: true`; ინგლისური — English ჩანართში, `captions`-ში.
- აუდიოაღწერა — ცალკე YouTube-ვერსია (`adId` ≠ `id`, მთავარის სიგრძის) ან `visualInAudio`; გადართვა
  იმავე წამზე (`loadVideoById` / `cueVideoById`). YouTube-ის ხმის ჩაჩუმება და საკუთარი აუდიო — არა (ToS).
- ჟესტური ენის ვერსია არ კეთდება (B0): YouTube-ის ფლეიერში ჩიპი არ არის, ჩეკლისტში წესი არ არის.
- Chromium: `npm run audit -- --only youtube` — YouTube-ის ქსელი `page.route`-ით ყალბდება; axe
  `iframes: false` (iframe-ის შიგთავსი გარეა, `frame-tested` incomplete მოსალოდნელია).

## კოდის კონვენციები (B1 — server)

- **spec-first:** ახალი endpoint ჯერ `server/openapi.yaml`-ში იწერება (`operationId`, `x-adapter`, `x-permission`, `x-step`, სქემა `components.schemas`-იდან), შემდეგ — `route(app, spec, operationId, handler)`. გზა, მეთოდი და შემავალი სქემა სერვერზე ხელით არ იწერება. `test/openapi.test.js` ამოწმებს, რომ რეგისტრირებული route-ები = spec-ის ოპერაციები მიმდინარე ნაბიჯამდე.
- **სქემის ფენები:** `*Props` (სტრუქტურა: ტიპი, enum, ზედა ზღვარი) → საჯარო (`Article`…, allOf + სავალდებულო ველები, slug, თარიღი, `lang`, `unevaluatedProperties: false`) და `*Draft` (ადმინი, ცარიელი ველი დასაშვებია, + `translations`). სიის ელემენტი (`*Summary`) აკრძალულ ველს `false`-ით გამორიცხავს (`body: false`). ყოველ allOf-ის ფენას `type: object` აქვს (ajv strict).
- **ajv:** `createAjv(spec)` — `Ajv2020`, `strict`, `allErrors`, `removeAdditional: false`; query / path — `coerceTypes: true`. YAML-ში აღწერა, რომელიც `: `, ` #` ან მძიმეს შეიცავს flow-mapping-ში, ბრჭყალებშია (strict-მა ორი ასეთი ხარვეზი დაიჭირა).
- **შეცდომა:** მხოლოდ `ContentError` (`@/content/errors.js`) — `throw new ContentError('conflict')`; handler მას `STATUS_BY_CODE`-ით თარგმნის. საკუთარი `{ error: … }` ფორმა არ არსებობს.
- **საერთო მოდულები:** სერვერი `@/content/*`-ს პირდაპირ იმპორტებს (Vitest — `resolve.alias`, Node — `alias.js`). საერთო მოდულში Vite-ის API (`import.meta.env.X`) მხოლოდ `?.`-ით (`import.meta.env?.DEV`), ბრაუზერის API — `typeof` შემოწმებით. ახალი საერთო მოდული `scripts/shared-smoke.js`-ში ემატება.
- **ლოგი:** `request.log.*` — მხოლოდ კოდი, route-ის შაბლონი, რაოდენობა; ელფოსტა, სახელი, IP, ტექსტი, token, query-ს მნიშვნელობა — არასოდეს. `REDACT_KEYS` — დამცავი ბადე.
- **contract-ტესტი:** frontend-ის adapter-ის ახალი / შეცვლილი ფუნქცია `test/contract/requests.test.js`-ში (მოთხოვნა ↔ spec) და `responses.test.js`-ში (mock-ის პასუხი ↔ სქემა) ემატება — დაფარვა ორივე მიმართულებით მოწმდება. B6-ში `public-plan.js` რეალური HTTP adapter-ით იცვლება.
- **ტესტის ბაზა:** `inject('mongoUri')` (global setup — ერთი replica set); თითო ფაილს — საკუთარი ბაზის სახელი (`mc_test_*`).

## კოდის კონვენციები (B2 — ბაზა)

- **ბაზის ფენა — მხოლოდ repository:** route (B3–B6) კოლექციას პირდაპირ არ წერს; `createRepositories(database)` → `content`, `settings`, `snapshot`. ახალი კოლექციის ჩამწერი — `server/db/<name>.js` (users / sessions — B3, media — B5, messages / subscribers — B6).
- **validator-ის წყარო — `openapi.yaml`:** კონტენტის / პარამეტრების / შეტყობინების სქემა `*Draft`-იდან (`ContactPayload`-იდან) `toBsonSchema`-ით იქმნება. მოდელის ველი იცვლება spec-ში → `npm run server:migrate`. ბაზის მეტა (ვერსია, დრო, ინდექსის ველები) — `collections.js`-ში. `differential.test.js` ამოწმებს, რომ ajv და MongoDB ერთნაირად აფასებს.
- **`content`-ის დოკუმენტი:** `item` — მოდელი უცვლელად; ზედა დონე — `_id` (`a-001` / `a-<ObjectId>`), `type`, `slug` (მხოლოდ შევსებული), `status`, `publishedAt` (Date), `version`, `createdAt`, `updatedAt`, `updatedBy`, `working`, `searchText`, `mediaKeys`. ზედა დონის ველს მხოლოდ `derive.js` ითვლის — ხელით არ იწერება.
- **მიგრაცია:** `server/migrations/NNN-name.js` (`id`, `up(db, { spec, retention })`), `MIGRATIONS`-ში ემატება; ყოველი მიგრაცია იდემპოტენტურია (მეორე გაშვება — 0 ცვლილება, ტესტით). ინდექსი სახელით იმართება; ხელით დამატებულს მიგრაცია არ შლის.
- **409 და ტრანზაქცია:** ჩაწერა ვერსიით — `updateOne({ _id, version }, …)` → `matchedCount: 0` → `conflict`; ისტორიის / რჩეულის ცვლილება — `inTransaction(client, …)`. ერთი რჩეული ტიპზე ბაზის უნიკალური ინდექსითაა დაცული (`type_featured_unique`) — `featured` მხოლოდ `setFeatured`-ით იცვლება.
- **დრო:** ბაზაში Date; repository ISO UTC-ს (`Z`) აბრუნებს; მოდელის თარიღი (`item.publishedAt`) — სტრიქონი ოფსეტით, უცვლელად.
- **ფოტო:** ჩადგმული ობიექტი (`{ src, alt, ratio }`, project-context §12); ფაილის გამოყენება — `mediaKeys` (`src` → `/media/<key>`).
- **seed:** მხოლოდ dev / staging; მომხმარებელს არ ქმნის; `validateContent` → 0 (ტესტი და CLI). mock-ის მონაცემის ცვლილება → seed-ის ტესტი ამოწმებს.
- **ტესტის ბაზა:** `test/db/helpers.js` — `freshDatabase(label)` (მიგრაციით), `clock()`; failpoint (`failCommand`) — მხოლოდ ტესტის replica set-ზე (`enableTestCommands`).

## კოდის კონვენციები (B3 — ავტორიზაცია)

- **guard-ი spec-იდან:** route-ში სესიის / როლის შემოწმება ხელით არ იწერება. ოპერაციის `security` (`session`, `csrf`), `x-permission` და `x-rate-limit` (`auth` | `forms`) `server/lib/auth.js`-ის `onRoute` hook-ით ედება; handler-ში — `request.auth` (`{ session, user }`). ახალი ადმინის endpoint — spec-ში `security` + `x-permission`, მეტი არაფერი.
- **cookie-ები:** მხოლოდ `setSessionCookies` / `clearSessionCookies` (`__Host-`: Secure, `Path=/`, Domain-ის გარეშე); `CSRF_COOKIE` / `CSRF_HEADER` — `src/admin/api/http.js`-იდან (ერთი სახელი ორივე მხარეს), `SESSION_COOKIE` — მხოლოდ სერვერზე (httpOnly).
- **საიდუმლო ბაზაში:** token, CSRF token, მოწვევის კოდი — მხოლოდ `hashToken` (sha256); პაროლი — მხოლოდ `hashPassword` (argon2id, `ARGON2_OPTIONS`). შედარება — `safeEqual`. ახალი შემთხვევითი მნიშვნელობა — `newToken()` (CSPRNG, 256 ბიტი).
- **ზოგადი პასუხი:** ანგარიშის არსებობა არასოდეს მჟღავნდება — შესვლა: 401 + `dummyHash` უცნობ ელფოსტაზე; რეგისტრაცია: 422 `fields.invite` ნებისმიერ უარზე, hash ყოველთვის ითვლება; rate limit-ის ანგარიშის გასაღები — ელფოსტის sha256, არსებობის მიუხედავად.
- **ვალიდაცია:** `validateLogin` / `validateRegister` (`auth-forms.js`) + `registerFieldErrors` (ცნობილი პაროლი, მხოლოდ სერვერზე); ელფოსტა — `normalizeEmail` (`forms.js`); პაროლი არასოდეს trim-დება.
- **დრო:** `buildApp({ now })` → repository, rate limit, cookie-ს `Max-Age`; ტესტში საათი რეალური დროიდან იწყება (`test/auth/helpers.js`) — წარსულის `expiresAt`-ს ბაზის TTL monitor ტესტის შუაში წაშლიდა.
- **ლოგი:** `request.log.info({ event: 'auth.login' }, 'auth')` — მხოლოდ მოვლენის სახელი; user id, ელფოსტა, IP, token, კოდი — არასოდეს (`test/auth/limits.test.js` ამოწმებს).
- **ტესტი:** `test/auth/helpers.js` — `authApp(label, { env, extend, logStream })`, `agent(app, { ip })` (cookie jar + `X-CSRF-Token`, როგორც `http.js`), `addUser`; frontend-ის adapter-ი რეალურ სერვერზე — `http-adapter.test.js`.

## კოდის კონვენციები (B4 — კონტენტის API)

- **ერთი წესი ორ მხარეს:** ადმინის პასუხის ფორმა და წესი (`toRow`, `toRecord`, `listRows`, `searchRows`, `versionList`, `mergeUpdate`, `keepFeatured`, `newDraft`, `publishItem`, `assertFuture`, `buildStats`, `buildA11yReport`, `featuredIds`, `featuredChanges`) — `src/admin/api/records.js`; გამოქვეყნების ბლოკერი — `src/content/checks.js` (`publishBlockers`, `blockerFields`). mock და `server/routes/*.js` მათ იძახებენ — ასლი არ იწერება. სერვერის საკუთარი წესი მხოლოდ ის არის, რისი შემოწმებაც mock-ს არ შეუძლია: ტიპის `*Draft` სქემა, `translations.en` (ბაზის `$jsonSchema`), `[ჩანაცვლება]` YouTube-ის id-ში (`placeholders: false`).
- **mock = ეტალონი, სერვერის წესით:** სერვერის წესი, რომელიც ქცევას ცვლის (სტატუსი მხოლოდ `/publish`-ით, `featured` მხოლოდ პარამეტრებიდან, უცნობი რჩეული → 404), mock-შიც იმავე ფუნქციით ედება — parity არ ირღვევა.
- **`ItemDraft`-იანი route:** `attachValidation: true` + `draftValidationError(request, '' | '/data')` — სქემის შეცდომა მონახაზის გარეთ → მაშინვე; მონახაზში — ჯერ შენახული ტიპის `*Draft` (`createDraftValidator`, ზუსტი ველი და კოდი), მერე თავდაპირველი შეცდომა. handler ყოველთვის ჯერ ამოწმებს `request.validationError`-ს.
- **ადმინის სია / ძიება მეხსიერებაში:** `check` ფილტრს ვალიდაცია სჭირდება, `q` — სათაური + slug (mock-ის იგივე); `searchText` / ინდექსი — B6-ის საჯარო ძიებისთვის.
- **რიგი mock-ისაა:** გამოქვეყნება — (დაგეგმვის თარიღი) → item → სქემა → ბლოკერი → `replace` (ვერსია → 409); შენახვა — 404 → 409 → სტატუსი → სქემა → ჩაწერა.
- **parity-ტესტი:** ახალი ადმინის ქცევა — სცენარი `src/admin/__tests__/scenarios/admin-scenarios.js`-ში (`step`, `env.note()` — მხოლოდ ის, რაც ორივე მხარეს ერთნაირია: კოდი, ველის გზა, seed-ის id, სათაური, ვერსია, ავტორი; არა — ახალი id და დროის სტრიქონი). frontend-ი მას mock-ზე უშვებს (`api.test.js`), სერვერი — ორივეზე (`test/content/parity.test.js`) და კვალს ადარებს; HTTP-ის ყოველი პასუხი spec-ით მოწმდება (`problems`).
- **HTTP-ის გარემო:** `test/content/http-env.js` — `httpEnv(label, { start })`: mock-ის საცავი `adminState`-ით → ბაზა იმავე id-ებით / მეტათი, მომხმარებლები `u-001` / `u-002`, საათი `start`-იდან (`advance`), საჯარო ხედი — B6-დან რეალური `/api/v1` (`createHttpContentAdapter`, `browser.fetch`). `close()` კავშირებს იძულებით ხურავს (Fastify-ის keep-alive 72 წმ).
- **UI რეალურ სერვერზე:** `server/test/ui/*.test.jsx` — `// @vitest-environment jsdom` + `import '@/test/setup.js'`; `setAdminAdapter(env.adapter)`; afterEach — `cleanup()` env-ის დახურვამდე. სერვერის კოდში `new URL(…, String(import.meta.url))` — Vite-ის asset-ის გარდაქმნა jsdom-ში ფაილის გზას `http://`-ად აქცევდა.

## კოდის კონვენციები (B5 — მედია და დოკუმენტები)

- **ტიპი შიგთავსით:** ატვირთული ფაილის ტიპს `src/content/files.js` ადგენს (magic bytes); გაფართოება და გამოცხადებული MIME მხოლოდ შეუსაბამობისთვისაა. დაშვებულია JPEG / PNG / WebP, PDF, VTT — SVG, GIF, აუდიო / ვიდეო არა. UI-ში იგივე `checkBlob` (UX), `accept` — `acceptFor(kinds)`. ახალი ტიპი — მხოლოდ `MEDIA_TYPES`-ში, ტესტით, ორივე მხარეს.
- **ფაილის შეცდომა → 400 + `fields.file`** (`fileError(code, vars)`, ტექსტი ველის ტექსტია); მეტა-ველი → 422; გამოყენებულის წაშლა → 409 `inUseError` („გამოიყენება N მასალაში“, N — მასალა, არა ველი). `http.js` 400 / 422 `fields`-ს `validation`-ად კითხულობს — UI ტექსტს `uploadMessage(error)`-ით იღებს და `FieldError`-ით აჩვენებს (`role="alert"`, `aria-describedby` ღილაკზე).
- **ფოტო ყოველთვის ხელახლა იკოდირდება** (`processImage`): მეტამონაცემის შენარჩუნება (`withMetadata`, `keepMetadata`, `keepExif`) აკრძალულია; ზომა და პროპორცია ინახება, ფაილი არ იჭრება.
- **ბიბლიოთეკა = `library.js`:** ფაილი ერთ ბარათად ყველა გამოყენებით (ცოცხალი ვერსია + სამუშაო ასლი); ჩადგმული ფოტო, რომლის `src` რეესტრში არ არის — `img:<მასალა>:<ველი>`. ცვლილება ბიბლიოთეკიდან მასალას ახალ ვერსიად ინახავს და სამუშაო ასლს **ტოვებს** (`replace({ working })`, mock-ის `save(…, { working })`). ცარიელი alt → 422.
- **ფაილის კვანძი** = ნებისმიერი ობიექტი `src`-ით (`fileNodes`) — ველის სია ხელით არ იწერება (გუნდი, პარტნიორები, სლაიდი, სუბტიტრი ავტომატურად შედის).
- **წაშლა:** ჩანაწერი + ისტორიის `src` → null ერთ ტრანზაქციაში (`media.remove`), საცავიდან — ტრანზაქციის შემდეგ (ჩავარდნა → ობოლი ფაილი, ლოგში მხოლოდ შეცდომის სახე). ძველი ვერსია წაშლას არ ბლოკავს.
- **საცავის გასაღები** მხოლოდ `newMediaKey`-ით; ყოველი ოპერაცია `assertKey`-ს გადის; საჯარო მისამართი — `/media/<key>` (`mediaSrc`), კონტენტში სხვა ფორმა არ იწერება (`mediaKeysOf` მხოლოდ `/media/`-ს ცნობს).
- **გამოქვეყნება:** `reconcileFiles` — `/media/` ფაილი რეესტრში უნდა იყოს (`fileMissing`), VTT-ის `cues` / `end` სერვერის მნიშვნელობით.
- **ტესტი:** სერვერის ფაილის ტესტი — `server/test/media/fixtures.js`-ის ფიქსტურებით (GPS ხელით აწყობილ TIFF-შია; sharp-ის `withExif` GPS-ს არ წერს); multipart — `multipart(file, fields)` (`app.inject`) ან `encodeMultipart` (`browser.js`, jsdom-ის FormData-ც); parity-ში `media: true`.
- **დამოკიდებულება:** transitive პაკეტი, რომელიც 14 დღეზე ახალია — root `overrides`-ით (`@fastify/busboy`, `semver`), ლოკში შემოწმებით (`npm ls` სუფთა).

## კოდის კონვენციები (B6 — საჯარო API და ფორმები)

- **საჯარო წაკითხვა = mock-ის კოდი:** `routes/public.js` ბაზიდან იღებს მხოლოდ საჯაროდ ხილულს (`publicItems` / `publicItem` — ჩასმის რიგით), შემდეგ — `public.js` (`publicItem`: localize + გამოთვლადი ველები) და `query.js` (`query*` / `find*`) მოთხოვნის ენაზე (`inLocale` — სინქრონულ ბლოკში, `await`-ის გარეშე). საკუთარი ფილტრი / დალაგება / გვერდები სერვერზე არ იწერება. ბაზის ფილტრი (`item.category`, `item.featured`, `searchFilter`) მხოლოდ წინასწარია — ზესიმრავლე.
- **`searchText`** სტატიაზე ორივე ენის საჯარო საძიებო ტექსტს შეიცავს (`articleSearchText`); ახალი საძიებო ველი → `query.js`-ის `articleSearchText`-ში (ორივე მხარე ერთად) + მიგრაცია (ხელახლა დათვლა, 003-ის ნიმუშით).
- **ქეში:** საჯარო GET — `cached()` (`ETag` = sha256, `PUBLIC_CACHE_CONTROL`); სერვერის ქეში არ არის. შეცდომა — `no-store` (`security.js`). ახალი საჯარო GET spec-ში — 200-ზე `ETag` + `Cache-Control` header-ები და `'304': NotModified` (`openapi.test.js` ამოწმებს).
- **ენა სერვერზე:** მოთხოვნის `?lang=` (`requestLocale`); ველის შეცდომა, 404 / 429-ის ტექსტი — `inLocale`-ით. `setLocale` სერვერზე აკრძალულია (გლობალური მდგომარეობაა); `withLocale` Promise-ს არ იღებს.
- **ფორმები:** ვალიდაცია — `forms.js` (`validateContact`, `validateSubscribe`) handler-ში, სქემა — მხოლოდ სტრუქტურა (უცნობი ველი → 400; დიაგნოზის / ჯანმრთელობის ველი არ არსებობს და არ დაემატება). honeypot — პირველი შემოწმება, პასუხი იგივე ფორმისაა. CAPTCHA და დროის ლიმიტი არ არის — rate limit (`x-rate-limit: forms`, კონტაქტზე + `sendContact:contact:<sha256>`).
- **გამოწერა:** double opt-in — `pending` (token-ის sha256, `SUBSCRIBE_CONFIRM_DAYS`) → `confirmed`; პასუხი ყოველთვის `{ ok, status: 'pending' }`. ბმული — `subscriptionLink(origin, locale, kind, token)` (token fragment-ში); GET არაფერს ცვლის — გვერდზე ღილაკი (POST). გაუქმების token — `unsubscribeToken(secret, id)` (HMAC), ბაზაში არ ინახება; newsletter-ის ინსტრუმენტი ბმულს ამავე ფუნქციით ქმნის.
- **ფოსტა:** მხოლოდ `app.mailer.send(template(...))` — შაბლონი `server/mail/templates.js`-ში (ka / en; კონტაქტი — ქართულად, სათაურში პერსონალური მონაცემი არ არის). ლოგში — `mail.sent` / `mail.stub` / `mail.failed` + შაბლონი; მიმღები, სათაური, ტექსტი, ბმული და შეცდომის ტექსტი — არასოდეს. ტესტში — `MAIL_TRANSPORT=memory` (`app.mailer.outbox`, `failNext`).
- **parity:** ახალი საჯარო ქცევა — სცენარი `src/content/__tests__/scenarios/content-scenarios.js`-ში (`CONTENT_SCENARIOS` / `FORM_SCENARIOS`, `locales`), `env.note()`-ში სრული პასუხი (შემთხვევითი token / id — არა). frontend — mock-ზე (`adapter.test.js`), სერვერი — ორივეზე (`test/public/parity.test.js`).

## კოდის კონვენციები (B7 — გაშვება)

- **build = API:** `npm run build` mock-ს არ შეიცავს — `vite.config.js`-ის `backendDefines` (`/api/v1`, `/api/admin`); `VITE_MOCK=1` — მხოლოდ დემო build-ი (check-dist მას უარყოფს). mock-ის მოდული საჯარო ან ადმინის chunk-ში → check-dist ✗ (`scripts/dist-rules.mjs`, `.vite/modules.json`). dev-ში API-ით — `npm run dev:api`.
- **საიტი სერვერზე:** HTML მხოლოდ `routes/site.js`-ით (`resolveMeta` → `renderIndex`); inline script-ი მხოლოდ mc-boot (CSP-ის hash გაშვებისას ითვლება — `index.html`-ში ახალი inline script → CSP-ის ცვლილება და ტესტი). ახალი საჯარო როუტი → `src/content/seo.js`-ის `SITE_PAGES` (სათაური / აღწერა — i18n-ის გასაღები; `seo.test.js` routes.jsx-ს ადარებს); მასალის გვერდი — `item` / `query`.
- **CSP:** `style-src 'self'` — `<style>` / `style=""` HTML-ში და `setAttribute('style')` აკრძალულია (React-ის `style` prop — CSSOM, დასაშვებია); ბიბლიოთეკის CSS-ის ჩასმა (TipTap `injectCSS`) — გათიშული, წესები CSS ფაილში. ახალი გარე origin (რუკა, ანალიტიკა) → `site/headers.js` + კონფიდენციალურობის პოლიტიკა.
- **noindex:** ადმინი, API, `/subscribe/*`, 404 — ყოველთვის; `SITE_INDEXING=off` — ყველაფერი. robots.txt `/admin`-ს და `/api`-ს არ ასახელებს.
- **ცარიელი ბაზა:** საბაზისო ჩანაწერები (`db/base.js`) — მხოლოდ რაც აკლია; ფაქტი `[ფრჩხილებშია]`. seed წარმოებაში არ ეშვება.
- **რედაქტორის ჩაწერა რიგშია** (`EntityEditor` → `exclusive`): ავტოშენახვა, გამოქვეყნება, მონახაზად შენახვა ერთდროულად არ მიდის (რეალურ API-ზე იმავე `version`-ით → 409). ახალი ჩაწერის ქმედება — `exclusive(() => …)`-ით.
- **ფოსტა:** production — `resend` ან `log`; Resend — `fetch`, SDK-ის გარეშე, ლოგში სტატუსი, მონაცემი არა.
- **საიდუმლო:** smoke / audit / local-prod — ანგარიში env-იდან ან შემთხვევითი (გაშვებაზე); პაროლი კოდში, ფაილში და ლოგში არასოდეს. backup-ის ფაილი — `0600`, დაშიფრულად (`docs/deploy.md`).
- **სერვერზე ცვლილების შემდეგ:** `npm run build && npm run smoke:local` (≈ 1 წთ) — header-ები, cookie, გამოქვეყნების ნაკადი, CSP.
