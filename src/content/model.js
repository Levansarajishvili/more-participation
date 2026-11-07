/**
 * კონტენტის მოდელი. ველები AdminPanel დაფის რედაქტორს 1:1 იმეორებს (სათაური, slug,
 * კატეგორია, მოკლე აღწერა ≤ 160, ტექსტი ბლოკებად, ფოტო 3:2 + alt, სტატუსი, თარიღი),
 * რომ F8-ის ადმინი ან CMS პირდაპირ მიება.
 *
 * კონვენციები:
 * - ტექსტი — ცოცხალი სტრიქონი; HTML არსად არ ინახება. სტატიის ტექსტი სტრუქტურირებული ბლოკებია.
 * - თარიღი — ISO 8601 სტრიქონი ოფსეტით (`2026-11-03T10:00:00+04:00`).
 * - `src: null` — ფაილი ჯერ არ არის (mock ან ატვირთვის მოლოდინში); UI ჩანაცვლების ჩარჩოს
 *   ხატავს, alt კი მაინც სავალდებულოა.
 * - URL `null` — ბმული ჯერ უცნობია; UI ღილაკს არ აჩვენებს ან გათიშულ მდგომარეობაში ხატავს.
 * - გამოთვლადი ველები (`readingMinutes`, `slideCount`, `has*`) adapter-ში ითვლება.
 */

/** @typedef {import('./taxonomy.js').ArticleCategory} ArticleCategory */
/** @typedef {import('./taxonomy.js').SeriesTopic} SeriesTopic */
/** @typedef {import('./taxonomy.js').VideoCategory} VideoCategory */
/** @typedef {import('./taxonomy.js').NewsType} NewsType */
/** @typedef {import('./taxonomy.js').EventFormat} EventFormat */
/** @typedef {import('./taxonomy.js').AccessLevel} AccessLevel */
/** @typedef {import('./taxonomy.js').OfficeFeature} OfficeFeature */
/** @typedef {import('./taxonomy.js').PartnerKind} PartnerKind */
/** @typedef {import('./taxonomy.js').SocialNetwork} SocialNetwork */
/** @typedef {import('./taxonomy.js').SeriesTone} SeriesTone */

/**
 * F9 — ენის ვერსიები: ყოველ კონტენტის ერთეულს (Article, Series, Video, NewsItem, Event, TeamMember,
 * Partner, SiteSettings) აქვს არასავალდებულო `translations?: Translations` — ნაწილობრივი ასლი
 * იმავე ფორმით (მხოლოდ ტექსტი: სათაური, აღწერა, alt, ტექსტის ბლოკები, სლაიდის / ტრანსკრიპტის
 * ტექსტი…). საჯარო პასუხში თარგმანი ზემოდან ედება და ემატება გამოთვლილი `lang: 'ka' | 'en'`
 * (`localize.js`); `translations` პასუხში არ ხვდება.
 * @typedef {{ en?: Record<string, unknown> }} Translations
 */
/** @typedef {import('./taxonomy.js').ContactTopic} ContactTopic */
/** @typedef {import('./taxonomy.js').ReplyChannel} ReplyChannel */

/* ─── საერთო ─────────────────────────────────────────────────────────────── */

/** @typedef {'16:9' | '3:2' | '4:3' | '1:1' | '4:5'} Ratio */
/** @typedef {'draft' | 'scheduled' | 'published'} Status */
/** @typedef {'ka' | 'en'} Lang */

/** @type {readonly Ratio[]} */
export const RATIOS = Object.freeze(['16:9', '3:2', '4:3', '1:1', '4:5']);

/** @type {readonly Status[]} */
export const STATUSES = Object.freeze(['draft', 'scheduled', 'published']);

/** მოკლე აღწერის ზღვარი: ჩანს ბარათზე და ძიებაში (AdminPanel). */
export const EXCERPT_MAX = 160;

/**
 * კითხვის სიჩქარე სიტყვა/წუთში `readingMinutes`-ისთვის. დაშვებაა: ქართული ტექსტის
 * გაზომილი მაჩვენებელი არ გვაქვს; სიტყვები გრძელია, ამიტომ ინგლისურის ~200-ზე დაბალია.
 */
export const READING_WPM = 150;

/**
 * მედიის პროპორცია როლის მიხედვით (project-context §3).
 * @type {Readonly<Record<'articleCover' | 'newsCover' | 'videoPoster' | 'seriesCover' | 'portrait' | 'logo', Ratio>>}
 */
