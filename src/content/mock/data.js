import { createArticles } from './articles.js';
import { createEvents, createNews } from './news.js';
import { createPartners, createSettings, createStages, createTeam } from './org.js';
import { createSeries } from './series.js';
import { createVideos } from './videos.js';
import { applyTranslations } from './translations.js';

/** @typedef {import('../model.js').ContentSnapshot} ContentSnapshot */

/**
 * mock-ის სრული ნაკრები. დეტერმინისტულია: ერთი და იგივე `now` → ერთი და იგივე მონაცემი
 * (ტესტები ფიქსირებულ `now`-ს გადასცემენ).
 * @param {{ now?: number }} [options]
 * @returns {ContentSnapshot}
 */
export function createMockData({ now = Date.now() } = {}) {
  // F9: ინგლისური ვერსიები — ნაწილი მასალისა (translations.js)
  return applyTranslations({
    articles: createArticles(now),
    series: createSeries(now),
    videos: createVideos(now),
    news: createNews(now),
    events: createEvents(now),
    team: createTeam(),
    partners: createPartners(),
    stages: createStages(),
    settings: createSettings(),
  });
}
