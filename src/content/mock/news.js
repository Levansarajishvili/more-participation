import { slugify } from '../slug.js';

import { image, linkBlock, p, tbilisi } from './helpers.js';

/** @typedef {import('../model.js').NewsItem} NewsItem */
/** @typedef {import('../model.js').Event} Event */
/** @typedef {import('../model.js').Status} Status */
/** @typedef {import('../taxonomy.js').NewsType} NewsType */
/** @typedef {import('../model.js').EventAccessibility} EventAccessibility */

/**
 * NewsPage / HomePage დაფების სიახლეები + იმავე ტიპის თემები. თარიღები `now`-დან
 * 3–800 დღით უკანაა, ანუ ყოველთვის სამ კალენდარულ წელს მოიცავს (წლის ფილტრი).
 * @type {{ title: string, excerpt: string, type: NewsType, alt: string, days: number,
 *   featured?: boolean, action?: string, status?: Status }[]}
 */
const NEWS = [
  {
    title: '[ციფრული უნარების აკადემიის ახალი ნაკადი იხსნება]',
    excerpt:
      '[განაცხადების მიღება მიმდინარეობს თარიღამდე. სწავლება ონლაინ და ოფლაინ, ჟესტური ენის თარჯიმნით.]',
    type: 'announcement',
    alt: '[ახალი ნაკადის გახსნა: მონაწილეები და ტრენერი კომპიუტერულ კლასში]',
    days: -3,
    featured: true,
    action: '[განაცხადის შევსება]',
  },
  {
    title: '[ინკლუზიური დასაქმების ფორუმი ქალაქში]',
    excerpt: '[დამსაქმებლები და კანდიდატები ერთ სივრცეში — რეგისტრაცია ღიაა.]',
    type: 'event',
    alt: '[ფორუმის დარბაზი, მონაწილეები სტენდებთან საუბრობენ]',
    days: -12,
    action: '[ფორუმზე რეგისტრაცია]',
  },
  {
    title: '[ხელმისაწვდომი ქალაქის რუკა: პირველი 00 ობიექტი]',
    excerpt: '[მონაწილეებმა ქალაქის ცენტრში ბარიერები აღრიცხეს და რუკაზე გამოაქვეყნეს.]',
    type: 'program',
    alt: '[საველე მუშაობა: მონაწილე შენობის შესასვლელს ზომავს]',
    days: -25,
  },
  {
    title: '[მედია: ჩვენი მონაწილის ინტერვიუ]',
    excerpt: '[როგორ გახდა მონაწილე პროფესიონალი და რა შეცვალა მისთვის მენტორობამ.]',
    type: 'media',
    alt: '[ინტერვიუ სტუდიაში, მონაწილე და ჟურნალისტი მიკროფონებთან]',
    days: -40,
  },
  {
    title: '[მოხალისეთა მიღება ღიაა]',
    excerpt: '[გვჭირდება დიზაინერები, დეველოპერები, იურისტები და ტრენერები.]',
    type: 'announcement',
    alt: '[გუნდი მაგიდის გარშემო გეგმას განიხილავს]',
    days: -70,
    action: '[მოხალისედ რეგისტრაცია]',
  },
  {
    title: '[პარტნიორობა კომპანიასთან: 00 სტაჟირების ადგილი]',
    excerpt: '[სამთვიანი ანაზღაურებადი სტაჟირება, მენტორის თანხლებით.]',
    type: 'program',
    alt: '[სტაჟიორი ოფისში მენტორთან ერთად ეკრანს უყურებს]',
    days: -110,
  },
  {
    title: '[ღია კარის დღე ოფისში]',
    excerpt: '[მოდი, გაიცანი გუნდი და პროგრამები — რეგისტრაციის გარეშე.]',
    type: 'event',
    alt: '[ოფისის შესასვლელი, სტუმრებს გუნდის წევრი ხვდება]',
    days: -160,
  },
  {
    title: '[მენტორობის პროგრამის შედეგები]',
    excerpt: '[წლის შეჯამება: რამდენმა მონაწილემ იპოვა სამსახური და რა ისწავლა გუნდმა.]',
    type: 'program',
    alt: '[მენტორი და მონაწილე ერთად ზიან და საუბრობენ]',
    days: -220,
  },
  {
    title: '[რადიოინტერვიუ: ხელმისაწვდომი განათლება]',
    excerpt:
      '[გუნდის წევრი რადიოეთერში ხელმისაწვდომ სწავლებასა და გონივრულ მისადაგებაზე საუბრობს.]',
    type: 'media',
    alt: '[რადიოსტუდია, სტუმარი მიკროფონთან საუბრობს]',
    days: -300,
  },
  {
    title: '[ახალი პარტნიორობა]',
    excerpt: '[ახალი პარტნიორი ორგანიზაცია და ერთობლივი პროგრამა — დეტალები სრულ ტექსტში.]',
    type: 'announcement',
    alt: '[ორი ორგანიზაციის წარმომადგენლები ხელს ართმევენ ერთმანეთს]',
    days: -380,
  },
  {
    title: '[სემინარი: ჩვევა და მოტივაცია — ჩანაწერი]',
    excerpt: '[სემინარის ჩანაწერი სუბტიტრებითა და ჟესტური ენით უკვე ხელმისაწვდომია.]',
    type: 'event',
    alt: '[ონლაინ სემინარის ეკრანი, კუთხეში ჟესტური ენის თარჯიმანი]',
    days: -450,
  },
  {
    title: '[ციფრული უნარების აკადემია: პირველი ნაკადის დასრულება]',
    excerpt: '[პირველმა ნაკადმა სწავლა დაასრულა — მონაწილეები საკუთარ პროექტებს წარადგენენ.]',
    type: 'program',
    alt: '[მონაწილე ეკრანზე საკუთარ პროექტს წარადგენს]',
    days: -520,
  },
  {
    title: '[ვებგვერდის ახალი ვერსია: ხმოვანი და კონტრასტული რეჟიმები]',
    excerpt:
      '[თავსებადობის მენიუ: შრიფტის ზომა, კონტრასტი, სტრიქონებს შორის მანძილი და ხმოვანი რეჟიმი.]',
    type: 'announcement',
    alt: '[ლეპტოპის ეკრანზე საიტი მაღალი კონტრასტის რეჟიმში]',
    days: -600,
  },
  {
    title: '[ტელესიუჟეტი: სტაჟირების ისტორიები]',
    excerpt: '[სიუჟეტი სამ სტაჟიორზე — მათივე სიტყვებით.]',
    type: 'media',
    alt: '[ოპერატორი კამერით იღებს სტაჟიორს სამუშაო ადგილზე]',
    days: -700,
  },
  {
    title: '[ზაფხულის სკოლა: ლიდერობა და ადვოკატირება]',
    excerpt: '[ხუთდღიანი სკოლა ახალგაზრდებისთვის: საჯარო გამოსვლა, კამპანია და გუნდური მუშაობა.]',
    type: 'event',
    alt: '[ზაფხულის სკოლის მონაწილეები ეზოში ჯგუფურ სავარჯიშოს ასრულებენ]',
    days: -800,
  },
  {
    title: '[მონახაზი: გუნდის ახალი წევრი]',
    excerpt: '[მონახაზი — საჯაროდ არ ჩანს.]',
    type: 'announcement',
    alt: '[გუნდის ახალი წევრის პორტრეტი]',
    days: -1,
    status: 'draft',
  },
];

