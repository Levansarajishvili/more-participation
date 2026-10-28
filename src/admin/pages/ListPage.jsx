import { useEffect, useId, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import {
  Button,
  ChipGroup,
  ContentState,
  LiveRegion,
  SkeletonGroup,
  VisuallyHidden,
} from '@/components/ui/index.js';
import { STATUSES } from '@/content/model.js';
import { useContent } from '@/hooks/useContent.js';

import { shortDateTime } from '../format.js';

import { content } from '../api/adminAdapter.js';
import { ruleLabel } from '../a11y-rules.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusBadge, { IssueBadge } from '../components/StatusBadge.jsx';
import { TYPE_CONFIG, isContentType, typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';
import { rowTitle } from '../display.js';
import { useAdminPage } from '../shell/admin-page.js';

import AdminNotFound from './AdminNotFound.jsx';

export const PAGE_SIZE = 10;

/**
 * კონტენტის სია (`/admin/:type`, AdminPanel დაფის „სია“).
 *
 * - ფილტრი, ძიება და გვერდი URL-შია: `?status=draft&q=…&page=2&check=altMissing`; ჩიპი და
 *   ძიება — push, გვერდი 1-ზე ბრუნდება. რაოდენობა `role="status"`-ით ცხადდება, ფოკუსი ფილტრზე რჩება.
 * - ცხრილი: სათაური, კატეგორია, სტატუსი, განახლდა, მოქმედება; მოქმედების სახელი სათაურს შეიცავს
 *   („რედაქტირება: [სათაური]“ — დამალული ნაწილით). „წაშლა“ — სამუდამოა, ნატიური `<dialog>`-ით დადასტურების შემდეგ (ფოკუსი „გაუქმებაზე“).
 * - 390-ზე ცხრილი `overflow-x: auto` რეგიონშია (`role="region"`, `tabindex="0"`, caption-ით) —
 *   WCAG 1.4.10 ცხრილს გამონაკლისს აძლევს; ბარათებად (`display: block`) არ იქცევა — Safari ცხრილის
 *   სემანტიკას კარგავს.
 * - გვერდის შეცვლისას ფოკუსი ცხრილის რეგიონზე გადადის (ბოლო გვერდზე „შემდეგი“ ქრება).
 * - დაფის კატეგორიის ჩიპები, სტატუსის select და მასობრივი მონიშვნა prompt-ში არ არის — არ არის.
 */
export default function ListPage() {
  const { type } = useParams();
  if (!isContentType(type)) return <AdminNotFound />;
  return <ContentList key={type} type={type} />;
}

/** @param {{ type: import('../content-types.js').ContentType }} props */
function ContentList({ type }) {
  const [params, setParams] = useSearchParams();
  const status = STATUSES.includes(/** @type {any} */ (params.get('status')))
    ? /** @type {import('@/content/model.js').Status} */ (params.get('status'))
    : null;
  const q = params.get('q') ?? '';
  const check = params.get('check') || null;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const config = TYPE_CONFIG[type];
  const label = typeLabel(type);

  useAdminPage({
    title: label,
    crumbs: [
      { to: '/admin', label: ta('header.root') },
      { label: ta('nav.groups.content') },
      { label },
    ],
    type,
  });

  const list = useContent(
    () => content.list({ type, status, q, page, check, limit: PAGE_SIZE }),
    [type, status, q, page, check],
  );
  const [query, setQuery] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) {
    setLastQ(q);
    setQuery(q);
  }
  const [statusText, setStatusText] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(
    /** @type {import('../api/adminAdapter.js').ContentRow | null} */ (null),
  );
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);
  const regionRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const focusRegion = useRef(false);
  const captionId = useId();
  const searchId = useId();

  const filterText = [status && ta(`status.${status}`), q && `„${q}“`, check && ruleLabel(check)]
    .filter(Boolean)
    .join(', ');

  // ტექსტი მხოლოდ ახალ შედეგზე იცვლება (ჩატვირთვისას ძველი რჩება) — F6-ის წესი
  const [shownFor, setShownFor] = useState(/** @type {unknown} */ (null));
  if (list.status === 'success' && list.data && list.data !== shownFor) {
    setShownFor(list.data);
    setStatusText(
      filterText
        ? ta('list.foundFiltered', { count: list.data.total, filter: filterText })
        : ta('list.found', { count: list.data.total }),
    );
  }

  // გვერდის / წაშლის შემდეგ ფოკუსი ცხრილზე (ბოლო გვერდზე „შემდეგი“ ბმული აღარ არის)
  useEffect(() => {
    if (list.status !== 'success' || !focusRegion.current) return;
    focusRegion.current = false;
    regionRef.current?.focus({ preventScroll: false });
  }, [list.status, list.data]);

  /** @param {Record<string, string | null>} patch @param {{ keepPage?: boolean }} [options] */
  function update(patch, { keepPage = false } = {}) {
    const copy = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') copy.delete(key);
      else copy.set(key, value);
    }
    if (!keepPage) copy.delete('page');
    setParams(copy, { preventScrollReset: true });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setDeleteError('');
    try {
      await content.remove(deleting.id);
      setMessage(ta('list.deleted', { title: deleting.title }));
      setDeleting(null);
      focusRegion.current = true;
      list.reload();
    } catch (error) {
      setDeleteError(ta('list.deleteFailed', { message: /** @type {Error} */ (error).message }));
    } finally {
      setBusy(false);
    }
  }

  const data = list.data;
  const filtered = Boolean(status || q || check);

  return (
    <div className="mc-admin-list">
      {!config.creatable && <p className="mc-admin-note">{ta('list.fixedPages')}</p>}

      <div className="mc-admin-panel mc-admin-filters">
        <ChipGroup
          label={ta('list.statusLabel')}
          options={[
            { id: null, label: ta('list.all') },
            ...STATUSES.map((id) => ({ id, label: ta(`status.${id}`) })),
          ]}
          value={status}
          onChange={(value) => update({ status: value })}
        />
        <search className="mc-admin-filters__search" aria-label={ta('list.search')}>
          <form
            className="mc-admin-search__form"
            onSubmit={(event) => {
              event.preventDefault();
              update({ q: query.trim() || null });
            }}
          >
            <label htmlFor={searchId} className="mc-label">
              {ta('list.search')}
            </label>
            <span className="mc-admin-search__row">
              <input
                id={searchId}
                type="search"
                className="mc-input mc-admin-search__input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm" icon="search">
                {ta('list.searchSubmit')}
              </Button>
            </span>
          </form>
        </search>
        {check && (
          <p className="mc-admin-filters__check">
            <span>{ta('list.checkFilter', { label: ruleLabel(check) })}</span>
            <Button variant="link" size="sm" onClick={() => update({ check: null })}>
              {ta('list.checkClear')}
            </Button>
          </p>
        )}
      </div>

      <LiveRegion visible className="mc-admin-list__status">
        {statusText}
      </LiveRegion>
      <LiveRegion>{message}</LiveRegion>

      <ContentState
        status={list.status}
        error={list.error}
        onRetry={list.reload}
        label={ta('list.loadingLabel')}
        skeleton={<SkeletonGroup count={4} variant="row" />}
        empty={data?.items.length === 0}
        emptyText={
          filtered ? (
            <>
              {ta('list.empty')}{' '}
              <Button
                variant="link"
                size="sm"
                onClick={() => update({ status: null, q: null, check: null })}
              >
                {ta('list.filtersReset')}
              </Button>
            </>
          ) : (
            ta('list.emptyAll')
          )
        }
      >
        {() => (
          <>
            <div
              ref={regionRef}
              className="mc-table-scroll mc-admin-panel mc-admin-panel--flush"
              role="region"
              tabIndex={0}
              aria-labelledby={captionId}
            >
              <table className="mc-admin-table">
                <caption id={captionId} className="sr-only">
                  {ta('list.caption', { type: label })}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{ta('list.colTitle')}</th>
                    <th scope="col">{typeLabel(type, 'category')}</th>
                    <th scope="col">{ta('list.colStatus')}</th>
                    <th scope="col">{ta('list.colUpdated')}</th>
                    <th scope="col">{ta('list.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="mc-admin-table__title" lang={rowTitle(row).lang}>
                          {rowTitle(row).text}
                        </span>
                        <span className="mc-admin-table__meta">
                          <span lang="en">{type === 'pages' ? row.category : row.slug}</span>
                          <IssueBadge count={row.issues.errors} />
                        </span>
                      </td>
                      <td>
                        {row.category ? config.categoryLabel(row.category) : ta('common.dash')}
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        <time dateTime={row.updatedAt}>{shortDateTime(row.updatedAt)}</time>
                        <span className="mc-admin-table__meta">
                          {row.updatedBy?.name ?? ta('common.unknownAuthor')}
                        </span>
                      </td>
                      <td>
                        <span className="mc-admin-table__actions">
                          <Button variant="secondary" size="sm" to={`/admin/${type}/${row.id}`}>
                            {ta('list.edit')}
                            <VisuallyHidden>
                              {': '}
                              <span lang={rowTitle(row).lang}>{rowTitle(row).text}</span>
                            </VisuallyHidden>
                          </Button>
                          {config.deletable && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="trash"
                              onClick={() => {
                                setDeleteError('');
                                setDeleting(row);
                              }}
                            >
                              {ta('list.delete')}
                              <VisuallyHidden>
                                {': '}
                                <span lang={rowTitle(row).lang}>{rowTitle(row).text}</span>
                              </VisuallyHidden>
                            </Button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && (
              <nav aria-label={ta('list.pagination')} className="mc-pagination">
                <p className="mc-pagination__info">
                  {ta('list.shownOf', { shown: data.items.length, total: data.total })}
                  {data.pages > 1 && (
                    <span className="mc-pagination__page">
                      {' · '}
                      {ta('list.pageOf', { page: data.page, pages: data.pages })}
                    </span>
                  )}
                </p>
                {data.pages > 1 && (
                  <span className="mc-pagination__buttons">
                    <PageLink
                      page={data.page - 1}
                      disabled={data.page <= 1}
                      label={ta('list.prev')}
                      icon="chevron-left"
                      onGo={() => (focusRegion.current = true)}
                      params={params}
                    />
                    <PageLink
                      page={data.page + 1}
                      disabled={data.page >= data.pages}
                      label={ta('list.next')}
                      iconEnd="chevron-right"
                      onGo={() => (focusRegion.current = true)}
                      params={params}
                    />
                  </span>
                )}
              </nav>
            )}
          </>
        )}
      </ContentState>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? ta('list.deleteTitle', { title: deleting.title }) : ''}
        description={ta('list.deleteText')}
        confirmLabel={ta('list.deleteConfirm')}
        cancelLabel={ta('list.deleteCancel')}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        {deleteError && (
          <p role="alert" className="mc-dialog__error">
            {deleteError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

/**
 * გვერდის ბმული (URL-ის `page`). ზღვარზე — `aria-disabled` ბმული (Tab-ში არ არის); ფოკუსი
 * ცხრილზე გადადის, ამიტომ ბოლო გვერდზე ფოკუსი არ იკარგება.
 * @param {{ page: number, disabled: boolean, label: string, icon?: string, iconEnd?: string, onGo: () => void, params: URLSearchParams }} props
 */
function PageLink({ page, disabled, label, icon, iconEnd, onGo, params }) {
  const copy = new URLSearchParams(params);
  if (page <= 1) copy.delete('page');
  else copy.set('page', String(page));
  const query = copy.toString();
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={icon}
      iconEnd={iconEnd}
      disabled={disabled}
      to={/** @type {any} */ ({ search: query ? `?${query}` : '' })}
      {...(!disabled && { preventScrollReset: true })}
      onClick={onGo}
    >
      {label}
    </Button>
  );
}
