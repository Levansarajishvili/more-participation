import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { createMockData } from '@/content/mock/data.js';

import { NOW } from '../../ui/__tests__/fixtures.jsx';
import Slider from '../Slider.jsx';

const OPTIONS = { rules: { 'color-contrast': { enabled: false } } };
const habit = createMockData({ now: NOW }).series.find((series) => series.featured);

/** @param {Partial<import('react').ComponentProps<typeof Slider>>} [props] */
function renderSlider(props = {}) {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter>
      <main>
        <button type="button">გარეთ</button>
        <Slider
          slides={habit.slides}
          title={habit.title}
          tone={habit.tone}
          handle="[@h]"
          {...props}
        />
      </main>
    </MemoryRouter>,
  );
  const region = screen.getByRole('region', { name: `სლაიდები: ${habit.title}` });
  return { ...view, user, region };
}

const slide = () => screen.getByRole('group', { name: /^\d+ \/ \d+$/ });
const status = () => screen.getByRole('status');

beforeEach(() => localStorage.clear());

describe('Slider (APG carousel)', () => {
  it('რეგიონი „კარუსელი“, სლაიდი „3 / 6“, ცოცხალი ტექსტი, მრიცხველი polite', () => {
    const { region } = renderSlider();
    expect(region).toHaveAttribute('aria-roledescription', 'კარუსელი');
    expect(slide()).toHaveAttribute('aria-roledescription', 'სლაიდი');
    expect(slide()).toHaveAccessibleName('1 / 6');
    expect(within(slide()).getByRole('heading', { level: 3 })).toHaveTextContent(
      habit.slides[0].title,
    );
    expect(slide()).toHaveTextContent(habit.slides[0].body);
    expect(status()).toHaveAttribute('aria-live', 'polite');
    expect(status()).toHaveTextContent(`სლაიდი 1 / 6: ${habit.slides[0].title}`);
    // სურათი არ არის — მხოლოდ დეკორატიული ლოგო
    expect(within(slide()).queryAllByRole('img')).toHaveLength(0);
  });

  it('„შემდეგი“ / „წინა“ — 44px ღილაკები, ბოლოებში aria-disabled (ფოკუსი არ იკარგება)', async () => {
    const { user } = renderSlider();
    const prev = screen.getByRole('button', { name: 'წინა სლაიდი' });
    const next = screen.getByRole('button', { name: 'შემდეგი სლაიდი' });
    expect(prev).toHaveClass('mc-btn--sm');
    expect(prev).toHaveAttribute('aria-disabled', 'true');
    expect(prev).not.toBeDisabled();
    await user.click(next);
    expect(slide()).toHaveAccessibleName('2 / 6');
    expect(status()).toHaveTextContent(`სლაიდი 2 / 6: ${habit.slides[1].title}`);
    expect(prev).not.toHaveAttribute('aria-disabled');
    for (let i = 0; i < 6; i += 1) await user.click(next);
    expect(slide()).toHaveAccessibleName('6 / 6');
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).toHaveFocus();
    await user.click(prev);
    expect(slide()).toHaveAccessibleName('5 / 6');
  });

  it('წერტილები — ღილაკები სათაურით, aria-current მიმდინარეზე', async () => {
    const { user } = renderSlider();
    const dots = within(screen.getByRole('group', { name: 'სლაიდის არჩევა' })).getAllByRole(
      'button',
    );
    expect(dots).toHaveLength(6);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    expect(dots[3]).toHaveAccessibleName(`სლაიდი 4: ${habit.slides[3].title}`);
    await user.click(dots[3]);
    expect(slide()).toHaveAccessibleName('4 / 6');
    expect(dots[3]).toHaveAttribute('aria-current', 'true');
    expect(dots[0]).not.toHaveAttribute('aria-current');
  });

  it('← → Home End მხოლოდ სლაიდერში ფოკუსისას; წერტილზე ფოკუსი ახალ წერტილზე გადადის', async () => {
    const { user } = renderSlider();
    // ფოკუსი გარეთაა — ისარი სლაიდს არ ცვლის
    screen.getByRole('button', { name: 'გარეთ' }).focus();
    await user.keyboard('{ArrowRight}{End}');
    expect(slide()).toHaveAccessibleName('1 / 6');

    screen.getByRole('button', { name: 'შემდეგი სლაიდი' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(slide()).toHaveAccessibleName('2 / 6');
    await user.keyboard('{End}');
    expect(slide()).toHaveAccessibleName('6 / 6');
    await user.keyboard('{Home}');
    expect(slide()).toHaveAccessibleName('1 / 6');
    await user.keyboard('{ArrowLeft}');
    expect(slide()).toHaveAccessibleName('1 / 6');

    const dots = within(screen.getByRole('group', { name: 'სლაიდის არჩევა' })).getAllByRole(
      'button',
    );
    dots[0].focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(slide()).toHaveAccessibleName('3 / 6');
    expect(dots[2]).toHaveFocus();
  });

  it('ავტოდაკვრა არ არის: დრო გადის — სლაიდი იგივეა', async () => {
    renderSlider();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(slide()).toHaveAccessibleName('1 / 6');
    expect(screen.queryByRole('button', { name: /გაჩერება|ავტო/ })).toBeNull();
  });

  it('touch swipe: მარცხნივ → შემდეგი, მარჯვნივ → წინა; ვერტიკალური / მაუსი — არა', () => {
    renderSlider();
    const viewport = /** @type {HTMLElement} */ (slide().parentElement);
    const swipe = (/** @type {number} */ dx, /** @type {number} */ dy, type = 'touch') => {
      fireEvent.pointerDown(viewport, {
        pointerId: 1,
        pointerType: type,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerUp(viewport, {
        pointerId: 1,
        pointerType: type,
        clientX: 200 + dx,
        clientY: 200 + dy,
      });
    };
    swipe(-80, 5);
    expect(slide()).toHaveAccessibleName('2 / 6');
    swipe(80, 0);
    expect(slide()).toHaveAccessibleName('1 / 6');
    swipe(-30, 0); // მოკლე
    swipe(-60, 120); // ვერტიკალური სქროლი
    swipe(-120, 0, 'mouse'); // მაუსით — ტექსტის მონიშვნა
    expect(slide()).toHaveAccessibleName('1 / 6');
  });

  it('სლაიდის ნომერი 01–05, ყდაზე ნომერი არ არის; ყდის ფერი tone-ით', async () => {
    const { user } = renderSlider();
    expect(slide()).toHaveClass('mc-tone--navy');
    expect(slide().querySelector('.mc-slide__num')).toBeNull();
    expect(slide()).toHaveTextContent('სერია');
    await user.click(screen.getByRole('button', { name: 'შემდეგი სლაიდი' }));
    expect(slide().querySelector('.mc-slide__num')).toHaveTextContent('01');
    expect(slide()).toHaveTextContent('ნაბიჯი');
  });

  it('axe: 0 დარღვევა (პირველი და შუა სლაიდი)', async () => {
    const { container, user } = renderSlider();
    expect(await axe(container, OPTIONS)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'შემდეგი სლაიდი' }));
    expect(await axe(container, OPTIONS)).toHaveNoViolations();
  });
});
