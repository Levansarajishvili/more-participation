import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { setContentAdapter } from '@/content/adapter.js';
import {
  failingAdapter,
  okAdapter,
  renderPage,
  settle,
  switchableAdapter,
} from '@/features/__tests__/page-helpers.jsx';

afterEach(() => setContentAdapter(null));

const FIELD = 'ელფოსტა (სავალდებულო)';

describe('SubscribeForm (სტატიები: მუქი ზოლი, სიახლეები: ბარათი)', () => {
  it('ცარიელი → შეცდომა ველის ქვემოთ (ხატულა + ტექსტი), ფოკუსი ველზე; ჯამი არ ჩნდება', async () => {
    const { main, user } = await renderPage('/articles');
    const block = within(main).getByRole('region', { name: 'ახალი სტატიები — ელფოსტაზე' });
    await user.click(within(block).getByRole('button', { name: 'გამოწერა' }));
    const field = within(block).getByLabelText(FIELD);
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('შეცდომა: ეს ველი სავალდებულოა.');
    expect(within(block).queryByRole('alert')).toBeNull();
    expect(field).toHaveAttribute('autocomplete', 'email');
    expect(block.querySelector('[data-theme="dark"]')).not.toBeNull();
  });

  it('არასწორი → ფორმატის მინიშნება; სწორი → role="status" „გამოწერა მიღებულია“, ველი სუფთავდება', async () => {
    const adapter = okAdapter();
    const { main, user } = await renderPage('/news', adapter);
    await settle(main);
    const block = within(main).getByRole('region', { name: 'სიახლეები ელფოსტაზე' });
    const field = within(block).getByLabelText(FIELD);
    await user.type(field, 'name@');
    await user.click(within(block).getByRole('button', { name: 'გამოწერა' }));
    expect(field).toHaveAccessibleDescription(
      'შეცდომა: ელფოსტა ასე უნდა გამოიყურებოდეს: name@example.ge',
    );
    await user.clear(field);
    await user.type(field, 'name@example.ge{Enter}');
    await waitFor(() =>
      expect(within(block).getByRole('status')).toHaveTextContent(
        'გამოწერა მიღებულია: name@example.ge.',
      ),
    );
    expect(field).toHaveValue('');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(adapter.subscribers.has('name@example.ge')).toBe(true);
  });

  it('ქსელის შეცდომა → შეტყობინება ველთან, ტექსტი რჩება', async () => {
    const source = switchableAdapter(okAdapter());
    const { main, user } = await renderPage('/news', source.adapter);
    await settle(main);
    source.use(failingAdapter());
    const block = within(main).getByRole('region', { name: 'სიახლეები ელფოსტაზე' });
    const field = within(block).getByLabelText(FIELD);
    await user.type(field, 'name@example.ge');
    await user.click(within(block).getByRole('button', { name: 'გამოწერა' }));
    await waitFor(() => expect(field).toHaveAccessibleDescription(/კავშირი ვერ დამყარდა/));
    expect(field).toHaveValue('name@example.ge');
    expect(screen.getByRole('heading', { level: 1, name: 'სიახლეები' })).toBeInTheDocument();
  });
});
