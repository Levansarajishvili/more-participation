import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { routes } from './routes.jsx';

const PAGES = [
  ['/', 'მთავარი', 'მეტი ჩართულობა'],
  ['/about', 'ჩვენ შესახებ', 'ჩვენ შესახებ — მეტი ჩართულობა'],
  ['/articles', 'სტატიები', 'სტატიები — მეტი ჩართულობა'],
  ['/articles/chveva-5-nabiji', '[სტატიის სათაური]', '[სტატიის სათაური] — მეტი ჩართულობა'],
  ['/development', 'პიროვნული განვითარება', 'პიროვნული განვითარება — მეტი ჩართულობა'],
  ['/videos', 'ვიდეოები', 'ვიდეოები — მეტი ჩართულობა'],
  ['/news', 'სიახლეები', 'სიახლეები — მეტი ჩართულობა'],
  ['/contact', 'კონტაქტი', 'კონტაქტი — მეტი ჩართულობა'],
  ['/__kit', 'UI ნაკრები', 'UI ნაკრები — მეტი ჩართულობა'],
  ['/ar-arsebuli', 'გვერდი ვერ მოიძებნა', 'გვერდი ვერ მოიძებნა — მეტი ჩართულობა'],
];

/** @param {string} path */
async function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  const heading = await screen.findByRole('heading', { level: 1 });
  return { ...view, heading };
}

describe('როუტები', () => {
  it.each(PAGES)('%s — ერთი h1, სათაური და main', async (path, h1, title) => {
    const { container, heading } = await renderAt(path);
    expect(heading).toHaveTextContent(h1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('main')).toContainElement(heading);
    expect(document.title).toBe(title);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('/__kit მხოლოდ dev-ში რეგისტრირდება', () => {
    const paths = routes[0].children.map((route) => route.path);
    expect(paths.includes('__kit')).toBe(import.meta.env.DEV);
  });

  it('ადმინის როუტები ჯერ არ არსებობს (F8)', () => {
    const paths = routes[0].children.map((route) => route.path ?? '');
    expect(paths.some((path) => path.startsWith('admin'))).toBe(false);
  });
});
