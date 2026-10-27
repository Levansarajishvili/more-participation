import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRoutes } from '@/routes.jsx';
import { installMatchMedia } from '@/test/media.js';

import {
  chunkText,
  findGeorgianVoice,
  readableBlocks,
  resetSpeechForTests,
  VOICE_TIMEOUT_MS,
} from '../speech.js';

const html = readFileSync(resolve('index.html'), 'utf8');
const boot = html.match(/<script id="mc-boot">([\s\S]*?)<\/script>/)?.[1] ?? '';

/** @type {ReturnType<typeof installMatchMedia> | null} */
let media = null;

beforeEach(() => {
  resetSpeechForTests();
});

afterEach(() => {
  media?.restore();
  media = null;
  delete (/** @type {any} */ (window).speechSynthesis);
  delete (/** @type {any} */ (window).SpeechSynthesisUtterance);
  resetSpeechForTests();
});

/**
 * @param {string} [path]
 * @param {{ width?: number, dark?: boolean }} [env]
 */
async function renderApp(path = '/about', { width = 1440, dark = false } = {}) {
  media ??= installMatchMedia({ width, dark });
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });
  return { ...view, router, user };
}

/** @param {import('@testing-library/user-event').UserEvent} user */
async function openMenu(user) {
  const toggle = screen.getByRole('button', { name: 'თავსებადობის მენიუ' });
  await user.click(toggle);
  const panel = screen.getByRole('group', { name: 'თავსებადობის მენიუ' });
  return { toggle, panel };
}

/** გვერდის „გადატვირთვა“: <html> სუფთავდება და index.html-ის mc-boot ხელახლა ეშვება. */
function reloadDocument() {
  const root = document.documentElement;
  for (const name of ['data-theme', 'data-size', 'data-spacing']) root.removeAttribute(name);
  new Function('document', 'window', boot)(document, window);
}

/**
 * ყალბი Web Speech API.
 * @param {{ lang: string, name: string, localService?: boolean }[]} voices
 */
function installSpeech(voices) {
  /** @type {{ text: string, lang?: string }[]} */
  const spoken = [];
  const cancel = vi.fn();
  /** @type {any} */ (window).speechSynthesis = {
    getVoices: () => voices,
    speak: (/** @type {{ text: string }} */ utterance) => spoken.push(utterance),
    cancel,
    addEventListener() {},
    removeEventListener() {},
  };
  /** @type {any} */ (window).SpeechSynthesisUtterance = class {
    /** @param {string} text */
    constructor(text) {
      this.text = text;
    }
  };
  return { spoken, cancel };
}