export const MEDIA_RATIO = Object.freeze({
  articleCover: '3:2',
  newsCover: '3:2',
  videoPoster: '16:9',
  seriesCover: '4:3',
  portrait: '1:1',
  logo: '3:2',
});

/**
 * @typedef {object} Image
 * @property {string | null} src   null — ფაილი ჯერ არ არის
 * @property {string} alt          სავალდებულო: აღწერს, რა ხდება ფოტოზე
 * @property {Ratio} ratio
 * @property {number} [width]      ორიგინალის სიგანე px-ში (CLS-ისთვის)
 * @property {number} [height]
 * @property {string} [credit]     ფოტოს ავტორი
 */

/**
 * @typedef {object} AudioTrack
 * @property {string | null} src
 * @property {Lang} srclang
 * @property {string} label
 * @property {number} [duration]   წამებში
 */

/**
 * @typedef {object} DocumentFile
 * @property {string | null} src
 * @property {string} label
 * @property {number} [size]       ბაიტებში
 * @property {'ka' | 'en'} [lang]  F8: დოკუმენტის ენა
 * @property {boolean} [tagged]    F8: PDF/UA (tagged) დადასტურებულია — არა → ჩეკლისტის გაფრთხილება
 */

/**
 * @template T
 * @typedef {object} Page
 * @property {T[]} items
 * @property {string | null} nextCursor   გაუმჭვირვალე; null — მეტი არ არის
 * @property {number} total               ფილტრის შემდეგ, ყველა გვერდზე ჯამში
 */

/* ─── სტატიის ტექსტი: ბლოკები ───────────────────────────────────────────── */

/**
 * @typedef {object} TextRun
 * @property {'text'} type
 * @property {string} text
 * @property {boolean} [strong]   მუქი (რედაქტორის „B“); კურსივი არ არსებობს
 * @property {Lang} [lang]        უცხოენოვანი ფრაგმენტი → `lang` ატრიბუტი
 */

/**
 * @typedef {object} LinkRun
 * @property {'link'} type
 * @property {string} text        აღწერითი: „აქ“, „ვრცლად“ — აკრძალულია
 * @property {string} href        შიდა გზა (`/articles/…`) ან სრული URL
 * @property {Lang} [lang]
 */

/** @typedef {TextRun | LinkRun} Inline */

/**
 * @typedef {object} ParagraphBlock
 * @property {'p'} type
 * @property {Inline[]} content
 */

/**
 * @typedef {object} HeadingBlock
 * @property {'h2' | 'h3'} type   H1 სტატიის სათაურია და ტექსტში არ გამოიყენება
 * @property {string} text
 */

/**
 * @typedef {object} ListBlock
 * @property {'list'} type
 * @property {boolean} ordered
 * @property {Inline[][]} items
 */

/**
 * @typedef {object} QuoteBlock
 * @property {'quote'} type
 * @property {string} text        Noto Serif Georgian 500
 * @property {string} [cite]      ვის ეკუთვნის ციტატა
 */

/**
 * @typedef {object} ImageBlock
 * @property {'image'} type
 * @property {Image} image
 * @property {string} [caption]
 */

/**
 * დამოუკიდებელი ბმული-ბლოკი (მასალაზე მითითება ტექსტის შუაში).
 * @typedef {object} LinkBlock
 * @property {'link'} type
 * @property {string} text
 * @property {string} href
 * @property {string} [description]
 */

/** @typedef {ParagraphBlock | HeadingBlock | ListBlock | QuoteBlock | ImageBlock | LinkBlock} Block */

/* ─── სტატია ─────────────────────────────────────────────────────────────── */

/**
 * @typedef {object} Article
 * @property {string} slug
 * @property {string} title
 * @property {string} excerpt          ≤ EXCERPT_MAX
 * @property {ArticleCategory} category
 * @property {Image} cover             3:2
 * @property {string} author
 * @property {Status} status
 * @property {string} publishedAt      `scheduled`-ისთვის — გამოქვეყნების დრო
 * @property {string} [updatedAt]
 * @property {boolean} featured        „რჩეული სტატია“
 * @property {Block[]} body
 * @property {AudioTrack | null} audio აუდიო ვერსია; მზადდება გამოქვეყნების შემდეგ
 * @property {number} readingMinutes   გამოთვლადი
 */

/**
 * სიის ელემენტი: ტექსტისა და აუდიოს გარეშე.
 * @typedef {Omit<Article, 'body' | 'audio'> & { hasAudio: boolean }} ArticleSummary
 */

