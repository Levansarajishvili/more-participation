import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';

import { setAdminAdapter } from '../api/adminAdapter.js';
import { setAutosaveDelay } from '../editor/autosave.js';

import { AXE, renderAdmin, setupAdmin, signInDirect } from './admin-helpers.jsx';

/** ფორმატით სწორი, სატესტო id-ები (რეალური ვიდეო არ არის). */
const ID = 'TestVideo01';
const AD_ID = 'TestVideoAD';
const VTT =
  'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n[ფრაზა]\n\n00:00:05.000 --> 00:00:09.500\n[ფრაზა 2]\n';

/** @type {import('vitest').MockInstance} */
let fetchSpy;

beforeAll(async () => {
  await import('../routes.jsx');
  await import('../editor/EditorPage.jsx');
}, 30_000);

beforeEach(() => {
  // ადმინში YouTube-თან (oEmbed / Data API) ან სხვაგან ქსელის მოთხოვნა არ ხდება — spy ამოწმებს
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('ქსელი ადმინის ტესტში არ გამოიყენება');
  });
});

afterEach(() => {
  setAdminAdapter(null);
  setContentAdapter(null);
  setAutosaveDelay(2000);
  vi.restoreAllMocks();
});

async function openDraftVideo() {
  setAutosaveDelay(60_000);
  const env = setupAdmin();
  signInDirect(env.admin, 'editor');
  const record = env.store.findBySlug('videos', 'akhali-video-monakhazi');
  const view = renderAdmin(`/admin/videos/${record?.id}`);
  await screen.findByRole('heading', { level: 2, name: 'გამოქვეყნება' }, { timeout: 8000 });
  return { ...env, ...view, id: /** @type {string} */ (record?.id) };
}

const linkField = () => screen.getByRole('textbox', { name: /^YouTube-ის ბმული/ });
const adField = () =>
  screen.getByRole('textbox', { name: /^აუდიოაღწერის ვერსია — YouTube-ის ბმული/ });
const checklistItem = (/** @type {string} */ text) => {
  const section = screen
    .getByRole('heading', { name: 'ხელმისაწვდომობის ჩეკლისტი' })
    .closest('section');
  return within(/** @type {HTMLElement} */ (section))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.includes(text));
};

/**
 * @param {ReturnType<typeof import('@testing-library/user-event').default.setup>} user
 * @param {HTMLElement} field
 * @param {string} text
 */
async function pasteInto(user, field, text) {
  await user.clear(field);
  field.focus();
  await user.paste(text);
}

