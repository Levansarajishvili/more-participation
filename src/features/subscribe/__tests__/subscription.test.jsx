import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import {
  AXE,
  failingAdapter,
  headingTree,
  okAdapter,
  renderPage,
  skippedLevels,
  switchableAdapter,
} from '@/features/__tests__/page-helpers.jsx';

/**
 * B6: წერილის ბმულის გვერდი (`/subscribe/confirm`, `/subscribe/unsubscribe`) mock adapter-ით —
 * double opt-in-ის მთელი გზა. HTTP adapter-ით რეალურ სერვერზე — `server/test/ui/forms-http.test.jsx`.
 */

afterEach(() => setContentAdapter(null));

/** mock-ის წერილიდან ბმული (`/subscribe/confirm#token=…`). @param {ReturnType<typeof okAdapter>} adapter */
const lastLink = (adapter) => /** @type {{ link: string }} */ (adapter.outbox.at(-1)).link;

describe('გამოწერის დადასტურება', () => {
  it('GET არაფერს ადასტურებს; ღილაკი (CTA) → role="status", ფოკუსი h2-ზე; ბაზაში — confirmed', async () => {
    const adapter = okAdapter();
    await adapter.subscribe('reader@example.ge');
    const { main, user } = await renderPage(lastLink(adapter), adapter);
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent(
      'გამოწერის დადასტურება',
    );
    expect(main).toHaveTextContent('ბმული 7 დღე მოქმედებს.');
    expect(adapter.subscribers.get('reader@example.ge')?.status).toBe('pending');
    const button = within(main).getByRole('button', { name: 'დადასტურება' });
    expect(button.className).toMatch(/cta/);
    await user.click(button);
    const status = await within(main).findByRole('status');
    expect(status).toHaveTextContent('გამოწერა დადასტურდა');
    await waitFor(() => expect(within(status).getByRole('heading', { level: 2 })).toHaveFocus());
    expect(adapter.subscribers.get('reader@example.ge')?.status).toBe('confirmed');
    expect(adapter.outbox.at(-1)).toMatchObject({ template: 'subscribe-welcome' });
    expect(skippedLevels(headingTree(main))).toEqual([]);
    expect(await axe(main, AXE)).toHaveNoViolations();
  });

  it('გამოყენებული / ვადაგასული ბმული → role="alert" ხატულით და ტექსტით + „თავიდან გამოწერა“', async () => {
    const adapter = okAdapter();
    await adapter.subscribe('again@example.ge');
    const link = lastLink(adapter);
    await adapter.confirmSubscription(new URL(link, 'http://x').hash.slice(7));
    const { main, user } = await renderPage(link, adapter);
    await user.click(within(main).getByRole('button', { name: 'დადასტურება' }));
    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent('ბმული ვადაგასულია ან უკვე გამოყენებულია');
    expect(alert.querySelector('svg')).not.toBeNull();
    expect(within(main).getByRole('link', { name: 'თავიდან გამოწერა' })).toHaveAttribute(
      'href',
      '/articles',
    );
    expect(within(main).queryByRole('button', { name: 'დადასტურება' })).toBeNull();
    expect(await axe(main, AXE)).toHaveNoViolations();
  });

  it('ქსელის შეცდომა → alert, ღილაკი რჩება; ხელახლა → წარმატება', async () => {
    const ok = okAdapter();
    await ok.subscribe('net@example.ge');
    const source = switchableAdapter(failingAdapter());
    const { main, user } = await renderPage(lastLink(ok), source.adapter);
    await user.click(within(main).getByRole('button', { name: 'დადასტურება' }));
    expect(await within(main).findByRole('alert')).toHaveTextContent(/კავშირი ვერ დამყარდა/);
    source.use(ok);
    await user.click(within(main).getByRole('button', { name: 'დადასტურება' }));
    expect(await within(main).findByRole('status')).toHaveTextContent('გამოწერა დადასტურდა');
  });

  it('ბმული token-ის გარეშე / დაზიანებული → შეტყობინება, ღილაკი არ არის, მოთხოვნა არ იგზავნება', async () => {
    for (const path of ['/subscribe/confirm', '/subscribe/confirm#token=abc']) {
      const adapter = okAdapter();
      const { main, unmount } = await renderPage(path, adapter);
      expect(main).toHaveTextContent('ბმული არასრულია');
      expect(within(main).queryByRole('button', { name: 'დადასტურება' })).toBeNull();
      unmount();
    }
  });
});

describe('გამოწერის გაუქმება ერთი ბმულით', () => {
  it('მისასალმებელი წერილის ბმული → ღილაკი (primary) → გაუქმდა; ინგლისურად — /en', async () => {
    const adapter = okAdapter();
    await adapter.subscribe('leave@example.ge');
    await adapter.confirmSubscription(new URL(lastLink(adapter), 'http://x').hash.slice(7));
    const link = lastLink(adapter);
    expect(link).toMatch(/^\/subscribe\/unsubscribe#token=/);
    const { main, user } = await renderPage(link, adapter);
    const button = within(main).getByRole('button', { name: 'გამოწერის გაუქმება' });
    expect(button.className).not.toMatch(/cta/);
    await user.click(button);
    expect(await within(main).findByRole('status')).toHaveTextContent('გამოწერა გაუქმდა');
    expect(adapter.subscribers.has('leave@example.ge')).toBe(false);
    expect(await axe(main, AXE)).toHaveNoViolations();
  });

  it('ყალბი ბმული → alert „ბმული არასწორია“, „თავიდან გამოწერის“ ღილაკის გარეშე', async () => {
    const { main, user } = await renderPage(
      `/subscribe/unsubscribe#token=${'0'.repeat(24)}.${'A'.repeat(43)}`,
    );
    await user.click(within(main).getByRole('button', { name: 'გამოწერის გაუქმება' }));
    expect(await within(main).findByRole('alert')).toHaveTextContent('ბმული არასწორია');
    expect(screen.queryByRole('link', { name: 'თავიდან გამოწერა' })).toBeNull();
  });
});
