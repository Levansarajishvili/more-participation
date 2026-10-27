import { listArticles, listNews, listSeries, listVideos } from '@/content/adapter.js';
import { useContent } from '@/hooks/useContent.js';

/** მთავარი გვერდის რაოდენობები (HomePage დაფა): 3 უახლესი სტატია, 4 სერია, 3 ვიდეო, 3 სიახლე. */
export const HOME_LIMITS = Object.freeze({ articles: 3, series: 4, videos: 3, news: 3 });

/**
 * მთავარი გვერდის ოთხი მოთხოვნა. თითოეულს საკუთარი მდგომარეობა აქვს (ერთის შეცდომა დანარჩენს
 * არ აჩერებს). ვიდეოების სია ერთხელ მოდის: ჰეროს „კვირის ვიდეო“ და „ვიდეო-ისტორიები“ მას იყოფენ;
 * რაოდენობები ჰეროს შესასვლელებისთვისაა (`total` / სიგრძე).
 *
 * @returns {{
 *   articles: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').Page<import('@/content/model.js').ArticleSummary>>,
 *   series: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').SeriesSummary[]>,
 *   videos: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').VideoSummary[]>,
 *   news: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').NewsPage>,
 * }}
 */
export function useHomeContent() {
  const articles = useContent(() => listArticles({ limit: HOME_LIMITS.articles }), []);
  const series = useContent(() => listSeries(), []);
  const videos = useContent(() => listVideos(), []);
  const news = useContent(() => listNews({ limit: HOME_LIMITS.news }), []);
  return { articles, series, videos, news };
}

/**
 * კვირის ვიდეო = რჩეული (`featured`), თუ არ არის — უახლესი. „ვიდეო-ისტორიები“ მას აღარ
 * იმეორებს (დაფაზე ერთი ვიდეო ორჯერ ჩანდა).
 * @param {import('@/content/model.js').VideoSummary[] | undefined} list
 */
export function splitVideos(list = []) {
  const weekly = list.find((video) => video.featured) ?? list[0] ?? null;
  const rest = list.filter((video) => video !== weekly).slice(0, HOME_LIMITS.videos);
  return { weekly, rest };
}
