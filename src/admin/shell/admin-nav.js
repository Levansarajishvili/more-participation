/**
 * sidebar-ის მენიუ (AdminPanel დაფა): სამი ჯგუფი. `type` — კონტენტის ტიპი (მრიცხველი
 * `stats().counts`-იდან), `permission` — ჯგუფი მხოლოდ ამ უფლებით ჩანს.
 * ღონისძიებები სიახლეების ქვეპუნქტია (დაფაზე ცალკე არ არის).
 *
 * @typedef {object} AdminNavItem
 * @property {string} to
 * @property {string} [label]     i18n-ის გასაღები (ტიპის გარეშე)
 * @property {import('../content-types.js').ContentType} [type]
 * @property {'images' | 'documents'} [library]
 * @property {string} icon
 * @property {boolean} [end]
 * @property {AdminNavItem[]} [children]
 *
 * @typedef {{ id: 'content' | 'library' | 'admin', permission?: import('../api/permissions.js').Permission, items: AdminNavItem[] }} AdminNavGroup
 */

/** @type {readonly AdminNavGroup[]} */
export const ADMIN_NAV = Object.freeze([
  {
    id: 'content',
    items: [
      { to: '/admin', label: 'nav.dashboard', icon: 'dashboard', end: true },
      { to: '/admin/articles', type: 'articles', icon: 'article' },
      { to: '/admin/series', type: 'series', icon: 'slides' },
      { to: '/admin/videos', type: 'videos', icon: 'video' },
      {
        to: '/admin/news',
        type: 'news',
        icon: 'news',
        children: [{ to: '/admin/events', type: 'events', icon: 'event' }],
      },
      { to: '/admin/pages', type: 'pages', icon: 'pages' },
    ],
  },
  {
    id: 'library',
    items: [
      { to: '/admin/media', label: 'nav.media', library: 'images', icon: 'image' },
      { to: '/admin/documents', label: 'nav.documents', library: 'documents', icon: 'document' },
    ],
  },
  {
    id: 'admin',
    permission: 'users.manage',
    items: [
      { to: '/admin/users', label: 'nav.users', icon: 'users' },
      { to: '/admin/settings', label: 'nav.settings', icon: 'settings' },
    ],
  },
]);
