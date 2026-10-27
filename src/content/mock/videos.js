import { slugify } from '../slug.js';

import { image, tbilisi } from './helpers.js';

/** @typedef {import('../model.js').Video} Video */
/** @typedef {import('../model.js').TranscriptLine} TranscriptLine */
/** @typedef {import('../taxonomy.js').VideoCategory} VideoCategory */

/**
 * VideosPage / HomePage დაფების ექვსი ისტორია. ხანგრძლივობა დაფის `[04:30]`-ის მსგავსი
 * სინთეზური რიცხვია (წამებში), რომ ფლეიერის პროგრესი და ტრანსკრიპტი შემოწმდეს.
 * @type {{ title: string, slugFrom: string, excerpt: string, category: VideoCategory,
 *   role: string, poster: string, duration: number, featured?: boolean }[]}
 */
const ENTRIES = [
  {
    title: '[სახელი: როგორ გავხდი ვებ-დეველოპერი]',
    slugFrom: 'rogor gavkhdi veb-developeri',
    excerpt:
      '[პირველი კურსიდან პირველ კონტრაქტამდე — რა გამოდგა ყველაზე რთული, ვინ დამეხმარა და რას ვურჩევდი მათ, ვინც ახლა იწყებს.]',
    category: 'career',
    role: '[ვებ-დეველოპერი]',
    poster:
      '[ვიდეოს კადრი: თვალის დონე, მოქმედების მომენტი — მონაწილე ოფისში კოდს წერს ეკრანის მკითხველით და ყურსასმენით]',
    duration: 270,
    featured: true,
  },
  {
    title: '[სპორტი, რომელმაც ცხოვრება შეცვალა]',
    slugFrom: 'sporti-romelmats-tskhovreba-shetsvala',
    excerpt: '[ადაპტირებული კალათბურთი: პირველი ვარჯიშიდან პირველ ოფიციალურ მატჩამდე.]',
    category: 'sport',
    role: '[ადაპტირებული კალათბურთი]',
    poster:
      '[ვიდეოს კადრი: თვალის დონე, მოქმედების მომენტი — ვარჯიში დარბაზში, მოთამაშე ბურთს კალათში აგდებს]',
    duration: 192,
  },
  {
    title: '[ჩემი ხმა სცენაზე]',
    slugFrom: 'chemi-khma-stsenaze',
    excerpt: '[მსახიობის ისტორია: როგორ შეიქმნა სპექტაკლი, სადაც ჟესტური ენა სცენის ენაა.]',
    category: 'art',
    role: '[მსახიობი]',
    poster:
      '[ვიდეოს კადრი: თვალის დონე, მოქმედების მომენტი — მსახიობი სცენაზე ჟესტურ ენაზე თამაშობს, პროჟექტორის შუქში]',
    duration: 305,
  },
  {
    title: '[ქალაქი ყველასთვის]',
    slugFrom: 'kalaki-qvelastvis',
    excerpt: '[აქტივისტი ქალაქის ბარიერებს რუკაზე აღრიცხავს და მათ გამოსწორებას ითხოვს.]',
    category: 'achievements',
    role: '[აქტივისტი]',
    poster:
      '[ვიდეოს კადრი: თვალის დონე, მოქმედების მომენტი — ქუჩაში პანდუსის გაზომვა, აქტივისტი ჩანაწერს აკეთებს]',
    duration: 400,
  },
  {
    title: '[ფერებით მოყოლილი ისტორია]',
    slugFrom: 'perebit-moqolili-istoria',
    excerpt: '[მხატვრის სახელოსნო: როგორ იბადება ნახატი და რას ნიშნავს პირველი გამოფენა.]',
    category: 'art',
    role: '[მხატვარი]',
    poster: '[ვიდეოს კადრი: თვალის დონე, მოქმედების მომენტი — სახელოსნო, მხატვარი ტილოზე მუშაობს]',
    duration: 228,
  },
  {
    title: '[დამოუკიდებლობის პატარა ნაბიჯები]',
    slugFrom: 'damoukideblobis-patara-nabijebi',
    excerpt:
      '[სტუდენტის ყოველდღიურობა: უნივერსიტეტი, საზოგადოებრივი ტრანსპორტი და საკუთარი გრაფიკი.]',
    category: 'everyday',
    role: '[სტუდენტი]',
    poster:
      '[ვიდეოს კადრი: თვალის დონე, მოქმედების მომენტი — სტუდენტი უნივერსიტეტის ეზოში მეგობრებთან ერთად]',
    duration: 330,
  },
];

/**
 * ტრანსკრიპტი: საუბარი + აუდიოაღწერის სტრიქონები, თანაბრად განაწილებული.
 * @param {number} duration
 * @returns {TranscriptLine[]}
 */
function transcript(duration) {
  const step = Math.floor(duration / 6);
  return [
    {
      start: 0,
      kind: 'description',
      text: '[აუდიოაღწერა: რა ჩანს პირველ კადრში — ადგილი, ადამიანი, მოქმედება.]',
    },
    {
      start: 4,
      kind: 'speech',
      speaker: '[სახელი]',
      text: '[პირველი ფრაზა — მონაწილის სიტყვები, ზუსტად ისე, როგორც ითქვა.]',
    },
    {
      start: step * 2,
      kind: 'speech',
      speaker: '[სახელი]',
      text: '[ტრანსკრიპტის ტექსტი — მონაწილის სიტყვები, დროის ნიშნულებით. აბზაცი 1–3 წინადადებაა, რომ კითხვისას თვალი არ დაიკარგოს.]',
    },
    {
      start: step * 3,
      kind: 'description',
      text: '[აუდიოაღწერა: კადრში ჩანს სამუშაო მაგიდა და ორი ეკრანი.]',
    },
    {
      start: step * 4,
      kind: 'speech',
      speaker: '[სახელი]',
      text: '[ტრანსკრიპტის ტექსტი — რჩევა მათთვის, ვინც ახლა იწყებს, მონაწილის სიტყვებით.]',
    },
    {
      start: step * 5,
      kind: 'speech',
      speaker: '[სახელი]',
      text: '[ბოლო ფრაზა — ვიდეოს დასასრული.]',
    },
  ];
}

/**
 * @param {number} now
 * @returns {Video[]}
 */
export function createVideos(now) {
  return ENTRIES.map((entry, i) => ({
    slug: slugify(entry.slugFrom),
    title: entry.title,
    excerpt: entry.excerpt,
    category: entry.category,
    person: { name: '[სახელი გვარი]', role: entry.role },
    poster: image(entry.poster, '16:9'),
    duration: entry.duration,
    language: 'ka',
    status: 'published',
    publishedAt: tbilisi(now, -(3 + i * 11), '12:00'),
    featured: entry.featured === true,
    sources: [{ src: null, type: 'video/mp4' }],
    captions: [{ kind: 'captions', srclang: 'ka', label: 'ქართული', src: null, default: true }],
    audioDescription: { src: null, srclang: 'ka', label: 'აუდიოაღწერა' },
    signLanguage: { src: null, label: '[ქართული ჟესტური ენა]' },
    transcript: transcript(entry.duration),
  }));
}
