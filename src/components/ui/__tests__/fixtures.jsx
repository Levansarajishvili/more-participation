import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { createMockData } from '@/content/mock/data.js';
import {
  toArticleSummary,
  toNewsSummary,
  toSeriesSummary,
  toVideoSummary,
  withArticleDerived,
  withSeriesDerived,
} from '@/content/query.js';

/** ფიქსირებული „ახლა“ — mock-ის თარიღები მასზეა მიბმული. */
export const NOW = Date.parse('2026-10-26T10:00:00+04:00');
const data = createMockData({ now: NOW });

export const article = toArticleSummary(withArticleDerived(data.articles[0]));
export const series = toSeriesSummary(withSeriesDerived(data.series[0]));
export const video = toVideoSummary(data.videos[0]);
export const newsItem = toNewsSummary(data.news.find((item) => item.action) ?? data.news[0]);
export const event = data.events[0];
export const member = data.team[0];
export const partner = data.partners[0];

/**
 * რენდერი Router-ის კონტექსტში (`to` → `<Link>`), `<main>`-ში — landmark-ის წესისთვის.
 * @param {import('react').ReactElement} ui
 */
export function renderUi(ui) {
  return render(
    <MemoryRouter>
      <main>{ui}</main>
    </MemoryRouter>,
  );
}
