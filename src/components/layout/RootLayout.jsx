import { ScrollRestoration } from 'react-router';

import PreferencesProvider from '@/features/a11y/PreferencesProvider.jsx';

import PageShell from './PageShell.jsx';

/**
 * ძირეული როუტის კომპონენტი: თავსებადობის პარამეტრები → გარსი → გვერდი.
 * ScrollRestoration: ახალ გვერდზე ზემოთ (მყისიერად), „უკან / წინ“ — შენახული პოზიცია;
 * `preventScrollReset` (ფილტრები, useUrlFilters) პოზიციას არ ცვლის; hash — სამიზნემდე.
 */
export default function RootLayout() {
  return (
    <PreferencesProvider>
      <PageShell />
      <ScrollRestoration />
    </PreferencesProvider>
  );
}
