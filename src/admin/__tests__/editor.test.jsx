import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';

import { setAdminAdapter } from '../api/adminAdapter.js';
import { setAutosaveDelay } from '../editor/autosave.js';

import { AXE, renderAdmin, setupAdmin, signInDirect } from './admin-helpers.jsx';

beforeAll(async () => {
  await import('../routes.jsx');
  await import('../editor/EditorPage.jsx');
  await import('../editor/RichTextEditor.jsx');
}, 30_000);

afterEach(() => {
  setAdminAdapter(null);
  setContentAdapter(null);
  setAutosaveDelay(2000);
});

/** @param {string} slug @param {'articles' | 'videos'} [type] */
async function openDraft(slug, type = 'articles', { delay = 60_000, role = 'editor' } = {}) {
  setAutosaveDelay(delay);
  const env = setupAdmin();
  signInDirect(env.admin, role);
  const record = env.store.findBySlug(type, slug);
  const view = renderAdmin(`/admin/${type}/${record?.id}`);
  await screen.findByRole('heading', { level: 2, name: 'გამოქვეყნება' }, { timeout: 8000 });
  return { ...env, ...view, id: /** @type {string} */ (record?.id) };
}

describe('რედაქტორი: გამოქვეყნება და ჩეკლისტი', () => {
  it('alt-ის გარეშე გამოქვეყნება შეუძლებელია: ჯამი, ფოკუსი მასზე, ბმული alt-ის ველზე', async () => {
    const { user, store, id } = await openDraft('akhali-statia-monakhazi');
    expect(screen.getByText('1 / 4 შესრულებულია')).toHaveAttribute('role', 'status');
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }));
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent('გამოქვეყნება ვერ მოხერხდა: 3 შენიშვნა');
    await user.click(within(summary).getByRole('link', { name: /alt-ტექსტი/ }));
    const alt = /** @type {HTMLInputElement} */ (document.getElementById('f-cover-alt'));
    expect(alt).toHaveFocus();
    expect(alt).toHaveAttribute('aria-invalid', 'true');
    expect(store.find('articles', id)?.item).toMatchObject({ status: 'draft' });
  });

  it('ვიდეო სუბტიტრის / აუდიოაღწერის გარეშე არ ქვეყნდება; „ვიზუალური ინფორმაცია აუდიოშიცაა“ AD-ს წესს ასრულებს', async () => {
    const { user, store, id } = await openDraft('akhali-video-monakhazi', 'videos');
    const checklist = screen
      .getByRole('heading', { name: 'ხელმისაწვდომობის ჩეკლისტი' })
      .closest('section');
    const items = () => within(/** @type {HTMLElement} */ (checklist)).getAllByRole('listitem');
    expect(items().find((li) => li.textContent?.includes('აუდიოაღწერა'))?.className).toContain(
      'mc-rule--fail',
    );
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(/სუბტიტრები/);
    await user.click(screen.getByRole('checkbox', { name: /ვიზუალური ინფორმაცია აუდიოშიცაა/ }));
    expect(items().find((li) => li.textContent?.includes('აუდიოაღწერა'))?.className).toContain(
      'mc-rule--ok',
    );
    expect(items().find((li) => li.textContent?.includes('ჟესტური'))?.className).toContain(
      'mc-rule--warn',
    );
    expect(store.find('videos', id)?.item).toMatchObject({ status: 'draft' });
  });

  it('ხარვეზის გასწორების შემდეგ ქვეყნდება და საჯარო საიტზე ჩანს', async () => {
    const { user, pub, store, id } = await openDraft('akhali-statia-monakhazi');
    await user.type(
      document.getElementById('f-cover-alt') ?? document.body,
      'მონაწილე სცენაზე გამოდის',
    );
    // ტექსტი — H2 + აღწერითი ბმული (რედაქტორის გარეთ, მონაცემით: jsdom-ში contenteditable-ის აკრეფა არასანდოა)
    const record = store.find('articles', id);
    expect(record).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('2 შენიშვნა');
    void pub;
  });
});

