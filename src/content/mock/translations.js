/**
 * F9: mock-ის ინგლისური ვერსიები (`translations.en`). ფაქტი აქაც არ არის — ქართული placeholder-ის
 * თარგმანია, იგივე `[ფრჩხილებით]`. განზრახ ნაწილობრივია: ზოგი მასალა თარგმნილია, ზოგი — არა,
 * რომ ინგლისურ საიტზე ორივე მდგომარეობა ჩანდეს (თარგმანის გარეშე — ქართულად, „In Georgian“).
 */

/** @typedef {import('../model.js').ContentSnapshot} ContentSnapshot */

const BODY = [
  {
    type: 'p',
    content: [
      {
        type: 'text',
        text: '[Introduction: two or three sentences on the situation the article covers and what the reader takes away by the end.]',
      },
    ],
  },
  { type: 'h2', text: '[Subheading 1: four to seven words, the idea at a glance]' },
  {
    type: 'p',
    content: [
      {
        type: 'text',
        text: '[Paragraph: one idea and one example. Practical steps first, then the reason.] ',
      },
      {
        type: 'link',
        text: '[How to turn failure into learning]',
        href: '/articles/rogor-vaktsiot-tsarumatebloba-stsavlad',
      },
    ],
  },
  { type: 'h2', text: '[Subheading 2]' },
  {
    type: 'list',
    ordered: false,
    items: [[{ type: 'text', text: '[First step]' }], [{ type: 'text', text: '[Second step]' }]],
  },
];

/** @type {Record<string, Record<string, Record<string, unknown>>>} */
const EN = {
  articles: {
    'zrdis-azrovneba-ratom-aris-jer-qvelaze-dzlieri-sitqva': {
      title: '[Growth mindset: why “yet” is the strongest word]',
      excerpt:
        '[“I can’t do this” and “I can’t do this yet” — a one-word difference that changes every challenge.]',
      author: '[Author’s full name]',
      cover: {
        alt: '[A participant sits at a table with a mentor; both look at a laptop screen and laugh]',
      },
      body: BODY,
    },
    'rogor-vaktsiot-tsarumatebloba-stsavlad': {
      title: '[How to turn failure into learning]',
      excerpt: '[Five growth-mindset practices for everyday situations.]',
      author: '[Author’s full name]',
      body: BODY,
    },
    'pirveli-gasaubreba-rogor-visaubrot-sachiroebebze': {
      title: '[First interview: how to talk about your needs]',
      excerpt: '[Confidently and calmly — with practical phrases you can use in an interview.]',
      author: '[Author’s full name]',
      body: BODY,
    },
  },
  news: {
    'tsipruli-unarebis-akademiis-akhali-nakadi-ikhsneba': {
      title: '[A new cohort of the Digital Skills Academy opens]',
      excerpt:
        '[Applications are open until the deadline. Online and in-person teaching, with a sign language interpreter.]',
      body: [{ type: 'p', content: [{ type: 'text', text: '[News text in English.]' }] }],
    },
    'inkluziuri-dasakmebis-porumi-kalakshi': {
      title: '[Inclusive employment forum in the city]',
      excerpt: '[Employers and candidates in one space — registration is open.]',
    },
  },
  series: {
    'chveva-5-nabiji': {
      title: '[Habit — 5 steps]',
      excerpt: '[How a habit forms and how it stays. Practical steps you can try in a week.]',
      slides: [
        {
          title: '[Habit]',
          body: '[How a habit forms and how it stays — 5 steps.]',
          plain: '[Simply put: a habit is what we do every day. Here are 5 steps to a new habit.]',
        },
      ],
    },
  },
  videos: {
    'rogor-gavkhdi-veb-developeri': {
      title: '[Name: how I became a web developer]',
      excerpt:
        '[From the first course to the first contract — what was hardest, who helped and what I would advise.]',
      person: { role: '[Web developer]' },
      poster: {
        alt: '[Video still: eye level, a moment of action — the participant writes code in an office with a screen reader and headphones]',
      },
      transcript: [
        {
          text: '[Audio description: what the first shot shows — the place, the person, the action.]',
        },
      ],
    },
  },
  events: {
    'inkluziuri-dasakmebis-porumi': {
      title: '[Inclusive employment forum]',
      excerpt: '[Employers and candidates in one space: interviews, seminars, consultations.]',
      location: '[Address, city]',
      accessibility: {
        notes: '[A lift in the entrance hall; an assistant at the registration desk]',
      },
    },
    'ghia-karis-dghe': {
      title: '[Open day]',
      excerpt: '[Meet the team and the programmes — no registration needed.]',
    },
  },
};

/** @type {Record<string, unknown>} */
const SETTINGS_EN = {
  responseTime: '[within 2 working days]',
  hours: [
    { label: '[Monday–Friday]' },
    { label: '[Video call in sign language]', value: '[day, time]' },
  ],
  contacts: {
    address: {
      text: '[Address]',
      directions:
        '[How to find us: the nearest stop and the distance, the entrance from the street, the floor and a landmark in the building.]',
    },
  },
  officeAccessibility: [
    { value: '[No steps / with a ramp]' },
    { value: '[Yes, door width — 00 cm]' },
    { value: '[Adapted]' },
    { value: '[For persons with disabilities — 0 spaces]' },
    { value: '[Stop name, distance]' },
  ],
  faq: [
    {
      question: '[How soon will you reply?]',
      answer: '[On working days — within 2 days. For an urgent matter, call us.]',
    },
    {
      question: '[Can I contact you in sign language?]',
      answer: '[Yes: book a video call or send us a video message on the platform.]',
    },
  ],
};

/**
 * @param {ContentSnapshot} data
 * @returns {ContentSnapshot}
 */
export function applyTranslations(data) {
  /** @param {string} collection @param {any[]} list */
  const each = (collection, list) =>
    list.map((item) =>
      EN[collection]?.[item.slug]
        ? { ...item, translations: { en: structuredClone(EN[collection][item.slug]) } }
        : item,
    );
  return {
    ...data,
    articles: each('articles', data.articles),
    news: each('news', data.news),
    series: each('series', data.series),
    videos: each('videos', data.videos),
    events: each('events', data.events),
    // გუნდი: როლი და ფოტოს alt — პირველ სამ წევრს; პარტნიორები თარგმანის გარეშე
    team: data.team.map((member, i) =>
      i < 3
        ? {
            ...member,
            translations: {
              en: {
                role: ['[Founder]', '[Head of programmes]', '[Accessibility specialist]'][i],
                photo: { alt: '[Photo: eye level, the team member at work]' },
              },
            },
          }
        : member,
    ),
    settings: { ...data.settings, translations: { en: structuredClone(SETTINGS_EN) } },
  };
}
