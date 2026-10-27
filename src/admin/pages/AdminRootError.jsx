import { ta } from '../i18n/index.js';

/** ადმინის გარსის ავარია (AuthProvider-მდე): მინიმალური გვერდი, საკუთარი h1-ით. */
export default function AdminRootError() {
  return (
    <main id="main" className="mc-admin-fallback">
      <h1>{ta('errors.routeTitle')}</h1>
      <p>{ta('errors.routeText')}</p>
      <button
        type="button"
        className="mc-btn mc-btn--secondary mc-btn--sm"
        onClick={() => window.location.reload()}
      >
        <span>{ta('errors.reload')}</span>
      </button>
    </main>
  );
}
