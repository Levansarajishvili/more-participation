import { relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';

/**
 * B5: dev — API (`/api/*`) და ატვირთული ფაილები (`/media/*`) `npm run server:dev`-ზე (3000), რომ
 * ბრაუზერისთვის ერთი origin იყოს (cookie, CSRF, `connect-src 'self'`). `VITE_API_PROXY` — სხვა
 * მისამართი. წარმოებაში ერთ სერვისს Fastify ემსახურება (B7, `server/routes/site.js`) და proxy არ არსებობს.
 */
const API_PROXY = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3000';

/** B7: production build-ის ნაგულისხმევი მისამართები (ერთი origin — B0 #4). */
export const PRODUCTION_API = Object.freeze({ content: '/api/v1', admin: '/api/admin' });

/**
 * B7: backend-ის მისამართები build-ში (`define` — build-ის დროს ჩაისმება, მეორე შტო და mock-ის chunk-ები
 * bundle-ში აღარ ხვდება; check-dist ამოწმებს).
 *
 * | ბრძანება | კონტენტი / ადმინი |
 * |---|---|
 * | `vite build` (`npm run build`) | `/api/v1`, `/api/admin` — env-ით შეცვლადი; mock არასოდეს |
 * | `VITE_MOCK=1 vite build` | mock (დიზაინის / დემოს სტატიკური build — deploy-ისთვის არა; `npm run build`-ის check-dist მას უარყოფს) |
 * | `vite` (`npm run dev`) | env-ის გარეშე — mock; `VITE_CONTENT_API` / `VITE_ADMIN_API` — API |
 * | `vite --mode api` (`npm run dev:api`) | `/api/v1`, `/api/admin` (proxy → `server:dev`) |
 *
 * @param {{ command: 'build' | 'serve', mode: string, env: Record<string, string> }} input
 * @returns {Record<string, string>}  `define`-ის ჩანაწერები (ცარიელი — Vite-ის ჩვეულებრივი env)
 */
export function backendDefines({ command, mode, env }) {
  const mock = env.VITE_MOCK === '1';
  const api = command === 'build' ? !mock : mode === 'api';
  if (!api && !mock) return {};
  const content = mock ? '' : env.VITE_CONTENT_API || PRODUCTION_API.content;
  const admin = mock ? '' : env.VITE_ADMIN_API || PRODUCTION_API.admin;
  return {
    'import.meta.env.VITE_CONTENT_API': JSON.stringify(content),
    'import.meta.env.VITE_ADMIN_API': JSON.stringify(admin),
  };
}

/**
 * B7: chunk → მოდულები (`dist/.vite/modules.json`) — check-dist ამოწმებს, რომ mock-ის მოდული
 * (`src/content/mock/**`, `src/admin/api/mock.js`) არცერთ chunk-ში არ არის. minify ფუნქციის სახელს
 * (`createMockData`) შლის, ამიტომ მარტო სტრიქონის ძიება საკმარისი არ არის. `.vite/` სერვერზე არ ემსახურება.
 * @returns {import('vite').Plugin}
 */
function chunkModules() {
  const root = fileURLToPath(new URL('.', import.meta.url));
  return {
    name: 'mc-chunk-modules',
    apply: 'build',
    generateBundle(_options, bundle) {
      /** @type {Record<string, string[]>} */
      const map = {};
      for (const [file, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        map[file] = chunk.moduleIds
          .filter((id) => !id.startsWith('\0'))
          .map((id) => relative(root, id.split('?')[0]).split('\\').join('/'));
      }
      this.emitFile({
        type: 'asset',
        fileName: '.vite/modules.json',
        source: `${JSON.stringify(map, null, 1)}\n`,
      });
    },
  };
}

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), tailwindcss(), svgr(), chunkModules()],
  define: backendDefines({ command, mode, env: loadEnv(mode, process.cwd(), 'VITE_') }),
  server: {
    proxy: {
      '/api': { target: API_PROXY, xfwd: false },
      '/media': { target: API_PROXY, xfwd: false },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // F8: check-dist manifest-ით ადგენს, რომელი chunk-ია საჯარო და რომელი — მხოლოდ ადმინის
    manifest: true,
    // შრიფტები ცალკე ფაილებად: unicode-range-ით ბრაუზერი მხოლოდ საჭირო subset-ს ტვირთავს
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
}));
