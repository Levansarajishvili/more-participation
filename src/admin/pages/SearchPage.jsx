import { Link, useSearchParams } from 'react-router';

import { ContentState, LiveRegion, SkeletonGroup } from '@/components/ui/index.js';
import { useContent } from '@/hooks/useContent.js';

import { content } from '../api/adminAdapter.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';
import { useAdminPage } from '../shell/admin-page.js';

/**
 * ძიება პანელში (`/admin/search?q=`): header-ის ფორმიდან. შედეგი — ყველა ტიპი, უახლესი ჯერ;
 * რაოდენობა `role="status"`-ით.
 */
export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  useAdminPage({ title: q ? ta('search.titleQuery', { q }) : ta('search.title') });
  const results = useContent(() => content.search(q), [q], { enabled: Boolean(q) });

  if (!q) return <p className="mc-admin-note">{ta('search.hint')}</p>;

  return (
    <div className="mc-admin-search-page">
      <ContentState
        status={results.status}
        error={results.error}
        onRetry={results.reload}
        label={ta('search.loadingLabel')}
        skeleton={<SkeletonGroup count={3} variant="row" />}
        empty={results.data?.length === 0}
        emptyText={ta('search.empty', { q })}
      >
        {() => (
          <>
            <LiveRegion visible className="mc-admin-list__status">
              {ta('search.found', { count: results.data?.length ?? 0 })}
            </LiveRegion>
            <ul role="list" className="mc-admin-panel mc-search-results">
              {results.data?.map((row) => (
                <li key={row.id} className="mc-search-results__item">
                  <Link to={`/admin/${row.type}/${row.id}`} className="mc-admin-table__title">
                    {row.title}
                  </Link>
                  <span className="mc-admin-table__meta">{typeLabel(row.type, 'one')}</span>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </ContentState>
    </div>
  );
}
