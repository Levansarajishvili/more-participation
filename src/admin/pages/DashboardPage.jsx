import { Link } from 'react-router';

import { ContentState, Icon, SkeletonGroup, VisuallyHidden } from '@/components/ui/index.js';
import { useContent } from '@/hooks/useContent.js';
import { formatDate } from '@/i18n/index.js';

import { shortDateTime } from '../format.js';

import { a11yReport, content, stats } from '../api/adminAdapter.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { typeLabel } from '../content-types.js';
import { ruleLabel } from '../a11y-rules.js';
import { ta } from '../i18n/index.js';

/**
 * დაფა (`/admin`, AdminPanel დაფის „დაფა“):
 * - 4 მაჩვენებელი `<ul>`-ად: გამოქვეყნებული, მონახაზი, დაგეგმილი, ხელმისაწვდომობის ხარვეზი —
 *   რიცხვები საცავიდან ითვლება (ფაქტი არ არის — გამოთვლაა);
 * - „ბოლო ცვლილებები“ — `<table>` + `<caption>` (h2 მის შიგნით) + `scope="col"`;
 * - „ხელმისაწვდომობის შემოწმება“ — წესი → ბმულები ფილტრირებულ სიაზე (`/admin/:type?check=…`),
 *   „სრული ანგარიში“ → `/admin/a11y`.
 * ღონისძიებები დაფაზე ცალკე არ ჩანს (დაფის გადაწყვეტილება) — ისინი მაჩვენებლებსა და სიაშია.
 */
export default function DashboardPage() {
  const statsState = useContent(() => stats(), []);
  const recent = useContent(() => content.list({ type: 'all', limit: 5 }), []);
  const report = useContent(() => a11yReport(), []);
  const hasTable = recent.status === 'success' && (recent.data?.items.length ?? 0) > 0;

  return (
    <div className="mc-dashboard">
      <ContentState
        status={statsState.status}
        error={statsState.error}
        onRetry={statsState.reload}
        label={ta('dashboard.statsLoading')}
        skeleton={<SkeletonGroup count={4} variant="text" lines={2} className="mc-stats" />}
      >
        {() => (
          <StatList
            data={/** @type {import('../api/adminAdapter.js').Stats} */ (statsState.data)}
          />
        )}
      </ContentState>

      <div className="mc-dashboard__grid">
        <section className="mc-admin-panel" aria-labelledby="dash-recent">
          {!hasTable && (
            <h2 id="dash-recent" className="mc-admin-panel__title">
              {ta('dashboard.recent')}
            </h2>
          )}
          <ContentState
            status={recent.status}
            error={recent.error}
            onRetry={recent.reload}
            label={ta('dashboard.recentLoading')}
            skeleton={<SkeletonGroup count={3} variant="row" />}
            empty={recent.data?.items.length === 0}
            emptyText={ta('dashboard.recentEmpty')}
          >
            {() => <RecentTable rows={recent.data?.items ?? []} />}
          </ContentState>
        </section>

        <section className="mc-admin-panel" aria-labelledby="dash-checks">
          <h2 id="dash-checks" className="mc-admin-panel__title">
            {ta('dashboard.checks')}
          </h2>
          <ContentState
            status={report.status}
            error={report.error}
            onRetry={report.reload}
            label={ta('dashboard.checksLoading')}
            skeleton={<SkeletonGroup count={3} variant="text" lines={1} />}
          >
            {() => <CheckList report={/** @type {any} */ (report.data)} />}
          </ContentState>
          <Link to="/admin/a11y" className="mc-admin-link">
            {ta('dashboard.fullReport')}
          </Link>
        </section>
      </div>
    </div>
  );
}

