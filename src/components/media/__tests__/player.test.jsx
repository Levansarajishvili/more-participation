import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { createMockData } from '@/content/mock/data.js';

import { NOW } from '../../ui/__tests__/fixtures.jsx';
import { PLAYER_STORAGE_KEY } from '../player-prefs.js';
import VideoPlayer from '../VideoPlayer.jsx';

import { createFakeSource, withFiles } from './fake-source.jsx';

const OPTIONS = { rules: { 'color-contrast': { enabled: false } } };
const base = createMockData({ now: NOW }).videos[0];
const video = withFiles(base);

/**
 * @param {{ layout?: 'full' | 'compact', fake?: Parameters<typeof createFakeSource>[0], subject?: typeof video }} [options]
 */
function renderPlayer({ layout = 'full', fake, subject = video } = {}) {
  const user = userEvent.setup();
  const { controller, source } = createFakeSource(fake);
  const view = render(
    <MemoryRouter>
      <main>
        <button type="button">გარეთ</button>
        <VideoPlayer video={subject} source={source} layout={layout} />
      </main>
    </MemoryRouter>,
  );
  const region = screen.getByRole('region', { name: `ვიდეოფლეიერი: ${subject.title}` });
  return { ...view, user, controller, region };
}

const progress = () => screen.getByRole('slider', { name: 'პროგრესი' });

beforeEach(() => localStorage.clear());