/**
 * @param {number} now
 * @returns {NewsItem[]}
 */
export function createNews(now) {
  return NEWS.map((entry) => ({
    slug: slugify(entry.title),
    title: entry.title,
    excerpt: entry.excerpt,
    type: entry.type,
    cover: image(entry.alt, '3:2'),
    status: entry.status ?? 'published',
    publishedAt: tbilisi(now, entry.days, '09:30'),
    featured: entry.featured === true,
    body: [
      p(
        '[სიახლის ტექსტი: რა მოხდა ან რა იგეგმება, ვისთვისაა, როდის და სად. ორი-სამი მოკლე აბზაცი; ვადა და რეგისტრაციის გზა პირველივე აბზაცშია.]',
      ),
      p(
        '[მეორე აბზაცი: ხელმისაწვდომობის დეტალები — თარჯიმანი, ფორმატი, მისადგომობა — და საკონტაქტო გზა კითხვებისთვის.]',
      ),
      linkBlock('[კონტაქტი: კითხვები ამ სიახლეზე]', '/contact'),
    ],
    action: entry.action ? { text: entry.action, href: null } : null,
  }));
}

/** @type {Record<'office' | 'venue' | 'online' | 'hybrid', EventAccessibility>} */
const ACCESS = {
  office: {
    wheelchair: 'yes',
    signInterpreter: 'yes',
    captions: 'on-request',
    format: 'in-person',
    notes: '[მასალები წინასწარ, მარტივ ენაზე; სამშვიდო ოთახი]',
  },
  venue: {
    wheelchair: 'yes',
    signInterpreter: 'yes',
    captions: 'yes',
    format: 'in-person',
    notes: '[სადარბაზოში ლიფტი; რეგისტრაციის მაგიდასთან დამხმარე]',
  },
  online: {
    wheelchair: 'not-applicable',
    signInterpreter: 'yes',
    captions: 'yes',
    format: 'online',
    notes: '[ჩანაწერი სუბტიტრებით ღონისძიებიდან ერთ კვირაში]',
  },
  hybrid: {
    wheelchair: 'yes',
    signInterpreter: 'on-request',
    captions: 'yes',
    format: 'hybrid',
    notes: null,
  },
};

