# გაშვების runbook — „მეტი ჩართულობა“ (B7)

ერთი Render Web Service (Frankfurt) ემსახურება API-ს (`/api/*`) და საიტს (`dist/`) **ერთ origin-ზე**; ბაზა —
MongoDB Atlas (AWS `eu-central-1`); ფაილები — Cloudflare R2 (`/media/*` სერვისის გავლით); ფოსტა — Resend.
საიდუმლო (პაროლი, connection string, გასაღები) ამ ფაილში, კოდში და zip-ში არ არის — მხოლოდ Render-ის env-ში
ან ლოკალურ `server/.env`-ში (git / zip-ის გარეთ). `[ფრჩხილებში]` — ჩასანაცვლებელი მნიშვნელობა.

| გარემო | სად | ბაზა | ინდექსაცია | ფოსტა |
|---|---|---|---|---|
| ლოკალური production | `npm run build && npm run prod:local` (`scripts/local-prod.mjs`) | MongoDB 8.0 მეხსიერებაში | on (ტესტი) | log / file |
| staging | `[სერვისი].onrender.com` | Atlas — ცალკე ბაზა (`MONGODB_DB=meti-chartuloba-staging`) ან ცალკე კლასტერი | **off** | log (დომენამდე) |
| production | `https://[დომენი]` | Atlas — `meti-chartuloba` | on (დომენის შემდეგ) | resend |

## 1. ანგარიშები

ყველა ანგარიში ორგანიზაციის ელფოსტაზეა (`info@[დომენი]` / როლური მისამართი — არა პირადი), ორფაქტორიანი
ავტორიზაციით; წვდომა — მინიმუმ ორ ადამიანს (ერთის დაკარგვა სერვისს არ კეტავს).

| სერვისი | რისთვის | ტარიფი (B0, 2026-11-04) | ვინ ხსნის |
|---|---|---|---|
| GitHub | კოდი, Render-ის auto-deploy | უფასო | `[პასუხისმგებელი]` |
| Render | Web Service | Starter ($7/თვე) · ბიუჯეტი $0 → Free / Fly.io (ქვემოთ) | `[პასუხისმგებელი]` |
| MongoDB Atlas | ბაზა | Flex (≈ $8/თვე, ყოველდღიური snapshot) · ბიუჯეტი $0 → Free (backup არ აქვს) | `[პასუხისმგებელი]` |
| Cloudflare | R2 (ფაილები), არასავალდებულო DNS / proxy | R2 ≤ 10 GB — $0 | `[პასუხისმგებელი]` |
| Resend | `no-reply@[დომენი]` | ≤ 3 000 წერილი/თვე — $0 | `[პასუხისმგებელი]` |
| დომენის რეგისტრატორი | `[დომენი]` | `[ფასი]` | `[პასუხისმგებელი]` |

## 2. env ცვლადები

წესები და შემოწმება — `server/config.js` (`ENV_SCHEMA`); არასწორი მნიშვნელობა → სერვისი არ ეშვება, შეცდომის
ტექსტი მნიშვნელობას არ იმეორებს. სრული სია კომენტარებით — `server/.env.example`.

