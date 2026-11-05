import { validateLogin } from '@/admin/auth/auth-forms.js';
import { ta } from '@/admin/i18n/index.js';
import { ContentError } from '@/content/errors.js';
import { normalizeEmail } from '@/content/forms.js';

import { inTransaction } from '../db/content.js';
import { newUserId, toAdminUser } from '../db/users.js';
import { clearSessionCookies, repositories, sessionToken, setSessionCookies } from '../lib/auth.js';
import { route } from '../lib/openapi.js';
import {
  dummyHash,
  hashPassword,
  needsRehash,
  registerFieldErrors,
  verifyPassword,
} from '../lib/password.js';
import { rateLimited } from '../lib/rate-limit.js';
import { hashToken } from '../lib/tokens.js';

/**
 * `/api/admin/auth/*` (B3): login, register, logout, me, extendSession — `AdminAdapter.auth`-ის
 * კონტრაქტით (mock-ის იგივე ქცევა და შეცდომები).
 *
 * შესვლა: უცნობი ელფოსტა, არასწორი პაროლი და დეაქტივირებული ანგარიში — ერთი პასუხი (401
 * `unauthorized`) და ერთი სამუშაო: argon2id ყოველთვის ითვლება (უცნობზე — `dummyHash`-ით).
 * ანგარიშის მრიცხველი მხოლოდ წარუმატებელ მცდელობას ითვლის.
 *
 * რეგისტრაცია: არასწორი / გამოყენებული / ვადაგასული / სხვა ელფოსტის კოდი და დაკავებული ელფოსტა —
 * ერთი პასუხი (422 `fields.invite`); პაროლის hash ყოველთვის ითვლება (დრო არაფერს ამხელს). კოდის
 * დახარჯვა და ანგარიშის შექმნა — ერთ ტრანზაქციაში (დაკავებულ ელფოსტაზე მოწვევა არ იწვება).
 *
 * ლოგი — მხოლოდ მოვლენის სახელი (`auth.login.failed`…): ელფოსტა, id, IP, token — არა.
 */

/**
 * @param {import('../db/users.js').UserDoc} user
 * @param {import('../db/sessions.js').SessionDoc} session
 * @returns {import('@/admin/api/adminAdapter.js').Session}
 */
export function sessionPayload(user, session) {
  return { user: toAdminUser(user), expiresAt: session.expiresAt.toISOString() };
}

function inviteError() {
  return new ContentError('validation', {
    fields: { invite: { code: 'invite', message: ta('fieldErrors.invite') } },
  });
}

/**
 * ახალი სესია (ASVS 7.2.4): მოთხოვნის ძველი სესია — თუ იყო — იშლება.
 * @param {import('fastify').FastifyInstance} app
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {string} userId
 * @param {{ remember?: boolean }} [options]
 */
async function startSession(app, request, reply, userId, { remember = false } = {}) {
  const { sessions } = repositories(app);
  const previous = sessionToken(request);
  if (previous) await sessions.remove(hashToken(previous));
  const created = await sessions.create(userId);
  const maxAge = remember
    ? Math.max(1, Math.floor((created.session.maxExpiresAt.getTime() - app.now()) / 1000))
    : undefined;
  setSessionCookies(reply, { token: created.token, csrfToken: created.csrfToken, maxAge });
  return created.session;
}

/** @param {import('fastify').FastifyInstance} app */
export function registerAuthRoutes(app) {
  const { spec } = app;
  // dummy hash გაშვებისას ითვლება — პირველი უცნობი ელფოსტა უფრო ნელი არ იყოს
  app.addHook('onReady', async () => {
    await dummyHash();
  });

  route(app, spec, 'login', async (request, reply) => {
    const body = /** @type {{ email: string, password: string, remember?: boolean }} */ (
      request.body
    );
    const fields = validateLogin(body);
    if (Object.keys(fields).length) throw new ContentError('validation', { fields });

    const { users } = repositories(app);
    const limiter = app.rateLimits.auth;
    const email = normalizeEmail(body.email);
    const account = `login:acct:${hashToken(email)}`;
    const wait = limiter.blocked(account);
    if (wait) throw rateLimited(reply, wait);

    const user = await users.findByEmail(email);
    const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash()), body.password);
    if (!user || !valid || user.status !== 'active') {
      limiter.hit(account);
      request.log.info({ event: 'auth.login.failed' }, 'auth');
      throw new ContentError('unauthorized');
    }
    const rehash = needsRehash(user.passwordHash)
      ? { passwordHash: await hashPassword(body.password) }
      : {};
    await users.recordLogin(user._id, rehash);
    const session = await startSession(app, request, reply, user._id, { remember: body.remember });
    request.log.info({ event: 'auth.login' }, 'auth');
    return sessionPayload(user, session);
  });

  route(app, spec, 'register', async (request, reply) => {
    const body = /** @type {{ name: string, email: string, invite: string, password: string }} */ (
      request.body
    );
    const fields = registerFieldErrors(body);
    if (Object.keys(fields).length) throw new ContentError('validation', { fields });

    const repos = repositories(app);
    const email = normalizeEmail(body.email);
    const passwordHash = await hashPassword(body.password);
    const id = newUserId();
    /** @type {import('../db/users.js').UserDoc} */
    let user;
    try {
      user = await inTransaction(repos.client, async (session) => {
        const invite = await repos.invites.claim(body.invite, { email, userId: id, session });
        if (!invite) throw inviteError();
        return repos.users.insert(
          {
            id,
            name: body.name.trim(),
            email,
            passwordHash,
            role: invite.role,
            lastLoginAt: new Date(app.now()),
          },
          { session },
        );
      });
    } catch (error) {
      // დაკავებული ელფოსტა (email_unique → conflict) — იგივე პასუხი, რაც არასწორ კოდზე
      if (error instanceof ContentError && error.code === 'conflict') throw inviteError();
      throw error;
    }
    const session = await startSession(app, request, reply, user._id);
    request.log.info({ event: 'auth.register' }, 'auth');
    reply.code(201);
    return sessionPayload(user, session);
  });

  route(app, spec, 'logout', async (request, reply) => {
    const { session } = /** @type {import('../lib/auth.js').RequestAuth} */ (request.auth);
    await repositories(app).sessions.remove(session._id);
    clearSessionCookies(reply);
    request.log.info({ event: 'auth.logout' }, 'auth');
    return { ok: /** @type {const} */ (true) };
  });

  route(app, spec, 'me', async (request) => {
    const { user, session } = /** @type {import('../lib/auth.js').RequestAuth} */ (request.auth);
    return sessionPayload(user, session);
  });

  route(app, spec, 'extendSession', async (request, reply) => {
    const { user, session } = /** @type {import('../lib/auth.js').RequestAuth} */ (request.auth);
    const extended = await repositories(app).sessions.extend(session._id);
    if (!extended) {
      clearSessionCookies(reply);
      throw new ContentError('unauthorized');
    }
    return sessionPayload(user, extended);
  });
}
