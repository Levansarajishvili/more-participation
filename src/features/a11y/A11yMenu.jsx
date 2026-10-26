import { useEffect, useId, useRef, useState } from 'react';

import { Button, Icon, IconButton, LiveRegion, RadioGroup, Switch } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { FONT_SIZES, THEMES } from './prefs.js';
import { cancelSpeech, readElement, useSpeech } from './speech.js';
import { usePreferences } from './usePreferences.js';

const MIN_SIZE = FONT_SIZES[0];
const MAX_SIZE = FONT_SIZES[FONT_SIZES.length - 1];

/**
 * თავსებადობის მენიუ (A11yPanel დაფა): ღილაკი ზედა ზოლში + არამოდალური პანელი.
 * საკუთარი, მსუბუქი კომპონენტია — მესამე მხარის overlay-ვიჯეტი არ გამოიყენება.
 *
 * - ღილაკი: `aria-expanded`, `aria-controls`; პანელი DOM-ში ღილაკს მოსდევს, ამიტომ Tab
 *   ღილაკიდან პირდაპირ პანელში შედის (ფოკუსი გახსნისას არ გადაიტანება).
 * - დახურვა: Esc (ფოკუსი ღილაკზე ბრუნდება), ✕ ღილაკი, დაწკაპება გარეთ, ფოკუსის გასვლა
 *   პანელიდან — ღია პანელმა გვერდის ფოკუსირებული ელემენტი არ უნდა დაფაროს (WCAG 2.4.11).
 * - პანელს ძირეული თემა აქვს (`data-theme`), თუმცა ზედა ზოლი მუქი ქვეხეა.
 * - ყოველი ცვლილება `role="status"`-ით ცხადდება (პანელის ქვედა ხაზი).
 *
 * @param {{ className?: string }} props
 */
export default function A11yMenu({ className }) {
  const { prefs, theme, setTheme, stepSize, setSpacing, setVoice, reset } = usePreferences();
  const speech = useSpeech();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const toggleRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const announceTimer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const panelId = useId();
  const titleId = `${panelId}-title`;
  const sizeLabelId = `${panelId}-size`;

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

  function onVoice(/** @type {boolean} */ on) {
    setVoice(on);
    if (on) {
      announce(t('a11y.status.voiceOn'));
      readElement(document.getElementById('main'));
    } else {
      cancelSpeech();
      announce(t('a11y.status.voiceOff'));
    }
  }

  function onSize(/** @type {1 | -1} */ direction) {
    if ((direction < 0 && prefs.size <= MIN_SIZE) || (direction > 0 && prefs.size >= MAX_SIZE)) {
      return;
    }
    const size = stepSize(direction);
    announce(t('a11y.status.size', { size }));
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
          <p id={titleId} className="mc-a11y-panel__title">
            {t('a11y.menu')}
          </p>
          <IconButton
            icon="close"
            size="sm"
            label={t('a11y.menuClose')}
            onClick={() => close(true)}
          />
        </div>

        <Switch
          icon="voice"
          label={t('a11y.voice')}
          checked={voiceOn}
          onChange={onVoice}
          disabled={!voiceReady}
          description={voiceReady ? t('a11y.voiceHint') : undefined}
          disabledReason={
            speech.status === 'pending' ? t('a11y.voiceChecking') : t('a11y.voiceUnavailable')
          }
        />

        <div role="group" aria-labelledby={sizeLabelId} className="mc-a11y-row">
          <Icon name="font-size" size="1.375rem" />
          <span id={sizeLabelId} className="mc-a11y-row__label">
            {t('a11y.fontSize')}
          </span>
          <span className="mc-a11y-row__controls">
            <IconButton
              icon="minus"
              size="sm"
              label={t('a11y.fontSizeDecrease')}
              aria-disabled={prefs.size <= MIN_SIZE || undefined}
              onClick={() => onSize(-1)}
            />
            <span className="mc-a11y-row__value">
              {t('a11y.fontSizeValue', { size: prefs.size })}
            </span>
            <IconButton
              icon="plus"
              size="sm"
              label={t('a11y.fontSizeIncrease')}
              aria-disabled={prefs.size >= MAX_SIZE || undefined}
              onClick={() => onSize(1)}
            />
          </span>
        </div>

        <RadioGroup
          legend={t('a11y.contrast')}
          name={`${panelId}-theme`}
          options={THEMES.map((id) => ({ id, label: t(`a11y.themes.${id}`) }))}
          value={theme}
          onChange={(id) => {
            setTheme(/** @type {import('./prefs.js').Theme} */ (id));
            announce(t('a11y.status.theme', { name: t(`a11y.themes.${id}`) }));
          }}
          className="mc-a11y-theme"
        />

        <Switch
          icon="layout"
          label={t('a11y.spacing')}
          description={t('a11y.spacingWide')}
          checked={prefs.spacing}
          onChange={(on) => {
            setSpacing(on);
            announce(on ? t('a11y.status.spacingOn') : t('a11y.status.spacingOff'));
          }}
        />

        <hr className="mc-a11y-panel__rule" />

        <Button
          variant="secondary"
          size="sm"
          icon="reset"
          fullWidth
          className="mc-a11y-panel__reset"
          onClick={() => {
            cancelSpeech();
            reset();
            announce(t('a11y.resetDone'));
          }}
        >
          {t('a11y.reset')}
        </Button>

        <LiveRegion visible className="mc-a11y-panel__status">
          {message}
        </LiveRegion>
      </div>
    </div>
  );
}
