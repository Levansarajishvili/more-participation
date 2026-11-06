// @vitest-environment jsdom
import '@/test/setup.js';

import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { EDITOR, renderAdmin } from '@/admin/__tests__/admin-helpers.jsx';
import { setAdminAdapter } from '@/admin/api/adminAdapter.js';
import { setAutosaveDelay } from '@/admin/editor/autosave.js';
import { setContentAdapter } from '@/content/adapter.js';
import { t } from '@/i18n/index.js';
import { installMatchMedia } from '@/test/media.js';

import { httpEnv } from '../content/http-env.js';

/**
 * B4: frontend-ის რედაქტორი (`EntityEditor`, jsdom) HTTP adapter-ით — რეალური სერვერი +
 * memory-server, cookie jar (httpOnly სესია JS-ს არ უჩანს, CSRF — `document.cookie`-იდან).
 * `src/admin/__tests__/editor.test.jsx`-ის ძირითადი სცენარები: alt-ის გარეშე გამოქვეყნება ვერ
 * ხერხდება, სერვერის ბლოკერი (422) რედაქტორში ჩანს, 409 → დიალოგი, ავტოშენახვა (მონახაზი და
 * გამოქვეყნებულის სამუშაო ასლი).
 */

/** @type {Awaited<ReturnType<typeof httpEnv>> | null} */
let env = null;

beforeAll(async () => {
  await import('@/admin/routes.jsx');
  await import('@/admin/editor/EditorPage.jsx');
  await import('@/admin/editor/RichTextEditor.jsx');
}, 60_000);

afterEach(async () => {
  cleanup();
  setAdminAdapter(null);
  setContentAdapter(null);
  setAutosaveDelay(2000);
  await env?.close();
  env = null;
});

/**
 * @param {string | ((e: NonNullable<typeof env>) => Promise<string>)} target  slug, id (`v-002`) ან
 *   ფუნქცია, რომელიც id-ს ირჩევს
 * @param {'articles' | 'videos'} [type]
 * @param {{ delay?: number }} [options]
 */
async function openEditor(target, type = 'articles', { delay = 60_000 } = {}) {
  setAutosaveDelay(delay);
  installMatchMedia({ width: 1440 });
  env = await httpEnv('ui_editor');
  await env.login(EDITOR);
  setAdminAdapter(env.adapter);
  const id =
    typeof target === 'function'
      ? await target(env)
      : /^[asvnep]-/.test(target)
        ? target
        : (await env.bySlug(type, target))?.id;
  const found = { id, item: await env.item(/** @type {string} */ (id)) };
  const record = /** @type {{ id: string, item: Record<string, any> }} */ (found);
  const view = renderAdmin(`/admin/${type}/${record.id}`);
  await screen.findByRole('heading', { level: 2, name: 'გამოქვეყნება' }, { timeout: 15_000 });
  return { ...view, id: record.id, item: record.item, env };
}

const titleField = () => screen.getByRole('textbox', { name: /^სათაური/ });

