// @vitest-environment jsdom
import '@/test/setup.js';

import { Buffer } from 'node:buffer';

import { cleanup, screen, waitFor, within } from '@testing-library/react';
import sharp from 'sharp';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { AXE, EDITOR, renderAdmin } from '@/admin/__tests__/admin-helpers.jsx';
import { setAdminAdapter } from '@/admin/api/adminAdapter.js';
import { setAutosaveDelay } from '@/admin/editor/autosave.js';
import { setContentAdapter } from '@/content/adapter.js';
import { installMatchMedia } from '@/test/media.js';

import { httpEnv } from '../content/http-env.js';
import { CAMERA, jpegWithGps } from '../media/fixtures.js';

/**
 * B5: მედიის ეკრანი (`/admin/media`) და რედაქტორის ფოტოს ატვირთვა — frontend-ის კომპონენტები jsdom-ში,
 * HTTP adapter-ით რეალურ სერვერზე (memory-server + მეხსიერების საცავი). ატვირთვა multipart-ით,
 * სერვერის უარი ველთან ჩანს, ბრაუზერის წინასწარი შემოწმება მოთხოვნას არ აგზავნის, 409 → სია
 * ახლდება, ატვირთული ფოტოს EXIF ცარიელია.
 */

/** @type {Awaited<ReturnType<typeof httpEnv>> | null} */
let env = null;

beforeAll(async () => {
  await import('@/admin/routes.jsx');
  await import('@/admin/pages/MediaPage.jsx');
  await import('@/admin/editor/EditorPage.jsx');
}, 60_000);

afterEach(async () => {
  cleanup();
  setAdminAdapter(null);
  setContentAdapter(null);
  setAutosaveDelay(2000);
  await env?.close();
  env = null;
});

/** @param {Buffer} data @param {string} name @param {string} type */
const file = (data, name, type) => new File([new Uint8Array(data)], name, { type });

async function openMedia() {
  installMatchMedia({ width: 1440 });
  env = await httpEnv('ui_media');
  await env.login(EDITOR);
  setAdminAdapter(env.adapter);
  const view = renderAdmin('/admin/media');
  await screen.findByRole('button', { name: 'ფოტოს ატვირთვა' }, { timeout: 15_000 });
  await waitFor(() => expect(document.querySelector('.mc-media-grid')).not.toBeNull(), {
    timeout: 10_000,
  });
  const input = /** @type {HTMLInputElement} */ (
    document.querySelector('.mc-library__upload input[type="file"]')
  );
  return { ...view, input, env };
}

/** @param {string} title */
const card = (title) =>
  /** @type {HTMLElement} */ (screen.getByRole('heading', { level: 2, name: title }).closest('li'));

