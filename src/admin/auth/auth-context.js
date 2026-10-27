import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * @typedef {object} AuthValue
 * @property {'loading' | 'authenticated' | 'anonymous'} status
 * @property {import('../api/adminAdapter.js').AdminUser | null} user
 * @property {string | null} expiresAt
 * @property {'expired' | 'logged-out' | null} reason   რატომ გამოვიდა მომხმარებელი
 * @property {(values: { email: string, password: string, remember?: boolean }) => Promise<void>} login
 * @property {(values: { name: string, email: string, invite: string, password: string }) => Promise<void>} register
 * @property {() => Promise<void>} logout
 * @property {() => Promise<void>} extend
 * @property {(fn: () => unknown) => () => void} addFlush  ავტოშენახვა სესიის ამოწურვამდე
 */

/** @type {import('react').Context<AuthValue | null>} */
export const AuthContext = createContext(/** @type {AuthValue | null} */ (null));

/** @returns {AuthValue} */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth: AuthProvider აკლია');
  return value;
}

/**
 * სესიის ამოწურვამდე (გაფრთხილებისას და გასვლამდე) გამოსაძახებელი ფუნქცია — რედაქტორის
 * ავტოშენახვა (WCAG 2.2.5: ხელახალი შესვლის შემდეგ მონაცემი ადგილზეა).
 * @param {() => unknown} fn
 */
export function useSessionFlush(fn) {
  const { addFlush } = useAuth();
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => addFlush(() => latest.current()), [addFlush]);
}
