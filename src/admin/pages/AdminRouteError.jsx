import { useEffect } from 'react';
import { useRouteError } from 'react-router';

import { Button } from '@/components/ui/index.js';

import { ta } from '../i18n/index.js';
import { useAdminPage } from '../shell/admin-page.js';

/** ეკრანის შეცდომა გარსის შიგნით: მენიუ და header რჩება. */
export default function AdminRouteError() {
  const error = useRouteError();
  useAdminPage({ title: ta('errors.routeTitle') });
  useEffect(() => {
    if (import.meta.env.DEV) console.error(error);
  }, [error]);
  return (
    <div className="mc-admin-panel mc-admin-message">
      <p>{ta('errors.routeText')}</p>
      <Button variant="secondary" size="sm" icon="reset" onClick={() => window.location.reload()}>
        {ta('errors.reload')}
      </Button>
    </div>
  );
}
