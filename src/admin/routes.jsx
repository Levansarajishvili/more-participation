import AdminRoot from './AdminRoot.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import RequireRole from './auth/RequireRole.jsx';
import { isContentType, typeLabel } from './content-types.js';
import { ta } from './i18n/index.js';
import A11yReportPage from './pages/A11yReportPage.jsx';
import AdminNotFound from './pages/AdminNotFound.jsx';
import AdminRootError from './pages/AdminRootError.jsx';
import AdminRouteError from './pages/AdminRouteError.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ListPage from './pages/ListPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import AdminShell from './shell/AdminShell.jsx';

/**
 * ადმინის როუტები (F8). ეს მოდული საჯარო bundle-ში არ არის: `src/routes.jsx`-ის
 * `patchRoutesOnNavigation` მას მხოლოდ `/admin`-ზე პირველი გადასვლისას ტვირთავს (lazy route
 * discovery) — საჯარო chunk-ში რჩება მხოლოდ ერთი `import()`.
 *
 * `handle.admin`: `title` — ადმინის i18n-ის გასაღები ან `(params) => string`, `crumbs` —
 * ბილიკის შუა ნაწილი, `root` — ბილიკის გარეშე (დაფა), `editor` — რედაქტორის ეკრანი (header-ის
 * CTA secondary ხდება).
 *
 * როუტი → როლი: `login` — ყველა; დანარჩენი — რედაქტორი და ადმინისტრატორი (RequireAuth);
 * `users`, `settings` — მხოლოდ ადმინისტრატორი (RequireRole). frontend-ის guard მხოლოდ UX-ია.
 * @returns {import('react-router').RouteObject[]}
 */
/**
 * lazy ეკრანი: რედაქტორი (TipTap) და ბიბლიოთეკა ადმინის ძირითად chunk-ში არ ხვდება.
 * @param {() => Promise<{ default: import('react').ComponentType }>} load
 */
const screen = (load) => ({ Component: async () => (await load()).default });

export function createAdminRoutes() {
  const contentCrumb = () => [{ label: ta('nav.groups.content') }];
  const libraryCrumb = () => [{ label: ta('nav.groups.library') }];
  const adminCrumb = () => [{ label: ta('nav.groups.admin') }];
  /** @param {{ type?: string }} params */
  const typeCrumbs = (params) =>
    isContentType(params.type)
      ? [
          { label: ta('nav.groups.content') },
          { to: `/admin/${params.type}`, label: typeLabel(params.type) },
        ]
      : [];
  /** @param {{ type?: string }} params */
  const typeTitle = (params) =>
    isContentType(params.type) ? typeLabel(params.type) : ta('errors.notFoundTitle');
  /** @param {{ type?: string }} params */
  const itemTitle = (params) =>
    isContentType(params.type) ? typeLabel(params.type, 'one') : ta('errors.notFoundTitle');

  return [
    {
      path: '/admin',
      Component: AdminRoot,
      ErrorBoundary: AdminRootError,
      HydrateFallback: () => null,
      children: [
        { path: 'login', Component: LoginPage },
        {
          Component: RequireAuth,
          children: [
            {
              Component: AdminShell,
              children: [
                {
                  ErrorBoundary: AdminRouteError,
                  children: [
                    {
                      index: true,
                      handle: { admin: { title: 'dashboard.title', root: true } },
                      Component: DashboardPage,
                    },
                    {
                      path: 'a11y',
                      handle: { admin: { title: 'a11y.title' } },
                      Component: A11yReportPage,
                    },
                    {
                      path: 'search',
                      handle: { admin: { title: 'search.title' } },
                      Component: SearchPage,
                    },
                    {
                      path: 'media',
                      handle: { admin: { title: 'nav.media', crumbs: libraryCrumb } },
                      lazy: screen(() => import('./pages/MediaPage.jsx')),
                    },
                    {
                      path: 'documents',
                      handle: { admin: { title: 'nav.documents', crumbs: libraryCrumb } },
                      lazy: screen(() => import('./pages/DocumentsPage.jsx')),
                    },
                    {
                      element: <RequireRole permission="users.manage" />,
                      children: [
                        {
                          path: 'users',
                          handle: { admin: { title: 'nav.users', crumbs: adminCrumb } },
                          lazy: screen(() => import('./pages/UsersPage.jsx')),
                        },
                      ],
                    },
                    {
                      element: <RequireRole permission="settings.manage" />,
                      children: [
                        {
                          path: 'settings',
                          handle: { admin: { title: 'nav.settings', crumbs: adminCrumb } },
                          lazy: screen(() => import('./pages/SettingsPage.jsx')),
                        },
                      ],
                    },
                    {
                      path: ':type',
                      handle: { admin: { title: typeTitle, crumbs: contentCrumb } },
                      Component: ListPage,
                    },
                    // რედაქტორი: `:id = new` — ახალი მასალა (იგივე როუტი: შექმნისას კომპონენტი არ ხელახლა
                    // იხატება); TipTap — კიდევ ცალკე chunk (RichTextEditor lazy)
                    {
                      path: ':type/:id',
                      handle: { admin: { title: itemTitle, crumbs: typeCrumbs, editor: true } },
                      lazy: screen(() => import('./editor/EditorPage.jsx')),
                    },
                    {
                      path: ':type/:id/preview',
                      handle: { admin: { title: itemTitle, crumbs: typeCrumbs } },
                      lazy: screen(() => import('./editor/PreviewPage.jsx')),
                    },
                    {
                      path: '*',
                      handle: { admin: { title: 'errors.notFoundTitle' } },
                      Component: AdminNotFound,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}