/* ─── პიროვნული განვითარება: სერია და სლაიდი ────────────────────────────── */

/**
 * ცოცხალი ტექსტი, არა სურათი. `plain` — მარტივი ენის ვერსია (მოკლე წინადადებები,
 * ერთი აზრი თითოში); „ტექსტური ვერსია“ title + body-დან იკრიბება.
 * @typedef {object} Slide
 * @property {string} id
 * @property {'cover' | 'step' | 'summary'} kind
 * @property {number | null} number    ნაბიჯის ნომერი (`01`), ყდაზე null
 * @property {string} title            46/1.12
 * @property {string} body             24/1.45
 * @property {string} plain
 * @property {Image | null} [image]
 */

/**
 * @typedef {object} Series
 * @property {string} slug
 * @property {string} title
 * @property {SeriesTopic} topic
 * @property {string} excerpt
 * @property {SeriesTone} tone        ყდის ფერი (სოციალურ ქსელშიც იგივე)
 * @property {Image | null} cover      4:3; null — ყდა ტიპოგრაფიულია (tone + სათაური)
 * @property {Status} status
 * @property {string} publishedAt
 * @property {boolean} featured        „რჩეული სერია“
 * @property {Slide[]} slides
 * @property {DocumentFile | null} pdf
 * @property {number} readingMinutes   გამოთვლადი
 */

/** @typedef {Omit<Series, 'slides'> & { slideCount: number }} SeriesSummary */

/* ─── ვიდეო ──────────────────────────────────────────────────────────────── */

/**
 * F10: ვიდეოს წყარო მხოლოდ YouTube-ია (B0) — ინახება id, არა URL (`youtube.js`-ის `parseYouTube`).
 * `adId` — აუდიოაღწერის ვერსია: ცალკე YouTube-ვიდეო, სრული მიქსი (ორიგინალის ხმა + აღწერა),
 * მთავარის სიგრძის (± 1 წმ), რომ ერთი VTT და ერთი ტრანსკრიპტი ორივეს მოერგოს. სათაური და აღწერა
 * YouTube-იდან არ მოდის — რედაქტორი წერს (`title`, `excerpt`). კადრი id-იდან ითვლება
 * (`youtubePoster(id)`), ამიტომ `poster` მოდელში აღარ არის.
 * @typedef {object} VideoYouTube
 * @property {string} id          11 სიმბოლო; mock-ში — `[YouTube-ის id]`
 * @property {string} [adId]      აუდიოაღწერის ვერსია; ≠ id
 */

/**
 * ჩვენი WebVTT ბილიკი (B0.1): ფლეიერი ფაილს თავად კითხულობს და ტექსტს ზოლში აჩვენებს — YouTube-ის
 * საკუთარი სუბტიტრი არ ირთვება. ქართული (`ka`, `default: true`) სავალდებულოა, ინგლისური —
 * არასავალდებულო (`/en`-ზე; თუ არ არის — ქართული `lang="ka"`-ით).
 * `cues` და `end` ატვირთვისას ითვლება (`vtt.js`-ის `summarizeCues`) — ჩეკლისტი ფაილს თავიდან არ
 * კითხულობს; ფაილი, რომელიც პარსერს ვერ გაივლის, საერთოდ არ ინახება.
 * @typedef {object} CaptionTrack
 * @property {'captions' | 'subtitles'} kind
 * @property {Lang} srclang
 * @property {string} label
 * @property {string | null} src       null — ფაილი ატვირთვის მოლოდინშია (mock)
 * @property {boolean} default         ქართული სუბტიტრი ნაგულისხმევად ჩართულია
 * @property {number} [cues]           cue-ების რაოდენობა
 * @property {number} [end]            ბოლო cue-ს დასრულება, წამი
 */

/**
 * @typedef {object} TranscriptLine
 * @property {number} start            წამებში
 * @property {'speech' | 'description'} kind  description — ვიზუალური ინფორმაციის სტრიქონი
 * @property {string} text
 * @property {string} [speaker]
 */

/**
 * @typedef {object} VideoPerson
 * @property {string} name
 * @property {string} role             „მსახიობი“, „ადაპტირებული კალათბურთი“
 */

