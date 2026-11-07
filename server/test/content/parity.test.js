import { describe, expect, it } from 'vitest';

import { SCENARIOS, mockEnv } from '@/admin/__tests__/scenarios/admin-scenarios.js';

import { httpEnv } from './http-env.js';

/**
 * B4 parity: `src/admin/__tests__/api.test.js`-ის სცენარები (საერთო `admin-scenarios.js`) ორ
 * adapter-ზე — mock და HTTP (რეალური სერვერი + memory-server) — იმავე საწყისი მონაცემით და საათით.
 * ყოველი სცენარი ორივე გარემოში საკუთარ `expect`-ებს გადის, მისი კვალი (`notes`) კი ერთნაირი უნდა
 * იყოს; HTTP-ის ყოველი პასუხი spec-ს აკმაყოფილებს (`problems`).
 *
 * B5: მედიის სცენარებიც (ატვირთვა multipart-ით, ბიბლიოთეკა, alt ყველგან, 409, წაშლა) —
 * `http-env.js`-ის `media: true` (საცავი — მეხსიერება).
 *
 * B6: საჯარო ხედი (`pub`) HTTP-ზე რეალური `/api/v1`-ია (`createHttpContentAdapter`) — ადმინში
 * გამოქვეყნება / წაშლა / გუნდის თარგმანი საჯარო API-ში მაშინვე ჩანს.
 */

const STEPS = ['B3', 'B4a', 'B4b', 'B5', 'B6'];

describe('parity: ადმინის სცენარები — mock ↔ HTTP', () => {
  for (const scenario of SCENARIOS.filter((s) => STEPS.includes(s.step))) {
    it(`[${scenario.step}] ${scenario.name}`, async () => {
      const start = Date.now();
      const mock = mockEnv({ start });
      await scenario.run(mock);
      expect(mock.notes.length).toBeGreaterThan(0);
      const http = await httpEnv('parity', { start });
      try {
        await scenario.run(http);
      } finally {
        await http.close();
      }
      expect(http.problems).toEqual([]);
      expect(http.notes).toEqual(mock.notes);
    });
  }
});
