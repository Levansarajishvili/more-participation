import { Link } from 'react-router';

import { ContentState, Icon, LiveRegion, SkeletonGroup } from '@/components/ui/index.js';
import { useContent } from '@/hooks/useContent.js';

import { a11yReport } from '../api/adminAdapter.js';
import { ruleLabel } from '../a11y-rules.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';
import { rowTitle } from '../display.js';

/**
 * ხელმისაწვდომობის სრული ანგარიში (`/admin/a11y`): ჯამი `role="status"`-ით, შემდეგ ორი ცხრილი —
 * „გამოქვეყნებას ბლოკავს“ (validate.js-ის error) და „გაფრთხილება“ (warning), + ინფორმაციული
 * წესები (კონტრასტი, ხმოვანი ვერსია). ყოველი სტრიქონი რედაქტორზე მიდის.
 */
export default function A11yReportPage() {
  const report = useContent(() => a11yReport(), []);
  const data = report.data;
  return (
    <div className="mc-a11y-report">
      <ContentState
        status={report.status}
        error={report.error}
        onRetry={report.reload}
        label={ta('a11y.loadingLabel')}
        skeleton={<SkeletonGroup count={3} variant="row" />}
      >
        {() =>
          data && (
            <>
              <LiveRegion visible className="mc-admin-list__status">
                {data.totals.items
                  ? ta('a11y.summary', {
                      errors: data.totals.errors,
                      warnings: data.totals.warnings,
                      items: data.totals.items,
                    })
                  : ta('a11y.summaryNone')}
              </LiveRegion>
              <IssueTable
                report={data}
                severity="error"
                id="a11y-blocking"
                title={ta('a11y.blocking')}
                empty={ta('a11y.blockingNone')}
              />
              <IssueTable
                report={data}
                severity="warning"
                id="a11y-warnings"
                title={ta('a11y.warning')}
                empty={ta('a11y.warningNone')}
              />
              <section className="mc-admin-panel" aria-labelledby="a11y-info">
                <h2 id="a11y-info" className="mc-admin-panel__title">
                  {ta('a11y.info')}
                </h2>
                <ul role="list" className="mc-rule-list">
                  <li className="mc-rule mc-rule--info">
                    <Icon name="contrast" size="1.25rem" />
                    <span>{ta('dashboard.contrastInfo')}</span>
                  </li>
                  <li className="mc-rule mc-rule--info">
                    <Icon name="voice" size="1.25rem" />
                    <span>{ta('a11y.infoVoice')}</span>
                  </li>
                </ul>
              </section>
            </>
          )
        }
      </ContentState>
    </div>
  );
}

/**
 * @param {{ report: import('../api/adminAdapter.js').A11yReport, severity: 'error' | 'warning', id: string, title: string, empty: string }} props
 */
function IssueTable({ report, severity, id, title, empty }) {
  const rows = report.items.flatMap((item) =>
    item.issues
      .filter((issue) => issue.severity === severity)
      .map((issue, i) => ({ item, issue, key: `${item.id}-${issue.field}-${issue.code}-${i}` })),
  );
  return (
    <section className="mc-admin-panel" aria-labelledby={id}>
      {rows.length === 0 ? (
        <>
          <h2 id={id} className="mc-admin-panel__title">
            {title}
          </h2>
          <p className="mc-rule mc-rule--ok">
            <Icon name="check" size="1.25rem" />
            <span>{empty}</span>
          </p>
        </>
      ) : (
        <div
          className="mc-table-scroll"
          role="region"
          tabIndex={0}
          aria-label={ta('common.tableRegion', { title })}
        >
          <table className="mc-admin-table">
            <caption>
              <h2 id={id} className="mc-admin-panel__title">
                {title}
              </h2>
            </caption>
            <thead>
              <tr>
                <th scope="col">{ta('a11y.colItem')}</th>
                <th scope="col">{ta('a11y.colType')}</th>
                <th scope="col">{ta('a11y.colStatus')}</th>
                <th scope="col">{ta('a11y.colIssue')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, issue, key }) => (
                <tr key={key}>
                  <td>
                    <Link
                      to={`/admin/${item.type}/${item.id}`}
                      className="mc-admin-table__title"
                      lang={rowTitle(item).lang}
                    >
                      {rowTitle(item).text}
                    </Link>
                  </td>
                  <td>{typeLabel(item.type, 'one')}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>
                    <span className={`mc-rule mc-rule--${severity}`}>
                      <Icon name="alert" size="1.25rem" />
                      <span>
                        <span className="mc-rule__label">{ruleLabel(issue.code)}</span>
                        <span className="mc-admin-table__meta">{issue.message}</span>
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
