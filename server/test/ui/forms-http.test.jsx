// @vitest-environment jsdom
import '@/test/setup.js';

import { cleanup, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { NOW } from '@/content/__tests__/scenarios/content-scenarios.js';
import { setContentAdapter } from '@/content/adapter.js';
import { AXE, renderPage, settle } from '@/features/__tests__/page-helpers.jsx';
import { setLocale } from '@/i18n/locale.js';

import { publicHttpEnv, seededDatabase } from '../public/public-env.js';

/**
 * B6: საჯარო ფორმები (jsdom) HTTP adapter-ით რეალურ სერვერზე (seed-იანი memory-server, fake ფოსტა):
 * კონტაქტის ფორმა მხოლოდ კლავიატურით → სერვერი ინახავს და წერილს აგზავნის; 429 → `role="alert"`,
 * ტექსტი რჩება; გამოწერა → „შეამოწმე ელფოსტა“ → წერილის ბმული → დადასტურება → გაუქმება.
 * CAPTCHA არსად არის. `src/features/**` ტესტების (mock) HTTP ვერსია.
 */

/** @type {Awaited<ReturnType<typeof seededDatabase>>} */
let seeded;
/** @type {Awaited<ReturnType<typeof publicHttpEnv>> | null} */
let env = null;

beforeAll(async () => {
  seeded = await seededDatabase('ui_forms', { start: NOW });
});
afterAll(() => seeded?.database.drop());
afterEach(async () => {
  cleanup();
  setContentAdapter(null);
  setLocale('ka');
  await env?.close();
  env = null;
});

/** @param {Record<string, string>} [config] */
async function start(config) {
  env = await publicHttpEnv(seeded.database, { start: NOW, env: config });
  return env;
}

/** user-event-ში `[` და `{` გასაღების აღწერაა. @param {string} text */
const literal = (text) => text.replace(/[[{]/g, '$&$&');
const NAME = 'სახელი და გვარი (სავალდებულო)';
const CONTACT = 'ტელეფონი ან ელფოსტა (სავალდებულო)';

describe('კონტაქტის ფორმა — HTTP', () => {
  it('მხოლოდ კლავიატურით: Tab → აკრეფა → Space (თანხმობა) → Enter → დადასტურება; ბაზაში და inbox-ში', async () => {
    const { adapter, app } = await start();
    const before = await app.repos.forms.countMessages();
    const { main, user } = await renderPage('/contact', adapter);
    await settle(main);
    const form = within(main).getByRole('region', { name: 'მოგვწერე' });
    within(form).getByLabelText(NAME).focus();
    await user.keyboard(literal('[სახელი გვარი]'));
    await user.tab();
    expect(within(form).getByLabelText(CONTACT)).toHaveFocus();
    await user.keyboard('name@example.ge');
    const consent = within(form).getByRole('checkbox');
    consent.focus();
    await user.keyboard(' ');
    expect(consent).toBeChecked();
    within(form).getByLabelText(NAME).focus();
    await user.keyboard('{Enter}');
    const title = await within(form).findByRole(
      'heading',
      { level: 3, name: 'შეტყობინება მიღებულია' },
      { timeout: 10_000 },
    );
    await waitFor(() => expect(title).toHaveFocus());
    expect(title.closest('[role="status"]')).not.toBeNull();
    expect(await app.repos.forms.countMessages()).toBe(before + 1);
    expect(app.mailer.outbox.at(-1)).toMatchObject({ template: 'contact' });
    expect(main.textContent).not.toMatch(/CAPTCHA/i);
    expect(env?.problems).toEqual([]);
    expect(await axe(main, AXE)).toHaveNoViolations();
  });

  it('სერვერის rate limit (429) → role="alert" ტექსტით, შეყვანილი ტექსტი რჩება', async () => {
    const { adapter } = await start({ RATE_LIMIT_FORMS_MAX: '1' });
    const { main, user } = await renderPage('/contact', adapter);
    await settle(main);
    const form = within(main).getByRole('region', { name: 'მოგვწერე' });
    await user.type(within(form).getByLabelText(NAME), literal('[სახელი გვარი]'));
    await user.type(within(form).getByLabelText(CONTACT), 'limit@example.ge');
    await user.click(within(form).getByRole('checkbox'));
    await user.click(within(form).getByRole('button', { name: 'შეტყობინების გაგზავნა' }));
    await within(form).findByRole('heading', { level: 3, name: 'შეტყობინება მიღებულია' });
    await user.click(within(form).getByRole('button', { name: 'ახალი შეტყობინება' }));
    await user.type(within(form).getByLabelText(NAME), 'მეორე');
    await user.type(within(form).getByLabelText(CONTACT), 'limit@example.ge');
    await user.click(within(form).getByRole('checkbox'));
    await user.click(within(form).getByRole('button', { name: 'შეტყობინების გაგზავნა' }));
    const alert = await within(form).findByRole('alert');
    expect(alert).toHaveTextContent('ძალიან ბევრი მცდელობა');
    expect(within(form).getByLabelText(NAME)).toHaveValue('მეორე');
  });
});

describe('გამოწერა — HTTP, double opt-in', () => {
  it('ფორმა → „შეამოწმე ელფოსტა“ → წერილის ბმული → დადასტურება → მისასალმებელი წერილი → გაუქმება', async () => {
    const { adapter, app } = await start();
    const page = await renderPage('/news', adapter);
    await settle(page.main);
    const block = within(page.main).getByRole('region', { name: 'სიახლეები ელფოსტაზე' });
    await page.user.type(
      within(block).getByLabelText('ელფოსტა (სავალდებულო)'),
      'ui@example.ge{Enter}',
    );
    await waitFor(() =>
      expect(within(block).getByRole('status')).toHaveTextContent(
        'შეამოწმე ელფოსტა: ui@example.ge.',
      ),
    );
    expect((await app.repos.forms.findSubscriber('ui@example.ge'))?.status).toBe('pending');
    const confirm = app.mailer.outbox.at(-1);
    const link = new URL(/https?:\/\/\S+/.exec(confirm.text)?.[0] ?? '');
    expect(link.pathname).toBe('/subscribe/confirm');
    cleanup();

    const view = await renderPage(`${link.pathname}${link.hash}`, adapter);
    // ბმულის გახსნა არაფერს ცვლის — მხოლოდ ღილაკი
    expect((await app.repos.forms.findSubscriber('ui@example.ge'))?.status).toBe('pending');
    await view.user.click(within(view.main).getByRole('button', { name: 'დადასტურება' }));
    expect(await within(view.main).findByRole('status')).toHaveTextContent('გამოწერა დადასტურდა');
    expect((await app.repos.forms.findSubscriber('ui@example.ge'))?.status).toBe('confirmed');
    cleanup();

    const welcome = app.mailer.outbox.at(-1);
    expect(welcome.template).toBe('subscribe-welcome');
    const out = new URL(/https?:\/\/\S+/.exec(welcome.text)?.[0] ?? '');
    const leave = await renderPage(`${out.pathname}${out.hash}`, adapter);
    await leave.user.click(within(leave.main).getByRole('button', { name: 'გამოწერის გაუქმება' }));
    expect(await within(leave.main).findByRole('status')).toHaveTextContent('გამოწერა გაუქმდა');
    expect(await app.repos.forms.findSubscriber('ui@example.ge')).toBeNull();
    expect(env?.problems).toEqual([]);
  });

  it('ინგლისურად: ველის შეცდომა და დადასტურების ბმული ინგლისურია (`/en/subscribe/confirm`)', async () => {
    setLocale('en');
    const { adapter, app } = await start();
    await expect(adapter.subscribe('x@')).rejects.toMatchObject({
      fields: { email: { message: 'An email address looks like this: name@example.ge' } },
    });
    await adapter.subscribe('english@example.ge');
    const mail = app.mailer.outbox.at(-1);
    expect(mail.subject).toBe('Confirm your subscription — More Participation');
    expect(mail.text).toMatch(/http:\/\/localhost:5173\/en\/subscribe\/confirm#token=/);
  });
});