describe('F10: ვიდეოს რედაქტორი — YouTube-ის ბმული', () => {
  it('ჩასმა: ინახება მხოლოდ id, ჩანს „ვიდეოს id“ და კადრი; სათაური და აღწერა უცვლელია; YouTube-თან მოთხოვნა არ ხდება', async () => {
    const { user } = await openDraftVideo();
    const title = screen.getByRole('textbox', { name: /^სათაური/ });
    const excerpt = screen.getByRole('textbox', { name: /^მოკლე აღწერა/ });
    const before = { title: title.value, excerpt: excerpt.value };
    expect(checklistItem('ვიდეოს წყარო')?.className).toContain('mc-rule--fail');

    await pasteInto(user, linkField(), `https://youtu.be/${ID}?si=AbCd&t=83`);
    expect(linkField()).toHaveValue(`https://youtu.be/${ID}?si=AbCd&t=83`);
    expect(screen.getByText(ID)).toHaveAttribute('lang', 'en');
    expect(linkField()).toHaveAccessibleDescription(new RegExp(`ვიდეოს id: ${ID}`));
    const preview = /** @type {HTMLImageElement} */ (
      document.querySelector('.mc-youtube-field__preview img')
    );
    expect(preview).toHaveAttribute('src', `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`);
    expect(preview).toHaveAttribute('alt', '');
    expect(title).toHaveValue(before.title);
    expect(excerpt).toHaveValue(before.excerpt);
    expect(checklistItem('ვიდეოს წყარო')?.className).toContain('mc-rule--ok');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('არასწორი ბმული: ველის შეცდომა ტექსტით და ხატულით, id იშლება, ჩეკლისტი ბლოკავს', async () => {
    const { user } = await openDraftVideo();
    await pasteInto(user, linkField(), `https://www.youtube.com/watch?v=${ID}`);
    await pasteInto(user, linkField(), 'https://vimeo.com/123456');
    expect(linkField()).toHaveAttribute('aria-invalid', 'true');
    const error = /** @type {HTMLElement} */ (document.getElementById(`${linkField().id}-error`));
    expect(error).toHaveTextContent(/YouTube-ის ბმული ვერ ამოვიცანით/);
    expect(error.querySelector('svg')).not.toBeNull();
    expect(screen.queryByText(ID)).toBeNull();
    expect(checklistItem('ვიდეოს წყარო')?.className).toContain('mc-rule--fail');
  });

  it('უკვე გამოყენებული id → გაფრთხილება ბმულით იმ მასალაზე; აუდიოაღწერა = მთავარი → შეცდომა', async () => {
    const { user, store } = await openDraftVideo();
    const other = store.findBySlug('videos', 'sporti-romelmats-tskhovreba-shetsvala');
    if (!other) throw new Error('fixture');
    /** @type {any} */ (other.item).youtube = { id: ID, adId: AD_ID };
    await pasteInto(user, linkField(), ID);
    const warning = await screen.findByText(/გაფრთხილება: ეს YouTube-ის ვიდეო უკვე გამოიყენება/);
    const link = within(/** @type {HTMLElement} */ (warning.closest('p'))).getByRole('link');
    expect(link).toHaveAttribute('href', `/admin/videos/${other.id}`);
    expect(link).toHaveTextContent(/** @type {any} */ (other.item).title);
    expect(linkField()).toHaveAccessibleDescription(/უკვე გამოიყენება/);

    await pasteInto(user, adField(), `https://www.youtube.com/watch?v=${ID}`);
    expect(adField()).toHaveAttribute('aria-invalid', 'true');
    expect(adField()).toHaveAccessibleDescription(/ეს მთავარი ვიდეოს ბმულია/);
  });

  it('VTT: დაზიანებული — შეცდომა სტრიქონის ნომრით (არ ინახება); სწორი — cue-ების რაოდენობა, ჩეკლისტი ✓', async () => {
    const { user } = await openDraftVideo();
    const fieldset = /** @type {HTMLElement} */ (document.getElementById('f-captions'));
    const input = /** @type {HTMLInputElement} */ (fieldset.querySelector('input[type="file"]'));
    await user.upload(
      input,
      new File(['WEBVTT\n\n00:00:05,000 --> 00:00:06,000\nა'], 'bad.vtt', { type: 'text/vtt' }),
    );
    expect(await within(fieldset).findByText(/სტრიქონი 3/)).toBeInTheDocument();
    expect(within(fieldset).getByText('ფაილი ჯერ არ არის.')).toBeInTheDocument();
    expect(checklistItem('ქართული სუბტიტრი')?.className).toContain('mc-rule--fail');

    await user.upload(input, new File([VTT], 'ka.vtt', { type: 'text/vtt' }));
    expect(
      await within(fieldset).findByText(
        /^ფაილი ატვირთულია: 2 სუბტიტრი, ბოლო მთავრდება 00:\d\d-ზე\.$/,
      ),
    ).toBeInTheDocument();
    expect(within(fieldset).queryByText(/სტრიქონი 3/)).toBeNull();
    expect(checklistItem('ქართული სუბტიტრი')?.className).toContain('mc-rule--ok');
  });

  it('სრული გზა: ბმული + VTT + აუდიოაღწერის ვერსია → ქვეყნდება; სათაური ისევ რედაქტორისაა', async () => {
    const { user, store, id } = await openDraftVideo();
    const title = screen.getByRole('textbox', { name: /^სათაური/ });
    await pasteInto(user, linkField(), `https://www.youtube.com/watch?v=${ID}`);
    await pasteInto(user, adField(), `youtu.be/${AD_ID}`);
    const input = /** @type {HTMLInputElement} */ (
      document.querySelector('#f-captions input[type="file"]')
    );
    await user.upload(input, new File([VTT], 'ka.vtt', { type: 'text/vtt' }));
    await screen.findByText(/ფაილი ატვირთულია: 2 სუბტიტრი/);
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }));
    await waitFor(() =>
      expect(store.find('videos', id)?.item).toMatchObject({ status: 'published' }),
    );
    expect(store.find('videos', id)?.item).toMatchObject({
      title: title.value,
      youtube: { id: ID, adId: AD_ID },
      captions: [expect.objectContaining({ srclang: 'ka', default: true, cues: 2, end: 9.5 })],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('English ჩანართი: ინგლისური VTT (არასავალდებულო) captions-ში ინახება, translations.en-ში არა', async () => {
    const { user, store, id } = await openDraftVideo();
    await user.click(screen.getByRole('tab', { name: 'English' }));
    const fieldset = /** @type {HTMLElement} */ (document.getElementById('f-captions-en'));
    expect(fieldset).toHaveTextContent('სუბტიტრები (VTT, English)');
    expect(fieldset).toHaveTextContent('(არასავალდებულო)');
    const input = /** @type {HTMLInputElement} */ (fieldset.querySelector('input[type="file"]'));
    await user.upload(input, new File([VTT], 'en.vtt', { type: 'text/vtt' }));
    await within(fieldset).findByText(/ფაილი ატვირთულია/);
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() =>
      expect(store.find('videos', id)?.item).toMatchObject({
        captions: [expect.objectContaining({ srclang: 'en', kind: 'subtitles', default: false })],
      }),
    );
    const saved = /** @type {any} */ (store.find('videos', id));
    expect(saved.item.translations?.en?.captions).toBe(undefined);
  });

  it('axe: ვიდეოს რედაქტორი — ბმულით, შეცდომით, გაფრთხილებით', async () => {
    const { user, container, store } = await openDraftVideo();
    const busy = /** @type {any} */ (store.findBySlug('videos', 'chemi-khma-stsenaze'));
    busy.item.youtube = { id: ID };
    await pasteInto(user, linkField(), ID);
    await screen.findByText(/უკვე გამოიყენება/);
    await pasteInto(user, adField(), 'not a link');
    act(() => adField().blur());
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});
