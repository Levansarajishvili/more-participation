import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import { createMockData } from '@/content/mock/data.js';
import { createMockAdapter } from '@/content/mock/index.js';
import {
  AXE,
  NOW,
  failingAdapter,
  headingTree,
  okAdapter,
  renderPage,
  settle,
  skippedLevels,
  switchableAdapter,
  unbracketedFacts,
} from '@/features/__tests__/page-helpers.jsx';

afterEach(() => setContentAdapter(null));

/** @param {HTMLElement} main */
const form = (main) => within(main).getByRole('region', { name: 'მოგვწერე' });
const NAME = 'სახელი და გვარი (სავალდებულო)';
const CONTACT = 'ტელეფონი ან ელფოსტა (სავალდებულო)';
const CONSENT =
  'ვეთანხმები პერსონალური მონაცემების დამუშავებას კონფიდენციალურობის პოლიტიკის შესაბამისად (სავალდებულო)';

/** user-event-ში `[` და `{` გასაღების აღწერაა — ლიტერალი გაორმაგებით იწერება. @param {string} text */
const literal = (text) => text.replace(/[[{]/g, '$&$&');

/** @param {(settings: import('@/content/model.js').SiteSettings) => void} edit */
function adapterWith(edit) {
  const data = createMockData({ now: NOW });
  edit(data.settings);
  return createMockAdapter({ now: () => NOW, data });
}

/** @param {import('@testing-library/user-event').UserEvent} user @param {HTMLElement} region */
async function fillValid(user, region) {
  await user.type(within(region).getByLabelText(NAME), literal('[სახელი გვარი]'));
  await user.type(within(region).getByLabelText(CONTACT), 'name@example.ge');
  await user.click(within(region).getByLabelText(CONSENT));
}

describe('კონტაქტი: სტრუქტურა', () => {
  it('h1, lead პასუხის ვადით, ხუთი არხი, ფორმა, რუკა, ოფისი, საათები, FAQ', async () => {
    const { main } = await renderPage('/contact');
    await settle(main);
    expect(main).toHaveTextContent('გიპასუხებთ [2 სამუშაო დღეში].');
    const channels = within(main).getByRole('region', { name: 'დაკავშირების გზები' });
    expect(
      within(channels)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['ტელეფონი', 'ელფოსტა', 'მესენჯერი', 'ვიდეოზარი ჟესტურ ენაზე', 'მისამართი']);
    // placeholder ([ტელეფონი]) ბმული არ ხდება — მოქმედება „[ბმული მზადდება]“
    expect(within(channels).queryAllByRole('link')).toHaveLength(0);
    expect(within(channels).getAllByText('[ბმული მზადდება]')).toHaveLength(5);

    for (const name of ['ოფისის ხელმისაწვდომობა', 'სამუშაო საათები', 'ხშირი კითხვები']) {
      expect(within(main).getByRole('region', { name })).toBeInTheDocument();
    }
    const office = within(main).getByRole('region', { name: 'ოფისის ხელმისაწვდომობა' });
    expect(office.querySelectorAll('dt')).toHaveLength(6);
    expect(within(office).getByText('[საფეხურის გარეშე / პანდუსით]').tagName).toBe('DD');
    const hours = within(main).getByRole('region', { name: 'სამუშაო საათები' });
    expect(within(hours).getByText('[00:00–00:00]')).toBeInTheDocument();
  });

  it('რუკა: iframe არ ედება ტექსტური ალტერნატივის / URL-ის გარეშე; მისამართი და გზა ტექსტით ჩანს', async () => {
    const { main } = await renderPage('/contact');
    await settle(main);
    expect(main.querySelector('iframe')).toBeNull();
    const map = /** @type {HTMLElement} */ (main.querySelector('.mc-contact-map'));
    expect(map.querySelector('.mc-contact-map__placeholder')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(within(map).getByText(/^\[როგორ მოგვაგნო:/)).toBeInTheDocument();
  });

  it('რუკა: embedUrl + directions → iframe სათაურით; directions ცარიელი → iframe არა', async () => {
    const withMap = await renderPage(
      '/contact',
      adapterWith((s) => {
        s.contacts.address.embedUrl = 'https://maps.example/embed';
      }),
    );
    await settle(withMap.main);
    const frame = withMap.main.querySelector('iframe');
    expect(frame).toHaveAttribute('title', 'ოფისის მდებარეობა რუკაზე');
    expect(frame).toHaveAttribute('loading', 'lazy');
    withMap.unmount();

    const noText = await renderPage(
      '/contact',
      adapterWith((s) => {
        s.contacts.address.embedUrl = 'https://maps.example/embed';
        s.contacts.address.directions = '';
      }),
    );
    await settle(noText.main);
    expect(noText.main.querySelector('iframe')).toBeNull();
  });

  it('რეალური მნიშვნელობა → tel: / mailto: / URL ბმული', async () => {
    const { main } = await renderPage(
      '/contact',
      adapterWith((s) => {
        s.contacts.phone = '+995 32 200 00 00';
        s.contacts.email = 'info@example.ge';
        s.contacts.signVideo.bookingUrl = 'https://booking.example/sign';
      }),
    );
    await settle(main);
    const channels = within(main).getByRole('region', { name: 'დაკავშირების გზები' });
    expect(within(channels).getByRole('link', { name: 'დარეკვა' })).toHaveAttribute(
      'href',
      'tel:+995322000000',
    );
    expect(within(channels).getByRole('link', { name: 'მოწერა' })).toHaveAttribute(
      'href',
      'mailto:info@example.ge',
    );
    expect(
      within(channels).getByRole('link', { name: 'ზარის დაჯავშნა (იხსნება ახალ ჩანართში)' }),
    ).toHaveAttribute('href', 'https://booking.example/sign');
  });

  it('სათაურების ხე, ფაქტები ფრჩხილებში, axe (honeypot-ით)', async () => {
    const { main, container } = await renderPage('/contact');
    await settle(main);
    const tree = headingTree(main);
    expect(skippedLevels(tree)).toEqual([]);
    expect(tree.filter(([level]) => level < 3).map(([level, text]) => `h${level} ${text}`)).toEqual(
      [
        'h1 კონტაქტი',
        'h2 დაკავშირების გზები',
        'h2 მოგვწერე',
        'h2 ოფისის ხელმისაწვდომობა',
        'h2 სამუშაო საათები',
        'h2 ხშირი კითხვები',
      ],
    );
    expect(unbracketedFacts(main)).toEqual([]);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('FAQ — აკორდეონი (aria-expanded), კითხვები h3', async () => {
    const { main, user } = await renderPage('/contact');
    await settle(main);
    const faq = within(main).getByRole('region', { name: 'ხშირი კითხვები' });
    const triggers = within(faq).getAllByRole('button');
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'false');
    await user.click(triggers[0]);
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
    expect(within(faq).getByText(/^\[სამუშაო დღეებში/)).toBeVisible();
  });
});

describe('კონტაქტი: ფორმა — ველები და ეკრანის მკითხველი', () => {
  it('ლეიბლი ველის ზემოთ, „(სავალდებულო)“ / „(არასავალდებულო)“, მინიშნებები describedby-ით; placeholder არ არის', async () => {
    const { main } = await renderPage('/contact');
    const region = form(main);
    const name = within(region).getByLabelText(NAME);
    expect(name).toBeRequired();
    expect(name).toHaveAttribute('autocomplete', 'name');
    expect(within(region).getByLabelText(CONTACT)).toHaveAccessibleDescription(
      'ელფოსტით პასუხისთვის მიუთითე ელფოსტა, ზარისა და მესიჯისთვის — ტელეფონი.',
    );
    expect(within(region).getByLabelText('თემა (სავალდებულო)')).toHaveValue('general');
    expect(within(region).getByLabelText('შეტყობინება (არასავალდებულო)')).not.toBeRequired();
    const support = within(region).getByLabelText(
      'რა მხარდაჭერა დაგჭირდება კომუნიკაციისას? (არასავალდებულო)',
    );
    expect(support).toHaveAccessibleDescription(/დიაგნოზის შესახებ ინფორმაცია არ გვჭირდება/);
    const reply = within(region).getByRole('radiogroup', {
      name: 'როგორ გიპასუხოთ? (სავალდებულო)',
    });
    expect(within(reply).getByRole('radio', { name: 'ელფოსტა' })).toBeChecked();
    expect(within(region).getByLabelText(CONSENT)).toBeRequired();
    expect(region.querySelectorAll('[placeholder]')).toHaveLength(0);
    // დიაგნოზს არცერთი ველი არ ითხოვს
    expect(region.textContent).not.toMatch(
      /დიაგნოზი \(|შეზღუდვის ტიპი|ჯანმრთელობის მდგომარეობა \(/,
    );
    expect(region).toHaveTextContent('CAPTCHA არ გვაქვს — არც დროის ლიმიტი.');
  });

  it('honeypot: aria-hidden, tabindex="-1", autocomplete="off" — ეკრანის მკითხველი და Tab ვერ აღწევს', async () => {
    const { main } = await renderPage('/contact');
    const trap = /** @type {HTMLInputElement} */ (main.querySelector('input[name="website"]'));
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap).toHaveAttribute('autocomplete', 'off');
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    // ხელმისაწვდომობის ხეში არ არის (getByLabelText aria-hidden-ს არ ითვალისწინებს, getByRole — კი)
    expect(
      within(form(main)).queryByRole('textbox', { name: 'ეს ველი ცარიელი დატოვე' }),
    ).toBeNull();
  });

  it('?topic=partnership → თემა წინასწარ არჩეულია; ?topic=barrier → შეტყობინების მინიშნება', async () => {
    const first = await renderPage('/contact?topic=partnership');
    expect(within(form(first.main)).getByLabelText('თემა (სავალდებულო)')).toHaveValue(
      'partnership',
    );
    // URL-ის შეცვლა გვერდზე ყოფნისას (ფუტერის „შეგხვდა ბარიერი?“)
    await act(() => first.router.navigate('/contact?topic=barrier'));
    const region = form(first.main);
    await waitFor(() =>
      expect(within(region).getByLabelText('თემა (სავალდებულო)')).toHaveValue('barrier'),
    );
    expect(
      within(region).getByLabelText('შეტყობინება (არასავალდებულო)'),
    ).toHaveAccessibleDescription(/სად შეგხვდა ბარიერი/);
    first.unmount();

    const bogus = await renderPage('/contact?topic=hack');
    expect(within(form(bogus.main)).getByLabelText('თემა (სავალდებულო)')).toHaveValue('general');
  });
});

describe('კონტაქტი: გაგზავნა', () => {
  it('ცარიელი → ჯამი (role="alert", ფოკუსი) ბმულებით + ხაზოვანი შეცდომები; ბმული → ველი', async () => {
    const adapter = okAdapter();
    const { main, user } = await renderPage('/contact', adapter);
    const region = form(main);
    await user.click(within(region).getByRole('button', { name: 'შეტყობინების გაგზავნა' }));

    const summary = within(region).getByRole('alert');
    expect(summary).toHaveFocus();
    expect(summary).toHaveAccessibleName('ფორმაში 3 შეცდომაა. გაასწორე მონიშნული ველები.');
    const links = within(summary).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual([
      'სახელი და გვარი: ეს ველი სავალდებულოა.',
      'ტელეფონი ან ელფოსტა: ეს ველი სავალდებულოა.',
      'ვეთანხმები პერსონალური მონაცემების დამუშავებას: გაგზავნისთვის საჭიროა თანხმობა მონაცემების დამუშავებაზე.',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '#cf-name',
      '#cf-contact',
      '#cf-consent',
    ]);

    const name = within(region).getByLabelText(NAME);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('შეცდომა: ეს ველი სავალდებულოა.');
    expect(region.querySelector('#cf-name-error svg')).not.toBeNull(); // ხატულა + ტექსტი

    await user.click(links[2]);
    expect(within(region).getByLabelText(CONSENT)).toHaveFocus();
    expect(adapter.contacts()).toBe(0);
  });

  it('ვალიდაცია ყოველ კლავიშზე არ ხდება — შეცდომა შემდეგ გაგზავნამდე რჩება', async () => {
    const { main, user } = await renderPage('/contact');
    const region = form(main);
    const contact = within(region).getByLabelText(CONTACT);
    await user.type(contact, '12');
    expect(contact).not.toHaveAttribute('aria-invalid');
    expect(within(region).queryByRole('alert')).toBeNull();
  });

  it('არასწორი: ტელეფონი/ელფოსტა, შემდეგ არხის შეუსაბამობა — ჯამი ყოველ ცდაზე ახლდება და ფოკუსს იღებს', async () => {
    const { main, user } = await renderPage('/contact');
    const region = form(main);
    await user.type(within(region).getByLabelText(NAME), literal('[სახელი გვარი]'));
    await user.type(within(region).getByLabelText(CONTACT), '12');
    await user.click(within(region).getByLabelText(CONSENT));
    await user.click(within(region).getByRole('button', { name: 'შეტყობინების გაგზავნა' }));
    let summary = within(region).getByRole('alert');
    expect(
      within(summary)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['ტელეფონი ან ელფოსტა: შეიყვანე ტელეფონის ნომერი ან ელფოსტა.']);
    expect(summary).toHaveFocus();

    const contact = within(region).getByLabelText(CONTACT);
    await user.clear(contact);
    await user.type(contact, '+995 555 00 00 00');
    await user.click(within(region).getByRole('button', { name: 'შეტყობინების გაგზავნა' }));
    summary = within(region).getByRole('alert');
    expect(summary).toHaveFocus();
    expect(within(summary).getByRole('link')).toHaveTextContent(
      'როგორ გიპასუხოთ?: ელფოსტით პასუხისთვის „ტელეფონი ან ელფოსტა“ ველში ელფოსტა მიუთითე — ან აირჩიე სხვა არხი.',
    );
    await user.click(within(summary).getByRole('link'));
    // რადიო-ჯგუფი: ფოკუსი არჩეულ ვარიანტზე
    expect(within(region).getByRole('radio', { name: 'ელფოსტა' })).toHaveFocus();
    expect(
      within(region).getByRole('radiogroup', { name: 'როგორ გიპასუხოთ? (სავალდებულო)' }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('წარმატება → დადასტურება (role="status"), ფოკუსი სათაურზე, „რა მოხდება შემდეგ“ ვადით; „ახალი შეტყობინება“', async () => {
    const adapter = okAdapter();
    const { main, user } = await renderPage('/contact?topic=barrier', adapter);
    await settle(main);
    const region = form(main);
    await user.type(within(region).getByLabelText(NAME), literal('[სახელი გვარი]'));
    await user.type(within(region).getByLabelText(CONTACT), '+995 555 00 00 00');
    await user.type(
      within(region).getByLabelText('რა მხარდაჭერა დაგჭირდება კომუნიკაციისას? (არასავალდებულო)'),
      literal('[ჟესტური ენის თარჯიმანი]'),
    );
    await user.click(within(region).getByRole('radio', { name: 'ზარი' }));
    await user.click(within(region).getByLabelText(CONSENT));
    await user.click(within(region).getByRole('button', { name: 'შეტყობინების გაგზავნა' }));

    const title = await within(region).findByRole('heading', {
      level: 3,
      name: 'შეტყობინება მიღებულია',
    });
    await waitFor(() => expect(title).toHaveFocus());
    const status = title.closest('[role="status"]');
    expect(status).not.toBeNull();
    expect(status).toHaveTextContent('გიპასუხებთ [2 სამუშაო დღეში] შენთვის სასურველი გზით: ზარი.');
    const steps = within(/** @type {HTMLElement} */ (status)).getAllByRole('listitem');
    expect(steps.map((li) => li.textContent)).toContain(
      '[მითითებულ მხარდაჭერას პასუხისა და შეხვედრის მომზადებისას გავითვალისწინებთ.]',
    );
    expect(adapter.contacts()).toBe(1);
    expect(unbracketedFacts(main)).toEqual([]);

    await user.click(within(region).getByRole('button', { name: 'ახალი შეტყობინება' }));
    const name = within(region).getByLabelText(NAME);
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toHaveValue('');
  });

  it('honeypot შევსებულია → მომხმარებელი წარმატებას ხედავს, შეტყობინება არ ინახება', async () => {
    const adapter = okAdapter();
    const { main, user } = await renderPage('/contact', adapter);
    const region = form(main);
    await fillValid(user, region);
    const trap = /** @type {HTMLInputElement} */ (main.querySelector('input[name="website"]'));
    await user.type(trap, 'https://spam.example');
    await user.click(within(region).getByRole('button', { name: 'შეტყობინების გაგზავნა' }));
    await within(region).findByRole('heading', { level: 3, name: 'შეტყობინება მიღებულია' });
    expect(adapter.contacts()).toBe(0);
  });

  it('ქსელის შეცდომა → role="alert", შეყვანილი ტექსტი რჩება; ხელახლა → წარმატება', async () => {
    const source = switchableAdapter(okAdapter());
    const { main, user } = await renderPage('/contact', source.adapter);
    await settle(main);
    const region = form(main);
    await fillValid(user, region);
    source.use(failingAdapter());
    const submit = within(region).getByRole('button', { name: 'შეტყობინების გაგზავნა' });
    await user.click(submit);
    const alert = await within(region).findByRole('alert');
    expect(alert).toHaveTextContent(
      'შეტყობინება ვერ გაიგზავნა. კავშირი ვერ დამყარდა. შეამოწმე ინტერნეტი და სცადე ხელახლა. შეყვანილი ტექსტი ადგილზეა — სცადე ხელახლა.',
    );
    expect(within(region).getByLabelText(NAME)).toHaveValue('[სახელი გვარი]');
    source.use(okAdapter());
    await user.click(submit);
    expect(
      await within(region).findByRole('heading', { level: 3, name: 'შეტყობინება მიღებულია' }),
    ).toBeInTheDocument();
  });
});

describe('კონტაქტი: მხოლოდ კლავიატურით (gate)', () => {
  it('Tab-ის რიგი ველების რიგს მიჰყვება (honeypot გამოტოვებულია); აკრეფა, Space, Enter → დადასტურება', async () => {
    const adapter = okAdapter();
    const { main, user } = await renderPage('/contact', adapter);
    await settle(main);
    const region = form(main);
    const name = within(region).getByLabelText(NAME);
    name.focus();

    await user.keyboard(literal('[სახელი გვარი]'));
    await user.tab();
    expect(within(region).getByLabelText(CONTACT)).toHaveFocus();
    await user.keyboard('name@example.ge');
    await user.tab();
    expect(within(region).getByLabelText('თემა (სავალდებულო)')).toHaveFocus();
    await user.tab();
    expect(within(region).getByLabelText('შეტყობინება (არასავალდებულო)')).toHaveFocus();
    await user.keyboard(literal('[შეტყობინების ტექსტი]'));
    await user.tab();
    expect(
      within(region).getByLabelText('რა მხარდაჭერა დაგჭირდება კომუნიკაციისას? (არასავალდებულო)'),
    ).toHaveFocus();
    await user.tab();
    expect(within(region).getByRole('radio', { name: 'ელფოსტა' })).toHaveFocus();
    await user.tab();
    const consent = within(region).getByLabelText(CONSENT);
    expect(consent).toHaveFocus();
    await user.keyboard(' ');
    expect(consent).toBeChecked();
    await user.tab();
    const submit = within(region).getByRole('button', { name: 'შეტყობინების გაგზავნა' });
    expect(submit).toHaveFocus();
    await user.keyboard('{Enter}');

    const title = await within(region).findByRole('heading', {
      level: 3,
      name: 'შეტყობინება მიღებულია',
    });
    await waitFor(() => expect(title).toHaveFocus());
    expect(adapter.contacts()).toBe(1);
  });

  it('Enter ტექსტურ ველში აგზავნის; შეცდომისას ფოკუსი ჯამზე, Tab → პირველი ბმული → Enter → ველი', async () => {
    const { main, user } = await renderPage('/contact');
    const region = form(main);
    within(region).getByLabelText(NAME).focus();
    await user.keyboard('{Enter}');
    const summary = within(region).getByRole('alert');
    expect(summary).toHaveFocus();
    await user.tab();
    expect(within(summary).getAllByRole('link')[0]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(within(region).getByLabelText(NAME)).toHaveFocus();
  });
});

describe('კონტაქტი: პარამეტრების მდგომარეობები', () => {
  it('პარამეტრების შეცდომა არხებსა და ოფისზე — ფორმა მაინც მუშაობს', async () => {
    const { main } = await renderPage('/contact', failingAdapter());
    await settle(main);
    expect(
      within(main).getByRole('button', { name: 'თავიდან ცდა: დაკავშირების გზები' }),
    ).toBeVisible();
    expect(within(form(main)).getByLabelText(NAME)).toBeEnabled();
    expect(screen.getByRole('heading', { level: 1, name: 'კონტაქტი' })).toBeInTheDocument();
  });
});
