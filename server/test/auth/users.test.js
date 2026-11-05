import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { COLLECTION } from '../../db/collections.js';
import { loadSpec } from '../../lib/openapi.js';
import { INVITE_PATTERN, hashToken } from '../../lib/tokens.js';
import { createMatcher } from '../contract/spec-match.js';
import { DAY } from '../db/helpers.js';

import { ADMIN, ADMIN_EMAIL, EDITOR_EMAIL, PASSWORD, addUser, agent, authApp } from './helpers.js';

/**
 * B3: როლები (`permissions.js` → 403), მომხმარებლები, მოწვევა, რეგისტრაცია.
 */

const spec = loadSpec();
const matcher = createMatcher(spec);

/** @param {string} operationId @param {any} res */
function conforms(operationId, res) {
  const op = matcher.operations.find((o) => o.operationId === operationId);
  return matcher.checkResponse(op, res.statusCode, res.json());
}

/** @type {Awaited<ReturnType<typeof authApp>>} */
let ctx;
/** @type {ReturnType<typeof agent>} */
let admin;
/** @type {ReturnType<typeof agent>} */
let editor;
/** @type {string} */
let adminId;
/** @type {string} */
let editorId;

beforeAll(async () => {
  ctx = await authApp('auth_users');
  adminId = (await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin' }))._id;
  editorId = (await addUser(ctx.repos, { email: EDITOR_EMAIL, role: 'editor' }))._id;
  admin = agent(ctx.app);
  editor = agent(ctx.app);
  await admin.login(ADMIN_EMAIL);
  await editor.login(EDITOR_EMAIL);
});
afterAll(() => ctx.close());

/** @param {Record<string, unknown>} [body] */
async function invite(body = { role: 'editor' }) {
  const res = await admin.post(`${ADMIN}/users/invites`, body);
  expect(res.statusCode).toBe(201);
  return res.json();
}

/**
 * @param {Record<string, unknown>} body
 * @param {string} [ip]
 */
const register = (body, ip) =>
  agent(ctx.app, { ip }).post(`${ADMIN}/auth/register`, {
    name: 'ახალი რედაქტორი',
    email: 'new@example.org',
    password: PASSWORD,
    ...body,
  });

describe('როლები (`x-permission` → permissions.js)', () => {
  it('რედაქტორი: users.* → 403; სესიის გარეშე → 401; ადმინისტრატორი → 200', async () => {
    const calls = [
      ['GET', `${ADMIN}/users`, undefined],
      ['POST', `${ADMIN}/users/invites`, { role: 'editor' }],
      ['PATCH', `${ADMIN}/users/${editorId}`, { role: 'admin' }],
      ['POST', `${ADMIN}/users/${adminId}/deactivate`, undefined],
    ];
    for (const [method, url, payload] of calls) {
      const asEditor = await editor.request({ method: String(method), url: String(url), payload });
      expect(asEditor.statusCode, `${method} ${url}`).toBe(403);
      expect(asEditor.json().code).toBe('forbidden');
      const anonymous = await agent(ctx.app).request({
        method: String(method),
        url: String(url),
        payload,
      });
      expect(anonymous.statusCode, `${method} ${url}`).toBe(401);
    }
    const list = await admin.get(`${ADMIN}/users`);
    expect(list.statusCode).toBe(200);
    expect(conforms('listUsers', list)).toEqual([]);
    expect(list.json().map((/** @type {any} */ u) => u.email)).toEqual([ADMIN_EMAIL, EDITOR_EMAIL]);
    expect(JSON.stringify(list.json())).not.toMatch(/argon2|passwordHash|lastLoginAt/);
  });

  it('როლი სერვერზე ყოველ მოთხოვნაზე იკითხება: დაწინაურება მაშინვე მოქმედებს', async () => {
    const promoted = await admin.patch(`${ADMIN}/users/${editorId}`, { role: 'admin' });
    expect(promoted.statusCode).toBe(200);
    expect(conforms('setUserRole', promoted)).toEqual([]);
    expect((await editor.get(`${ADMIN}/users`)).statusCode).toBe(200);
    await admin.patch(`${ADMIN}/users/${editorId}`, { role: 'editor' });
    expect((await editor.get(`${ADMIN}/users`)).statusCode).toBe(403);
  });

  it('საკუთარი როლის შეცვლა / დეაქტივაცია → 400; იგივე როლი — 200; უცნობი → 404; არასწორი → 400 / 422', async () => {
    const demote = await admin.patch(`${ADMIN}/users/${adminId}`, { role: 'editor' });
    expect(demote.statusCode).toBe(400);
    expect(demote.json().code).toBe('bad-request');
    expect((await admin.patch(`${ADMIN}/users/${adminId}`, { role: 'admin' })).statusCode).toBe(
      200,
    );
    expect((await admin.post(`${ADMIN}/users/${adminId}/deactivate`)).statusCode).toBe(400);
    expect((await admin.patch(`${ADMIN}/users/u-missing`, { role: 'editor' })).statusCode).toBe(
      404,
    );
    expect((await admin.post(`${ADMIN}/users/u-missing/deactivate`)).statusCode).toBe(404);
    expect((await admin.patch(`${ADMIN}/users/u-1`, { role: 'owner' })).statusCode).toBe(422);
    expect((await admin.patch(`${ADMIN}/users/not-a-user`, { role: 'editor' })).statusCode).toBe(
      400,
    );
    const me = await admin.get(`${ADMIN}/auth/me`);
    expect(me.json().user).toMatchObject({ role: 'admin', status: 'active' });
  });

  it('დეაქტივაცია: ყველა სესია იშლება, შესვლა — ზოგადი 401', async () => {
    const user = await addUser(ctx.repos, { email: 'leaving@example.org' });
    const one = agent(ctx.app);
    const two = agent(ctx.app);
    await one.login('leaving@example.org');
    await two.login('leaving@example.org');
    const sessions = ctx.database.db.collection(COLLECTION.sessions);
    expect(await sessions.countDocuments({ userId: user._id })).toBe(2);

    const res = await admin.post(`${ADMIN}/users/${user._id}/deactivate`);
    expect(res.statusCode).toBe(200);
    expect(conforms('deactivateUser', res)).toEqual([]);
    expect(res.json().status).toBe('deactivated');
    expect(await sessions.countDocuments({ userId: user._id })).toBe(0);
    expect((await one.get(`${ADMIN}/auth/me`)).statusCode).toBe(401);
    expect((await two.post(`${ADMIN}/auth/session`)).statusCode).toBe(401);
    const login = await agent(ctx.app).login('leaving@example.org');
    expect(login.statusCode).toBe(401);
    expect(login.json().code).toBe('unauthorized');
  });
});

describe('მოწვევა', () => {
  it('201 Invite: კოდი ერთხელ ღიაა, ბაზაში — sha256; ვადა 7 დღე; ბმული', async () => {
    const res = await admin.post(`${ADMIN}/users/invites`, {
      role: 'editor',
      email: ' Ana@Example.org ',
    });
    expect(res.statusCode).toBe(201);
    expect(conforms('createInvite', res)).toEqual([]);
    const body = res.json();
    expect(body.code).toMatch(INVITE_PATTERN);
    expect(body.role).toBe('editor');
    expect(body.link).toBe(`/admin/login?tab=register&invite=${body.code}`);
    expect(Date.parse(body.expiresAt)).toBe(ctx.clk.now() + 7 * DAY);
    const doc = await ctx.database.db
      .collection(COLLECTION.invites)
      .findOne({ _id: /** @type {any} */ (hashToken(body.code)) });
    expect(doc).toMatchObject({ role: 'editor', email: 'ana@example.org', createdBy: adminId });
    expect(JSON.stringify(doc)).not.toContain(body.code);
  });

  it('არასწორი ელფოსტა → 422 fields.email; უცნობი ველი / როლი → 400 / 422', async () => {
    const bad = await admin.post(`${ADMIN}/users/invites`, { role: 'editor', email: 'nope' });
    expect(bad.statusCode).toBe(422);
    expect(bad.json().fields.email.code).toBe('email');
    expect((await admin.post(`${ADMIN}/users/invites`, { role: 'owner' })).statusCode).toBe(422);
    expect(
      (await admin.post(`${ADMIN}/users/invites`, { role: 'editor', expires: 1 })).statusCode,
    ).toBe(400);
  });
});

describe('რეგისტრაცია მოწვევით', () => {
  it('201 Session + cookie-ები; როლი მოწვევიდან; კოდი — ჰარისა და რეგისტრის გარეშე; ერთჯერადი', async () => {
    const { code } = await invite({ role: 'admin' });
    const a = agent(ctx.app, { ip: '10.1.0.1' });
    const res = await a.post(`${ADMIN}/auth/register`, {
      name: '  ნინო  ',
      email: 'Nino@Example.org',
      invite: `  ${code.toLowerCase()} `,
      password: PASSWORD,
    });
    expect(res.statusCode).toBe(201);
    expect(conforms('register', res)).toEqual([]);
    expect(res.json().user).toMatchObject({
      name: 'ნინო',
      email: 'nino@example.org',
      role: 'admin',
      status: 'active',
    });
    expect(a.session()).toBeDefined();
    expect((await a.get(`${ADMIN}/auth/me`)).statusCode).toBe(200);
    const doc = await ctx.database.db
      .collection(COLLECTION.invites)
      .findOne({ _id: /** @type {any} */ (hashToken(code)) });
    expect(doc?.usedBy).toBe(res.json().user.id);
    expect(doc?.usedAt).toBeInstanceOf(Date);

    const reuse = await register({ email: 'other@example.org', invite: code }, '10.1.0.2');
    expect(reuse.statusCode).toBe(422);
    expect(reuse.json().fields).toEqual({
      invite: { code: 'invite', message: expect.any(String) },
    });
  });

  it('უცნობი / ვადაგასული / სხვა ელფოსტის კოდი და დაკავებული ელფოსტა — ერთი პასუხი; კოდი არ იწვება', async () => {
    const expected = (await register({ invite: 'MC-UNKNOWN' }, '10.2.0.1')).json();
    expect(expected.code).toBe('validation');

    const taken = await invite();
    const takenRes = await register({ email: EDITOR_EMAIL, invite: taken.code }, '10.2.0.2');
    expect(takenRes.statusCode).toBe(422);
    expect(takenRes.json()).toEqual(expected);
    // დაკავებულმა ელფოსტამ მოწვევა არ დახარჯა — ტრანზაქცია გაუქმდა
    const ok = await register({ email: 'fresh@example.org', invite: taken.code }, '10.2.0.3');
    expect(ok.statusCode).toBe(201);

    const bound = await invite({ role: 'editor', email: 'bound@example.org' });
    const wrongEmail = await register(
      { email: 'other2@example.org', invite: bound.code },
      '10.2.0.4',
    );
    expect(wrongEmail.json()).toEqual(expected);
    expect(
      (await register({ email: 'BOUND@example.org', invite: bound.code }, '10.2.0.5')).statusCode,
    ).toBe(201);

    const late = await invite();
    ctx.clk.advance(7 * DAY + 1);
    const expired = await register({ email: 'late@example.org', invite: late.code }, '10.2.0.6');
    expect(expired.statusCode).toBe(422);
    expect(expired.json()).toEqual(expected);
  });

  it('პაროლი: < 12 → passwordShort; ცნობილი → passwordCommon (კოდი არ იწვება)', async () => {
    await admin.login(ADMIN_EMAIL); // წინა ტესტმა საათი 7 დღით გადაწია — სესია ამოიწურა
    const { code } = await invite();
    const short = await register(
      { email: 'p1@example.org', invite: code, password: 'მოკლე' },
      '10.3.0.1',
    );
    expect(short.statusCode).toBe(422);
    expect(short.json().fields.password.code).toBe('passwordShort');
    const common = await register(
      { email: 'p2@example.org', invite: code, password: 'Qwerty123456' },
      '10.3.0.2',
    );
    expect(common.statusCode).toBe(422);
    expect(common.json().fields.password.code).toBe('passwordCommon');
    expect((await register({ email: 'p3@example.org', invite: code }, '10.3.0.3')).statusCode).toBe(
      201,
    );
  });
});