describe('თავსებადობის მენიუ: შენახვა და აღდგენა', () => {
  it('შრიფტი, კონტრასტი და განლაგება გადატვირთვის შემდეგ რჩება', async () => {
    const first = await renderApp();
    const { panel } = await openMenu(first.user);

    await first.user.click(within(panel).getByRole('button', { name: 'შრიფტის გაზრდა' }));
    expect(document.documentElement).toHaveAttribute('data-size', '125');
    expect(await within(panel).findByText('შრიფტის ზომა: 125%')).toBeInTheDocument();

    await first.user.click(within(panel).getByRole('radio', { name: 'მაღალი' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'contrast');
    expect(await within(panel).findByText('კონტრასტი: მაღალი')).toBeInTheDocument();

    await first.user.click(within(panel).getByRole('switch', { name: 'განლაგება' }));
    expect(document.documentElement).toHaveAttribute('data-spacing', 'wide');

    expect(JSON.parse(localStorage.getItem('mc-a11y') ?? 'null')).toEqual({
      size: 125,
      theme: 'contrast',
      spacing: true,
      voice: false,
    });

    first.unmount();
    reloadDocument();
    // mc-boot პირველ რენდერამდე აბრუნებს ატრიბუტებს
    expect(document.documentElement).toHaveAttribute('data-theme', 'contrast');
    expect(document.documentElement).toHaveAttribute('data-size', '125');
    expect(document.documentElement).toHaveAttribute('data-spacing', 'wide');

    const second = await renderApp();
    const reopened = (await openMenu(second.user)).panel;
    expect(within(reopened).getByText('125%')).toBeInTheDocument();
    expect(within(reopened).getByRole('radio', { name: 'მაღალი' })).toBeChecked();
    expect(within(reopened).getByRole('switch', { name: 'განლაგება' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'contrast');
  });

  it('ზღვარზე ღილაკი aria-disabled-ია, ფოკუსს ინარჩუნებს და ზომას არ ცვლის', async () => {
    const { user } = await renderApp();
    const { panel } = await openMenu(user);
    const decrease = within(panel).getByRole('button', { name: 'შრიფტის შემცირება' });
    expect(decrease).toHaveAttribute('aria-disabled', 'true');
    await user.click(decrease);
    expect(decrease).toHaveFocus();
    expect(document.documentElement).toHaveAttribute('data-size', '100');

    const increase = within(panel).getByRole('button', { name: 'შრიფტის გაზრდა' });
    for (let i = 0; i < 5; i += 1) await user.click(increase);
    expect(document.documentElement).toHaveAttribute('data-size', '200');
    expect(increase).toHaveAttribute('aria-disabled', 'true');
  });

  it('გასუფთავება: საცავი იშლება, თემა OS-ს უბრუნდება', async () => {
    media = installMatchMedia({ width: 1440, dark: true });
    const { user } = await renderApp();
    const { panel } = await openMenu(user);
    await user.click(within(panel).getByRole('radio', { name: 'სტანდარტული' }));
    await user.click(within(panel).getByRole('button', { name: 'შრიფტის გაზრდა' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('mc-a11y')).not.toBeNull();

    await user.click(within(panel).getByRole('button', { name: 'გასუფთავება' }));
    expect(localStorage.getItem('mc-a11y')).toBeNull();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-size', '100');
    expect(
      await within(panel).findByText('პარამეტრები ნაგულისხმევზე დაბრუნდა.'),
    ).toBeInTheDocument();
  });

  it('სხვა ჩანართში შეცვლა (storage event) აქაც აისახება', async () => {
    await renderApp();
    act(() => {
      localStorage.setItem('mc-a11y', '{"size":150,"spacing":true}');
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'mc-a11y', newValue: '{"size":150,"spacing":true}' }),
      );
    });
    expect(document.documentElement).toHaveAttribute('data-size', '150');
    expect(document.documentElement).toHaveAttribute('data-spacing', 'wide');
  });
});

describe('თავსებადობის მენიუ: ქცევა', () => {
  it('aria-expanded / aria-controls; Esc ხურავს და ფოკუსს ღილაკზე აბრუნებს', async () => {
    const { user } = await renderApp();
    const toggle = screen.getByRole('button', { name: 'თავსებადობის მენიუ' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const panel = /** @type {HTMLElement} */ (
      document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    );
    expect(panel).not.toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    // პანელი DOM-ში ღილაკს მოსდევს: Tab → დახურვის ღილაკი → ხმოვანი რეჟიმი
    await user.tab();
    expect(
      within(panel).getByRole('button', { name: 'თავსებადობის მენიუს დახურვა' }),
    ).toHaveFocus();
    await user.tab();
    expect(within(panel).getByRole('switch', { name: 'ხმოვანი რეჟიმი' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(panel).not.toBeVisible();
  });

  it('Tab-ის თანმიმდევრობა პანელში და დახურვა ფოკუსის გასვლისას', async () => {
    const { user } = await renderApp();
    const { toggle, panel } = await openMenu(user);
    const names = [];
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      const el = /** @type {HTMLElement} */ (document.activeElement);
      names.push(
        el.getAttribute('aria-label') ||
          el.querySelector('.mc-switch__label')?.textContent ||
          el.closest('label')?.textContent ||
          el.textContent,
      );
    }
    expect(names).toEqual([
      'თავსებადობის მენიუს დახურვა',
      'ხმოვანი რეჟიმი',
      'შრიფტის შემცირება',
      'შრიფტის გაზრდა',
      'სტანდარტული',
      'განლაგება',
      'გასუფთავება',
      'English',
    ]);
    // ფოკუსი პანელიდან გავიდა — ღია პანელი ფოკუსირებულ ელემენტს არ დაფარავს (WCAG 2.4.11)
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toBeVisible();
  });

  it('დაწკაპება გარეთ ხურავს, ფოკუსს კი არ გადაიტანს', async () => {
    const { user } = await renderApp();
    const { toggle } = await openMenu(user);
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('OS-ის თემის ცვლილებას სესიის შუაში მიჰყვება, სანამ თემა ხელით არ აირჩევა', async () => {
    media = installMatchMedia({ width: 1440, dark: false });
    const { user } = await renderApp();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    act(() => media?.set({ dark: true }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    const { panel } = await openMenu(user);
    await user.click(within(panel).getByRole('radio', { name: 'სტანდარტული' }));
    act(() => media?.set({ dark: false }));
    act(() => media?.set({ dark: true }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});

describe('ხმოვანი რეჟიმი', () => {
  it('speechSynthesis-ის გარეშე: გადამრთველი aria-disabled-ია და მიზეზს ტექსტით ხსნის', async () => {
    const { user } = await renderApp();
    const { panel } = await openMenu(user);
    const voice = within(panel).getByRole('switch', { name: 'ხმოვანი რეჟიმი' });
    expect(voice).toBeVisible();
    expect(voice).toHaveAttribute('aria-disabled', 'true');
    expect(voice).toHaveAccessibleDescription(/ქართული ხმა არ არის/);
    await user.click(voice);
    expect(voice).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem('mc-a11y')).toBeNull();
  });

  it('API არის, ქართული ხმა — არა: ჯერ „შემოწმება“, შემდეგ მიზეზი', async () => {
    installSpeech([{ lang: 'en-US', name: 'English' }]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { user } = await renderApp();
      const { panel } = await openMenu(user);
      const voice = within(panel).getByRole('switch', { name: 'ხმოვანი რეჟიმი' });
      expect(voice).toHaveAccessibleDescription('ქართული ხმის შემოწმება…');
      act(() => vi.advanceTimersByTime(VOICE_TIMEOUT_MS + 10));
      expect(voice).toHaveAccessibleDescription(/ქართული ხმა არ არის/);
      expect(voice).toHaveAttribute('aria-disabled', 'true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ქართული ხმით: ჩართვა კითხულობს გვერდს, Esc აჩერებს, ახალი გვერდიც იკითხება', async () => {
    const { spoken, cancel } = installSpeech([{ lang: 'ka-GE', name: 'Georgian' }]);
    const { user, router } = await renderApp('/about');
    const { panel } = await openMenu(user);
    const voice = within(panel).getByRole('switch', { name: 'ხმოვანი რეჟიმი' });
    expect(voice).not.toHaveAttribute('aria-disabled');

    await user.click(voice);
    expect(voice).toHaveAttribute('aria-checked', 'true');
    // F5: გვერდს შიგთავსი აქვს — #main ბლოკებად იკითხება: ბილიკი, h1, ტექსტი…
    const texts = spoken.map((u) => u.text);
    expect(texts.slice(0, 2)).toEqual(['მთავარი', 'ჩვენ შესახებ']);
    expect(texts).toContain('ვანგრევთ ბარიერებს. ვაძლიერებთ პოტენციალს.');
    expect(spoken[0].lang).toBe('ka-GE');
    expect(JSON.parse(localStorage.getItem('mc-a11y') ?? '{}')).toMatchObject({ voice: true });

    await user.keyboard('{Escape}');
    expect(cancel).toHaveBeenCalled();

    const before = spoken.length;
    await act(() => router.navigate('/news'));
    await screen.findByRole('heading', { level: 1, name: 'სიახლეები' });
    // F6: სიახლეების გვერდს შიგთავსი აქვს — ბილიკი, h1, ტექსტი… (ახალი წაკითხვა h1-ს შეიცავს)
    await waitFor(() => expect(spoken.slice(before).map((u) => u.text)).toContain('სიახლეები'));
  });
});

describe('speech.js', () => {
  it('chunkText: ≤ 220 სიმბოლო, წინადადების საზღვარზე', () => {
    expect(chunkText('  მოკლე   ტექსტი ')).toEqual(['მოკლე ტექსტი']);
    const long = Array.from(
      { length: 12 },
      (_, i) => `წინადადება ნომერი ${i} საკმაოდ გრძელია.`,
    ).join(' ');
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 220)).toBe(true);
    expect(chunks.join(' ')).toBe(long);
  });

  it('readableBlocks: DOM-ის რიგი, ჩადგმული ბლოკი ერთხელ, aria-hidden გამოტოვებულია', () => {
    const root = document.createElement('main');
    root.innerHTML =
      '<h1>სათაური</h1><p>აბზაცი</p><ul><li><p>პუნქტი</p></li></ul><p aria-hidden="true">დამალული</p>';
    expect(readableBlocks(root)).toEqual(['სათაური', 'აბზაცი', 'პუნქტი']);
  });

  it('findGeorgianVoice: ka / ka-GE / ka_GE, ლოკალური უპირატესია', () => {
    const voices = /** @type {SpeechSynthesisVoice[]} */ (
      /** @type {unknown} */ ([
        { lang: 'en-US', name: 'A', localService: true },
        { lang: 'ka_GE', name: 'B', localService: false },
        { lang: 'ka-GE', name: 'C', localService: true },
      ])
    );
    expect(findGeorgianVoice(voices)?.name).toBe('C');
    expect(findGeorgianVoice([])).toBeNull();
  });
});
