import argon2 from 'argon2';
import { describe, expect, it } from 'vitest';

import { PASSWORD_MIN } from '@/admin/auth/auth-forms.js';

import { guardsFor } from '../../lib/auth.js';
import { loadSpec } from '../../lib/openapi.js';
import {
  ARGON2_OPTIONS,
  commonPasswords,
  dummyHash,
  hashPassword,
  isCommonPassword,
  needsRehash,
  registerFieldErrors,
  verifyPassword,
} from '../../lib/password.js';
import { MAX_KEYS, createRateLimiter } from '../../lib/rate-limit.js';
import {
  INVITE_PATTERN,
  TOKEN_PATTERN,
  hashToken,
  newInviteCode,
  newToken,
  normalizeInviteCode,
  safeEqual,
} from '../../lib/tokens.js';

import { PASSWORD } from './helpers.js';

describe('tokens', () => {
  it('სესიის token: 256 ბიტი base64url, უნიკალური; hash — sha256 hex', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newToken()));
    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token).toMatch(TOKEN_PATTERN);
      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    }
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('მოწვევის კოდი: MC- + 26 Crockford-ის სიმბოლო; შეყვანა — ჰარისა და რეგისტრის გარეშე', () => {
    const codes = new Set(Array.from({ length: 200 }, () => newInviteCode()));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(INVITE_PATTERN);
    const code = newInviteCode();
    expect(normalizeInviteCode(`  ${code.toLowerCase()} `)).toBe(code);
    expect(normalizeInviteCode(undefined)).toBe('');
  });

  it('safeEqual: სიგრძე და შიგთავსი', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('ა', 'ა')).toBe(true);
  });
});

describe('პაროლი (argon2id)', () => {
  it('OWASP-ის პარამეტრები hash-ში; verify; დაზიანებული hash → false', async () => {
    expect(ARGON2_OPTIONS).toMatchObject({ memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    const hash = await hashPassword(PASSWORD);
    expect(hash).toMatch(/^\$argon2id\$v=19\$/);
    expect(hash).toMatch(/m=19456/);
    expect(hash).toMatch(/t=2/);
    expect(hash).toMatch(/p=1/);
    expect(await verifyPassword(hash, PASSWORD)).toBe(true);
    // ზუსტად ისე, როგორც მოვიდა (ASVS 6.2.8): ჰარი / რეგისტრი სხვა პაროლია
    expect(await verifyPassword(hash, ` ${PASSWORD}`)).toBe(false);
    expect(await verifyPassword(hash, PASSWORD.toUpperCase())).toBe(false);
    expect(await verifyPassword('not-a-hash', PASSWORD)).toBe(false);
    expect(needsRehash(hash)).toBe(false);
    const old = await argon2.hash(PASSWORD, { ...ARGON2_OPTIONS, memoryCost: 9216, timeCost: 4 });
    expect(needsRehash(old)).toBe(true);
    expect(await verifyPassword(await dummyHash(), PASSWORD)).toBe(false);
    expect(await dummyHash()).toBe(await dummyHash());
  });

  it('ცნობილი პაროლების სია: 3000, ყველა ≥ PASSWORD_MIN, პატარა ასოებით; შედარება რეგისტრის გარეშე', () => {
    const list = commonPasswords();
    expect(list.size).toBe(3000);
    for (const password of list) {
      expect([...password].length).toBeGreaterThanOrEqual(PASSWORD_MIN);
      expect(password).toBe(password.toLowerCase());
    }
    expect(isCommonPassword('QWERTY123456')).toBe(true);
    expect(isCommonPassword(PASSWORD)).toBe(false);
  });

  it('registerFieldErrors: validateRegister (UI-ის წესი) + passwordCommon', () => {
    const base = { name: 'სახელი', email: 'a@example.org', invite: 'MC-X' };
    expect(registerFieldErrors({ ...base, password: PASSWORD })).toEqual({});
    expect(registerFieldErrors({ ...base, password: 'short' }).password.code).toBe('passwordShort');
    const common = registerFieldErrors({ ...base, password: '1qaz2wsx3edc' });
    expect(common.password).toEqual({ code: 'passwordCommon', message: expect.any(String) });
    expect(common.password.message).toMatch(/\S/);
    expect(Object.keys(registerFieldErrors({}))).toEqual(['name', 'email', 'invite', 'password']);
  });
});

describe('rate limiter (fixed window)', () => {
  it('ზღვარი, Retry-After, ფანჯრის შემდეგ განულება; გასაღებები ერთმანეთისგან დამოუკიდებელია', () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000, now: () => t });
    expect([1, 2, 3].map(() => limiter.consume('a'))).toEqual([0, 0, 0]);
    expect(limiter.consume('a')).toBe(60);
    expect(limiter.consume('b')).toBe(0);
    t = 59_001;
    expect(limiter.blocked('a')).toBe(1);
    t = 60_000;
    expect(limiter.consume('a')).toBe(0);
  });

  it('blocked მრიცხველს არ ზრდის; hit — ზრდის', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    expect(limiter.blocked('k')).toBe(0);
    expect(limiter.blocked('k')).toBe(0);
    limiter.hit('k');
    expect(limiter.blocked('k')).toBe(1);
  });

  it('მეხსიერების ზღვარი: ჯერ ვადაგასული, შემდეგ უძველესი გასაღები იშლება', () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 10, now: () => t, maxKeys: 3 });
    limiter.hit('a');
    limiter.hit('b');
    t = 5;
    limiter.hit('c');
    expect(limiter.size()).toBe(3);
    t = 11; // a, b — ვადაგასული
    limiter.hit('d');
    expect(limiter.size()).toBe(2);
    limiter.hit('e');
    limiter.hit('f');
    expect(limiter.size()).toBe(3);
    expect(MAX_KEYS).toBe(10_000);
  });
});

describe('guard-ები spec-იდან (B4–B6-ის route-ებიც ავტომატურად იღებს)', () => {
  it('security / x-permission / x-rate-limit → session, csrf, permission, rateLimit', () => {
    const spec = loadSpec();
    expect(guardsFor(spec, 'login')).toEqual({
      session: false,
      csrf: false,
      permission: null,
      rateLimit: 'auth',
    });
    expect(guardsFor(spec, 'me')).toEqual({
      session: true,
      csrf: false,
      permission: null,
      rateLimit: null,
    });
    expect(guardsFor(spec, 'publishItem')).toEqual({
      session: true,
      csrf: true,
      permission: 'content.publish',
      rateLimit: null,
    });
    expect(guardsFor(spec, 'getAdminSettings').permission).toBe('settings.manage');
    expect(guardsFor(spec, 'sendContact')).toEqual({
      session: false,
      csrf: false,
      permission: null,
      rateLimit: 'forms',
    });
    expect(guardsFor(spec, 'getHealth').session).toBe(false);
  });
});
