import RootLayout from '@/components/layout/RootLayout.jsx';
import RouteError from '@/pages/RouteError.jsx';

/**
 * გვერდის lazy-ჩატვირთვა Data Mode-ში: ყოველი გვერდი ცალკე chunk-ია.
 * @param {() => Promise<{ default: import('react').ComponentType }>} load
 * @returns {import('react-router').RouteObject['lazy']}
 */
const page = (load) => ({ Component: async () => (await load()).default });

/**
 * საჯარო როუტები (project-context §5). URL-ები ლათინურად.
 * `/__kit` მხოლოდ dev-შია: import.meta.env.DEV build-ზე `false` ხდება და chunk არ იქმნება
 * (ამოწმებს scripts/check-dist.mjs). ადმინი (`/admin/*`) — F8.
 * @type {import('react-router').RouteObject[]}
 */
export const routes = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteError,
    // პირველი lazy-chunk-ის ჩატვირთვამდე არაფერი იხატება (chunk-ები < 1 kB-ია)
    HydrateFallback: () => null,
    children: [
      { index: true, lazy: page(() => import('@/pages/HomePage.jsx')) },
      { path: 'about', lazy: page(() => import('@/pages/AboutPage.jsx')) },
      { path: 'articles', lazy: page(() => import('@/pages/ArticlesPage.jsx')) },
      { path: 'articles/:slug', lazy: page(() => import('@/pages/ArticlePage.jsx')) },
      { path: 'development', lazy: page(() => import('@/pages/DevelopmentPage.jsx')) },
      { path: 'videos', lazy: page(() => import('@/pages/VideosPage.jsx')) },
      { path: 'news', lazy: page(() => import('@/pages/NewsPage.jsx')) },
      { path: 'contact', lazy: page(() => import('@/pages/ContactPage.jsx')) },
      ...(import.meta.env.DEV
        ? [{ path: '__kit', lazy: page(() => import('@/pages/KitPage.jsx')) }]
        : []),
      { path: '*', lazy: page(() => import('@/pages/NotFoundPage.jsx')) },
    ],
  },
];
