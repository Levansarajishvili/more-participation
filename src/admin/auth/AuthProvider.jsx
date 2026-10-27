import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, LiveRegion } from '@/components/ui/index.js';
import { formatTime } from '@/i18n/index.js';

import { UNAUTHORIZED_EVENT, auth } from '../api/adminAdapter.js';
import Dialog from '../components/Dialog.jsx';
import { ta } from '../i18n/index.js';

import { AuthContext } from './auth-context.js';

/** გაფრთხილება ამოწურვამდე 2 წუთით ადრე (WCAG 2.2.1: ≥ 20 წამი, ერთი მოქმედებით გაგრძელება). */
export const SESSION_WARNING_MS = 2 * 60_000;
/** ადგილობრივი გასვლა სერვერზე 5 წამით ადრე: ბოლო ავტოშენახვა ჯერ კიდევ ვალიდურ სესიაზე მიდის. */
export const EXPIRE_MARGIN_MS = 5_000;

/** @typedef {import('./auth-context.js').AuthValue} AuthValue */
/** @typedef {import('../api/adminAdapter.js').Session} Session */

/** @param {Session} s */
const authed = (s) => ({
  status: /** @type {const} */ ('authenticated'),
  user: s.user,
  expiresAt: s.expiresAt,
  reason: null,
});
/** @param {'expired' | 'logged-out' | null} reason */
const anonymous = (reason) => ({
  status: /** @type {const} */ ('anonymous'),
  user: null,
  expiresAt: null,
  reason,
});

/**
 * სესიის მდგომარეობა ადმინისთვის. `me()` ჩატვირთვისას; სესიის ვადა:
 * - ამოწურვამდე 2 წუთით ადრე — `role="alertdialog"` „გაგრძელება / გასვლა“ (2.2.1), ავტოშენახვა
 *   (`useSessionFlush`) იწყება;
 * - ამოწურვისას — ავტოშენახვა, შემდეგ `anonymous` + `reason: 'expired'` → RequireAuth შესვლის
 *   გვერდზე `?next=`-ით გადაიყვანს, ხელახალი შესვლის შემდეგ იმავე ეკრანზე ბრუნდება (2.2.5);
 * - ნებისმიერი API-ს 401 (`UNAUTHORIZED_EVENT`) — იგივე, რაც ამოწურვა.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {number} [props.warningMs]
 * @param {number} [props.expireMarginMs]
 * @param {() => number} [props.now]
 */
export default function AuthProvider({
  children,
  warningMs = SESSION_WARNING_MS,
  expireMarginMs = EXPIRE_MARGIN_MS,
  now = Date.now,
}) {
  const [session, setSession] = useState(
    /** @type {Pick<AuthValue, 'status' | 'user' | 'expiresAt' | 'reason'>} */ ({
      status: 'loading',
      user: null,
      expiresAt: null,
      reason: null,
    }),
  );
  const [warning, setWarning] = useState(false);
  const [extendError, setExtendError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const flushers = useRef(/** @type {Set<() => unknown>} */ (new Set()));
  const extendRef = useRef(/** @type {HTMLButtonElement | null} */ (null));

  useEffect(() => {
    let alive = true;
    auth
      .me()
      .then((s) => alive && setSession(authed(s)))
      .catch(() => alive && setSession(anonymous(null)));
    return () => {
      alive = false;
    };
  }, []);

  const flush = useCallback(async () => {
    for (const fn of [...flushers.current]) {
      try {
        await fn();
      } catch {
        // ავტოშენახვის შეცდომას რედაქტორი თავად აჩვენებს
      }
    }
  }, []);

  const expire = useCallback(async () => {
    await flush();
    setWarning(false);
    setSession(anonymous('expired'));
    auth.logout().catch(() => {});
  }, [flush]);

  useEffect(() => {
    if (session.status !== 'authenticated' || !session.expiresAt) return undefined;
    const left = Date.parse(session.expiresAt) - now();
    const warn = setTimeout(
      () => {
        setExtendError('');
        setWarning(true);
        flush();
      },
      Math.max(0, left - warningMs),
    );
    const end = setTimeout(expire, Math.max(0, left - expireMarginMs));
    return () => {
      clearTimeout(warn);
      clearTimeout(end);
    };
  }, [session.status, session.expiresAt, warningMs, expireMarginMs, now, flush, expire]);

  useEffect(() => {
    if (session.status !== 'authenticated') return undefined;
    const onUnauthorized = () => {
      setWarning(false);
      setSession(anonymous('expired'));
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [session.status]);

  const addFlush = useCallback((/** @type {() => unknown} */ fn) => {
    flushers.current.add(fn);
    return () => {
      flushers.current.delete(fn);
    };
  }, []);

  const login = useCallback(async (/** @type {any} */ values) => {
    setSession(authed(await auth.login(values)));
  }, []);

  const register = useCallback(async (/** @type {any} */ values) => {
    setSession(authed(await auth.register(values)));
  }, []);

  const logout = useCallback(async () => {
    await flush();
    setWarning(false);
    await auth.logout().catch(() => {});
    setSession(anonymous('logged-out'));
  }, [flush]);

  const extend = useCallback(async () => {
    const next = await auth.extendSession();
    setSession(authed(next));
    setWarning(false);
    setMessage(ta('session.extended', { time: formatTime(next.expiresAt) }));
  }, []);

  /** @type {AuthValue} */
  const value = useMemo(
    () => ({ ...session, login, register, logout, extend, addFlush }),
    [session, login, register, logout, extend, addFlush],
  );

  async function onExtend() {
    setBusy(true);
    setExtendError('');
    try {
      await extend();
    } catch (error) {
      setExtendError(ta('session.extendFailed', { message: /** @type {Error} */ (error).message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog
        open={warning && session.status === 'authenticated'}
        role="alertdialog"
        onClose={onExtend}
        initialFocus={extendRef}
        title={ta('session.title')}
        description={
          session.expiresAt ? ta('session.text', { time: formatTime(session.expiresAt) }) : ''
        }
        actions={
          <>
            <Button ref={extendRef} variant="primary" size="sm" loading={busy} onClick={onExtend}>
              {ta('session.extend')}
            </Button>
            <Button variant="secondary" size="sm" onClick={logout}>
              {ta('session.logout')}
            </Button>
          </>
        }
      >
        {extendError && (
          <p role="alert" className="mc-dialog__error">
            {extendError}
          </p>
        )}
      </Dialog>
      <LiveRegion>{message}</LiveRegion>
    </AuthContext.Provider>
  );
}
