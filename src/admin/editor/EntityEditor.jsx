import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router';

import { Button, ErrorSummary, Icon, LiveRegion, RadioGroup } from '@/components/ui/index.js';
import { useContent } from '@/hooks/useContent.js';
import { formatDate, formatTime } from '@/i18n/index.js';

import { content, media } from '../api/adminAdapter.js';
import { ruleLabel } from '../a11y-rules.js';
import { useAuth, useSessionFlush } from '../auth/auth-context.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Dialog from '../components/Dialog.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';
import { ABOUT_SECTIONS } from '../schemas/pages.js';
import { schemaFor } from '../schemas/index.js';
import { useAdminPage } from '../shell/admin-page.js';

import { autosaveDelay } from './autosave.js';
import { EN_CODES, buildChecklist, validateEntity, validateTranslation } from './checklist.js';
import TranslationFields from './TranslationFields.jsx';
import { EN_PREFIX } from './translation.js';
import { DateTimeField } from './fields/FieldRenderer.jsx';
import FieldRenderer from './fields/FieldRenderer.jsx';
import { parsePath, resolveFieldId, sameValue, setIn } from './path.js';

/**
 * ერთი რედაქტორი ყველა ტიპისთვის (AdminPanel დაფის „რედაქტორი“): სქემა (`admin/schemas`) →
 * ველები; მარჯვნივ — გამოქვეყნება, ჩეკლისტი, ვერსიები.
 *
 * - ავტოშენახვა: 2 წმ debounce + ველიდან გასვლა; „ავტომატურად შეინახა 14:32 · ავტორი: …“
 *   ხილულია, ეკრანის მკითხველს მხოლოდ შეცდომა ცხადდება (`role="alert"`). გამოქვეყნებულის
 *   ავტოშენახვა საიტს არ ცვლის — სამუშაო ასლია, „გამოქვეყნება“ ამტკიცებს.
 * - Ctrl/⌘+S — შენახვა ახლავე (გამოქვეყნებულს მონახაზად არ აქცევს).
 * - შეუნახავი ცვლილებით გასვლა: `useBlocker` (დიალოგი) + `beforeunload`.
 * - ვერსიის კონფლიქტი (409) — დიალოგი „მასალა სხვამ შეცვალა“.
 * - გამოქვეყნება ბლოკერით — შეცდომების ჯამი, ფოკუსი მასზე, ბმული პირდაპირ ველზე (მაგ. alt).
 * - სესიის ამოწურვამდე ავტოშენახვა (`useSessionFlush`, WCAG 2.2.5).
 *
 * @param {{ type: import('../content-types.js').ContentType, routeId: string }} props
 */