/**
 * NewsPage დაფის „მომავალი ღონისძიებები“ + ერთი ჰიბრიდული და ორი გასული.
 * @param {number} now
 * @returns {Event[]}
 */
export function createEvents(now) {
  /** @type {{ title: string, excerpt: string, location: string, days: number, from: string, to: string, access: EventAccessibility }[]} */
  const entries = [
    {
      title: '[ინკლუზიური დასაქმების ფორუმი]',
      excerpt:
        '[დამსაქმებლები და კანდიდატები ერთ სივრცეში: გასაუბრებები, სემინარები, კონსულტაციები.]',
      location: '[მისამართი, ქალაქი]',
      days: 9,
      from: '10:00',
      to: '16:00',
      access: ACCESS.venue,
    },
    {
      title: '[სემინარი: ჩვევა და მოტივაცია]',
      excerpt: '[ონლაინ სემინარი სერიის „ჩვევა — 5 ნაბიჯი“ მიხედვით.]',
      location: '[ონლაინ, პლატფორმა]',
      days: 16,
      from: '18:00',
      to: '19:30',
      access: ACCESS.online,
    },
    {
      title: '[ღია კარის დღე]',
      excerpt: '[გაიცანი გუნდი და პროგრამები — რეგისტრაციის გარეშე.]',
      location: '[ოფისი, მისამართი]',
      days: 30,
      from: '12:00',
      to: '17:00',
      access: ACCESS.office,
    },
    {
      title: '[ტრენინგი: ხელმისაწვდომი დოკუმენტები]',
      excerpt: '[პრაქტიკული ტრენინგი: სათაურები, alt-ტექსტი და კონტრასტი Word-სა და PDF-ში.]',
      location: '[ოფისი, მისამართი · ონლაინ, პლატფორმა]',
      days: 44,
      from: '11:00',
      to: '14:00',
      access: ACCESS.hybrid,
    },
    {
      title: '[ზაფხულის სკოლა: ლიდერობა]',
      excerpt: '[გასული ღონისძიება — ჩანაწერი და მასალები სიახლეებშია.]',
      location: '[მისამართი, ქალაქი]',
      days: -60,
      from: '10:00',
      to: '17:00',
      access: ACCESS.venue,
    },
    {
      title: '[ციფრული უნარების აკადემიის გახსნა]',
      excerpt: '[გასული ღონისძიება — ახალი ნაკადის გახსნა.]',
      location: '[ოფისი, მისამართი]',
      days: -120,
      from: '15:00',
      to: '17:00',
      access: ACCESS.office,
    },
  ];

  return entries.map((entry) => ({
    slug: slugify(entry.title),
    title: entry.title,
    excerpt: entry.excerpt,
    start: tbilisi(now, entry.days, entry.from),
    end: tbilisi(now, entry.days, entry.to),
    location: entry.location,
    accessibility: { ...entry.access },
    registrationUrl: null,
    newsSlug: null,
    status: 'published',
    publishedAt: tbilisi(now, Math.min(entry.days, 0) - 20),
  }));
}