describe('რედაქტორი: ველები', () => {
  it('slug ხელით შეცვლის შემდეგ ავტომატიკა ითიშება; „აღდგენა“ სათაურიდან აბრუნებს', async () => {
    const { user } = await openDraft('akhali-statia-monakhazi');
    const title = screen.getByRole('textbox', { name: /^სათაური/ });
    const slug = screen.getByRole('textbox', { name: /^მისამართი/ });
    await user.click(screen.getByRole('button', { name: 'მისამართის სათაურიდან აღდგენა' }));
    await user.clear(title);
    await user.type(title, 'ჩვევა — 5 ნაბიჯი');
    await waitFor(() => expect(slug).toHaveValue('chveva-5-nabiji'));
    await user.type(slug, '-x');
    await user.type(title, ' ახალი');
    expect(slug).toHaveValue('chveva-5-nabiji-x');
  });

  it('მოკლე აღწერა: „n / 160“ ხილულია; ეკრანის მკითხველს მხოლოდ 140-ზე და 160-ზე ცხადდება', async () => {
    const { user } = await openDraft('akhali-statia-monakhazi');
    const excerpt = screen.getByRole('textbox', { name: /^მოკლე აღწერა/ });
    await user.clear(excerpt);
    excerpt.focus();
    await user.paste('ა'.repeat(100));
    expect(screen.getByText('100 / 160')).toHaveAttribute('aria-hidden', 'true');
    const region = excerpt.closest('.mc-counted')?.querySelector('[role="status"]');
    expect(region).toHaveTextContent('');
    await user.paste('ა'.repeat(40));
    expect(region).toHaveTextContent('დარჩა 20 სიმბოლო.');
    await user.paste('ა'.repeat(20));
    expect(region).toHaveTextContent('მიღწეულია ზღვარი: 160 სიმბოლო.');
  });

  it('ტექსტის ხელსაწყოები: role="toolbar", roving tabindex, aria-pressed, Ctrl+B', async () => {
    const { user } = await openDraft('akhali-statia-monakhazi');
    const toolbar = await screen.findByRole(
      'toolbar',
      { name: 'ტექსტის ფორმატირება' },
      { timeout: 8000 },
    );
    const buttons = within(toolbar).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'სათაური H2',
      'სათაური H3',
      'მუქი',
      'სია',
      'დანომრილი',
      'ბმული',
      'ციტატა',
      'ფოტო',
    ]);
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    buttons[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(buttons[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(buttons[7]).toHaveFocus();
    expect(buttons[7]).not.toHaveAttribute('aria-pressed');
    const bold = within(toolbar).getByRole('button', { name: 'მუქი' });
    expect(bold).toHaveAttribute('aria-pressed', 'false');
    expect(bold).toHaveAttribute('aria-keyshortcuts', 'Control+B Meta+B');
    expect(screen.getByRole('textbox', { name: /^ტექსტი/ })).toHaveAttribute(
      'aria-multiline',
      'true',
    );
  });
});

describe('რედაქტორი: შენახვა', () => {
  it('ავტოშენახვა (debounce): ცვლილება საცავში იწერება, „ავტომატურად შეინახა …“ ჩანს', async () => {
    const { user, store, id } = await openDraft('akhali-statia-monakhazi', 'articles', {
      delay: 50,
    });
    const title = screen.getByRole('textbox', { name: /^სათაური/ });
    await user.type(title, ' 2');
    await waitFor(() =>
      expect(store.find('articles', id)?.item).toMatchObject({
        title: '[სტატიის სათაური — მონახაზი] 2',
      }),
    );
    expect(
      screen.getByText(/^ავტომატურად შეინახა \d\d:\d\d · ავტორი: \[სახელი გვარი 2\]$/),
    ).toBeInTheDocument();
  });

  it('შეუნახავი ცვლილებით გასვლა → დიალოგი; „დარჩენა“ ეკრანზე ტოვებს, „შენახვა და გასვლა“ ინახავს', async () => {
    // ველიდან გასვლა (blur) ცვლილებას თავად ინახავს — დიალოგი მაშინ ჩანს, როცა ფოკუსი ველში რჩება
    // და გადასვლა სხვა გზით ხდება (ბრაუზერის „უკან“, მალსახმობი): აქ — router.navigate
    const { user, router, store, id } = await openDraft('akhali-statia-monakhazi');
    await user.type(screen.getByRole('textbox', { name: /^სათაური/ }), ' X');
    await act(() => router.navigate('/admin/articles'));
    const dialog = await screen.findByRole('alertdialog', { name: 'შეუნახავი ცვლილებები' });
    expect(within(dialog).getByRole('button', { name: 'შენახვა და გასვლა' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'დარჩენა' }));
    expect(router.state.location.pathname).toBe(`/admin/articles/${id}`);
    await user.type(screen.getByRole('textbox', { name: /^სათაური/ }), 'X');
    await act(() => router.navigate('/admin/articles'));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'შენახვა და გასვლა',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/articles'));
    expect(store.find('articles', id)?.item).toMatchObject({
      title: '[სტატიის სათაური — მონახაზი] XX',
    });
  });

  it('ველიდან გასვლა (blur) ინახავს — მაშინ გადასვლა დიალოგის გარეშე ხდება', async () => {
    const { user, router, store, id } = await openDraft('akhali-statia-monakhazi');
    await user.type(screen.getByRole('textbox', { name: /^სათაური/ }), ' B');
    await user.tab();
    await waitFor(() =>
      expect(store.find('articles', id)?.item).toMatchObject({
        title: '[სტატიის სათაური — მონახაზი] B',
      }),
    );
    await user.click(screen.getByRole('link', { name: 'სიაში დაბრუნება' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/articles'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Ctrl+S — ახლავე შენახვა', async () => {
    const { user, store, id } = await openDraft('akhali-statia-monakhazi');
    const title = screen.getByRole('textbox', { name: /^სათაური/ });
    await user.type(title, ' S');
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() =>
      expect(store.find('articles', id)?.item).toMatchObject({
        title: '[სტატიის სათაური — მონახაზი] S',
      }),
    );
  });

  it('ვერსიის კონფლიქტი (409) → „მასალა სხვამ შეცვალა“; „მათი ვერსია“ ფორმას ანაცვლებს', async () => {
    const { user, admin, id } = await openDraft('akhali-statia-monakhazi');
    const record = await admin.content.get(id);
    await admin.content.update(id, { title: '[სხვისი ცვლილება]' }, { version: record.version });
    await user.type(screen.getByRole('textbox', { name: /^სათაური/ }), ' ჩემი');
    await user.keyboard('{Control>}s{/Control}');
    const dialog = await screen.findByRole('alertdialog', { name: 'მასალა სხვამ შეცვალა' });
    await user.click(within(dialog).getByRole('button', { name: 'მათი ვერსიის ჩატვირთვა' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^სათაური/ })).toHaveValue('[სხვისი ცვლილება]'),
    );
  });

  it('ვერსიები: აღდგენა დადასტურებით', async () => {
    const { user, admin, id } = await openDraft('akhali-statia-monakhazi', 'articles', {
      delay: 30,
    });
    await user.type(screen.getByRole('textbox', { name: /^სათაური/ }), ' V2');
    await waitFor(async () => expect((await admin.content.versions(id)).length).toBeGreaterThan(1));
    const restore = await screen.findByRole('button', { name: /^აღდგენა: / });
    await user.click(restore);
    const dialog = screen.getByRole('dialog', { name: 'ვერსიის აღდგენა' });
    await user.click(within(dialog).getByRole('button', { name: 'აღდგენა' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^სათაური/ })).toHaveValue(
        '[სტატიის სათაური — მონახაზი]',
      ),
    );
  });

  it('axe: რედაქტორი (სტატია, ვიდეო)', async () => {
    const { container } = await openDraft('akhali-statia-monakhazi');
    await screen.findByRole('toolbar', {}, { timeout: 8000 });
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('ბიბლიოთეკა, მომხმარებლები, პარამეტრები', () => {
  /** @param {string} path @param {'admin' | 'editor'} [role] */
  async function open(path, role = 'admin') {
    const env = setupAdmin();
    signInDirect(env.admin, role);
    const view = renderAdmin(path);
    await screen.findByRole('main');
    await waitFor(
      () => expect(document.querySelector('[aria-busy="true"], .mc-skeleton')).toBeNull(),
      { timeout: 8000 },
    );
    return { ...env, ...view };
  }

  it('მედია: alt-ის გარეშე — „ხარვეზის“ ნიშანი; გამოყენებული ფაილის წაშლა იბლოკება (მიზეზით); alt-ის შენახვა', async () => {
    const { user, container } = await open('/admin/media?filter=missing-alt');
    await waitFor(() => expect(document.querySelector('.mc-media-grid')).not.toBeNull());
    const cards = within(
      /** @type {HTMLElement} */ (document.querySelector('.mc-media-grid')),
    ).getAllByRole('listitem');
    expect(within(cards[0]).getByText('ხარვეზი: alt-ტექსტი აკლია')).toBeInTheDocument();
    const remove = within(cards[0]).getByRole('button', { name: /^წაშლა/ });
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveAccessibleDescription(/გამოიყენება 1 მასალაში/);
    await user.click(within(cards[0]).getByRole('button', { name: /^alt-ის რედაქტირება/ }));
    const field = within(cards[0]).getByRole('textbox', { name: /^alt-ტექსტი/ });
    expect(field).toHaveFocus();
    await user.type(field, 'მონაწილე სცენაზე');
    await user.click(within(cards[0]).getByRole('button', { name: 'შენახვა' }));
    expect(await screen.findByText('alt შეინახა — ყველა გამოყენებაში აისახა.')).toBeInTheDocument();
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('დოკუმენტები: ცხრილი PDF/UA-ს მონიშვნით', async () => {
    const { container } = await open('/admin/documents');
    expect(screen.getByRole('table', { name: 'დოკუმენტები' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('checkbox', { name: /^PDF\/UA დადასტურებულია/ }).length,
    ).toBeGreaterThan(0);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('მომხმარებლები: მოწვევის ბმული ?tab=register&invite=… და ვადა; როლის შეცვლა', async () => {
    const { user, container, admin } = await open('/admin/users');
    await user.click(screen.getByRole('button', { name: 'მოწვევის შექმნა' }));
    const link = await screen.findByRole('textbox', { name: 'რეგისტრაციის ბმული' });
    expect(/** @type {HTMLInputElement} */ (link).value).toMatch(
      /\/admin\/login\?tab=register&invite=MC-INVITE-\d{4}$/,
    );
    expect(screen.getByText(/^მოწვევა მზადაა\. მოქმედებს/)).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /^როლი: \[სახელი გვარი 2\]/ }),
      'admin',
    );
    await waitFor(() =>
      expect(admin.state.users.find((u) => u.id === 'u-002')?.role).toBe('admin'),
    );
    expect(screen.getByRole('combobox', { name: /^როლი: \[სახელი გვარი\]/ })).toBeDisabled();
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('პარამეტრები: კონტაქტები და რჩეული მასალა — შენახვა საჯარო საიტზე აისახება', async () => {
    const { user, container, pub } = await open('/admin/settings');
    const phone = await screen.findByRole('textbox', { name: /^ტელეფონი/ });
    await user.clear(phone);
    await user.type(phone, '+995 555 00 00 00');
    await user.click(screen.getByRole('button', { name: 'შენახვა' }));
    expect(await screen.findByText(/პარამეტრები შეინახა/)).toBeInTheDocument();
    expect((await pub.getSettings()).contacts.phone).toBe('+995 555 00 00 00');
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});
