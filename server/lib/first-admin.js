import { ContentError } from '@/content/errors.js';
import { normalizeEmail } from '@/content/forms.js';

import { hashPassword, registerFieldErrors } from './password.js';

/**
 * პირველი ადმინისტრატორი (B3, ASVS 6.3.2 — ნაგულისხმევი ანგარიში არ არსებობს): ელფოსტა, სახელი
 * და პაროლი მხოლოდ ოპერატორისგან (ტერმინალი / env). წესები — რეგისტრაციის იგივე
 * (`registerFieldErrors`: სახელი, ელფოსტა, ≥ 12, ცნობილი პაროლი). აქტიური ადმინისტრატორი თუ
 * უკვე არსებობს — უარი: შემდეგი ანგარიშები მხოლოდ მოწვევით.
 *
 * შეცდომის `detail` მნიშვნელობას არ შეიცავს — მხოლოდ ველისა და წესის სახელს.
 * @param {import('../db/index.js').Repositories} repos
 * @param {{ email?: string, name?: string, password?: string }} input
 * @returns {Promise<import('../db/users.js').UserDoc>}
 */
export async function createFirstAdmin(repos, { email = '', name = '', password = '' }) {
  const fields = registerFieldErrors({ name, email, invite: '-', password });
  if (Object.keys(fields).length) {
    const detail = Object.entries(fields)
      .map(([key, field]) => `${key}: ${field.code}`)
      .join(', ');
    throw new ContentError('validation', { fields, detail });
  }
  if (await repos.users.countActive('admin')) {
    throw new ContentError('conflict', {
      detail: 'აქტიური ადმინისტრატორი უკვე არსებობს — ახალი ანგარიში ადმინ პანელიდან, მოწვევით',
    });
  }
  const normalized = normalizeEmail(email);
  if (await repos.users.findByEmail(normalized)) {
    throw new ContentError('conflict', { detail: 'ეს ელფოსტა უკვე დაკავებულია' });
  }
  return repos.users.insert({
    name: name.trim(),
    email: normalized,
    passwordHash: await hashPassword(password),
    role: 'admin',
  });
}
