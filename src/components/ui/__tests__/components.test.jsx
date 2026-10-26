import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { allowedHexFromContext } from '@/test/contrast.js';

import {
  BRAND_ICONS,
  Button,
  ICONS,
  Logo,
  Media,
  TextField,
  logoDetail,
  logoMetrics,
} from '../index.js';
import { parseSprite } from '../icon-sprite.js';

import { renderUi } from './fixtures.jsx';

afterEach(() => vi.restoreAllMocks());

describe('Icon: icons.svg', () => {
  it('IconSet-ის 18 ხატულა და UI-გლიფები წაიკითხა', () => {
    expect(BRAND_ICONS).toHaveLength(18);
    for (const name of BRAND_ICONS) expect(ICONS[name]?.paths.length).toBeGreaterThan(0);
    for (const name of ['check', 'alert', 'triangle-up', 'bookmark', 'plus', 'chevron-down']) {
      expect(ICONS[name]).toBeDefined();
    }
  });

  it('parseSprite: კლასი, stroke-width, ლეიბლი', () => {
    const icons = parseSprite(
      '<svg><!-- x --><symbol id="a" viewBox="0 0 12 12" stroke-width="3" data-label="ა"><path class="fill" d="M0 0"/><path d="M1 1"/></symbol></svg>',
    );
    expect(icons.a).toEqual({
      viewBox: '0 0 12 12',
      strokeWidth: 3,
      label: 'ა',
      paths: [
        { kind: 'fill', d: 'M0 0' },
        { kind: 'main', d: 'M1 1' },
      ],
    });
  });
});

describe('Logo', () => {
  it('დეტალი ზომით: ≥ 48 — 3D, 24–47 — ბრტყელი, < 24 — favicon', () => {
    expect(logoDetail(48)).toBe('3d');
    expect(logoDetail(47.9)).toBe('flat');
    expect(logoDetail(24)).toBe('flat');
    expect(logoDetail(16)).toBe('tiny');
  });

  it('ლოკაპში ნიშნის ზომა viewBox-იდან ითვლება', () => {
    const { width, markPx } = logoMetrics('horizontal', 56);
    expect(width).toBeCloseTo(307.6, 0);
    expect(markPx).toBeCloseTo(65.3, 0);
    expect(logoMetrics('mark', 32)).toEqual({ width: 32, height: 32, markPx: 32 });
  });

  it('role="img" + სახელი; decorative — aria-hidden; data-detail', () => {
    render(
      <>
        <Logo layout="horizontal" size={30} />
        <Logo layout="mark" size={96} label="მთავარი გვერდი" />
        <Logo layout="mark" size={20} decorative />
      </>,
    );
    const [lockup, mark] = screen.getAllByRole('img');
    expect(lockup).toHaveAccessibleName(
      'მეტი ჩართულობა განვითარებისა და სოციალური ცვლილებებისთვის',
    );
    expect(lockup).toHaveAttribute('data-detail', 'flat');
    expect(mark).toHaveAccessibleName('მთავარი გვერდი');
    expect(mark).toHaveAttribute('data-detail', '3d');
    expect(document.querySelector('[aria-hidden="true"][data-detail="tiny"]')).not.toBeNull();
  });

  it('ლოკაპი: სიტყვიერი ნიშანი lazy chunk-იდან ჩნდება, სახელი თავიდანვე სრულია', async () => {
    render(<Logo layout="horizontal" size={56} />);
    const lockup = screen.getByRole('img');
    expect(lockup).toHaveAccessibleName(
      'მეტი ჩართულობა განვითარებისა და სოციალური ცვლილებებისთვის',
    );
    await waitFor(() => expect(lockup.querySelectorAll(':scope > svg')).toHaveLength(2));
  });

  it('მინიმუმზე ნაკლები — dev-გაფრთხილება', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Logo layout="horizontal" size={20} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('მინიმუმი 160px'));
    warn.mockClear();
    render(<Logo layout="vertical" size={120} />);
    expect(warn).not.toHaveBeenCalled();
  });

  it('ტონი: ინვერსია და მონო სიტყვიერი ნიშნის ცვლადებს აყენებს', () => {
    render(
      <>
        <Logo tone="inverse" label="ინვ" />
        <Logo tone="mono" label="მონო" knockout="var(--mc-surface)" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'ინვ' }).style.getPropertyValue('--mc-logo-name')).toBe(
      '#FFFFFF',
    );
    const mono = screen.getByRole('img', { name: 'მონო' });
    expect(mono.style.getPropertyValue('--mc-logo-name')).toBe('currentColor');
    expect(mono.style.getPropertyValue('--mc-logo-knockout')).toBe('var(--mc-surface)');
  });
});

describe('Button', () => {
  it('loading: aria-busy, ტექსტი და დაჭერა იბლოკება; ფოკუსი რჩება', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderUi(
      <Button loading onClick={onClick}>
        მეტი
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'იტვირთება…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).not.toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('to → Link, href + newTab → target და ტექსტი ეკრანის მკითხველისთვის; გათიშული ბმული ფოკუსს არ იღებს', () => {
    renderUi(
      <>
        <Button to="/news">სიახლეები</Button>
        <Button href="https://example.org" newTab>
          გარე
        </Button>
        <Button to="/x" disabled>
          გათიშული
        </Button>
      </>,
    );
    expect(screen.getByRole('link', { name: 'სიახლეები' })).toHaveAttribute('href', '/news');
    const external = screen.getByRole('link', { name: /გარე/ });
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAccessibleName('გარე (იხსნება ახალ ჩანართში)');
    const disabled = screen.getByRole('link', { name: 'გათიშული' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    expect(disabled).not.toHaveAttribute('href');
  });
});

describe('TextField', () => {
  it('ლეიბლი, მინიშნება და შეცდომა aria-describedby-ით; aria-invalid', () => {
    renderUi(<TextField label="ელფოსტა" hint="name@example.ge" error="შეამოწმე" required />);
    const input = screen.getByLabelText('ელფოსტა');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('name@example.ge შეცდომა: შეამოწმე');
  });
});

describe('Media', () => {
  it('src: null — ჩარჩო „[ფოტო: …]“, <img> არ იხატება', () => {
    const { container } = renderUi(
      <Media image={{ src: null, alt: '[მონაწილე სახელოსნოში]', ratio: '3:2' }} />,
    );
    expect(container.querySelector('img')).toBeNull();
    const frame = screen.getByRole('img', { name: '[მონაწილე სახელოსნოში]' });
    expect(frame).toHaveTextContent('[ფოტო: მონაწილე სახელოსნოში]');
    expect(frame.style.aspectRatio).toBe('3 / 2');
  });
});

describe('components.css', () => {
  it('ყოველი HEX (ყდა, კადრის ნიშნები) project-context §2-იდანაა', () => {
    const css = readFileSync(resolve('src/styles/components.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const allowed = allowedHexFromContext(readFileSync(resolve('docs/project-context.md'), 'utf8'));
    const used = [...css.matchAll(/#[0-9a-f]{6}\b/gi)].map(([hex]) => hex.toLowerCase());
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((hex) => !allowed.has(hex))).toEqual([]);
  });

  it('ოქროსფერი ტოკენი მხოლოდ CTA-ს და დაკვრის ნიშანშია', () => {
    const css = readFileSync(resolve('src/styles/components.css'), 'utf8');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*var\(--mc-cta\)[^{}]*)\}/g)].map(([, sel]) =>
      sel.trim(),
    );
    for (const selector of rules) expect(selector).toMatch(/mc-btn--cta|mc-video-thumb__play/);
  });
});
