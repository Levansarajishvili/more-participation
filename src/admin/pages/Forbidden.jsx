import { Button } from '@/components/ui/index.js';

import { ta } from '../i18n/index.js';
import { useAdminPage } from '../shell/admin-page.js';

/** 403 გარსის შიგნით (RequireRole): მისამართი რჩება, ახსნა + დაფაზე დაბრუნება. */
export default function Forbidden() {
  useAdminPage({ title: ta('errors.forbiddenTitle') });
  return (
    <div className="mc-admin-panel mc-admin-message">
      <p>{ta('errors.forbiddenText')}</p>
      <Button variant="secondary" size="sm" to="/admin">
        {ta('errors.toDashboard')}
      </Button>
    </div>
  );
}
