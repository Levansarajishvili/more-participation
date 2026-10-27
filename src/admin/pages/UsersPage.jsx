import { useId, useState } from 'react';

import {
  Button,
  ContentState,
  LiveRegion,
  Select,
  SkeletonGroup,
  TextField,
} from '@/components/ui/index.js';
import { isEmail } from '@/content/forms.js';
import { useContent } from '@/hooks/useContent.js';
import { formatDate } from '@/i18n/index.js';

import { users } from '../api/adminAdapter.js';
import { ROLES } from '../api/permissions.js';
import { useAuth } from '../auth/auth-context.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ta } from '../i18n/index.js';

/**
 * მომხმარებლები (`/admin/users`, მხოლოდ ადმინისტრატორი): სია, მოწვევა ბმულით
 * (`/admin/login?tab=register&invite=…`) და ვადით, როლის შეცვლა, დეაქტივაცია (დადასტურებით).
 * საკუთარ ანგარიშს როლს ვერ შეუცვლი და ვერ გათიშავ (ბოლო ადმინისტრატორი არ უნდა დაიკარგოს).
 */
export default function UsersPage() {
  const { user: me } = useAuth();
  const list = useContent(() => users.list(), []);
  const [status, setStatus] = useState('');
  const [deactivating, setDeactivating] = useState(
    /** @type {import('../api/adminAdapter.js').AdminUser | null} */ (null),
  );
  const captionId = useId();

  return (
    <div className="mc-admin-list">
      <InviteForm />
      <LiveRegion>{status}</LiveRegion>
      <ContentState
        status={list.status}
        error={list.error}
        onRetry={list.reload}
        label={ta('nav.users')}
        skeleton={<SkeletonGroup count={3} variant="row" />}
      >
        {() => (
          <div
            className="mc-table-scroll mc-admin-panel mc-admin-panel--flush"
            role="region"
            tabIndex={0}
            aria-labelledby={captionId}
          >
            <table className="mc-admin-table">
              <caption id={captionId} className="sr-only">
                {ta('users.caption')}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{ta('users.colName')}</th>
                  <th scope="col">{ta('users.colEmail')}</th>
                  <th scope="col">{ta('users.colRole')}</th>
                  <th scope="col">{ta('users.colStatus')}</th>
                  <th scope="col">{ta('list.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="mc-admin-table__title">{u.name}</span>
                        {self && <span className="mc-admin-table__meta">{ta('users.you')}</span>}
                      </td>
                      <td>
                        <span lang="en">{u.email}</span>
                      </td>
                      <td>
                        <Select
                          label={ta('users.roleOf', { name: u.name })}
                          className="mc-users__role"
                          options={ROLES.map((id) => ({ id, label: ta(`roles.${id}`) }))}
                          value={u.role}
                          disabled={self || u.status === 'deactivated'}
                          onChange={async (event) => {
                            await users.setRole(u.id, /** @type {any} */ (event.target.value));
                            setStatus(
                              ta('users.roleChanged', {
                                name: u.name,
                                role: ta(`roles.${event.target.value}`),
                              }),
                            );
                            list.reload();
                          }}
                        />
                      </td>
                      <td>{ta(`users.status.${u.status}`)}</td>
                      <td>
                        {!self && u.status !== 'deactivated' && (
                          <Button variant="secondary" size="sm" onClick={() => setDeactivating(u)}>
                            {ta('users.deactivate')}
                            <span className="sr-only">: {u.name}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentState>
      <ConfirmDialog
        open={deactivating !== null}
        title={ta('users.deactivateTitle', { name: deactivating?.name ?? '' })}
        description={ta('users.deactivateText')}
        confirmLabel={ta('users.deactivate')}
        cancelLabel={ta('editor.cancel')}
        onConfirm={async () => {
          if (!deactivating) return;
          await users.deactivate(deactivating.id);
          setStatus(ta('users.deactivated', { name: deactivating.name }));
          setDeactivating(null);
          list.reload();
        }}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}

function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState('');
  const [result, setResult] = useState(
    /** @type {{ code: string, link: string, expiresAt: string } | null} */ (null),
  );
  const [copied, setCopied] = useState('');
  const titleId = useId();

  return (
    <section className="mc-admin-panel" aria-labelledby={titleId}>
      <h2 id={titleId} className="mc-admin-panel__title">
        {ta('users.inviteTitle')}
      </h2>
      <form
        noValidate
        className="mc-users__invite"
        onSubmit={async (event) => {
          event.preventDefault();
          if (email.trim() && !isEmail(email.trim())) {
            setError(ta('fieldErrors.email'));
            return;
          }
          setError('');
          setResult(
            await users.invite({
              email: email.trim() || undefined,
              role: /** @type {any} */ (role),
            }),
          );
        }}
      >
        <TextField
          label={ta('users.inviteEmail')}
          hint={ta('users.inviteEmailHint')}
          type="email"
          optional
          value={email}
          error={error || null}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Select
          label={ta('users.colRole')}
          options={ROLES.map((id) => ({ id, label: ta(`roles.${id}`) }))}
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <Button type="submit" variant="primary" size="md">
          {ta('users.inviteSubmit')}
        </Button>
      </form>
      {result && (
        <div role="status" className="mc-users__result">
          <p>{ta('users.inviteReady', { date: formatDate(result.expiresAt, 'dateTime') })}</p>
          <p>
            <span className="mc-admin-table__meta">{ta('users.inviteCode')}</span>{' '}
            <code lang="en">{result.code}</code>
          </p>
          <TextField
            label={ta('users.inviteLink')}
            readOnly
            value={`${window.location.origin}${result.link}`}
            onFocus={(event) => event.target.select()}
          />
          <Button
            variant="secondary"
            size="sm"
            icon="link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}${result.link}`);
                setCopied(ta('users.copied'));
              } catch {
                setCopied(ta('users.copyManual'));
              }
            }}
          >
            {ta('users.copy')}
          </Button>
          <LiveRegion>{copied}</LiveRegion>
        </div>
      )}
    </section>
  );
}
