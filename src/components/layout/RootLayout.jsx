import { Outlet } from 'react-router';

/**
 * დროებითი ძირეული განლაგება. F4-ში იცვლება PageShell-ით
 * (SiteHeader + skip-link + main + SiteFooter); `id="main"` skip-link-ის სამიზნეა.
 */
export default function RootLayout() {
  return (
    <main id="main">
      <Outlet />
    </main>
  );
}
