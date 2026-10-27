import { Outlet } from 'react-router';

import { can } from '../api/permissions.js';
import Forbidden from '../pages/Forbidden.jsx';

import { useAuth } from './auth-context.js';

/**
 * უფლების guard-ი (layout route): უფლების გარეშე — 403 ეკრანი გარსის შიგნით (გადამისამართება
 * არა: მისამართი რჩება, ბრაუზერის „უკან“ მუშაობს). მხოლოდ UX — სერვერიც 403-ს აბრუნებს.
 * @param {{ permission: import('../api/permissions.js').Permission }} props
 */
export default function RequireRole({ permission }) {
  const { user } = useAuth();
  return can(user, permission) ? <Outlet /> : <Forbidden />;
}
