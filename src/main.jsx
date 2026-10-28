import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import '@fontsource-variable/noto-sans-georgian';
import '@fontsource/noto-serif-georgian/500.css';
import './styles/index.css';

import { registerDictionary } from './i18n/index.js';
import { EN_PREFIX, localeFromPath, setLocale } from './i18n/locale.js';
import { createRouterOptions, routes } from './routes.jsx';

// F9: ენა URL-იდან — ინგლისური ვერსია `/en` basename-ზეა: ყოველი შიდა ბმული (`to="/articles"`)
// თავისთავად `/en/articles` ხდება; ენის გადამრთველი სხვა basename-ზე სრული გადასვლაა.
const locale = localeFromPath(window.location.pathname);
setLocale(locale);

// ინგლისური ლექსიკონი ცალკე chunk-ია: ქართულ ვერსიაზე არ იტვირთება
const ready =
  locale === 'en'
    ? import('./i18n/en.js').then(({ default: en }) => registerDictionary('en', en))
    : Promise.resolve();

ready.then(() => {
  const router = createBrowserRouter(routes, {
    ...createRouterOptions(),
    ...(locale === 'en' && { basename: EN_PREFIX }),
  });
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