describe('რედაქტორი HTTP adapter-ით: გამოქვეყნება', () => {
  it('alt-ის გარეშე გამოქვეყნება ვერ ხერხდება: ჯამი, ბმული alt-ის ველზე; ბაზაში — მონახაზი', async () => {
    const { user, id } = await openEditor('akhali-statia-monakhazi');
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }));
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent('გამოქვეყნება ვერ მოხერხდა: 3 შენიშვნა');
    await user.click(within(summary).getByRole('link', { name: /alt-ტექსტი/ }));
    expect(document.getElementById('f-cover-alt')).toHaveFocus();
    expect(await env?.item(id)).toMatchObject({ status: 'draft' });
    expect(env?.problems).toEqual([]);
  });

  it('სერვერის ბლოკერი (422) რედაქტორში ჩანს: `[ჩანაცვლება]` YouTube-ის id — ჩეკლისტი უშვებს, სერვერი — არა', async () => {
    const { user, id, item } = await openEditor('v-002', 'videos');
    expect(item.youtube.id).toMatch(/^\[.*\]$/);
    const before = await env?.repos.content.find(id);
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }));
    const summary = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(summary).toHaveTextContent(/გამოქვეყნება ვერ მოხერხდა: \d შენიშვნა/);
    expect(summary).toHaveTextContent(t('checks.youtubeInvalid'));
    const after = await env?.repos.content.find(id);
    expect(after?.meta.version).toBe(before?.meta.version);
    expect(after?.item).toEqual(before?.item);
    expect(env?.problems).toEqual([]);
  });

  it('409 → „მასალა სხვამ შეცვალა“; „მათი ვერსიის ჩატვირთვა“ სერვერის ვერსიას აჩვენებს', async () => {
    const { user, id } = await openEditor('akhali-statia-monakhazi');
    const record = await env?.admin.content.get(id);
    await env?.admin.content.update(
      id,
      { title: '[სხვისი ცვლილება]' },
      { version: /** @type {number} */ (record?.version) },
    );
    await user.type(titleField(), ' ჩემი');
    await user.keyboard('{Control>}s{/Control}');
    const dialog = await screen.findByRole('alertdialog', { name: 'მასალა სხვამ შეცვალა' });
    await user.click(within(dialog).getByRole('button', { name: 'მათი ვერსიის ჩატვირთვა' }));
    await waitFor(() => expect(titleField()).toHaveValue('[სხვისი ცვლილება]'));
    expect(env?.problems).toEqual([]);
  });
});

describe('რედაქტორი HTTP adapter-ით: ავტოშენახვა', () => {
  it('მონახაზი: debounce → ბაზაში იწერება, „ავტომატურად შეინახა … · ავტორი“ ჩანს', async () => {
    const { user, id } = await openEditor('akhali-statia-monakhazi', 'articles', { delay: 50 });
    await user.type(titleField(), ' 2');
    await waitFor(
      async () =>
        expect(await env?.item(id)).toMatchObject({
          title: '[სტატიის სათაური — მონახაზი] 2',
        }),
      { timeout: 5000 },
    );
    expect(
      await screen.findByText(/^ავტომატურად შეინახა \d\d:\d\d · ავტორი: \[სახელი გვარი 2\]$/),
    ).toBeInTheDocument();
    expect(env?.problems).toEqual([]);
  });

  it('გამოქვეყნებული: ავტოშენახვა სამუშაო ასლია — საიტი უცვლელია, „გამოქვეყნება“ მას ამტკიცებს', async () => {
    // პირველი საჯარო სტატია (სიის რიგით)
    const opened = await openEditor(
      async (e) =>
        (await e.admin.content.list({ type: 'articles', status: 'published' })).items[0].id,
      'articles',
      { delay: 50 },
    );
    const { user, id, item } = opened;
    await user.type(titleField(), ' (ახალი)');
    const doc = () => env?.app.db.collection('content').findOne({ _id: id });
    await waitFor(
      async () => expect((await doc())?.working?.item.title).toBe(`${item.title} (ახალი)`),
      { timeout: 5000 },
    );
    expect((await doc())?.item.title).toBe(item.title);
    expect((await env?.pub.getArticle(item.slug))?.title).toBe(item.title);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }));
    expect(
      await screen.findByText('გამოქვეყნდა — საიტზე უკვე ჩანს.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    // რედაქტორი slug-ს სათაურიდან აახლებს (F8: ავტომატიკა, სანამ slug ხელით არ შეცვლილა) — ახალი
    // მისამართით
    const published = await doc();
    expect(published?.item).toMatchObject({ status: 'published', title: `${item.title} (ახალი)` });
    expect((await env?.pub.getArticle(published?.item.slug))?.title).toBe(`${item.title} (ახალი)`);
    expect((await doc())?.working).toBeNull();
    expect(env?.problems).toEqual([]);
  });
});
