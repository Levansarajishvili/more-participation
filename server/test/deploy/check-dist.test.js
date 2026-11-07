import { describe, expect, it } from 'vitest';

import { backendDefines } from '../../../vite.config.js';
import { API_MODULES, mockLeaks } from '../../../scripts/dist-rules.mjs';

/**
 * B7: mock წარმოების bundle-ში არ ხვდება — build-ის env (vite.config.js) და check-dist-ის წესი.
 */

describe('vite.config.js — backendDefines', () => {
  it('vite build: ნაგულისხმევად /api/v1 და /api/admin; env-ით შეცვლადი; VITE_MOCK=1 — mock', () => {
    expect(backendDefines({ command: 'build', mode: 'production', env: {} })).toEqual({
      'import.meta.env.VITE_CONTENT_API': '"/api/v1"',
      'import.meta.env.VITE_ADMIN_API': '"/api/admin"',
    });
    expect(
      backendDefines({
        command: 'build',
        mode: 'production',
        env: { VITE_CONTENT_API: '/v2', VITE_ADMIN_API: '/a2' },
      }),
    ).toEqual({
      'import.meta.env.VITE_CONTENT_API': '"/v2"',
      'import.meta.env.VITE_ADMIN_API': '"/a2"',
    });
    expect(
      backendDefines({
        command: 'build',
        mode: 'production',
        env: { VITE_MOCK: '1', VITE_CONTENT_API: '/api/v1' },
      }),
    ).toEqual({
      'import.meta.env.VITE_CONTENT_API': '""',
      'import.meta.env.VITE_ADMIN_API': '""',
    });
  });

  it('dev: env-ის გარეშე — Vite-ის ჩვეულებრივი env (mock); --mode api — API; ტესტი — უცვლელი', () => {
    expect(backendDefines({ command: 'serve', mode: 'development', env: {} })).toEqual({});
    expect(backendDefines({ command: 'serve', mode: 'test', env: {} })).toEqual({});
    expect(backendDefines({ command: 'serve', mode: 'api', env: {} })).toMatchObject({
      'import.meta.env.VITE_CONTENT_API': '"/api/v1"',
    });
  });
});

describe('check-dist — mockLeaks', () => {
  const clean = {
    'assets/index-a.js': ['src/main.jsx', API_MODULES[0]],
    'assets/http-b.js': [API_MODULES[1]],
  };

  it('სუფთა build — შეცდომა არ არის', () => {
    expect(mockLeaks({ modules: clean, texts: { 'assets/index-a.js': 'x' } })).toEqual([]);
  });

  it('mock-ის მოდული ნებისმიერ chunk-ში (საჯარო ან ადმინის) — შეცდომა', () => {
    const errors = mockLeaks({
      modules: {
        ...clean,
        'assets/routes-c.js': ['src/admin/routes.jsx', 'src/admin/api/mock.js'],
        'assets/x-d.js': ['src/content/mock/data.js', 'src/content/__tests__/scenarios/x.js'],
      },
      texts: {},
    });
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/src\/admin\/api\/mock\.js — assets\/routes-c\.js/);
  });

  it('minify-ის შემდეგ სახელი ქრება — სტრიქონი მაინც იჭერს (პაროლი, მოწვევის კოდი)', () => {
    const errors = mockLeaks({
      modules: clean,
      texts: { 'assets/a.js': 'const p="mc-dev-password"', 'assets/b.js': 'createMockData()' },
    });
    expect(errors).toEqual(['„mc-dev-password“ — assets/a.js', '„createMockData“ — assets/b.js']);
  });

  it('HTTP adapter-ის გარეშე / module map-ის გარეშე — შეცდომა', () => {
    expect(mockLeaks({ modules: { 'assets/a.js': ['src/main.jsx'] }, texts: {} })).toHaveLength(2);
    expect(mockLeaks({ modules: null, texts: {} })[0]).toMatch(/modules\.json/);
  });
});