/** @param {{ data: import('../api/adminAdapter.js').Stats }} props */
function StatList({ data }) {
  const issues = data.a11yIssues;
  const items = [
    { key: 'published', value: data.published, note: ta('dashboard.publishedNote') },
    { key: 'draft', value: data.draft, note: ta('dashboard.draftNote') },
    {
      key: 'scheduled',
      value: data.scheduled,
      note: data.nextScheduledAt
        ? ta('dashboard.scheduledNext', { date: formatDate(data.nextScheduledAt, 'dateTime') })
        : ta('dashboard.scheduledNone'),
    },
    {
      key: 'issues',
      value: issues,
      note: issues ? ta('dashboard.issuesNote') : ta('dashboard.issuesNone'),
      tone: issues ? 'warn' : 'ok',
    },
  ];
  return (
    <ul role="list" aria-label={ta('dashboard.statsLabel')} className="mc-stats">
      {items.map((item) => (
        <li key={item.key} className="mc-stat" data-tone={item.tone}>
          <span className="mc-stat__label">{ta(`dashboard.${item.key}`)}</span>
          <span className="mc-stat__value">
            {item.tone && (
              <Icon
                name={item.tone === 'warn' ? 'alert' : 'check'}
                size="1.75rem"
                className="mc-stat__icon"
              />
            )}
            {item.value}
          </span>
          <span className="mc-stat__note">{item.note}</span>
        </li>
      ))}
    </ul>
  );
}

/** @param {{ rows: import('../api/adminAdapter.js').ContentRow[] }} props */
function RecentTable({ rows }) {
  return (
    <div
      className="mc-table-scroll"
      role="region"
      tabIndex={0}
      aria-label={ta('common.tableRegion', { title: ta('dashboard.recent') })}
    >
      <table className="mc-admin-table">
        <caption>
          <h2 id="dash-recent" className="mc-admin-panel__title">
            {ta('dashboard.recent')}
          </h2>
        </caption>
        <thead>
          <tr>
            <th scope="col">{ta('dashboard.colTitle')}</th>
            <th scope="col">{ta('dashboard.colType')}</th>
            <th scope="col">{ta('dashboard.colStatus')}</th>
            <th scope="col">{ta('dashboard.colAuthor')}</th>
            <th scope="col">{ta('dashboard.colUpdated')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link to={`/admin/${row.type}/${row.id}`} className="mc-admin-table__title">
                  {row.title}
                </Link>
              </td>
              <td>{typeLabel(row.type, 'one')}</td>
              <td>
                <StatusBadge status={row.status} />
              </td>
              <td>{row.updatedBy?.name ?? ta('common.unknownAuthor')}</td>
              <td>
                <time dateTime={row.updatedAt}>{shortDateTime(row.updatedAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** @param {{ report: import('../api/adminAdapter.js').A11yReport }} props */
function CheckList({ report }) {
  const blocking = report.groups.filter((g) => g.severity === 'error');
  const warnings = report.groups.filter((g) => g.severity === 'warning');
  return (
    <div className="mc-rules">
      {blocking.length === 0 ? (
        <p className="mc-rule mc-rule--ok">
          <Icon name="check" size="1.25rem" />
          <span>{ta('dashboard.checksNone')}</span>
        </p>
      ) : (
        <ul role="list" className="mc-rule-list">
          {blocking.map((group) => (
            <CheckGroup key={group.code} group={group} />
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <>
          <p className="mc-rules__sub">{ta('dashboard.checksWarnings')}</p>
          <ul role="list" className="mc-rule-list">
            {warnings.map((group) => (
              <CheckGroup key={group.code} group={group} />
            ))}
          </ul>
        </>
      )}
      <p className="mc-rule mc-rule--info">
        <Icon name="contrast" size="1.25rem" />
        <span>{ta('dashboard.contrastInfo')}</span>
      </p>
    </div>
  );
}

/** @param {{ group: import('../api/adminAdapter.js').A11yGroup }} props */
function CheckGroup({ group }) {
  const rule = ruleLabel(group.code);
  return (
    <li className={`mc-rule mc-rule--${group.severity}`}>
      <Icon name="alert" size="1.25rem" />
      <span className="mc-rule__body">
        <span className="mc-rule__label">{rule}</span>
        <span className="mc-rule__links">
          {group.types.map((bucket) => (
            <Link
              key={bucket.type}
              to={`/admin/${bucket.type}?check=${encodeURIComponent(group.code)}`}
              className="mc-admin-link"
            >
              {ta('dashboard.checkLinkType', { type: typeLabel(bucket.type), count: bucket.count })}
              <VisuallyHidden>{`: ${rule}${ta('dashboard.checkLinkSuffix')}`}</VisuallyHidden>
            </Link>
          ))}
        </span>
      </span>
    </li>
  );
}