export default function EntityEditor({ type, routeId }) {
  const schema = schemaFor(type);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = routeId === 'new';
  const [recordId, setRecordId] = useState(/** @type {string | null} */ (isNew ? null : routeId));
  const [loadState, setLoadState] = useState(
    /** @type {'loading' | 'ready' | 'error'} */ (isNew ? 'ready' : 'loading'),
  );
  const [loadError, setLoadError] = useState(/** @type {Error | null} */ (null));
  const [values, setValues] = useState(() => (isNew ? schema.defaults(Date.now()) : {}));
  const [saved, setSaved] = useState(values);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState(
    /** @type {import('@/content/model.js').Status} */ ('draft'),
  );
  const [publishedAt, setPublishedAt] = useState(/** @type {string | null} */ (null));
  const [target, setTarget] = useState(
    /** @type {'draft' | 'scheduled' | 'published'} */ ('published'),
  );
  const [scheduleAt, setScheduleAt] = useState(/** @type {string | null} */ (null));
  const [saveInfo, setSaveInfo] = useState(/** @type {{ at: string, by: string } | null} */ (null));
  const [saveError, setSaveError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [summary, setSummary] = useState(
    /** @type {{ id: string, label: string, message: string }[]} */ ([]),
  );
  const [attemptKey, setAttemptKey] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(/** @type {'publish' | 'draft' | null} */ (null));
  const [conflict, setConflict] = useState(false);
  const [restoreTo, setRestoreTo] = useState(/** @type {number | null} */ (null));
  const [unpublishAsk, setUnpublishAsk] = useState(false);
  const [articleSlugs, setArticleSlugs] = useState(() => new Set());

  const valuesRef = useRef(values);
  const savedRef = useRef(saved);
  const versionRef = useRef(version);
  const idRef = useRef(recordId);
  const inflight = useRef(/** @type {Promise<void> | null} */ (null));
  const skipBlock = useRef(false);
  const dirty = loadState === 'ready' && !sameValue(values, saved);
  const dirtyRef = useRef(dirty);
  // refs — ასინქრონული შენახვისა და blocker-ის ბოლო მნიშვნელობა (render-ის შემდეგ)
  useLayoutEffect(() => {
    valuesRef.current = values;
    savedRef.current = saved;
    versionRef.current = version;
    idRef.current = recordId;
    dirtyRef.current = dirty;
  });

  /* ─── ჩატვირთვა ───────────────────────────────────────────────────── */

  /** @param {import('../api/adminAdapter.js').ContentRecord} record */
  const applyRecord = useCallback((record) => {
    const item = record.working?.item ?? record.item;
    setValues(item);
    setSaved(item);
    setVersion(record.version);
    setStatus(record.item.status);
    setPublishedAt(record.item.publishedAt ?? null);
    setTarget(record.item.status === 'scheduled' ? 'scheduled' : 'published');
    setScheduleAt(record.item.status === 'scheduled' ? record.item.publishedAt : null);
    const info = record.working ?? { at: record.updatedAt, by: record.updatedBy };
    setSaveInfo({ at: info.at, by: info.by?.name ?? ta('common.unknownAuthor') });
  }, []);

  useEffect(() => {
    if (routeId === 'new' || (routeId === idRef.current && loadState === 'ready')) return undefined;
    let alive = true;
    setLoadState('loading');
    content
      .get(routeId)
      .then((record) => {
        if (!alive) return;
        if (record.type !== type) throw Object.assign(new Error('type'), { status: 404 });
        setRecordId(record.id);
        applyRecord(record);
        setLoadState('ready');
      })
      .catch((error) => {
        if (!alive) return;
        setLoadError(error);
        setLoadState('error');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- მხოლოდ მისამართის ცვლილებაზე
  }, [routeId, type]);

  useEffect(() => {
    let alive = true;
    content
      .list({ type: 'articles', status: 'published', limit: 50 })
      .then((page) => alive && setArticleSlugs(new Set(page.items.map((row) => row.slug))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* ─── შემოწმება ────────────────────────────────────────────────────── */

  const sections = type === 'pages' && values.slug === 'about' ? ABOUT_SECTIONS : schema.sections;
  const [lang, setLang] = useState(/** @type {'ka' | 'en'} */ ('ka'));
  const baseIssues = useMemo(
    () => (loadState === 'ready' ? validateEntity(type, values, articleSlugs) : []),
    [type, values, articleSlugs, loadState],
  );
  // F9: ინგლისური ვერსია (თუ თარგმანი არის) — alt, სათაურები, ბმულები, მოკლე აღწერა, მარტივი ენა
  const enIssues = useMemo(
    () => (loadState === 'ready' ? validateTranslation(type, values, articleSlugs) : []),
    [type, values, articleSlugs, loadState],
  );
  const issues = useMemo(() => [...baseIssues, ...enIssues], [baseIssues, enIssues]);
  const checklist = useMemo(() => {
    const visible =
      lang === 'en'
        ? [...enIssues, ...baseIssues.filter((i) => !EN_CODES.includes(i.code))]
        : baseIssues;
    return {
      ...buildChecklist(schema.rules, visible),
      blocking: issues.filter((i) => i.severity === 'error'),
    };
  }, [schema.rules, lang, baseIssues, enIssues, issues]);
  const translated = Boolean(/** @type {any} */ (values).translations?.en?.title?.trim?.());

  const errorFor = useCallback(
    (/** @type {string} */ path) => {
      if (serverErrors[path]) return serverErrors[path];
      if (!attempted) return null;
      return issues.find((i) => i.severity === 'error' && i.field === path)?.message ?? null;
    },
    [attempted, issues, serverErrors],
  );

  /* ─── შენახვა ──────────────────────────────────────────────────────── */

  const persist = useCallback(
    /** @param {{ autosave?: boolean, data?: Record<string, any> }} [options] */
    async ({ autosave = true, data } = {}) => {
      const snapshot = data ?? valuesRef.current;
      try {
        let record;
        if (!idRef.current) {
          record = await content.create(type, snapshot);
          idRef.current = record.id;
          setRecordId(record.id);
          skipBlock.current = true;
          navigate(`/admin/${type}/${record.id}`, { replace: true });
          skipBlock.current = false;
        } else {
          record = await content.update(idRef.current, snapshot, {
            version: versionRef.current,
            autosave,
          });
        }
        setVersion(record.version);
        versionRef.current = record.version;
        setStatus(record.item.status);
        setSaved(snapshot);
        savedRef.current = snapshot;
        setSaveError('');
        setSaveInfo({ at: new Date().toISOString(), by: user?.name ?? ta('common.unknownAuthor') });
        return record;
      } catch (error) {
        const e = /** @type {import('@/content/errors.js').ContentError} */ (error);
        if (e.code === 'conflict') setConflict(true);
        else setSaveError(ta('editor.save.failed', { message: e.message }));
        throw e;
      }
    },
    [type, navigate, user],
  );

  /** ავტოშენახვა: ერთდროულად ერთი მოთხოვნა; ბოლოს — ბოლო მნიშვნელობა. */
  const saveNow = useCallback(async () => {
    if (inflight.current) await inflight.current.catch(() => {});
    if (sameValue(valuesRef.current, savedRef.current) && idRef.current) return;
    const run = persist().then(
      () => {},
      () => {},
    );
    inflight.current = run;
    await run;
    inflight.current = null;
  }, [persist]);

  useEffect(() => {
    if (!dirty) return undefined;
    const timer = setTimeout(saveNow, autosaveDelay());
    return () => clearTimeout(timer);
  }, [values, dirty, saveNow]);

  useSessionFlush(saveNow);

  useEffect(() => {
    if (!dirty) return undefined;
    /** @param {BeforeUnloadEvent} event */
    const onUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  // სტაბილური ფუნქცია: ახალი ფუნქცია ყოველ render-ზე blocker-ს თავიდან ქმნიდა და დიალოგი იხურებოდა
  const shouldBlock = useCallback(
    (
      /** @type {{ currentLocation: { pathname: string }, nextLocation: { pathname: string } }} */ {
        currentLocation,
        nextLocation,
      },
    ) =>
      dirtyRef.current && !skipBlock.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  );
  const blocker = useBlocker(shouldBlock);

  const setValue = useCallback((/** @type {string} */ path, /** @type {unknown} */ next) => {
    setValues((current) => setIn(current, path, next));
    setServerErrors((errors) => {
      if (!errors[path]) return errors;
      const copy = { ...errors };
      delete copy[path];
      return copy;
    });
  }, []);

  const upload = useCallback(
    async (/** @type {File} */ file) => (await media.upload(file)).src,
    [],
  );
  const checkSlug = useCallback(
    async (/** @type {string} */ slug) =>
      (await content.checkSlug(type, slug, idRef.current)).available,
    [type],
  );

  const ctx = { values, setValue, onBlur: saveNow, errorFor, upload, checkSlug, type };

  /* ─── გამოქვეყნება ─────────────────────────────────────────────────── */

  /** @param {string} path */
  function labelFor(path) {
    if (path.startsWith(`${EN_PREFIX}.`))
      return `${labelFor(path.slice(EN_PREFIX.length + 1))} (English)`;
    const keys = parsePath(path).filter((k) => typeof k === 'string');
    for (const section of sections) {
      for (const field of section.fields) {
        if (
          path === field.name ||
          path.startsWith(`${field.name}.`) ||
          path.startsWith(`${field.name}[`)
        ) {
          if (field.kind === 'repeater') {
            const index = Number(/\[(\d+)\]/.exec(path)?.[1] ?? 0);
            const sub = field.fields?.find((f) => keys.includes(f.name.split('.')[0]));
            const item = ta(field.itemLabel ?? 'editor.repeater.item', { n: index + 1 });
            return sub ? `${ta(sub.label)} — ${item}` : ta(field.label);
          }
          if (field.kind === 'image' && path.endsWith('.alt'))
            return `${ta(field.label)}: ${ta('editor.image.alt')}`;
          return ta(field.label);
        }
      }
    }
    return ruleLabel(
      parsePath(path)[0] === 'publishedAt' ? 'other' : String(keys[keys.length - 1] ?? ''),
    );
  }

  /** @param {{ field: string, message: string }[]} list */
  function showSummary(list) {
    setAttempted(true);
    setSummary(
      list.map((item) => ({
        id: resolveFieldId(item.field),
        label: item.field === 'publishedAt' ? ta('editor.publish.date') : labelFor(item.field),
        message: item.message,
      })),
    );
    setAttemptKey((n) => n + 1);
  }

  async function publish() {
    setMessage('');
    const list = checklist.blocking.map((i) => ({ field: i.field, message: i.message }));
    if (target === 'scheduled' && (!scheduleAt || Date.parse(scheduleAt) <= Date.now())) {
      list.push({ field: 'publishedAt', message: ta('fieldErrors.scheduleFuture') });
    }
    if (list.length) {
      showSummary(list);
      return;
    }
    setSummary([]);
    setBusy('publish');
    try {
      if (!idRef.current || !sameValue(valuesRef.current, savedRef.current))
        await persist({ autosave: true });
      const data = valuesRef.current;
      const record =
        target === 'scheduled'
          ? await content.schedule(
              /** @type {string} */ (idRef.current),
              /** @type {string} */ (scheduleAt),
              { version: versionRef.current, data },
            )
          : await content.publish(/** @type {string} */ (idRef.current), {
              version: versionRef.current,
              data,
            });
      applyRecord(record);
      setAttempted(false);
      setMessage(
        target === 'scheduled'
          ? ta('editor.publish.scheduledDone', {
              date: formatDate(record.item.publishedAt, 'dateTime'),
            })
          : ta('editor.publish.done'),
      );
    } catch (error) {
      const e = /** @type {import('@/content/errors.js').ContentError} */ (error);
      if (e.code === 'validation' && e.fields) {
        /** @type {Record<string, string>} */
        const next = {};
        for (const [field, value] of Object.entries(e.fields)) next[field] = value.message;
        setServerErrors(next);
        showSummary(
          Object.entries(e.fields).map(([field, value]) => ({ field, message: value.message })),
        );
      } else if (e.code === 'conflict') setConflict(true);
      else setSaveError(ta('editor.save.failed', { message: e.message }));
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft() {
    setBusy('draft');
    setUnpublishAsk(false);
    try {
      const data = { ...valuesRef.current, status: 'draft' };
      setValues(data);
      const record = await persist({ autosave: false, data });
      if (record) applyRecord(record);
      setMessage(ta('editor.publish.draftDone'));
    } catch {
      // შეცდომა persist-ში ჩანს
    } finally {
      setBusy(null);
    }
  }

  async function resolveConflict(/** @type {'mine' | 'theirs'} */ choice) {
    const latest = await content.get(/** @type {string} */ (idRef.current));
    setConflict(false);
    if (choice === 'theirs') {
      applyRecord(latest);
      setMessage(ta('editor.conflict.loaded'));
      return;
    }
    setVersion(latest.version);
    versionRef.current = latest.version;
    await persist({ autosave: true }).catch(() => {});
    setMessage(ta('editor.conflict.kept'));
  }

  /* ─── ვერსიები ─────────────────────────────────────────────────────── */

  // ვერსიების სია ყოველი შენახვის შემდეგ ახლდება
  const versionsKey = `${version}:${status}`;
  const versions = useContent(
    () => {
      void versionsKey;
      return content.versions(/** @type {string} */ (recordId));
    },
    [recordId, versionsKey],
    { enabled: Boolean(recordId) },
  );

  async function restore() {
    if (restoreTo === null || !idRef.current) return;
    const record = await content.restoreVersion(idRef.current, restoreTo);
    applyRecord(record);
    setRestoreTo(null);
    setMessage(ta('editor.versions.restored', { version: restoreTo }));
  }

  /* ─── header ───────────────────────────────────────────────────────── */

  const titleText = /** @type {string} */ (values[schema.titleField ?? 'title'] ?? '');
  useAdminPage({
    title:
      titleText ||
      (isNew ? ta('editor.newTitle', { type: typeLabel(type, 'one') }) : typeLabel(type, 'one')),
    crumbs: [
      { to: '/admin', label: ta('header.root') },
      { label: ta('nav.groups.content') },
      { to: `/admin/${type}`, label: typeLabel(type) },
      { label: titleText || ta('editor.untitled') },
    ],
    type,
    editor: true,
  });

  if (loadState === 'loading') {
    return <LiveRegion visible>{ta('editor.loading')}</LiveRegion>;
  }
  if (loadState === 'error') {
    return (
      <div className="mc-admin-panel mc-admin-message">
        <p role="alert">{/** @type {Error} */ (loadError).message}</p>
        <Button variant="secondary" size="sm" to={`/admin/${type}`}>
          {ta('editor.backToList')}
        </Button>
      </div>
    );
  }

  const previewPath = recordId ? `/admin/${type}/${recordId}/preview` : null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Ctrl/⌘+S ფორმის ნებისმიერი ველიდან
    <div
      className="mc-editor"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          saveNow();
        }
      }}
    >
      <div className="mc-editor__top">
        <Button variant="secondary" size="sm" icon="chevron-left" to={`/admin/${type}`}>
          {ta('editor.backToList')}
        </Button>
        <p className="mc-editor__saved">
          {saveInfo
            ? ta(dirty ? 'editor.save.pending' : 'editor.save.saved', {
                time: formatTime(saveInfo.at),
                by: saveInfo.by,
              })
            : ta('editor.save.never')}
        </p>
      </div>
      {saveError && (
        <p role="alert" className="mc-auth-alert">
          <Icon name="alert" size="1.25rem" />
          <span>{saveError}</span>
        </p>
      )}
      {summary.length > 0 && (
        <ErrorSummary
          key={attemptKey}
          title={ta('editor.publish.summary', { count: summary.length })}
          items={summary}
          headingLevel="h2"
        />
      )}
      <LiveRegion visible className="mc-editor__message">
        {message}
      </LiveRegion>

      <div className="mc-editor__grid">
        <form
          noValidate
          className="mc-editor__form"
          aria-labelledby="editor-form-title"
          onSubmit={(event) => {
            event.preventDefault();
            saveNow();
          }}
        >
          <h2 id="editor-form-title" className="sr-only">
            {ta('editor.formTitle', { type: typeLabel(type, 'one') })}
          </h2>
          <LangTabs value={lang} onChange={setLang} />
          <div
            role="tabpanel"
            id={`editor-lang-${lang}`}
            aria-labelledby={`editor-lang-tab-${lang}`}
            className="mc-editor__form"
          >
            {lang === 'en' && (
              <p className="mc-admin-panel mc-editor__lang-note">
                {ta(translated ? 'editor.lang.enDone' : 'editor.lang.enNone')}{' '}
                {ta('editor.lang.enHint')}
              </p>
            )}
            {lang === 'en' && <TranslationFields sections={sections} ctx={ctx} />}
            {lang === 'ka' &&
              sections.map((section) => (
                <section
                  key={section.id}
                  className="mc-admin-panel mc-editor__section"
                  aria-labelledby={`sec-${section.id}`}
                >
                  <h3 id={`sec-${section.id}`} className="mc-admin-panel__title">
                    {ta(section.title)}
                  </h3>
                  {section.fields.map((field) => (
                    <FieldRenderer key={field.name} field={field} ctx={ctx} />
                  ))}
                </section>
              ))}
          </div>
        </form>

        <aside className="mc-editor__aside" aria-label={ta('editor.asideLabel')}>
          <section className="mc-admin-panel" aria-labelledby="ed-publish">
            <h2 id="ed-publish" className="mc-admin-panel__title">
              {ta('editor.publish.title')}
            </h2>
            <p className="mc-editor__status">
              <span>{ta('editor.publish.current')}</span> <StatusBadge status={status} />
              {publishedAt && status !== 'draft' && (
                <span className="mc-admin-table__meta">{formatDate(publishedAt, 'dateTime')}</span>
              )}
            </p>
            <RadioGroup
              legend={ta('editor.publish.when')}
              name="publish-target"
              layout="list"
              options={[
                { id: 'published', label: ta('editor.publish.now') },
                { id: 'scheduled', label: ta('editor.publish.later') },
              ]}
              value={target}
              onChange={(id) => setTarget(/** @type {'published' | 'scheduled'} */ (id))}
            />
            {target === 'scheduled' && (
              <DateTimeField
                field={{
                  name: 'publishedAt',
                  kind: 'datetime',
                  label: 'editor.publish.date',
                  required: true,
                }}
                path="publishedAt"
                ctx={{
                  ...ctx,
                  values: { publishedAt: scheduleAt },
                  setValue: (_, next) => setScheduleAt(/** @type {string} */ (next)),
                  errorFor: () =>
                    attempted && (!scheduleAt || Date.parse(scheduleAt) <= Date.now())
                      ? ta('fieldErrors.scheduleFuture')
                      : null,
                }}
              />
            )}
            <Button variant="cta" fullWidth loading={busy === 'publish'} onClick={publish}>
              {ta('editor.publish.cta')}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              loading={busy === 'draft'}
              onClick={() => (status === 'published' ? setUnpublishAsk(true) : saveDraft())}
            >
              {ta('editor.publish.draft')}
            </Button>
            {previewPath ? (
              <Button
                variant="link"
                to={previewPath}
                onClick={async (event) => {
                  event.preventDefault();
                  await saveNow();
                  skipBlock.current = true;
                  navigate(previewPath);
                  skipBlock.current = false;
                }}
              >
                {ta('editor.publish.preview')}
              </Button>
            ) : (
              <Button variant="link" disabled disabledReason={ta('editor.publish.previewPending')}>
                {ta('editor.publish.preview')}
              </Button>
            )}
          </section>

          <section className="mc-admin-panel" aria-labelledby="ed-checks">
            <h2 id="ed-checks" className="mc-admin-panel__title">
              {ta('editor.checklist.title')}
            </h2>
            <LiveRegion visible className="mc-admin-list__status">
              {ta('editor.checklist.summary', { done: checklist.done, total: checklist.total })}
            </LiveRegion>
            <ul role="list" className="mc-rule-list">
              {checklist.items.map((item) => (
                <li key={item.id} className={`mc-rule mc-rule--${item.state}`}>
                  <Icon
                    name={
                      item.state === 'ok' ? 'check' : item.state === 'info' ? 'contrast' : 'alert'
                    }
                    size="1.25rem"
                  />
                  <span>
                    <span className="mc-rule__label">
                      <span className="sr-only">
                        {ta(`editor.checklist.states.${item.state}`)}:{' '}
                      </span>
                      {ta(`editor.checklist.rules.${item.id}`)}
                    </span>
                    {item.issues.length > 0 && (
                      <span className="mc-admin-table__meta">
                        {ta(`editor.checklist.levels.${item.state === 'fail' ? 'block' : 'warn'}`)}{' '}
                        · {ta('editor.checklist.count', { count: item.issues.length })}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mc-admin-note">{ta('editor.checklist.note')}</p>
          </section>

          <section className="mc-admin-panel" aria-labelledby="ed-versions">
            <h2 id="ed-versions" className="mc-admin-panel__title">
              {ta('editor.versions.title')}
            </h2>
            {!recordId ? (
              <p className="mc-admin-note">{ta('editor.versions.none')}</p>
            ) : (
              <ol role="list" className="mc-versions">
                {(versions.data ?? []).map((v) => (
                  <li key={v.version} className="mc-versions__item">
                    <span>
                      <time dateTime={v.at}>{formatDate(v.at, 'dateTime')}</time>
                      <span className="mc-admin-table__meta">
                        {v.by?.name ?? ta('common.unknownAuthor')}
                        {v.current ? ` · ${ta('editor.versions.current')}` : ''}
                      </span>
                    </span>
                    {!v.current && (
                      <Button variant="secondary" size="sm" onClick={() => setRestoreTo(v.version)}>
                        {ta('editor.versions.restore')}
                        <span className="sr-only">: {formatDate(v.at, 'dateTime')}</span>
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={restoreTo !== null}
        title={ta('editor.versions.confirmTitle')}
        description={ta('editor.versions.confirmText')}
        confirmLabel={ta('editor.versions.restore')}
        cancelLabel={ta('editor.cancel')}
        onConfirm={restore}
        onCancel={() => setRestoreTo(null)}
      />
      <ConfirmDialog
        open={unpublishAsk}
        title={ta('editor.publish.unpublishTitle')}
        description={ta('editor.publish.unpublishText')}
        confirmLabel={ta('editor.publish.draft')}
        cancelLabel={ta('editor.cancel')}
        busy={busy === 'draft'}
        onConfirm={saveDraft}
        onCancel={() => setUnpublishAsk(false)}
      />
      <Dialog
        open={conflict}
        role="alertdialog"
        onClose={() => setConflict(false)}
        title={ta('editor.conflict.title')}
        description={ta('editor.conflict.text')}
        actions={
          <>
            <Button variant="primary" size="sm" onClick={() => resolveConflict('mine')}>
              {ta('editor.conflict.mine')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => resolveConflict('theirs')}>
              {ta('editor.conflict.theirs')}
            </Button>
          </>
        }
      />
      <Dialog
        open={blocker.state === 'blocked'}
        role="alertdialog"
        onClose={() => blocker.reset?.()}
        title={ta('editor.leave.title')}
        description={ta('editor.leave.text')}
        actions={
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                await saveNow();
                blocker.proceed?.();
              }}
            >
              {ta('editor.leave.save')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => blocker.reset?.()}>
              {ta('editor.leave.stay')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => blocker.proceed?.()}>
              {ta('editor.leave.discard')}
            </Button>
          </>
        }
      />
    </div>
  );
}

/**
 * მასალის ენის ჩანართები (WAI-ARIA tabs: ← → Home End, roving tabindex) — ქართული (ძირითადი
 * ვერსია) / English (`translations.en`). ჩეკლისტი არჩეული ენის ვერსიას აჩვენებს.
 * @param {{ value: 'ka' | 'en', onChange: (lang: 'ka' | 'en') => void }} props
 */
function LangTabs({ value, onChange }) {
  const tabs = /** @type {const} */ (['ka', 'en']);
  /** @param {import('react').KeyboardEvent} event */
  function onKeyDown(event) {
    const index = tabs.indexOf(value);
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = tabs[(index + 1) % 2];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs[1];
    if (!next) return;
    event.preventDefault();
    onChange(next);
    document.getElementById(`editor-lang-tab-${next}`)?.focus();
  }
  return (
    <div
      role="tablist"
      aria-label={ta('editor.lang.tabsLabel')}
      className="mc-tabs mc-editor__lang"
    >
      {tabs.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`editor-lang-tab-${id}`}
          aria-selected={value === id}
          aria-controls={`editor-lang-${id}`}
          tabIndex={value === id ? 0 : -1}
          lang={id === 'en' ? 'en' : undefined}
          className="mc-tabs__tab"
          onClick={() => onChange(id)}
          onKeyDown={onKeyDown}
        >
          {ta(`editor.lang.${id}`)}
        </button>
      ))}
    </div>
  );
}