describe('VideoPlayer: მართვა და ARIA', () => {
  it('რეგიონი სახელით და კლავიატურის მინიშნებით; ავტოდაკვრა არ არის', () => {
    const { region, controller } = renderPlayer();
    expect(region).toHaveAccessibleDescription(/Space ან K/);
    expect(controller.getState().paused).toBe(true);
    expect(screen.getByRole('button', { name: 'ჩართვა' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'ვიდეოს მართვა' })).toBeInTheDocument();
  });

  it('ჩართვა / პაუზა; პროგრესი role="slider", valuetext „01:23 / 04:30“', async () => {
    const { user, controller } = renderPlayer();
    await user.click(screen.getByRole('button', { name: 'ჩართვა' }));
    expect(controller.getState().paused).toBe(false);
    expect(screen.getByRole('button', { name: 'პაუზა' })).toBeInTheDocument();
    act(() => controller.setState({ currentTime: 83 }));
    expect(progress()).toHaveAttribute('aria-valuetext', '01:23 / 04:30');
    expect(progress()).toHaveAttribute('aria-valuemin', '0');
    expect(progress()).toHaveAttribute('aria-valuemax', '270');
    expect(progress()).toHaveAttribute('aria-valuenow', '83');
  });

  it('პროგრესის კლავიატურა: → +5, ← −5, PageUp +30, Home, End', async () => {
    const { user, controller } = renderPlayer({ fake: { currentTime: 60 } });
    progress().focus();
    await user.keyboard('{ArrowRight}');
    expect(controller.getState().currentTime).toBe(65);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(controller.getState().currentTime).toBe(55);
    await user.keyboard('{PageUp}');
    expect(controller.getState().currentTime).toBe(85);
    await user.keyboard('{End}');
    expect(controller.getState().currentTime).toBe(270);
    await user.keyboard('{Home}');
    expect(controller.getState().currentTime).toBe(0);
  });

  it('მალსახმობები მხოლოდ ფლეიერში: K, Space (რეგიონზე), ← →, M, C; გარეთ — არაფერი', async () => {
    const { user, controller, region } = renderPlayer({ fake: { currentTime: 30 } });
    screen.getByRole('button', { name: 'გარეთ' }).focus();
    await user.keyboard('k{ArrowRight}m');
    expect(controller.getState()).toMatchObject({ paused: true, currentTime: 30, muted: false });

    region.focus();
    await user.keyboard(' ');
    expect(controller.getState().paused).toBe(false);
    await user.keyboard('k');
    expect(controller.getState().paused).toBe(true);
    expect(screen.getByText('ვიდეო დაპაუზდა')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(controller.getState().currentTime).toBe(35);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(controller.getState().currentTime).toBe(25);
    await user.keyboard('m');
    expect(controller.getState().muted).toBe(true);
    expect(screen.getByText('ხმა გათიშულია')).toBeInTheDocument();
    await user.keyboard('c');
    expect(screen.getByRole('button', { name: 'სუბტიტრები' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText('სუბტიტრები გამორთულია')).toBeInTheDocument();
  });

  it('ქართული განლაგება: KeyK / KeyM მუშაობს, როცა e.key = „კ“ / „მ“', async () => {
    const { user, controller, region } = renderPlayer();
    region.focus();
    await user.keyboard('[KeyK]');
    expect(controller.getState().paused).toBe(false);
    await user.keyboard('[KeyM]');
    expect(controller.getState().muted).toBe(true);
  });

  it('ღილაკზე Space ღილაკისაა (ჩართვა არ ორმაგდება)', async () => {
    const { user, controller } = renderPlayer();
    screen.getByRole('button', { name: 'სუბტიტრები' }).focus();
    await user.keyboard(' ');
    expect(controller.getState().paused).toBe(true);
    expect(screen.getByRole('button', { name: 'სუბტიტრები' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('სუბტიტრი ნაგულისხმევად ჩართულია, overlay-ში; CC გამორთვა მალავს; არჩევანი ინახება', async () => {
    const { user, controller } = renderPlayer();
    expect(controller.calls.captions.at(-1)).toBe(true);
    expect(screen.getByText('[სუბტიტრი: მონაწილის სიტყვები]')).toHaveClass('mc-player__caption');
    act(() => controller.emitCaption('[ახალი ფრაზა]'));
    expect(screen.getByText('[ახალი ფრაზა]')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'სუბტიტრები' }));
    expect(screen.queryByText('[ახალი ფრაზა]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) ?? '{}')).toMatchObject({
      captions: false,
    });
  });

  it('ჟესტური ენა ნაგულისხმევად ჩართულია, აუდიოაღწერა — არა; სიჩქარე controller-ს გადაეცემა', async () => {
    const { user, controller } = renderPlayer();
    expect(controller.calls.sign.at(-1)).toBe(true);
    expect(controller.calls.audioDescription.at(-1)).toBe(false);
    await user.click(screen.getByRole('button', { name: 'აუდიოაღწერა' }));
    expect(controller.calls.audioDescription.at(-1)).toBe(true);
    await user.selectOptions(screen.getByRole('combobox', { name: 'სიჩქარე' }), '1.5');
    expect(controller.getState().rate).toBe(1.5);
  });

  it('ტრანსკრიპტი: aria-expanded, ნიშნული — ღილაკი „გადასვლა: 00:04“ → seek', async () => {
    const { user, controller } = renderPlayer();
    const toggle = screen.getByRole('button', { name: 'ტრანსკრიპტი' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const panel = /** @type {HTMLElement} */ (
      document.getElementById(/** @type {string} */ (toggle.getAttribute('aria-controls')))
    );
    expect(panel).not.toBeVisible();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    const list = within(panel).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(video.transcript.length);
    await user.click(within(panel).getByRole('button', { name: 'გადასვლა: 00:04' }));
    expect(controller.calls.seek.at(-1)).toBe(4);
    expect(within(panel).getAllByText('აუდიოაღწერა:').length).toBeGreaterThan(0);
  });

  it('კომპაქტური (390): მთავარი რიგი + „მეტი“ (Esc ხურავს, ფოკუსი ღილაკზე)', async () => {
    const { user } = renderPlayer({ layout: 'compact' });
    expect(screen.getByRole('button', { name: 'ჩართვა' })).toBeInTheDocument();
    expect(progress()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CC სუბტიტრები' })).toHaveTextContent(/^CC/);
    expect(screen.queryByRole('button', { name: 'ჟესტური ენა' })).toBeNull();
    const more = screen.getByRole('button', { name: 'მეტი' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    const panel = screen.getByRole('group', { name: 'მეტი პარამეტრი' });
    expect(within(panel).getByRole('switch', { name: 'ჟესტური ენა' })).toBeInTheDocument();
    expect(within(panel).getByRole('switch', { name: 'აუდიოაღწერა' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'ტრანსკრიპტი' })).toBeInTheDocument();
    expect(within(panel).getByRole('combobox', { name: 'სიჩქარე' })).toBeInTheDocument();
    within(panel).getByRole('switch', { name: 'ჟესტური ენა' }).focus();
    await user.keyboard('{Escape}');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveFocus();
  });

  it('ფაილი მზადდება (src: null): ჩართვა aria-disabled + მიზეზი, ტრანსკრიპტი ღიაა, ნიშნული — ტექსტი', () => {
    render(
      <MemoryRouter>
        <main>
          <VideoPlayer video={base} layout="full" />
        </main>
      </MemoryRouter>,
    );
    const play = screen.getByRole('button', { name: 'ჩართვა' });
    expect(play).toHaveAttribute('aria-disabled', 'true');
    expect(play).toHaveAccessibleDescription(/ვიდეო ფაილი მზადდება/);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('button', { name: 'ტრანსკრიპტი' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.queryByRole('button', { name: /^გადასვლა:/ })).toBeNull();
    expect(screen.getByText(/ჩატვირთვის შემდეგ/)).toBeInTheDocument();
  });

  it('ფაილის გარეშე ფუნქცია: ჟესტური ენა aria-disabled + ხილული მიზეზი', () => {
    renderPlayer({ subject: { ...video, signLanguage: null } });
    const sign = screen.getByRole('button', { name: 'ჟესტური ენა' });
    expect(sign).toHaveAttribute('aria-disabled', 'true');
    expect(sign).toHaveAccessibleDescription('ჟესტური ენის ვერსია მზადდება.');
  });

  it('axe: სრული, კომპაქტური გახსნილი „მეტით“ + ტრანსკრიპტით, მზადდება', async () => {
    const full = renderPlayer();
    await full.user.click(screen.getByRole('button', { name: 'ტრანსკრიპტი' }));
    expect(await axe(full.container, OPTIONS)).toHaveNoViolations();
    full.unmount();

    const compact = renderPlayer({ layout: 'compact' });
    await compact.user.click(screen.getByRole('button', { name: 'მეტი' }));
    expect(await axe(compact.container, OPTIONS)).toHaveNoViolations();
    compact.unmount();

    const pending = render(
      <MemoryRouter>
        <main>
          <VideoPlayer video={base} layout="compact" />
        </main>
      </MemoryRouter>,
    );
    expect(await axe(pending.container, OPTIONS)).toHaveNoViolations();
  });
});