| ცვლადი | სად | მაგალითი | production |
|---|---|---|---|
| `NODE_ENV` | Render | `production` | სავალდებულო |
| `TRUST_PROXY` | Render | `1` (Render) · `2` (Cloudflare proxy + Render) | სავალდებულო, ≥ 1 |
| `MONGODB_URI` | Render (საიდუმლო) | `mongodb+srv://[მომხმარებელი]:[პაროლი]@[კლასტერი].mongodb.net/?retryWrites=true&w=majority` | სავალდებულო |
| `MONGODB_DB` | Render | `meti-chartuloba` | ნაგულისხმევი |
| `PUBLIC_ORIGIN` | Render | `https://[დომენი]` (staging — `https://[სერვისი].onrender.com`) | სავალდებულო, https |
| `CONTACT_INBOX` | Render (საიდუმლო) | `[ელფოსტა]` | სავალდებულო |
| `SUBSCRIBE_SECRET` | Render (`generateValue`) | ≥ 32 შემთხვევითი სიმბოლო | სავალდებულო |
| `R2_ACCOUNT_ID` · `R2_BUCKET` | Render | `[32 hex]` · `[bucket]` | სავალდებულო |
| `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` | Render (საიდუმლო) | `[გასაღები]` · `[საიდუმლო]` | სავალდებულო |
| `MAIL_TRANSPORT` | Render | `log` (დომენამდე) → `resend` | `log` ან `resend` |
| `MAIL_FROM` · `RESEND_API_KEY` | Render (საიდუმლო) | `no-reply@[დომენი]` · `re_[…]` | `resend`-ზე სავალდებულო |
| `SITE_INDEXING` | Render | `off` (staging) · `on` (საბოლოო დომენი) | ნაგულისხმევი `off` |
| `MIGRATE_ON_START` | Render | `0` (Starter — pre-deploy) · `1` (Free / Fly.io) | ნაგულისხმევი `0` |
| `SITE_DIR` | — | ცარიელი → `dist/` | არ სჭირდება |
| `MESSAGES_TTL_DAYS`, `VERSIONS_KEEP`, `SESSION_*`, `INVITE_TTL_DAYS`, `RATE_LIMIT_*`, `MEDIA_MAX_*` | Render | ნაგულისხმევი (B0 #10) | დასადასტურებელი |
| `ADMIN_EMAIL` · `ADMIN_NAME` · `ADMIN_PASSWORD` | მხოლოდ ერთჯერადად Shell-ში | — | env-ში **არ** ინახება |
| `RENDER_GIT_COMMIT` | Render თავად | — | ლოგის `startup` მოვლენაში |

frontend-ის env (`VITE_*`) build-ში ჩაისმება და Render-ზე არ სჭირდება: `npm run build` ყოველთვის `/api/v1` და
`/api/admin`-ზეა (vite.config.js); mock წარმოების bundle-ში არ ხვდება — check-dist ამოწმებს.

## 3. MongoDB Atlas

1. **კლასტერი:** AWS, `eu-central-1` (Frankfurt), MongoDB 8.0; Flex (რეკომენდებული) ან Free (ბიუჯეტი $0).
2. **მომხმარებელი — მინიმალური უფლება.** Atlas ახალ მომხმარებელს ნაგულისხმევად პროექტის ყველა ბაზაზე
   read/write-ს აძლევს — არ გამოიყენო. Database Access → Custom Roles → `mc-app`, რესურსი — მხოლოდ ბაზა
   `meti-chartuloba` (staging-ს — საკუთარი როლი საკუთარ ბაზაზე):

   | მოქმედება | რისთვის |
   |---|---|
   | `find`, `insert`, `update`, `remove` | API, seed, restore |
   | `createCollection`, `collMod`, `createIndex`, `dropIndex`, `listCollections`, `listIndexes` | `server:migrate` (validator-ები, ინდექსები, TTL) |
   | `killCursors` | კურსორის დახურვა |

   `dropCollection` / `dropDatabase` როლში არ არის. მომხმარებელი `mc-app` → ეს როლი; პაროლი — გრძელი,
   შემთხვევითი (Atlas-ის „Autogenerate“). თუ კლასტერის ტარიფი custom role-ს არ იძლევა — Specific Privileges:
   `readWrite@meti-chartuloba` + `dbAdmin@meti-chartuloba` (`dbAdmin` ფართოა — `dropDatabase`-ს შეიცავს).
3. **ქსელი (IP Access List):** Render → სერვისი → Connect → Outbound — IP დიაპაზონები (რეგიონის ყველა
   სერვისისთვის საერთოა და Render მათ დროდადრო ცვლის — შეტყობინებას ელფოსტაზე აგზავნის; ცვლილებისას სია
   განაახლე). `0.0.0.0/0` არ დაამატო. ლოკალური ოპერაციისთვის (backup, restore, seed staging-ზე) — შენი IP
   **დროებით** (Atlas: „This entry is temporary“, 6 სთ).
4. **Backup:** Flex — ავტომატური ყოველდღიური snapshot (გათიშვა არ შეიძლება, ინახება ბოლო 8). Free — backup
   **არ არის**: კვირაში ერთხელ `npm run server:backup` (§ 9). ორივე შემთხვევაში — თვეში ერთხელ ლოგიკური ასლი
   (ტარიფისგან დამოუკიდებელი).
5. **connection string:** Connect → Drivers → `mongodb+srv://…` → Render-ის `MONGODB_URI` (საიდუმლო). TLS
   ნაგულისხმევადაა.

## 4. Cloudflare R2

1. Bucket `[bucket]` (რეგიონი — ავტომატური / EU jurisdiction, თუ ხელმისაწვდომია), **Public access — გათიშული**:
   ფაილები `/media/*`-ით Fastify-ის გავლით მიეწოდება (ერთი origin, `nosniff`, CSP sandbox, B5).
2. API Token: **Object Read & Write მხოლოდ ამ bucket-ზე** (არა Admin), TTL — შეუზღუდავი ან როტაციის ვადით
   (§ 10). Access Key ID / Secret → Render (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), Account ID → `R2_ACCOUNT_ID`.
3. CORS არ არის საჭირო (ბრაუზერი R2-ს პირდაპირ არ მიმართავს). Custom domain / CDN (`MEDIA_BASE_URL`) — არ
   გამოიყენება: Cloudflare proxy-ით (არასავალდებულო) `/media/*` ისედაც ქეშირდება (`immutable`).
4. ფაილების ასლი — § 9.

## 5. Resend და DNS (დომენის შემდეგ)

1. Resend → Domains → `[დომენი]` (ან ქვედომენი, მაგ. `mail.[დომენი]`) → რეგიონი EU, თუ არის.
2. DNS-ში (რეგისტრატორი ან Cloudflare) — Resend-ის ჩანაწერები **ზუსტად მისი ცხრილით**: SPF (`TXT`, Resend-ის
   ქვედომენზე), DKIM (`TXT`, `resend._domainkey`), MX (bounce). DMARC — `_dmarc.[დომენი]` `TXT`:
   `v=DMARC1; p=none; rua=mailto:[ელფოსტა]` → 2–4 კვირის შემდეგ `p=quarantine`.
3. Verify → API Keys → **Sending access, მხოლოდ ამ დომენზე** → Render: `RESEND_API_KEY`,
   `MAIL_FROM=no-reply@[დომენი]`, `MAIL_TRANSPORT=resend` → redeploy.
4. შემოწმება: საიტის კონტაქტის ფორმა → წერილი `CONTACT_INBOX`-ში; გამოწერა → დადასტურების წერილი; Gmail-ში
   „Show original“ → SPF / DKIM / DMARC — PASS.

დომენამდე (staging) `MAIL_TRANSPORT=log`: ფორმა შეტყობინებას ბაზაში ინახავს, წერილი **არ იგზავნება**
(ლოგში — `mail.stub`); გამოწერის ბმული არ მიდის.

## 6. Render

1. New → Blueprint → რეპო (ფესვში `render.yaml`) — ან ხელით Web Service იგივე პარამეტრებით:

   | პარამეტრი | მნიშვნელობა |
   |---|---|
   | Region | Frankfurt |
   | Build | `npm ci --include=dev && npm run build && npm prune --omit=dev` |
   | Pre-deploy | `npm run server:migrate` (მხოლოდ ფასიან ტარიფზე; Free-ზე — `MIGRATE_ON_START=1`) |
   | Start | `node server/index.js` |
   | Health check | `/api/health` (ბაზის ping; 503 → ახალი ვერსია ტრაფიკს არ იღებს) |
   | Node | `.node-version` → 22 |

2. env — § 2 (საიდუმლო — „Secret“, `sync: false`).
3. Custom Domain → `[დომენი]` და `www.[დომენი]` → DNS (`CNAME` / `ALIAS` Render-ის მითითებით) → TLS
   ავტომატურია; HTTP → HTTPS — Render. შემდეგ: `PUBLIC_ORIGIN=https://[დომენი]`, `SITE_INDEXING=on` → redeploy.
4. Cloudflare proxy (არასავალდებულო): DNS ჩანაწერი Proxied, SSL — Full (strict), `TRUST_PROXY=2`.
5. Notifications → deploy-ის ჩავარდნა → ელფოსტა.

**ბიუჯეტი $0:** Render Free იძინებს (გაღვიძება ≈ 1 წთ — ეკრანის მკითხველი ცარიელ გვერდს ხვდება, B0 #1) და
pre-deploy-ს არ იძლევა (`MIGRATE_ON_START=1`); ალტერნატივა — Fly.io `fra` (Dockerfile ჯერ არ არის — ღია).

## 7. პირველი გაშვება

1. Atlas (§ 3), R2 (§ 4), Render (§ 6) — env შევსებულია, `SITE_INDEXING=off`.
2. Deploy: build → **pre-deploy `server:migrate`** — კოლექციები, validator-ები, ინდექსები + საბაზისო ჩანაწერები
   (7 გვერდი, პარამეტრები `[ჩანაცვლებებით]`) → start → `/api/health` 200. ლოგში: `{"event":"startup",
   "site":true,"mail":"log","storage":"r2",…}`.
3. **seed — წარმოებაში არა.** staging-ზე (სურვილისამებრ, დემო-მონაცემი): ლოკალური ტერმინალიდან
   `MONGODB_URI=[staging] MONGODB_DB=meti-chartuloba-staging npm run server:seed` (`NODE_ENV` — არა production;
   ხელუხლებელ საბაზისო ჩანაწერებს ცვლის, სხვა შემთხვევაში — `-- --reset`).
4. პირველი ადმინისტრატორი: Render → Shell → `npm run server:create-admin` (ელფოსტა, სახელი, პაროლი ≥ 12 —
   ტერმინალში, ეკრანზე არ ჩანს). Shell-ის გარეშე ტარიფზე — ლოკალური ტერმინალიდან იგივე ბრძანება
   `MONGODB_URI`-ით (IP — დროებით Atlas-ის სიაში). env-ში ADMIN_* არ შეინახო. ნაგულისხმევი ანგარიში არ არსებობს.
5. `https://[სერვისი]/admin/login` → შესვლა → **პარამეტრები**: კონტაქტები, საათები, ოფისის ხელმისაწვდომობა,
   სოციალური ქსელები, ბმულები (`[…]` → რეალური მონაცემი; უცნობი — ცარიელი არ დატოვო, ფრჩხილებში რჩება).
6. მომხმარებლები → მოწვევა (რედაქტორი, 7 დღე) → ბმული მეორე ადამიანს.
7. **smoke** (§ 8) staging-ზე → მწვანე.
8. დომენი (§ 5, § 6.3) → `SITE_INDEXING=on` → smoke production-ზე → Google Search Console: დომენი +
   `https://[დომენი]/sitemap.xml`.

## 8. smoke

```
npx playwright install chromium          # ერთხელ
BASE_URL=https://[სერვისი] SMOKE_EMAIL=[ადმინის ელფოსტა] SMOKE_PASSWORD=[პაროლი] npm run smoke
```

ამოწმებს: header-ები (CSP mc-boot-ის hash-ით, HSTS, Referrer-Policy, Permissions-Policy, `X-Robots-Tag` ადმინსა და
API-ზე, robots.txt) → შესვლა (`__Host-` cookie: HttpOnly, Secure, SameSite=Lax, Path=/) → სტატია ფოტოთი → alt-ის
გარეშე გამოქვეყნება ვერ ხერხდება (რედაქტორი + სერვერის 422) → alt → გამოქვეყნება → საჯარო გვერდი ka + en →
წაშლა → 404 → ფაილის წაშლა → გასვლა; CSP-ის დარღვევა — 0. შექმნილი მასალა ყოველთვის იშლება. ჩავარდნისას —
`smoke-failure.png`. ლოკალურად: `npm run build && npm run smoke:local`.

`SMOKE_PASSWORD` shell-ის ისტორიაში რომ არ დარჩეს — `read -s SMOKE_PASSWORD && export SMOKE_PASSWORD`.

## 9. განახლება, rollback, backup / აღდგენა

**განახლება:** `main`-ში push → Render: build → pre-deploy migrate → ახალი ინსტანცია → health → ტრაფიკი →
ძველს SIGTERM (მიმდინარე მოთხოვნები სრულდება). შემდეგ: ლოგში `startup.commit` = ახალი commit → smoke.

**Rollback:** Render → Deploys → წინა deploy → Rollback (იგივე build, env და start; **ბაზა არ ბრუნდება**).
მიგრაციები მხოლოდ წინ მიდის და იდემპოტენტურია (ველს არ შლის, validator ფართოვდება) — წინა ვერსია ახალ
სქემაზე მუშაობს; თუ მიგრაცია ველს შლის / ცვლის — PR-ში ეს ცალკე წერია და rollback-ის გეგმა თან ახლავს.

**Backup:**

| რა | როგორ | სიხშირე | ინახება |
|---|---|---|---|
| ბაზა (Flex) | Atlas — ავტომატური snapshot | დღეში 1 | ბოლო 8 |
| ბაზა (ლოგიკური) | `npm run server:backup -- --out mc-backup-[თარიღი].ndjson.gz` (`MONGODB_URI` — ლოკალური env, IP — დროებით) | კვირაში 1 (Free) · თვეში 1 (Flex) | დაშიფრულ საცავში, ≥ 3 ასლი |
| ფაილები (R2) | `rclone sync r2:[bucket] [ასლის ადგილი]` (Object Read-only გასაღებით) | კვირაში 1 | ბოლო ≥ 4 |

ლოგიკური ასლი პერსონალურ მონაცემს შეიცავს (გამომწერის ელფოსტა, შეტყობინება, პაროლის hash) — ფაილი
`0600`-ით იქმნება; ინახება მხოლოდ დაშიფრულად (მაგ. 7-Zip AES-256 / VeraCrypt), არასოდეს — საჯარო ღრუბელში,
ელფოსტაში ან რეპოში. სესიები ასლში არ შედის.

**აღდგენა:**

1. Flex snapshot: Atlas → Backup → snapshot → Restore → **ახალ** კლასტერზე (ან ჩამოტვირთვა) → შემოწმება →
   `MONGODB_URI` გადართვა → redeploy.
2. ლოგიკური ასლი: ახალ ბაზაში (არსებულს არ გადაწერს) —
   `MONGODB_DB=meti-chartuloba-restore npm run server:restore -- --in [ფაილი] --confirm meti-chartuloba-restore`
   (მიგრაცია → ჩაწერა validator-ით → რაოდენობის შედარება; მოჭრილი ფაილი → შეცდომა) → შემოწმება → Render-ზე
   `MONGODB_DB=meti-chartuloba-restore` → redeploy. იმავე ბაზაზე — მხოლოდ `--drop`-ით (ყველაფერს შლის).
3. ფაილები: `rclone sync [ასლი] r2:[bucket]`.
4. აღდგენის შემდეგ: smoke; ყველა ხელახლა შედის (სესიები არ აღდგება).

ამოცდილი (RTO / RPO, მიზანი): `[ვადა]` / `[ვადა]` — ორგანიზაცია ადასტურებს; Flex-ზე RPO ≤ 24 სთ.

## 10. საიდუმლოს როტაცია

| საიდუმლო | როდის | როგორ | შედეგი |
|---|---|---|---|
| Atlas-ის პაროლი | წელიწადში 1 / გაჟონვისას | Database Access → Edit → ახალი პაროლი → Render `MONGODB_URI` → redeploy | ~1 წთ ძველი ინსტანცია ძველი პაროლით ვერ შეაერთებს — deploy-ის ფანჯარაში |
| R2-ის გასაღები | წელიწადში 1 / გაჟონვისას | ახალი token (იგივე უფლება) → Render → redeploy → ძველის Revoke | — |
| `RESEND_API_KEY` | წელიწადში 1 / გაჟონვისას | ახალი key → Render → redeploy → ძველის წაშლა | — |
| `SUBSCRIBE_SECRET` | **მხოლოდ გაჟონვისას** | ახალი მნიშვნელობა → redeploy | ყველა გაგზავნილი გაუქმების ბმული წყდება — მომდევნო წერილი ახალ ბმულს შეიცავს |
| ადმინის პაროლი | გაჟონვისას | პაროლის შეცვლა UI-ში ჯერ არ არის (§9 #28): სხვა ადმინისტრატორი → დეაქტივაცია → ახალი მოწვევა | დეაქტივაცია ყველა სესიას შლის |
| ყველა სესიის გაუქმება | ინციდენტისას | Atlas → `sessions` კოლექციის დოკუმენტების წაშლა | ყველა თავიდან შედის |

როტაციის შემდეგ — smoke. ძველი საიდუმლო არსად ინახება (ჩანაწერი — მხოლოდ თარიღი და ვინ შეცვალა).

## 11. ლოგი და მონიტორინგი

- **ლოგი:** pino JSON, ერთი ხაზი პასუხზე — მეთოდი, route-ის შაბლონი, სტატუსი, ms, `reqId`. IP, ელფოსტა,
  სახელი, ტექსტი, cookie, token, query — **არა** (ტესტით). Render → Logs (ვადა ტარიფით — `[ვადა]`).
- **მოვლენები:** `startup` (commit, საიტი, ფოსტა, საცავი), `migrate`, `auth.login.failed` (ზრდა → bruteforce-ის
  ცდა; rate limit 10 / 15 წთ), `mail.failed` (Resend-ის სტატუსი), `mail.stub` (staging), `site.meta.failed` (ბაზა
  მიუწვდომელია), `uncaughtException` / `unhandledRejection` (fatal → თავიდან ჩართვა).
- **Health:** Render — `/api/health` ყოველ რამდენიმე წამში (deploy-ზე — ტრაფიკის კარიბჭე); გარე მონიტორი
  (UptimeRobot / Better Stack, უფასო) — `https://[დომენი]/api/health`, 5 წთ, ალერტი ელფოსტაზე.
- **Atlas:** Alerts → Connections > 80% (Flex — 500), Logical Size > 4 GB (Flex — 5 GB).

## 12. Header-ები

| header | მნიშვნელობა | რატომ |
|---|---|---|
| `Content-Security-Policy` (HTML) | `default-src 'self'; script-src 'self' 'sha256-[mc-boot]' https://www.youtube.com; style-src 'self'; img-src 'self' data: https://i.ytimg.com; font-src 'self'; connect-src 'self'; media-src 'self'; frame-src https://www.youtube-nocookie.com; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` | XSS-ის შეზღუდვა; inline — მხოლოდ mc-boot (hash გაშვებისას build-იდან); YouTube — §10; შრიფტები self-hosted; `data:` — ორბიტის SVG mask |
| `Content-Security-Policy` (API, ფაილები) | `default-src 'none'; …` / `default-src 'none'; sandbox` | JSON / ფაილი არასოდეს სრულდება როგორც გვერდი |
| `Strict-Transport-Security` | `max-age=31536000` | HTTPS 1 წელი (ASVS 3.4.1); `includeSubDomains` — დომენის შემდეგ, ქვედომენების შემოწმებით |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | `no-referrer` YouTube-ის ჩაშენებას არღვევს (F10) |
| `Permissions-Policy` | კამერა, მიკროფონი, მდებარეობა, სენსორები, გადახდა, USB, Topics — `()`; autoplay / encrypted-media / PiP — `self` + YouTube; fullscreen — `self` | საიტს ეს არ სჭირდება; YouTube-ის iframe — მხოლოდ დაკვრა |
| `X-Robots-Tag` | `noindex, nofollow` — `/admin`, `/en/admin`, `/api`, `/subscribe/*`, 404; `SITE_INDEXING=off` — ყველაფერზე | ადმინი და staging საძიებოში არ ხვდება; robots.txt `/admin`-ს არ ასახელებს (§10) |
| `Cache-Control` | `/assets/*` — `public, max-age=31536000, immutable`; HTML — `no-cache`; API (საჯარო GET) — `public, max-age=0, must-revalidate` + ETag; სხვა API — `no-store`; sitemap / robots — 1 სთ | hash-იანი ფაილი არ იცვლება; HTML / კონტენტი გამოქვეყნებისთანავე ახლდება |
| `X-Content-Type-Options`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-Frame-Options` | `nosniff`, `same-origin`, `same-origin`, `SAMEORIGIN` | helmet (B1) |
| CORS | არ იგზავნება | ერთი origin (B0 #4) |

## 13. გაშვების checklist

- [ ] Atlas: Frankfurt, custom role `mc-app` (ერთ ბაზაზე), IP — Render-ის Outbound, backup (Flex) ან კვირეული `server:backup` (Free)
- [ ] R2: bucket private, token — Object Read & Write ერთ bucket-ზე
- [ ] Render: Frankfurt, Starter, pre-deploy `server:migrate`, health `/api/health`, env (§ 2), notifications
- [ ] პირველი deploy: ლოგში `startup` (`site: true`, `storage: r2`), `/api/health` 200
- [ ] `server:create-admin` (Shell), env-ში ADMIN_* არ არის
- [ ] პარამეტრები — რეალური კონტაქტები (ან `[…]` შეგნებულად)
- [ ] smoke staging-ზე — მწვანე
- [ ] დომენი + TLS → `PUBLIC_ORIGIN`, `SITE_INDEXING=on`
- [ ] Resend: დომენი Verified, SPF / DKIM / DMARC — PASS → `MAIL_TRANSPORT=resend` → ფორმის წერილი inbox-შია
- [ ] smoke production-ზე — მწვანე; Search Console — sitemap
- [ ] გარე uptime-მონიტორი, Atlas-ის ალერტები
- [ ] კონფიდენციალურობის პოლიტიკა (YouTube-ის კადრი, Resend, Atlas-ის backup, შენახვის ვადები — B0 #10) გამოქვეყნებულია, ბმული პარამეტრებში
- [ ] ხელმისაწვდომობის განცხადება (AA; ვიდეოზე AAA-ს პრეტენზია არა — §9 #25)

## 14. ღია საკითხები

| ღია საკითხი | ვინ წყვეტს | ბლოკავს გაშვებას? |
|---|---|---|
| ტარიფი: Render Starter + Atlas Flex (≈ $15/თვე) თუ $0 (Free / Fly.io + კვირეული backup) | ორგანიზაცია | **დიახ** |
| დომენი და რეგისტრატორი | ორგანიზაცია | **დიახ** (production; staging — არა) |
| Resend: დომენის DNS, `no-reply@` | ორგანიზაცია + დეველოპერი | **დიახ** — მის გარეშე ფორმის წერილი და გამოწერის ბმული არ იგზავნება |
| რეალური კონტენტი (ტექსტები, ფოტოები, გუნდი, კონტაქტები) | ორგანიზაცია | **დიახ** — `[…]` ჩანაცვლებები საჯაროდ ჩანს |
| კონფიდენციალურობის პოლიტიკა, შენახვის ვადები (B0 #10), ხელმისაწვდომობის განცხადება | ორგანიზაცია (+ იურისტი) | **დიახ** (ფორმები პერსონალურ მონაცემს აგროვებს) |
| ორგანიზაციის ოფიციალური ინგლისური სახელი | ორგანიზაცია | არა |
| rate limit-ის ზღვრები (10 / 15 წთ, 10 / 10 წთ), სესიის / მოწვევის ვადა | ორგანიზაცია | არა (ნაგულისხმევი მუშაობს) |
| პაროლის შეცვლა / აღდგენა (ASVS 6.2.2 / 6.2.3) | დეველოპერი (ცალკე ნაბიჯი) | არა — დოკუმენტირებული შეზღუდვა (§ 10) |
| newsletter-ის ინსტრუმენტი (გაგზავნა, RFC 8058) | ორგანიზაცია + დეველოპერი | არა |
| რუკის პროვაიდერი (CSP `frame-src`) | ორგანიზაცია | არა (რუკის გარეშე ტექსტური მისამართი ჩანს) |
| SSR / prerender (სრული HTML JS-ის გარეშე) | დეველოპერი, Search Console-ის მიხედვით | არა |
| Fly.io-ს Dockerfile ($0 ვარიანტი) | დეველოპერი | მხოლოდ $0 ვარიანტზე |
| CSP-ის ანგარიშის endpoint (`report-to`) | დეველოპერი | არა |
| ანალიტიკა („ყველაზე წაკითხული“) | ორგანიზაცია | არა |
