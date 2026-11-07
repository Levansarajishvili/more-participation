import { useEffect, useId, useRef, useState } from 'react';

import { Button, Icon, IconButton, LiveRegion, VisuallyHidden } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { FONT_SIZES, THEMES } from './prefs.js';
import { cancelSpeech, readElement, useSpeech } from './speech.js';
import { usePreferences } from './usePreferences.js';

const MIN_SIZE = FONT_SIZES[0];
const MAX_SIZE = FONT_SIZES[FONT_SIZES.length - 1];

/**
 * შემდეგი შრიფტის ზომა: ზრდა ბიჯით, მაქსიმუმის შემდეგ — მინიმუმი.
 * @param {import('./prefs.js').FontSize} size
 * @returns {import('./prefs.js').FontSize}
 */
function nextSize(size) {
  const index = FONT_SIZES.indexOf(size);
  return index < 0 || index >= FONT_SIZES.length - 1 ? MIN_SIZE : FONT_SIZES[index + 1];
}

/**
 * შემდეგი თემა: სტანდარტული → მუქი → მაღალი → სტანდარტული.
 * @param {import('./prefs.js').Theme} theme
 * @returns {import('./prefs.js').Theme}
 */
function nextTheme(theme) {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}

/**
 * მენიუს ფილა: ხატულა, წარწერა და ხილული მდგომარეობა.
 *
 * - გადამრთველი (`pressed` boolean) — `aria-pressed`; მდგომარეობის ტექსტი („ჩართული“) ხილულია, მაგრამ
 *   სახელში არ შედის (`aria-hidden`) — მდგომარეობას `aria-pressed` აცხადებს. ჩართულს ✓ ხატულაც აქვს:
 *   ფერი ერთადერთი ნიშანი არ არის.
 * - ციკლური ღილაკი (`pressed` undefined) — მნიშვნელობა („125%“) სახელის ნაწილია: „შრიფტი 125%“.
 * - მიუწვდომელი — `aria-disabled` (ფოკუსს იღებს), მიზეზი — `aria-describedby`.
 *
 * @param {object} props
 * @param {string} props.icon
 * @param {string} props.label
 * @param {string} props.state
 * @param {boolean} [props.pressed]
 * @param {boolean} [props.unavailable]
 * @param {string} props.descriptionId
 * @param {string} props.description
 * @param {() => void} props.onClick
 */
function Tile({ icon, label, state, pressed, unavailable, descriptionId, description, onClick }) {
  const toggle = typeof pressed === 'boolean';
  return (
    <li className="mc-a11y-grid__item">
      <button
        type="button"
        className="mc-a11y-tile"
        aria-pressed={toggle ? pressed : undefined}
        aria-disabled={unavailable || undefined}
        aria-describedby={descriptionId}
        onClick={onClick}
      >
        <Icon name={icon} size="2rem" className="mc-a11y-tile__icon" />
        <span className="mc-a11y-tile__label">{label}</span>{' '}
        <span className="mc-a11y-tile__state" aria-hidden={toggle || undefined}>
          {state}
        </span>
        {toggle && pressed ? (
          <Icon name="check" size="1.25rem" className="mc-a11y-tile__check" />
        ) : null}
      </button>
      <VisuallyHidden id={descriptionId}>{description}</VisuallyHidden>
    </li>
  );
}

/**
 * თავსებადობის მენიუ: ღილაკი ზედა ზოლში + არამოდალური პანელი — მუქი სათაურის ზოლი, 2 × 2 ფილა
 * (ხმოვანი რეჟიმი, შრიფტი, კონტრასტი, განლაგება) და „გასუფთავება“ მთელ სიგანეზე.
 * საკუთარი, მსუბუქი კომპონენტია — მესამე მხარის overlay-ვიჯეტი არ გამოიყენება.
 *
 * - ღილაკი: `aria-expanded`, `aria-controls`; პანელი DOM-ში ღილაკს მოსდევს, ამიტომ Tab
 *   ღილაკიდან პირდაპირ პანელში შედის (ფოკუსი გახსნისას არ გადაიტანება).
 * - დახურვა: Esc (ფოკუსი ღილაკზე ბრუნდება), ✕ ღილაკი, დაწკაპება გარეთ, ფოკუსის გასვლა
 *   პანელიდან — ღია პანელმა გვერდის ფოკუსირებული ელემენტი არ უნდა დაფაროს (WCAG 2.4.11).
 * - შრიფტი და კონტრასტი ციკლურია (100 → … → 200 → 100; სტანდარტული → მუქი → მაღალი);
 *   ხმოვანი რეჟიმი და განლაგება — გადამრთველები.
 * - პანელს ძირეული თემა აქვს (`data-theme`), სათაურის ზოლი — მუქი ქვეხე `--mc-footer` ფონზე.
 * - ყოველი ცვლილება `role="status"`-ით ცხადდება (პანელის ქვედა ხაზი, ხილული).
 *
 * @param {{ className?: string }} props
 */
