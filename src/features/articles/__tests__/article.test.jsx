import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import { resetSpeechForTests } from '@/features/a11y/speech.js';
import {
  AXE,
  failingAdapter,
  headingTree,
  okAdapter,
  renderPage,
  settle,
  skippedLevels,
  switchableAdapter,
  unbracketedFacts,
} from '@/features/__tests__/page-helpers.jsx';

afterEach(() => {
  setContentAdapter(null);
  resetSpeechForTests();
  vi.restoreAllMocks();
});

const SLUG = 'gonivruli-misadageba-ras-nishnavs-da-rogor-movitkhovot';
const TITLE = '[გონივრული მისადაგება: რას ნიშნავს და როგორ მოვითხოვოთ]';
const FEATURED_SLUG = 'zrdis-azrovneba-ratom-aris-jer-qvelaze-dzlieri-sitqva';
const FEATURED = '[ზრდის აზროვნება: რატომ არის „ჯერ“ ყველაზე ძლიერი სიტყვა]';

/** @param {string} [path] */
async function renderArticle(path = `/articles/${SLUG}`) {
  const view = await renderPage(path);
  const heading = /** @type {HTMLElement} */ (screen.getByRole('heading', { level: 1 }));
  await waitFor(() => expect(heading).not.toHaveTextContent('სტატია იტვირთება…'));
  await settle(view.main);
  return { ...view, heading };
}

