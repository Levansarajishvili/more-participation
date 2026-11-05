import { ta } from '@/admin/i18n/index.js';
import { ContentError } from '@/content/errors.js';
import { isEmail, normalizeEmail } from '@/content/forms.js';

import { toAdminUser } from '../db/users.js';
import { repositories } from '../lib/auth.js';
import { route } from '../lib/openapi.js';

/**
 * `/api/admin/users*` (B3) — მხოლოდ `users.manage` (ადმინისტრატორი; guard spec-ის
 * `x-permission`-იდან). საკუთარი როლის შეცვლა და საკუთარი დეაქტივაცია → 400 (mock-ის იგივე): ასე
 * ერთი აქტიური ადმინისტრატორი მაინც ყოველთვის რჩება. დეაქტივაცია მომხმარებლის ყველა სესიას შლის.
 *
 * მოწვევის ბმული პასუხშია (როგორც mock-ში) — ელფოსტით გაგზავნა B6 / B7-ში (გამგზავნის დომენი).
 */

/** @param {string} code */
export const inviteLink = (code) => `/admin/login?tab=register&invite=${encodeURIComponent(code)}`;

/** @param {import('fastify').FastifyInstance} app */
export function registerUsersRoutes(app) {
  const { spec } = app;

  route(app, spec, 'listUsers', async () =>
    (await repositories(app).users.list()).map(toAdminUser),
  );

  route(app, spec, 'createInvite', async (request, reply) => {
    const body = /** @type {{ email?: string, role: 'admin' | 'editor' }} */ (request.body);
    const email = normalizeEmail(body.email) || null;
    if (email && !isEmail(email)) {
      throw new ContentError('validation', {
        fields: { email: { code: 'email', message: ta('fieldErrors.email') } },
      });
    }
    const { user } = /** @type {import('../lib/auth.js').RequestAuth} */ (request.auth);
    const { code, invite } = await repositories(app).invites.create({
      role: body.role,
      email,
      by: user._id,
    });
    request.log.info({ event: 'users.invite' }, 'auth');
    reply.code(201);
    return {
      code,
      role: invite.role,
      link: inviteLink(code),
      expiresAt: invite.expiresAt.toISOString(),
    };
  });

  route(app, spec, 'setUserRole', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const { role } = /** @type {{ role: 'admin' | 'editor' }} */ (request.body);
    const { user: me } = /** @type {import('../lib/auth.js').RequestAuth} */ (request.auth);
    if (id === me._id && role !== me.role) {
      throw new ContentError('bad-request', { detail: 'self-demote' });
    }
    const user = await repositories(app).users.setRole(id, role);
    if (!user) throw new ContentError('not-found');
    request.log.info({ event: 'users.role' }, 'auth');
    return toAdminUser(user);
  });

  route(app, spec, 'deactivateUser', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const { user: me } = /** @type {import('../lib/auth.js').RequestAuth} */ (request.auth);
    if (id === me._id) throw new ContentError('bad-request', { detail: 'self-deactivate' });
    const { users, sessions } = repositories(app);
    const user = await users.deactivate(id);
    if (!user) throw new ContentError('not-found');
    await sessions.removeForUser(id);
    request.log.info({ event: 'users.deactivate' }, 'auth');
    return toAdminUser(user);
  });
}
