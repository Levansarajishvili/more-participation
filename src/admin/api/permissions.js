/**
 * როლები და უფლებები (F8). frontend-ის შემოწმება მხოლოდ UX-ია (მენიუ, guard-ი) — რეალურ
 * ავტორიზაციას სერვერი აკეთებს და იგივე ცხრილით 403-ს აბრუნებს (mock-იც ასე იქცევა).
 */

/** @typedef {'admin' | 'editor'} Role */
/**
 * @typedef {'content.read' | 'content.write' | 'content.publish' | 'media.read' | 'media.write'
 *   | 'a11y.read' | 'users.manage' | 'settings.manage'} Permission
 */

/** @type {readonly Role[]} */
export const ROLES = Object.freeze(['admin', 'editor']);

/** @type {readonly Permission[]} */
export const PERMISSIONS = Object.freeze([
  'content.read',
  'content.write',
  'content.publish',
  'media.read',
  'media.write',
  'a11y.read',
  'users.manage',
  'settings.manage',
]);

/**
 * ადმინისტრატორი — ყველაფერი; რედაქტორი — კონტენტი და მედია, მომხმარებლებისა და
 * პარამეტრების გარეშე.
 * @type {Readonly<Record<Role, readonly Permission[]>>}
 */
export const ROLE_PERMISSIONS = Object.freeze({
  admin: PERMISSIONS,
  editor: Object.freeze([
    'content.read',
    'content.write',
    'content.publish',
    'media.read',
    'media.write',
    'a11y.read',
  ]),
});

/**
 * @param {{ role?: string } | null | undefined} user
 * @param {Permission} permission
 * @returns {boolean}
 */
export function can(user, permission) {
  if (!user?.role) return false;
  const list = ROLE_PERMISSIONS[/** @type {Role} */ (user.role)];
  return Boolean(list?.includes(permission));
}