describe('სტატიის გვერდი: შაბლონი', () => {
  it('ბილიკი, კატეგორია (ბმული ფილტრზე), h1, აღწერა, ავტორი, <time>, კითხვის დრო', async () => {
    const { main, heading } = await renderArticle();
    expect(heading).toHaveTextContent(TITLE);
    expect(document.title).toBe(`${TITLE} — მეტი ჩართულობა`);
    const crumbs = within(main).getByRole('navigation', { name: 'ნავიგაციის ბილიკი' });
    expect(within(crumbs).getByRole('link', { name: 'სტატიები' })).toHaveAttribute(
      'href',
      '/articles',
    );
    expect(within(crumbs).getByText(TITLE)).toHaveAttribute('aria-current', 'page');
    expect(within(main).getByRole('link', { name: 'უფლებები' })).toHaveAttribute(
      'href',
      '/articles?category=rights',
    );
    const article = within(main).getByRole('article', { name: TITLE });
    const time = article.querySelector('time');
    expect(time?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(article).toHaveTextContent('ავტორი: [ავტორის სახელი გვარი]');
    expect(article).toHaveTextContent(/\d+ წთ კითხვა/);
  });

  it('ტექსტი ბლოკებიდან: h2/h3, სია, ციტატა (სერიფი), ფოტო + წარწერა, lang="en", ბმულები', async () => {
    const { main } = await renderArticle();
    const prose = /** @type {HTMLElement} */ (main.querySelector('.mc-prose'));
    expect(prose.querySelectorAll('h2').length).toBeGreaterThanOrEqual(5);
    expect(prose.querySelector('ul, ol')).not.toBeNull();
    expect(prose.querySelector('blockquote')).not.toBeNull();
    expect(prose.querySelector('figure figcaption')).not.toBeNull();
    expect(prose.querySelector('[lang="en"]')).toHaveTextContent('reasonable accommodation');
    expect(prose.querySelector('strong')).toHaveTextContent('[საკვანძო ტერმინი]');
    // შიდა ბმული სხვა სტატიაზე (აღწერითი — სათაური) და ბმული-ბლოკი /contact-ზე
    expect(within(prose).getAllByRole('link', { name: FEATURED })[0]).toHaveAttribute(
      'href',
      `/articles/${FEATURED_SLUG}`,
    );
    expect(
      within(prose).getByRole('link', {
        name: '[შემდეგი ნაბიჯი: დაგვიკავშირდი და შეარჩიე შენთვის შესაფერისი პროგრამა]',
      }),
    ).toHaveAttribute('href', '/contact');
  });

  it('სათაურების ხე, ფაქტები ფრჩხილებში, axe', async () => {
    const { main, container } = await renderArticle();
    const tree = headingTree(main);
    expect(tree[0]).toEqual([1, TITLE]);
    expect(skippedLevels(tree)).toEqual([]);
    expect(tree.filter(([level]) => level === 2).at(-1)).toEqual([2, 'მსგავსი სტატიები']);
    expect(unbracketedFacts(main)).toEqual([]);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('მსგავსი სტატიები: იმავე კატეგორიის, მიმდინარის გარეშე; „ყველა — უფლებები“', async () => {
    const { main } = await renderArticle();
    const related = within(main).getByRole('region', { name: 'მსგავსი სტატიები' });
    const titles = within(related)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(titles).toEqual(['[დასაქმების უფლებები: რას ითვალისწინებს კანონი]']);
    expect(titles).not.toContain(TITLE);
    expect(within(related).getByRole('link', { name: 'ყველა სტატია — უფლებები' })).toHaveAttribute(
      'href',
      '/articles?category=rights',
    );
  });

  it('ვერ მოიძებნა: h1 „სტატია ვერ მოიძებნა“, ბმული სიაზე; სათაური', async () => {
    const { heading, main } = await renderArticle('/articles/ar-arsebuli');
    expect(heading).toHaveTextContent('სტატია ვერ მოიძებნა');
    expect(within(main).getByRole('link', { name: 'სტატიების სიაში დაბრუნება' })).toHaveAttribute(
      'href',
      '/articles',
    );
    await waitFor(() => expect(document.title).toBe('სტატია ვერ მოიძებნა — მეტი ჩართულობა'));
  });

  it('შეცდომა → „თავიდან ცდა“ → სტატია; ფოკუსი h1-ზე ბრუნდება', async () => {
    const source = switchableAdapter(failingAdapter());
    const { main, user } = await renderPage(`/articles/${SLUG}`, source.adapter);
    const heading = screen.getByRole('heading', { level: 1 });
    await waitFor(() => expect(heading).toHaveTextContent('სტატია ვერ ჩაიტვირთა'));
    source.use(okAdapter());
    await user.click(within(main).getByRole('button', { name: 'თავიდან ცდა: სტატიები' }));
    await waitFor(() => expect(heading).toHaveTextContent(TITLE));
    await waitFor(() => expect(heading).toHaveFocus());
  });
});

describe('სტატიის გვერდი: ფოკუსი გადასვლისას', () => {
  it('სიიდან ბარათზე → h1 (იგივე კვანძი) სათაურით ფოკუსშია', async () => {
    const { main, user } = await renderPage('/articles');
    await settle(main);
    await user.click(within(main).getByRole('link', { name: FEATURED }));
    const heading = await screen.findByRole('heading', { level: 1, name: FEATURED });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('რჩეულის „მოუსმინე“ → #listen: ფოკუსი მოსმენის ღილაკზე', async () => {
    const { main, user } = await renderPage('/articles');
    await settle(main);
    await user.click(within(main).getByRole('link', { name: `მოუსმინე: ${FEATURED}` }));
    await screen.findByRole('heading', { level: 1, name: FEATURED });
    await waitFor(() => expect(document.getElementById('listen')).toHaveFocus());
  });

  it('პირველ ჩატვირთვაზე ფოკუსი არ გადაიტანება (F4-ის წესი)', async () => {
    const { heading } = await renderArticle();
    expect(heading).not.toHaveFocus();
  });

  it('მსგავს სტატიაზე გადასვლა (იგივე როუტი, სხვა slug) → ახალი სათაური ფოკუსში', async () => {
    const { main, user } = await renderArticle();
    const related = within(main).getByRole('region', { name: 'მსგავსი სტატიები' });
    const next = '[დასაქმების უფლებები: რას ითვალისწინებს კანონი]';
    await user.click(within(related).getByRole('link', { name: next }));
    const heading = await screen.findByRole('heading', { level: 1, name: next });
    await waitFor(() => expect(heading).toHaveFocus());
  });
});

describe('სტატიის გვერდი: მოსმენა, გაზიარება, შენახვა', () => {
  it('ქართული ხმა არ არის (jsdom) → „მოუსმინე“ aria-disabled, მიზეზი ტექსტით; ფოკუსს იღებს', async () => {
    const { main } = await renderArticle();
    const listen = within(main).getByRole('button', { name: 'მოუსმინე' });
    expect(listen).toHaveAttribute('aria-disabled', 'true');
    expect(listen).not.toBeDisabled();
    expect(listen).toHaveAccessibleDescription(/ქართული ხმა არ არის/);
  });

  it('ქართული ხმით: „მოუსმინე“ → h1, აღწერა და ტექსტი იკითხება; „შეჩერება“ აჩერებს', async () => {
    /** @type {{ text: string, lang: string }[]} */
    const spoken = [];
    const cancel = vi.fn();
    window.SpeechSynthesisUtterance = /** @type {never} */ (
      class {
        /** @param {string} text */
        constructor(text) {
          this.text = text;
          this.lang = '';
        }
      }
    );
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ lang: 'ka-GE', name: 'Georgian', localService: true }],
        speak: (/** @type {{ text: string, lang: string }} */ u) => spoken.push(u),
        cancel,
        addEventListener() {},
      },
    });
    resetSpeechForTests();
    try {
      const { main, user } = await renderArticle();
      const listen = within(main).getByRole('button', { name: 'მოუსმინე' });
      expect(listen).not.toHaveAttribute('aria-disabled');
      await user.click(listen);
      expect(spoken[0].text).toBe(TITLE);
      expect(spoken[0].lang).toBe('ka-GE');
      expect(spoken.some((u) => u.text.startsWith('[ქვესათაური 1'))).toBe(true);
      await user.click(within(main).getByRole('button', { name: 'შეჩერება' }));
      expect(cancel).toHaveBeenCalled();
    } finally {
      // @ts-expect-error — ტესტის შემდეგ jsdom-ის მდგომარეობა ბრუნდება
      delete window.speechSynthesis;
      // @ts-expect-error
      delete window.SpeechSynthesisUtterance;
    }
  });

  it('გაზიარება: Web Share API-ს გარეშე — ბმულის კოპირება + „ბმული დაკოპირდა.“', async () => {
    const { main, user } = await renderArticle();
    const copy = within(main).getByRole('button', { name: 'ბმულის კოპირება' });
    await user.click(copy);
    expect(await within(main).findByText('ბმული დაკოპირდა.')).toHaveAttribute('role', 'status');
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/articles/${SLUG}`);
  });

  it('კოპირება ვერ ხერხდება → ბმულის ველი, ფოკუსი და მონიშვნა მასზე', async () => {
    const { main, user } = await renderArticle();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(within(main).getByRole('button', { name: 'ბმულის კოპირება' }));
    const field = await within(main).findByLabelText('სტატიის ბმული');
    await waitFor(() => expect(field).toHaveFocus());
    expect(field).toHaveAttribute('readonly');
    expect(within(main).getByText(/ხელით/)).toHaveAttribute('role', 'status');
  });

  it('Web Share API → navigator.share({ title, url }); გაუქმება არაფერს აცხადებს', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    try {
      const { main, user } = await renderArticle();
      await user.click(within(main).getByRole('button', { name: 'გაზიარება' }));
      expect(share).toHaveBeenCalledWith({
        title: TITLE,
        url: `${window.location.origin}/articles/${SLUG}`,
      });
      expect(within(main).queryByText('ბმული დაკოპირდა.')).toBeNull();
    } finally {
      // @ts-expect-error
      delete navigator.share;
    }
  });

  it('შენახვა — ლეიბლიანი SaveToggle (aria-pressed)', async () => {
    const { main, user } = await renderArticle();
    const save = within(main).getByRole('button', { name: `შენახვა: ${TITLE}` });
    await user.click(save);
    expect(save).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('mc-saved') ?? '[]')).toContain(SLUG);
  });
});

describe('სიახლის გვერდი (/news/:slug)', () => {
  const NEWS = '[ციფრული უნარების აკადემიის ახალი ნაკადი იხსნება]';
  const NEWS_SLUG = 'tsipruli-unarebis-akademiis-akhali-nakadi-ikhsneba';

  it('სტატიის შაბლონი: ბილიკი, ტიპი, h1, <time>, მოქმედება (გათიშული), ტექსტი, axe', async () => {
    const { main, container } = await renderPage(`/news/${NEWS_SLUG}`);
    const heading = screen.getByRole('heading', { level: 1 });
    await waitFor(() => expect(heading).toHaveTextContent(NEWS));
    await settle(main);
    const crumbs = within(main).getByRole('navigation', { name: 'ნავიგაციის ბილიკი' });
    expect(within(crumbs).getByRole('link', { name: 'სიახლეები' })).toHaveAttribute(
      'href',
      '/news',
    );
    expect(within(main).getByRole('link', { name: 'განცხადება' })).toHaveAttribute(
      'href',
      '/news?category=announcement',
    );
    expect(main.querySelector('article time')?.getAttribute('datetime')).toMatch(/^\d{4}-/);
    // href: null → გათიშული ღილაკი (NewsCard-ის F3-ის წესი)
    expect(within(main).getByText('[განაცხადის შევსება]').closest('button')).toBeDisabled();
    expect(main.querySelector('.mc-prose p')).not.toBeNull();
    expect(skippedLevels(headingTree(main))).toEqual([]);
    expect(unbracketedFacts(main)).toEqual([]);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('სიახლეების სიიდან → h1 ფოკუსში; ვერ მოიძებნა → ბმული სიაზე', async () => {
    const { main, user, router } = await renderPage('/news');
    await settle(main);
    await user.click(within(main).getAllByRole('link', { name: NEWS })[0]);
    const heading = await screen.findByRole('heading', { level: 1, name: NEWS });
    await waitFor(() => expect(heading).toHaveFocus());

    await act(() => router.navigate('/news/ar-arsebuli'));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('სიახლე ვერ მოიძებნა'),
    );
    expect(screen.getByRole('link', { name: 'სიახლეების სიაში დაბრუნება' })).toHaveAttribute(
      'href',
      '/news',
    );
  });
});