/**
 * ჟესტური ენის ვერსია B0-დან არ კეთდება (1.2.6, AAA). F7-ის native ფლეიერის ველები (`sources`,
 * `poster`, `signLanguage`, `audioDescription` ფაილი) კონტენტის მოდელში აღარ არის — native
 * adapter-ი მათ თავისი ტიპით (`NativeVideo`, `components/media/sources.js`) იღებს.
 * @typedef {object} Video
 * @property {string} slug
 * @property {string} title            რედაქტორი წერს (YouTube-იდან არ მოდის)
 * @property {string} excerpt          რედაქტორი წერს, ≤ EXCERPT_MAX
 * @property {VideoCategory} category
 * @property {VideoPerson} person
 * @property {number} duration         წამებში, ხელით (ბარათი, `<time>`); ფლეიერი — `getDuration()`
 * @property {Lang} language           სასაუბრო ენა
 * @property {Status} status
 * @property {string} publishedAt
 * @property {boolean} featured        „კვირის ვიდეო“
 * @property {VideoYouTube} youtube
 * @property {CaptionTrack[]} captions
 * @property {TranscriptLine[]} transcript
 * @property {boolean} [visualInAudio]  „ვიზუალური ინფორმაცია აუდიოშიცაა“ — აუდიოაღწერის ვერსია არ სჭირდება
 */

/**
 * @typedef {Omit<Video, 'youtube' | 'captions' | 'transcript'> & {
 *   youtubeId: string | null, hasCaptions: boolean, hasAudioDescription: boolean
 * }} VideoSummary
 */

/* ─── სიახლე და ღონისძიება ──────────────────────────────────────────────── */

/**
 * @typedef {object} NewsAction
 * @property {string} text             „განაცხადი“, „რეგისტრაცია“
 * @property {string | null} href
 */

/**
 * @typedef {object} NewsItem
 * @property {string} slug
 * @property {string} title
 * @property {string} excerpt          ≤ EXCERPT_MAX
 * @property {NewsType} type
 * @property {Image} cover             3:2
 * @property {Status} status
 * @property {string} publishedAt
 * @property {boolean} featured        „რჩეული სიახლე“
 * @property {Block[]} body
 * @property {NewsAction | null} action
 */

/** @typedef {Omit<NewsItem, 'body'>} NewsSummary */

/**
 * @typedef {Page<NewsSummary> & { years: number[] }} NewsPage
 * `years` — წლები, რომლებშიც ამ ტიპის სიახლე არსებობს (წლის ფილტრისთვის), კლებადობით.
 */

/**
 * ხელმისაწვდომობის აღწერა: ყველა ველი სავალდებულოა, რომ „უცნობი“ არასოდეს ჩანდეს „კი“-დ.
 * @typedef {object} EventAccessibility
 * @property {AccessLevel} wheelchair       ეტლით მისადგომობა
 * @property {AccessLevel} signInterpreter  ჟესტური ენის თარჯიმანი
 * @property {AccessLevel} captions         სუბტიტრები (CART / ცოცხალი ტრანსკრიფცია)
 * @property {EventFormat} format           ადგილზე / ონლაინ / ორივე
 * @property {string | null} notes          სხვა: მასალები წინასწარ, სამშვიდო ოთახი…
 */

/**
 * @typedef {object} Event
 * @property {string} slug
 * @property {string} title
 * @property {string} excerpt
 * @property {string} start            ISO, თბილისის ოფსეტით
 * @property {string} end
 * @property {string} location         მისამართი ან ონლაინ პლატფორმა
 * @property {EventAccessibility} accessibility
 * @property {string | null} registrationUrl
 * @property {string | null} newsSlug  დაკავშირებული სიახლე
 * @property {Status} status
 * @property {string} publishedAt
 */

/* ─── ორგანიზაცია ────────────────────────────────────────────────────────── */

/**
 * @typedef {object} TeamMember
 * @property {string} slug
 * @property {string} name
 * @property {string} role
 * @property {string} bio              1–2 წინადადება
 * @property {Image} photo             1:1, თვალის დონე
 * @property {number} order
 */

/**
 * @typedef {object} Partner
 * @property {string} slug
 * @property {string} name
 * @property {PartnerKind} kind
 * @property {Image} logo              alt = პარტნიორის სახელი
 * @property {string | null} url
 */

/**
 * „ჩვენი გზა“ — ეტაპი.
 * @typedef {object} Stage
 * @property {string} id
 * @property {string} year             ტექსტად: „2019“ ან „2019–2020“
 * @property {string} text
 */

