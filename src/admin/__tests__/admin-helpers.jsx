import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { setContentAdapter } from '@/content/adapter.js';
import { createMockAdapter, createMockStore } from '@/content/mock/index.js';
import { createRouterOptions, createRoutes } from '@/routes.jsx';
import { installMatchMedia } from '@/test/media.js';

import { setAdminAdapter } from '../api/adminAdapter.js';
import { MOCK_PASSWORD, SESSION_TTL_MS, createMockAdminAdapter } from '../api/mock.js';

/** jsdom-ში განლაგება არ არის — კონტრასტს Chromium-ის axe ამოწმებს (gate). */
export const AXE = { rules: { 'color-contrast': { enabled: false } } };

export const ADMIN = 'admin@example.org';
export const EDITOR = 'editor@example.org';

/**
 * საერთო საცავი + საჯარო და ადმინის mock adapter-ები. საათი რეალურია: სესიის ტაიმერი
 * (AuthProvider) `Date.now()`-ს იყენებს.
 * @param {{ sessionTtl?: number, width?: number }} [options]
 */
export function setupAdmin({ sessionTtl = SESSION_TTL_MS, width = 1440 } = {}) {
  installMatchMedia({ width });
  const store = createMockStore();
  const pub = createMockAdapter({ store });
  const admin = createMockAdminAdapter({ store, sessionTtl });
  setContentAdapter(pub);
  setAdminAdapter(admin);
  return { store, pub, admin };
}

/**
 * სესიის გახსნა ფორმის გარეშე (ეკრანების ტესტები).
 * @param {ReturnType<typeof createMockAdminAdapter>} admin
 * @param {'admin' | 'editor'} [role]
 */
export function signInDirect(admin, role = 'admin') {
  const user = admin.state.users.find((u) => u.role === role);
  admin.state.session = {
    userId: /** @type {string} */ (user?.id),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
}

/**
 * @param {string} path
 * @param {{ routes?: import('react-router').RouteObject[] }} [options]
 */
export function renderAdmin(path, { routes } = {}) {
  const router = createMemoryRouter(routes ?? createRoutes(), {
    initialEntries: [path],
    ...(routes ? {} : createRouterOptions()),
  });
  const user = userEvent.setup();
  const view = render(<RouterProvider router={router} />);
  return { ...view, router, user };
}

/**
 * შესვლის ფორმის შევსება და გაგზავნა.
 * @param {ReturnType<typeof userEvent.setup>} user
 * @param {{ email?: string, password?: string }} [values]
 */
export async function fillLogin(user, { email = ADMIN, password = MOCK_PASSWORD } = {}) {
  const emailField = await screen.findByRole('textbox', { name: /^ელფოსტა/ });
  await user.clear(emailField);
  if (email) await user.type(emailField, email);
  const passwordField = screen.getByLabelText(/^პაროლი \(/, { selector: '#login-password' });
  await user.clear(passwordField);
  if (password) await user.type(passwordField, password);
  await user.click(screen.getByRole('button', { name: 'შესვლა' }));
}
