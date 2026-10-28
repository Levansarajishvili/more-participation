import RootLayout from '@/components/layout/RootLayout.jsx';
import RootError from '@/pages/RootError.jsx';
import RouteError from '@/pages/RouteError.jsx';
import { stripLocale } from '@/i18n/locale.js';

/**
 * გვერდის lazy-ჩატვირთვა Data Mode-ში: ყოველი გვერდი ცალკე chunk-ია.
 * @param {() => Promise<{ default: import('react').ComponentType }>} load
 * @returns {import('react-router').RouteObject['lazy']}
 */
const page = (load) => ({ Component: async () => (await load()).default });

/**
 * როუტის მეტამონაცემები: `title` — i18n-ის გასაღები; PageShell დოკუმენტის სათაურს
 * „{გვერდი} — მეტი ჩართულობა“-დ აწყობს. მთავარს სათაური არ აქვს → „მეტი ჩართულობა“.
 * დინამიკური სათაური (სტატია) — გვერდის `usePageTitle()`.
 * @typedef {{ title?: string | null }} RouteHandle  null — მხოლოდ საიტის სახელი
 */

/**
 * საჯარო როუტები (project-context §5). URL-ები ლათინურად.
 *
 * სტრუქტურა: `/` (RootLayout = PreferencesProvider + PageShell) → უგზო როუტი ErrorBoundary-ით
 * → გვერდები. გვერდის შეცდომა (RouteError) და 404 გარსის შიგნით ჩნდება; RootError — მხოლოდ
 * გარსის ავარიისას. `/__kit` მხოლოდ dev-შია (scripts/check-dist.mjs ამოწმებს).
 * ადმინი (`/admin/*`, AdminShell) — F8: აქ არ არის. `createRouterOptions()`-ის
 * `patchRoutesOnNavigation` ადმინის როუტებს `/admin`-ზე პირველი გადასვლისას ამატებს — საჯარო
 * bundle-ში ადმინის კოდი არ ხვდება (მხოლოდ ერთი `import()`).
 *
 * ფუნქციაა და არა მასივი: ყოველ router-ს საკუთარი lazy-ობიექტები სჭირდება — React Router
 * ჩატვირთულ lazy-ობიექტს ქეშავს, და მეორე router-ში (ტესტები) იგივე როუტზე გადასვლა
 * „No route matches“-ით ვარდებოდა.
 * @returns {import('react-router').RouteObject[]}
 */
export function createRoutes() {
  return [
    {
      path: '/',
      Component: RootLayout,
      ErrorBoundary: RootError,
      // პირველი lazy-chunk-ის ჩატვირთვამდე არაფერი იხატება (chunk-ები < 1 kB-ია)
      HydrateFallback: () => null,
      children: [
        {
          ErrorBoundary: RouteError,
          children: [
            {
              index: true,
              handle: { title: null },
              lazy: page(() => import('@/pages/HomePage.jsx')),
            },
            {
              path: 'about',
              handle: { title: 'nav.about' },
              lazy: page(() => import('@/pages/AboutPage.jsx')),
            },
            {
              path: 'articles',
              handle: { title: 'nav.articles' },
              lazy: page(() => import('@/pages/ArticlesPage.jsx')),
            },
            {
              path: 'articles/:slug',
              handle: { title: 'nav.articles' },
              lazy: page(() => import('@/pages/ArticlePage.jsx')),
            },
            {
              path: 'development',
              handle: { title: 'nav.development' },
              lazy: page(() => import('@/pages/DevelopmentPage.jsx')),
            },
            {
              path: 'videos',
              handle: { title: 'nav.videos' },
              lazy: page(() => import('@/pages/VideosPage.jsx')),
            },
            {
              path: 'news',
              handle: { title: 'nav.news' },
              lazy: page(() => import('@/pages/NewsPage.jsx')),
            },
            {
              // F6: სიახლის სრული ტექსტი (§9.5 — ახალი როუტი, სტატიის შაბლონით)
              path: 'news/:slug',
              handle: { title: 'nav.news' },
              lazy: page(() => import('@/pages/NewsItemPage.jsx')),
            },
            {
              path: 'contact',
              handle: { title: 'nav.contact' },
              lazy: page(() => import('@/pages/ContactPage.jsx')),
            },
            ...(import.meta.env.DEV
              ? [
                  // dev-ის გვერდი: სათაური usePageTitle-ით (წარწერა i18n-ში არ არის)
                  { path: '__kit', lazy: page(() => import('@/pages/KitPage.jsx')) },
                ]
              : []),
            {
              path: '*',
              handle: { title: 'shell.notFoundTitle' },
              lazy: page(() => import('@/pages/NotFoundPage.jsx')),
            },
          ],
        },
      ],
    },
  ];
}

/** ადმინის მისამართი: `/admin`, `/admin/…`, `/admin?…` (არა `/administration`). */
export const ADMIN_PATH = /^\/admin(?:[/?#]|$)/;

/**
 * router-ის პარამეტრები: ადმინის როუტების lazy discovery (React Router `patchRoutesOnNavigation`).
 * ფუნქცია `/`-ის splat-ზე (`*`) დამთხვევისასაც იძახება, ამიტომ `/admin/...` 404-ს არ ხვდება.
 * ყოველ router-ს საკუთარი მდგომარეობა აქვს (ტესტები); ერთდროული გადასვლები ერთ ჩატვირთვას ელოდება.
 * @returns {{ patchRoutesOnNavigation: NonNullable<Parameters<typeof import('react-router').createBrowserRouter>[1]>['patchRoutesOnNavigation'] }}
 */
export function createRouterOptions() {
  /** @type {Promise<void> | null} */
  let loading = null;
  return {
    async patchRoutesOnNavigation({ path, patch }) {
      // F9: `/en` basename-ზე გზა პრეფიქსით მოდის (`/en/admin`)
      if (!ADMIN_PATH.test(stripLocale(path))) return;
      loading ??= import('@/admin/routes.jsx').then(({ createAdminRoutes }) => {
        patch(null, createAdminRoutes());
      });
      await loading;
    },
  };
}

/** აპლიკაციის როუტები (main.jsx). */
export const routes = createRoutes();

/** საჯარო გვერდების როუტები (გარსის შიგნით) — ტესტებისა და საიტის რუკისთვის. */
export const pageRoutes = routes[0].children?.[0].children ?? [];