/**
 * @typedef {object} OfficeAccessItem
 * @property {OfficeFeature} feature
 * @property {string} value            „საფეხურის გარეშე“, „არის, კარის სიგანე — 90 სმ“
 */

/**
 * @typedef {object} OpeningHours
 * @property {string} label            „ორშაბათი–პარასკევი“
 * @property {string} value            „10:00–18:00“
 */

/**
 * @typedef {object} FaqItem
 * @property {string} id
 * @property {string} question
 * @property {string} answer
 */

/**
 * @typedef {object} SocialLink
 * @property {SocialNetwork} network
 * @property {string | null} url
 */

/**
 * F6: `messenger.url` (WhatsApp / Viber-ის ბმული), `address.embedUrl` (რუკის iframe) და
 * `address.directions` (რუკის ტექსტური ალტერნატივა: როგორ მოგვაგნო). iframe მხოლოდ მაშინ ედება,
 * როცა `embedUrl`-იც და `directions`-იც არის — რუკა ტექსტური ალტერნატივის გარეშე არ ჩნდება.
 * @typedef {object} SiteSettings
 * @property {{
 *   phone: string,
 *   email: string,
 *   messenger: { label: string, value: string, url: string | null },
 *   signVideo: { schedule: string, bookingUrl: string | null },
 *   address: { text: string, mapUrl: string | null, embedUrl: string | null, directions: string },
 * }} contacts
 * @property {OpeningHours[]} hours
 * @property {string} responseTime     „2 სამუშაო დღეში“ — ჩაისმება contact.lead/success-ში
 * @property {OfficeAccessItem[]} officeAccessibility
 * @property {FaqItem[]} faq
 * @property {SocialLink[]} social
 * @property {string} socialHandle     სლაიდის ქვედა ზოლში
 * @property {{ livedExperienceCount: string }} team  მხოლოდ ჯამური რიცხვი; პირად ბარათზე ეს ინფორმაცია არ ინახება
 * @property {{ privacy: string | null, vacancies: string | null, becomePartner: string | null, shareStory: string | null, accessibilityStatement: string | null }} links  F4: + ხელმისაწვდომობის განცხადება (ფუტერი)
 */

/* ─── ფორმები ───────────────────────────────────────────────────────────── */

/**
 * კონტაქტის ფორმა. დიაგნოზს არ ვეკითხებით — მხოლოდ იმას, როგორ ვუპასუხოთ და რა მხარდაჭერა
 * სჭირდება კომუნიკაციას (F6: `support`, თავისუფალი ტექსტი, არასავალდებულო).
 * `website` — honeypot: ადამიანისთვის უხილავი ველი (ასისტიური ტექნოლოგიისთვისაც დამალული),
 * რომელსაც მხოლოდ ბოტი ავსებს; შევსებულ შეტყობინებას სერვერი ჩუმად აგდებს (CAPTCHA არ არის).
 * @typedef {object} ContactPayload
 * @property {string} name
 * @property {string} contact          ტელეფონი ან ელფოსტა
 * @property {ContactTopic} topic
 * @property {string} message
 * @property {string} [support]        კომუნიკაციის მხარდაჭერა: თარჯიმანი, მარტივი ენა…
 * @property {ReplyChannel} replyVia
 * @property {boolean} consent
 * @property {string} [website]        honeypot — ცარიელი უნდა იყოს
 */

/** @typedef {{ ok: true, id: string }} ContactResult */
/**
 * B6 — double opt-in: `subscribe` → `pending` (ბმული ელფოსტაზე; პასუხი იგივეა უკვე გამოწერილ
 * მისამართზეც), `confirmSubscription` → `confirmed`, `unsubscribe` → `{ ok }` (ჩანაწერი იშლება).
 * @typedef {{ ok: true, status: 'pending' }} SubscribeResult
 * @typedef {{ ok: true, status: 'confirmed' }} ConfirmResult
 * @typedef {{ ok: true }} UnsubscribeResult
 */

/* ─── ერთიანი ნაკრები ───────────────────────────────────────────────────── */

/**
 * ყველა კონტენტი ერთად: mock-ის მონაცემები და validateContent-ის შესავალი.
 * @typedef {object} ContentSnapshot
 * @property {Article[]} articles
 * @property {Series[]} series
 * @property {Video[]} videos
 * @property {NewsItem[]} news
 * @property {Event[]} events
 * @property {TeamMember[]} team
 * @property {Partner[]} partners
 * @property {Stage[]} stages
 * @property {SiteSettings} settings
 */