describe('მედიის ეკრანი HTTP adapter-ით', () => {
  it('ატვირთვა → ბარათი „ხარვეზით“; EXIF / GPS ცარიელია; alt-ის შენახვა; გამოუყენებლის წაშლა საცავიდან', async () => {
    const { user, input } = await openMedia();
    expect(input.accept).toBe('image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp');
    await user.upload(input, file(await jpegWithGps(), 'ჩემი-ფოტო.jpg', 'image/jpeg'));
    expect(
      await screen.findByText('ატვირთულია: ჩემი-ფოტო.jpg', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    const uploaded = await waitFor(() => card('ჩემი-ფოტო.jpg'), { timeout: 10_000 });
    expect(within(uploaded).getByText('ხარვეზი: alt-ტექსტი აკლია')).toBeInTheDocument();

    const [doc] = await /** @type {any} */ (env).repos.media.list();
    const stored = await /** @type {any} */ (env).app.storage.get(doc.key);
    const meta = await sharp(stored.body).metadata();
    expect(meta.exif).toBeUndefined();
    expect(stored.body.includes(Buffer.from(CAMERA))).toBe(false);

    await user.click(within(uploaded).getByRole('button', { name: /^alt-ის რედაქტირება/ }));
    await user.type(
      within(uploaded).getByRole('textbox', { name: /^alt-ტექსტი/ }),
      'მონაწილე სცენაზე',
    );
    await user.click(within(uploaded).getByRole('button', { name: 'შენახვა' }));
    expect(
      await screen.findByText('alt შეინახა — ყველა გამოყენებაში აისახა.', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect((await /** @type {any} */ (env).repos.media.find(doc._id))?.alt).toBe(
      'მონაწილე სცენაზე',
    );

    // სია ახლდება (ჩონჩხი) — ბარათი თავიდან ჩნდება
    const saved = await waitFor(() => card('ჩემი-ფოტო.jpg'), { timeout: 10_000 });
    expect(within(saved).queryByText('ხარვეზი: alt-ტექსტი აკლია')).toBeNull();
    await user.click(within(saved).getByRole('button', { name: /^წაშლა/ }));
    const dialog = await screen.findByRole('dialog', { name: 'ფაილის წაშლა' });
    await user.click(within(dialog).getByRole('button', { name: 'წაშლა' }));
    expect(await screen.findByText('ფაილი წაიშალა.', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(await /** @type {any} */ (env).app.storage.head(doc.key)).toBeNull();
    expect(env?.problems).toEqual([]);
  });

  it('SVG `.png`-ად — ბრაუზერში ჩერდება (მოთხოვნა არ იგზავნება); დაზიანებული JPEG — სერვერის უარი ველთან; axe', async () => {
    const { user, input, container } = await openMedia();
    const button = screen.getByRole('button', { name: 'ფოტოს ატვირთვა' });
    await user.upload(
      input,
      new File(['<svg onload="alert(1)"/>'], 'logo.png', { type: 'image/png' }),
    );
    const local = await screen.findByRole('alert');
    expect(local).toHaveTextContent('ეს ფაილი სურათი არ არის — აირჩიე JPG, PNG ან WebP.');
    expect(button).toHaveAccessibleDescription(/ეს ფაილი სურათი არ არის/);
    expect(await /** @type {any} */ (env).repos.media.list()).toHaveLength(0);

    await user.upload(
      input,
      file(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]), 'broken.jpg', 'image/jpeg'),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'ფაილი ვერ აიტვირთა: ფაილი დაზიანებულია ან ვერ წავიკითხეთ — შეინახე თავიდან და ატვირთე.',
      ),
    );
    expect(await /** @type {any} */ (env).repos.media.list()).toHaveLength(0);
    expect(await axe(container, AXE)).toHaveNoViolations();
    expect(env?.problems).toEqual([]);
  });

  it('409: ფაილი ამასობაში მასალაში ჩაისვა → „…ვერ წაიშლება“, სია ახლდება, ღილაკი მიზეზით ითიშება', async () => {
    const { user, input } = await openMedia();
    await user.upload(input, file(await jpegWithGps(), 'race.jpg', 'image/jpeg'));
    await waitFor(() => card('race.jpg'), { timeout: 10_000 });
    const current = /** @type {NonNullable<typeof env>} */ (env);
    const [doc] = await current.repos.media.list();
    const draft = (await current.admin.content.list({ type: 'articles', status: 'draft' }))
      .items[0];
    const record = await current.admin.content.get(draft.id);
    await current.admin.content.update(
      draft.id,
      { cover: { src: `/media/${doc.key}`, alt: '[ყდა]', ratio: '3:2' } },
      { version: record.version },
    );
    await user.click(within(card('race.jpg')).getByRole('button', { name: /^წაშლა/ }));
    const dialog = await screen.findByRole('dialog', { name: 'ფაილის წაშლა' });
    await user.click(within(dialog).getByRole('button', { name: 'წაშლა' }));
    expect(
      await screen.findByText(
        'ფაილი ამასობაში მასალაში ჩაისვა და ვერ წაიშლება — სია განახლდა.',
        {},
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    await waitFor(
      () => {
        const remove = within(card(`${draft.title} — ყდა`)).getByRole('button', { name: /^წაშლა/ });
        expect(remove).toHaveAttribute('aria-disabled', 'true');
        expect(remove).toHaveAccessibleDescription('გამოიყენება 1 მასალაში — ჯერ იქიდან მოხსენი.');
      },
      { timeout: 10_000 },
    );
    expect(await current.app.storage.head(doc.key)).not.toBeNull();
    expect(current.problems).toEqual([]);
  });
});

describe('რედაქტორი: ფოტოს ატვირთვა HTTP adapter-ით', () => {
  it('ყდის ატვირთვა → `/media/…` ფორმაში და ბაზაში; ბიბლიოთეკაში — ფაილი გამოყენებით', async () => {
    setAutosaveDelay(60_000);
    installMatchMedia({ width: 1440 });
    env = await httpEnv('ui_editor_upload');
    await env.login(EDITOR);
    setAdminAdapter(env.adapter);
    const draft = await env.bySlug('articles', 'akhali-statia-monakhazi');
    const id = /** @type {{ id: string }} */ (draft).id;
    const { user } = renderAdmin(`/admin/articles/${id}`);
    await screen.findByRole('heading', { level: 2, name: 'გამოქვეყნება' }, { timeout: 15_000 });
    const cover = /** @type {HTMLElement} */ (document.getElementById('f-cover'));
    const input = /** @type {HTMLInputElement} */ (cover.querySelector('input[type="file"]'));

    await user.upload(
      input,
      file(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]), 'bad.jpg', 'image/jpeg'),
    );
    expect(await within(cover).findByRole('alert', {}, { timeout: 10_000 })).toHaveTextContent(
      /^.*ფაილი ვერ აიტვირთა: ფაილი დაზიანებულია/,
    );

    await user.upload(input, file(await jpegWithGps(), 'cover.jpg', 'image/jpeg'));
    expect(
      await within(cover).findByText('ატვირთულია: cover.jpg', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(within(cover).queryByRole('alert')).toBeNull();
    await user.type(
      within(cover).getByRole('textbox', { name: /^alt-ტექსტი/ }),
      'მონაწილე სცენაზე, თვალის დონე',
    );
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(
      async () =>
        expect((await env?.item(id))?.cover).toMatchObject({
          src: expect.stringMatching(/^\/media\/image\/\d{4}\/[A-Za-z0-9_-]{22}\.jpg$/),
          alt: 'მონაწილე სცენაზე, თვალის დონე',
        }),
      { timeout: 5000 },
    );
    const saved = /** @type {Record<string, any>} */ (await env.item(id));
    const library = await env.admin.media.list({ kind: 'image' });
    const uploaded = library.find((m) => m.src === saved.cover.src);
    expect(uploaded?.usage).toEqual([
      expect.objectContaining({ type: 'articles', id, field: 'cover' }),
    ]);
    expect(env.problems).toEqual([]);
  });
});
