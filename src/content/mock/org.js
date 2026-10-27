import { image, pad2 } from './helpers.js';

/** @typedef {import('../model.js').TeamMember} TeamMember */
/** @typedef {import('../model.js').Partner} Partner */
/** @typedef {import('../model.js').Stage} Stage */
/** @typedef {import('../model.js').SiteSettings} SiteSettings */
/** @typedef {import('../taxonomy.js').PartnerKind} PartnerKind */

/** AboutPage დაფის რვა როლი. */
const ROLES = [
  '[დამფუძნებელი]',
  '[პროგრამების ხელმძღვანელი]',
  '[ხელმისაწვდომობის სპეციალისტი]',
  '[მენტორობის კოორდინატორი]',
  '[კომუნიკაციები]',
  '[პარტნიორობა და ფანდრეიზინგი]',
  '[ტრენერი]',
  '[მოხალისეთა კოორდინატორი]',
];

/**
 * ფოტოს მიმართულება (F5): თვალის დონე, მოქმედების მომენტი, სამუშაო გარემო. ჯამში გუნდის
 * ფოტოებზე ჩანს ჟესტური ენა, ეკრანის მკითხველი და მარტივი ენის მასალა — შეზღუდვა პირად ბარათზე
 * არ იწერება, მრავალფეროვნებას კადრის მოქმედება აჩვენებს.
 */
const PHOTO_DIRECTIONS = [
  'უძღვება გუნდის შეხვედრას',
  'ჟესტურ ენაზე უხსნის კოლეგებს პროგრამის გეგმას',
  'ეკრანის მკითხველით და ყურსასმენით ამოწმებს საიტის ხელმისაწვდომობას',
  'მენტორობის შეხვედრა მონაწილესთან',
  'ღონისძიებაზე იღებს ვიდეოს',
  'პარტნიორთან შეხვედრაზე წარადგენს პროექტს',
  'ტრენინგს უძღვება მარტივი ენის სლაიდებით',
  'მოხალისეებთან ერთად ამზადებს ღონისძიების სივრცეს',
];

/** @returns {TeamMember[]} */
export function createTeam() {
  return ROLES.map((role, i) => ({
    slug: `team-${pad2(i + 1)}`,
    name: '[სახელი გვარი]',
    role,
    bio: '[მოკლე ბიო — 1–2 წინადადება: რას აკეთებს გუნდში და რა მიმართულებას ხელმძღვანელობს.]',
    photo: image(
      `[ფოტო: თვალის დონე, მოქმედების მომენტი — ${PHOTO_DIRECTIONS[i % PHOTO_DIRECTIONS.length]}]`,
      '1:1',
    ),
    order: i + 1,
  }));
}

/** @type {readonly PartnerKind[]} */
const KIND_CYCLE = ['company', 'donor', 'organization'];

/** AboutPage დაფის 12 ლოგოს ადგილი. @returns {Partner[]} */
export function createPartners() {
  return Array.from({ length: 12 }, (_, i) => ({
    slug: `partner-${pad2(i + 1)}`,
    name: `[პარტნიორი ${pad2(i + 1)}]`,
    kind: KIND_CYCLE[i % KIND_CYCLE.length],
    logo: image(`[პარტნიორი ${pad2(i + 1)}]`, '3:2'),
    url: null,
  }));
}

/** „ჩვენი გზა“ — AboutPage დაფის ოთხი ეტაპი. @returns {Stage[]} */
export function createStages() {
  return [
    '[ორგანიზაცია დაფუძნდა — პირველი ტრენინგები ქალაქში.]',
    '[დაიწყო ციფრული უნარების აკადემია და მენტორობის პროგრამა.]',
    '[პარტნიორობა 00 კომპანიასთან — პირველი სტაჟირებები.]',
    '[ხელმისაწვდომი ქალაქის რუკა და ადვოკატირების მიმართულება.]',
  ].map((text, i) => ({ id: `stage-${i + 1}`, year: '[წელი]', text }));
}

/** ContactPage დაფის მონაცემები; ყველა ფაქტი ფრჩხილებშია, ბმულები — null. @returns {SiteSettings} */
export function createSettings() {
  return {
    contacts: {
      phone: '[ტელეფონი]',
      email: '[ელფოსტა]',
      messenger: { label: '[WhatsApp / Viber]', value: '[ნომერი] — ტექსტი, ხმა ან ვიდეო' },
      signVideo: { schedule: '[დღე, საათი] — თარჯიმნით', bookingUrl: null },
      address: { text: '[მისამართი]', mapUrl: null },
    },
    hours: [
      { label: '[ორშაბათი–პარასკევი]', value: '[10:00–18:00]' },
      { label: '[ვიდეოზარი ჟესტურ ენაზე]', value: '[დღე, საათი]' },
    ],
    responseTime: '[2 სამუშაო დღეში]',
    officeAccessibility: [
      { feature: 'entrance', value: '[საფეხურის გარეშე / პანდუსით]' },
      { feature: 'elevator', value: '[არის, კარის სიგანე — 00 სმ]' },
      { feature: 'restroom', value: '[ადაპტირებული]' },
      { feature: 'parking', value: '[შშმ პირებისთვის — 0 ადგილი]' },
      { feature: 'transit', value: '[გაჩერების სახელი, მანძილი]' },
      { feature: 'guide-dog', value: '[დაშვებულია]' },
    ],
    faq: [
      {
        id: 'response-time',
        question: '[რამდენ ხანში მიპასუხებთ?]',
        answer: '[სამუშაო დღეებში — 2 დღის განმავლობაში. სასწრაფო საკითხზე დაგვირეკე.]',
      },
      {
        id: 'sign-language',
        question: '[შემიძლია ჟესტურ ენაზე დაკავშირება?]',
        answer: '[დიახ: დაჯავშნე ვიდეოზარი ან გამოგვიგზავნე ვიდეომესიჯი პლატფორმაზე.]',
      },
      {
        id: 'volunteer',
        question: '[როგორ გავხდე მოხალისე?]',
        answer: '[ამ ფორმაში აირჩიე თემა „მოხალისეობა“ ან შეავსე განაცხადი „ჩაერთე“ გვერდზე.]',
      },
    ],
    social: [
      { network: 'facebook', url: null },
      { network: 'instagram', url: null },
      { network: 'youtube', url: null },
    ],
    socialHandle: '[@მეტიჩართულობა]',
    team: { livedExperienceCount: '[N]' },
    links: {
      privacy: null,
      vacancies: null,
      becomePartner: null,
      shareStory: null,
      accessibilityStatement: null,
    },
  };
}
