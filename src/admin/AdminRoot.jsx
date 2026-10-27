import { Outlet, ScrollRestoration } from 'react-router';

import PreferencesProvider from '@/features/a11y/PreferencesProvider.jsx';

import AuthProvider from './auth/AuthProvider.jsx';
import './admin.css';

/**
 * ადმინის ძირი (`/admin/*`): თავსებადობის პარამეტრები (საჯარო საიტის იგივე `mc-a11y`) → სესია →
 * ეკრანი. ყველა ადმინ-როუტზე `<meta name="robots" content="noindex, nofollow">` (React 19 მას
 * `<head>`-ში აიტანს). `/admin` robots.txt-ში განზრახ არ არის: Disallow მისამართს ავრცელებს და
 * crawler-ი noindex-ს ვეღარ ხედავს. TODO(server): `X-Robots-Tag: noindex, nofollow` ყველა
 * `/admin` პასუხზე — SPA-ს index.html JS-ის გარეშე meta-ს არ შეიცავს.
 */
export default function AdminRoot() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <meta name="robots" content="noindex, nofollow" />
        <Outlet />
        <ScrollRestoration />
      </AuthProvider>
    </PreferencesProvider>
  );
}
