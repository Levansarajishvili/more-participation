import { Navigate, Outlet, useLocation } from 'react-router';

import { LiveRegion } from '@/components/ui/index.js';

import { ta } from '../i18n/index.js';

import { loginHref } from './auth-forms.js';
import { useAuth } from './auth-context.js';

/**
 * ავტორიზებული ზონა (UX — რეალურ უფლებას სერვერი ამოწმებს). სესიის გარეშე → `/admin/login`,
 * `?next=` — მიმდინარე ეკრანი (ამოწურვისას — `&reason=expired`); ხელით გასვლისას `next` არ
 * ინახება (სხვა მომხმარებელი იმავე ეკრანზე არ უნდა დაბრუნდეს).
 */
export default function RequireAuth() {
  const { status, reason } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="mc-admin-loading">
        <LiveRegion visible>{ta('auth.checking')}</LiveRegion>
      </div>
    );
  }
  if (status !== 'authenticated') {
    const next = reason === 'logged-out' ? undefined : `${location.pathname}${location.search}`;
    return <Navigate replace to={loginHref(next, reason)} />;
  }
  return <Outlet />;
}
