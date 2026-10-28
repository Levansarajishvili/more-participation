import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';

import {
  Button,
  Checkbox,
  ErrorSummary,
  Icon,
  IconButton,
  Logo,
  PendingLink,
  TextField,
} from '@/components/ui/index.js';
import A11yMenu from '@/features/a11y/A11yMenu.jsx';
import { usePreferences } from '@/features/a11y/usePreferences.js';
import { t } from '@/i18n/index.js';
import LanguageSwitch from '@/components/layout/LanguageSwitch.jsx';

import { useAuth } from '../auth/auth-context.js';
import { safeNext, validateLogin, validateRegister } from '../auth/auth-forms.js';
import PasswordField from '../components/PasswordField.jsx';
import { ta } from '../i18n/index.js';

/** @typedef {'login' | 'register'} AuthTab */
/** @type {readonly AuthTab[]} */
const TABS = ['login', 'register'];
const PERKS = /** @type {const} */ (['one', 'alt', 'video', 'history']);

/**
 * შესვლა / რეგისტრაცია (AdminAuth დაფა, 1440 — 5fr | 7fr; 390 — ერთი სვეტი).
 *
 * - DOM-ის რიგი: ზოლი (თავსებადობის მენიუ, მუქი რეჟიმი) → `<main>` (h1 + ჩანართები + ფორმა) →
 *   ბრენდ-პანელი (`<aside>`). 1440-ზე პანელი ვიზუალურად მარცხნივაა (grid), 390-ზე ფორმის
 *   შემდეგაა — DOM-შიც. პანელში ინტერაქტიული ელემენტი არ არის, ამიტომ Tab-ის რიგს არ ცვლის.
 *   h1 ფორმის სათაურია (დაფაზე h1 პანელზე იყო).
 * - ჩანართები — WAI-ARIA tabs: ← → Home End, roving tabindex, `aria-controls`; არჩეული ჩანართი
 *   URL-შია (`?tab=register&invite=…` რეგისტრაციას კოდით ხსნის), `replace`-ით.
 * - შეცდომა: ველებზე — ჯამი (`ErrorSummary`, `role="alert"`, ბმულები ველებზე) + ხაზოვანი
 *   შეცდომა; შესვლის უარყოფა — ზოგადი „ელფოსტა ან პაროლი არასწორია“ (ანგარიშის არსებობას არ ამხელს).
 * - WCAG 3.3.8: CAPTCHA არ არის, ჩასმა ყველგან დაშვებულია, „პაროლის ჩვენება“, password manager;
 *   დროის ლიმიტი არ არის (brute-force — სერვერის rate limit, TODO backend).
 */
