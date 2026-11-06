import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

/**
 * server-ის ტესტები (B1): Node-ის გარემო, `@/` → `src/` (frontend-ის საერთო მოდულები და
 * contract-ტესტისთვის adapter-ები), MongoDB — `mongodb-memory-server` replica set (global setup).
 * frontend-ის `vite.config.js`-ის `test` ამ ფაილებს არ ხედავს (`src/**` მხოლოდ).
 *
 * B4: `test/ui/*.test.jsx` — frontend-ის რედაქტორი (jsdom, ფაილის `@vitest-environment`) HTTP
 * adapter-ით რეალურ სერვერზე; ამისთვის — frontend-ის იგივე `react()` და `svgr()` (ლოგო `?react`).
 */
export default defineConfig({
  plugins: [react(), svgr()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.{js,jsx}'],
    globalSetup: ['test/global-setup.js'],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    restoreMocks: true,
  },
});