export default function A11yMenu({ className }) {
  const { prefs, theme, setTheme, setSize, setSpacing, setVoice, reset } = usePreferences();
  const speech = useSpeech();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const toggleRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const announceTimer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const panelId = useId();
  const titleId = `${panelId}-title`;

  /** იგივე ტექსტიც ხელახლა უნდა გამოცხადდეს — ჯერ ცარიელი, შემდეგ შეტყობინება. */
  function announce(/** @type {string} */ text) {
    setMessage('');
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setMessage(text), 60);
  }

  useEffect(
    () => () => {
      if (announceTimer.current) clearTimeout(announceTimer.current);
    },
    [],
  );

  function close(/** @type {boolean} */ returnFocus) {
    setOpen(false);
    setMessage('');
    if (returnFocus) toggleRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return undefined;
    /** @param {PointerEvent} event */
    function onPointerDown(event) {
      const target = /** @type {Node | null} */ (event.target);
      if (target && !wrapRef.current?.contains(target)) close(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  /** @param {import('react').KeyboardEvent} event */
  function onKeyDown(event) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close(true);
    }
  }

  /** @param {import('react').FocusEvent} event */
  function onBlur(event) {
    const next = /** @type {Node | null} */ (event.relatedTarget);
    // relatedTarget null — დაწკაპება პანელის არაინტერაქტიულ ნაწილზე; გარეთ დაწკაპებას pointerdown ხურავს
    if (open && next && !wrapRef.current?.contains(next)) close(false);
  }

  const voiceReady = speech.status === 'ready';
  const voiceOn = prefs.voice && voiceReady;
  const voiceReason =
    speech.status === 'pending' ? t('a11y.voiceChecking') : t('a11y.voiceUnavailable');

  function onVoice() {
    // მიუწვდომელი: მიზეზი ხილულ სტატუსში ჩნდება (ფილაზე მხოლოდ მოკლე „მიუწვდომელია“ ეტევა)
    if (!voiceReady) {
      announce(voiceReason);
      return;
    }
    const on = !voiceOn;
    setVoice(on);
    if (on) {
      announce(t('a11y.status.voiceOn'));
      readElement(document.getElementById('main'));
    } else {
      cancelSpeech();
      announce(t('a11y.status.voiceOff'));
    }
  }

  function onSize() {
    const size = nextSize(prefs.size);
    setSize(size);
    announce(t('a11y.status.size', { size }));
  }

  function onTheme() {
    const next = nextTheme(theme);
    setTheme(next);
    announce(t('a11y.status.theme', { name: t(`a11y.themes.${next}`) }));
  }

  function onSpacing() {
    const on = !prefs.spacing;
    setSpacing(on);
    announce(on ? t('a11y.status.spacingOn') : t('a11y.status.spacingOff'));
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Esc და ფოკუსის გასვლა შვილებიდან ამოდის
    <div
      ref={wrapRef}
      className={className ? `mc-a11y ${className}` : 'mc-a11y'}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <Button
        ref={toggleRef}
        variant="secondary"
        size="sm"
        icon="accessibility"
        iconEnd="chevron-down"
        className="mc-a11y__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        {t('a11y.menu')}
      </Button>

      <div
        id={panelId}
        role="group"
        aria-labelledby={titleId}
        hidden={!open}
        data-theme={theme}
        className="mc-a11y-panel"
      >
        <div className="mc-a11y-panel__head">
          <div className="mc-a11y-panel__head-inner" data-theme="dark">
            <p id={titleId} className="mc-a11y-panel__title">
              {t('a11y.menu')}
            </p>
            <IconButton
              icon="close"
              variant="ghost"
              className="mc-a11y-panel__close"
              size="sm"
              label={t('a11y.menuClose')}
              onClick={() => close(true)}
            />
          </div>
        </div>

        <div className="mc-a11y-panel__body">
          <ul role="list" className="mc-a11y-grid">
            <Tile
              icon="voice"
              label={t('a11y.voice')}
              state={
                voiceReady
                  ? t(voiceOn ? 'a11y.state.on' : 'a11y.state.off')
                  : t(
                      speech.status === 'pending'
                        ? 'a11y.state.checking'
                        : 'a11y.state.unavailable',
                    )
              }
              pressed={voiceOn}
              unavailable={!voiceReady}
              descriptionId={`${panelId}-voice`}
              description={voiceReady ? t('a11y.voiceHint') : voiceReason}
              onClick={onVoice}
            />
            <Tile
              icon="font-size"
              label={t('a11y.font')}
              state={t('a11y.fontSizeValue', { size: prefs.size })}
              descriptionId={`${panelId}-size`}
              description={t('a11y.fontHint', { min: MIN_SIZE, max: MAX_SIZE })}
              onClick={onSize}
            />
            <Tile
              icon="contrast"
              label={t('a11y.contrast')}
              state={t(`a11y.themes.${theme}`)}
              descriptionId={`${panelId}-theme`}
              description={t('a11y.contrastHint')}
              onClick={onTheme}
            />
            <Tile
              icon="layout"
              label={t('a11y.spacing')}
              state={t(prefs.spacing ? 'a11y.state.spacingWide' : 'a11y.state.spacingNormal')}
              pressed={prefs.spacing}
              descriptionId={`${panelId}-spacing`}
              description={t('a11y.spacingWide')}
              onClick={onSpacing}
            />
          </ul>

          <button
            type="button"
            className="mc-a11y-reset"
            onClick={() => {
              cancelSpeech();
              reset();
              announce(t('a11y.resetDone'));
            }}
          >
            <Icon name="reset" size="1.5rem" />
            {t('a11y.reset')}
          </button>

          <LiveRegion visible className="mc-a11y-panel__status">
            {message}
          </LiveRegion>
        </div>
      </div>
    </div>
  );
}