export default function LoginPage() {
  const { status } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = /** @type {AuthTab} */ (params.get('tab') === 'register' ? 'register' : 'login');
  const reason = params.get('reason');
  const next = safeNext(params.get('next'));
  const { theme, setTheme } = usePreferences();
  const title = ta(tab === 'register' ? 'auth.titleRegister' : 'auth.titleLogin');

  useEffect(() => {
    document.title = ta('meta.title', { title });
  }, [title]);

  if (status === 'authenticated') return <Navigate replace to={next} />;

  /** @param {AuthTab} id */
  function selectTab(id) {
    const copy = new URLSearchParams(params);
    if (id === 'login') copy.delete('tab');
    else copy.set('tab', id);
    setParams(copy, { replace: true, preventScrollReset: true });
  }

  const dark = theme === 'dark';
  const markTone = theme === 'contrast' ? 'mono' : 'inverse';

  return (
    <div className="mc-auth">
      <header className="mc-auth__bar">
        <A11yMenu className="mc-admin-a11y" />
        <LanguageSwitch className="mc-admin-lang" />
        <IconButton
          icon="moon"
          size="sm"
          label={t('a11y.themeToggle')}
          pressed={dark}
          onClick={() => setTheme(dark ? 'light' : 'dark')}
        />
      </header>

      <main id="main" tabIndex={-1} className="mc-auth__main">
        <section className="mc-auth__card" aria-labelledby="auth-title">
          <h1 id="auth-title" className="mc-auth__title">
            {title}
          </h1>
          {reason === 'expired' && (
            <p role="status" className="mc-auth-note">
              <Icon name="clock" size="1.25rem" />
              <span>{ta('auth.expired')}</span>
            </p>
          )}
          {reason === 'logged-out' && (
            <p role="status" className="mc-auth-note">
              <Icon name="check" size="1.25rem" />
              <span>{ta('auth.loggedOut')}</span>
            </p>
          )}
          <AuthTabs tab={tab} onSelect={selectTab} />
          <div
            role="tabpanel"
            id="auth-panel-login"
            aria-labelledby="auth-tab-login"
            hidden={tab !== 'login'}
            className="mc-auth__panel"
          >
            <LoginForm next={next} onSwitch={() => selectTab('register')} />
          </div>
          <div
            role="tabpanel"
            id="auth-panel-register"
            aria-labelledby="auth-tab-register"
            hidden={tab !== 'register'}
            className="mc-auth__panel"
          >
            <RegisterForm
              next={next}
              invite={params.get('invite') ?? ''}
              onSwitch={() => selectTab('login')}
            />
          </div>
        </section>
      </main>

      <aside className="mc-auth__brand" data-theme="dark" aria-labelledby="auth-brand-title">
        <div className="mc-auth__brand-head">
          <Logo layout="mark" tone={markTone} size={56} decorative />
          <span className="mc-admin-brand__text">
            <span className="mc-admin-brand__name">{ta('brand.name')}</span>
            <span className="mc-admin-brand__area">{ta('brand.area')}</span>
          </span>
        </div>
        <div className="mc-auth__brand-body">
          <h2 id="auth-brand-title" className="mc-auth__brand-title">
            {ta('auth.brandTitle')}
          </h2>
          <ul role="list" className="mc-auth__perks">
            {PERKS.map((key) => (
              <li key={key}>
                <Icon name="check" size="1.375rem" accent className="mc-auth__perk-icon" />
                <span>{ta(`auth.perks.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mc-auth__brand-foot">
          <p className="mc-auth__address">
            <Icon name="lock" size="1.125rem" />
            <span>{ta('auth.address')}</span>
          </p>
          <p className="mc-auth__private">{ta('auth.privateNote')}</p>
        </div>
      </aside>
    </div>
  );
}

/**
 * WAI-ARIA tabs (ავტომატური გააქტიურება): ← → ციკლით, Home / End; ფოკუსი არჩეულ ჩანართზე.
 * @param {{ tab: AuthTab, onSelect: (id: AuthTab) => void }} props
 */
function AuthTabs({ tab, onSelect }) {
  const refs = useRef(/** @type {Record<string, HTMLButtonElement | null>} */ ({}));

  /** @param {import('react').KeyboardEvent} event */
  function onKeyDown(event) {
    const index = TABS.indexOf(tab);
    /** @type {number | null} */
    let target = null;
    if (event.key === 'ArrowRight') target = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') target = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = TABS.length - 1;
    if (target === null) return;
    event.preventDefault();
    const id = TABS[target];
    onSelect(id);
    refs.current[id]?.focus();
  }

  return (
    <div role="tablist" aria-label={ta('auth.tabsLabel')} className="mc-tabs">
      {TABS.map((id) => (
        <button
          key={id}
          ref={(node) => {
            refs.current[id] = node;
          }}
          type="button"
          role="tab"
          id={`auth-tab-${id}`}
          aria-selected={tab === id}
          aria-controls={`auth-panel-${id}`}
          tabIndex={tab === id ? 0 : -1}
          className="mc-tabs__tab"
          onClick={() => onSelect(id)}
          onKeyDown={onKeyDown}
        >
          {ta(id === 'login' ? 'auth.tabLogin' : 'auth.tabRegister')}
        </button>
      ))}
    </div>
  );
}

/**
 * @param {Record<string, { message: string }>} errors
 * @param {Record<string, { id: string, label: string }>} fields
 */
function summaryItems(errors, fields) {
  return Object.keys(fields)
    .filter((key) => errors[key])
    .map((key) => ({ id: fields[key].id, label: fields[key].label, message: errors[key].message }));
}

/** @param {{ next: string, onSwitch: () => void }} props */
function LoginForm({ next, onSwitch }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState(/** @type {Record<string, { message: string }>} */ ({}));
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const fields = {
    email: { id: 'login-email', label: ta('auth.email') },
    password: { id: 'login-password', label: ta('auth.password') },
  };

  /** @param {import('react').FormEvent} event */
  async function onSubmit(event) {
    event.preventDefault();
    setFailure('');
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length) {
      setAttempt((n) => n + 1);
      return;
    }
    setBusy(true);
    try {
      await login(values);
      navigate(next, { replace: true, state: { focus: 'heading' } });
    } catch (error) {
      const e = /** @type {import('@/content/errors.js').ContentError} */ (error);
      if (e.code === 'validation' && e.fields) {
        setErrors(e.fields);
        setAttempt((n) => n + 1);
      } else {
        setFailure(e.code === 'unauthorized' ? ta('auth.loginFailed') : e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const items = summaryItems(errors, fields);
  return (
    <form noValidate className="mc-auth__form" onSubmit={onSubmit}>
      {items.length > 0 && (
        <ErrorSummary
          key={attempt}
          title={ta('auth.summaryTitle', { count: items.length })}
          items={items}
          headingLevel="h2"
        />
      )}
      <TextField
        id={fields.email.id}
        label={fields.email.label}
        type="email"
        name="email"
        autoComplete="username"
        inputMode="email"
        required
        value={values.email}
        error={errors.email}
        onChange={(event) => setValues((v) => ({ ...v, email: event.target.value }))}
      />
      <PasswordField
        id={fields.password.id}
        label={fields.password.label}
        name="password"
        autoComplete="current-password"
        required
        value={values.password}
        error={errors.password}
        onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
      />
      <div className="mc-auth__row">
        <Checkbox
          label={ta('auth.remember')}
          checked={values.remember}
          onChange={(event) => setValues((v) => ({ ...v, remember: event.target.checked }))}
        />
        <PendingLink>{ta('auth.forgot')}</PendingLink>
      </div>
      {failure && (
        <p role="alert" className="mc-auth-alert">
          <Icon name="alert" size="1.25rem" />
          <span>{failure}</span>
        </p>
      )}
      <Button
        type="submit"
        variant="cta"
        fullWidth
        loading={busy}
        loadingLabel={ta('auth.submittingLogin')}
      >
        {ta('auth.submitLogin')}
      </Button>
      <Button variant="link" onClick={onSwitch} className="mc-auth__switch">
        {ta('auth.toRegister')}
      </Button>
      <p className="mc-auth__foot">{ta('auth.footLogin')}</p>
    </form>
  );
}

/** @param {{ next: string, invite: string, onSwitch: () => void }} props */
function RegisterForm({ next, invite, onSwitch }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', invite, password: '' });
  const [errors, setErrors] = useState(/** @type {Record<string, { message: string }>} */ ({}));
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const fields = {
    name: { id: 'register-name', label: ta('auth.name') },
    email: { id: 'register-email', label: ta('auth.workEmail') },
    invite: { id: 'register-invite', label: ta('auth.invite') },
    password: { id: 'register-password', label: ta('auth.password') },
  };

  /** @param {keyof typeof values} key */
  const bind = (key) => ({
    value: values[key],
    error: errors[key],
    onChange: (/** @type {import('react').ChangeEvent<HTMLInputElement>} */ event) =>
      setValues((v) => ({ ...v, [key]: event.target.value })),
  });

  /** @param {import('react').FormEvent} event */
  async function onSubmit(event) {
    event.preventDefault();
    setFailure('');
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length) {
      setAttempt((n) => n + 1);
      return;
    }
    setBusy(true);
    try {
      await register(values);
      navigate(next, { replace: true, state: { focus: 'heading' } });
    } catch (error) {
      const e = /** @type {import('@/content/errors.js').ContentError} */ (error);
      if (e.code === 'validation' && e.fields) {
        setErrors(e.fields);
        setAttempt((n) => n + 1);
      } else {
        setFailure(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const items = summaryItems(errors, fields);
  return (
    <form noValidate className="mc-auth__form" onSubmit={onSubmit}>
      {items.length > 0 && (
        <ErrorSummary
          key={attempt}
          title={ta('auth.summaryTitle', { count: items.length })}
          items={items}
          headingLevel="h2"
        />
      )}
      <TextField
        id={fields.name.id}
        label={fields.name.label}
        name="name"
        autoComplete="name"
        required
        {...bind('name')}
      />
      <TextField
        id={fields.email.id}
        label={fields.email.label}
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        {...bind('email')}
      />
      <TextField
        id={fields.invite.id}
        label={fields.invite.label}
        name="invite"
        hint={ta('auth.inviteHint')}
        autoCapitalize="characters"
        spellCheck={false}
        required
        {...bind('invite')}
      />
      <PasswordField
        id={fields.password.id}
        label={fields.password.label}
        name="new-password"
        autoComplete="new-password"
        hint={ta('auth.passwordHint')}
        strength
        required
        {...bind('password')}
      />
      {failure && (
        <p role="alert" className="mc-auth-alert">
          <Icon name="alert" size="1.25rem" />
          <span>{failure}</span>
        </p>
      )}
      <Button
        type="submit"
        variant="cta"
        fullWidth
        loading={busy}
        loadingLabel={ta('auth.submittingRegister')}
      >
        {ta('auth.submitRegister')}
      </Button>
      <Button variant="link" onClick={onSwitch} className="mc-auth__switch">
        {ta('auth.toLogin')}
      </Button>
      <p className="mc-auth__foot">{ta('auth.footRegister')}</p>
    </form>
  );
}
