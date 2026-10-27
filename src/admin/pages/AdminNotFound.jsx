import { Button } from '@/components/ui/index.js';

import { ta } from '../i18n/index.js';
import { useAdminPage } from '../shell/admin-page.js';

/** ადმინის 404 (უცნობი ეკრანი ან კონტენტის ტიპი) — გარსის შიგნით. */
export default function AdminNotFound() {
  useAdminPage({ title: ta('errors.notFoundTitle') });
  return (
    <div className="mc-admin-panel mc-admin-message">
      <p>{ta('errors.notFoundText')}</p>
      <Button variant="secondary" size="sm" to="/admin">
        {ta('errors.toDashboard')}
      </Button>
    </div>
  );
}
