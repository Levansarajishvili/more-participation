import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

/**
 * B5: dev — API (`/api/*`) და ატვირთული ფაილები (`/media/*`) `npm run server:dev`-ზე (3000), რომ
 * ბრაუზერისთვის ერთი origin იყოს (cookie, CSRF, `connect-src 'self'`). `VITE_API_PROXY` — სხვა
 * მისამართი. წარმოებაში ერთ სერვისს Fastify ემსახურება (B7) და proxy არ არსებობს.
 */
const API_PROXY = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
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
});
