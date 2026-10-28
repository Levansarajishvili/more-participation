import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import {
  Button,
  Checkbox,
  LiveRegion,
  Media,
  RadioGroup,
  Select,
  TextArea,
  TextField,
} from '@/components/ui/index.js';
import { FieldError, FieldHint } from '@/components/ui/fields/Field.jsx';
import { slugify } from '@/content/slug.js';
import { options as taxonomyOptions } from '@/content/taxonomy.js';
import { formatFileSize } from '@/i18n/index.js';

import { ta } from '../../i18n/index.js';
import { fromClock, joinTbilisi, splitTbilisi, toClock } from '../datetime.js';
import { fieldId, getIn } from '../path.js';
import { parseVtt } from '../vtt.js';

/** TipTap ცალკე chunk-ია: პარამეტრების / ბიბლიოთეკის ეკრანები მას არ ტვირთავს. */
const RichTextEditor = lazy(() => import('../RichTextEditor.jsx'));

/**
 * სქემის ველი → კომპონენტი (EntityEditor-ის ძრავი). ყველა ველი UI ნაკრების ველებზეა: ლეიბლი
 * ზემოთ, მინიშნება / შეცდომა ქვემოთ, `aria-describedby`; id — `fieldId(path)` (შეცდომების ჯამის
 * ბმული ველზე მიდის). შეცდომა ჩანს მხოლოდ გამოქვეყნების მცდელობის შემდეგ (F6-ის წესი).
 *
 * @typedef {import('../../schemas/index.js').FieldSchema} FieldSchema
 * @typedef {object} FieldContext
 * @property {Record<string, any>} values
 * @property {(path: string, value: unknown) => void} setValue
 * @property {() => void} onBlur                     ავტოშენახვა ველიდან გასვლისას
 * @property {(path: string) => string | null} errorFor
 * @property {(file: File) => Promise<string | null>} upload
 * @property {(slug: string) => Promise<boolean>} checkSlug
 * @property {import('../../content-types.js').ContentType} type
 */

/**
 * @param {{ field: FieldSchema, path?: string, ctx: FieldContext }} props
 */
export default function FieldRenderer({ field, path = field.name, ctx }) {
  const value = getIn(ctx.values, path);
  const id = fieldId(path);
  const error = ctx.errorFor(path);
  const label = ta(field.label);
  const hint = field.hint ? ta(field.hint) : undefined;
  /** @param {unknown} next */
  const set = (next) => ctx.setValue(path, next);
  const common = {
    id,
    label,
    hint,
    error,
    required: field.required,
    optional: !field.required && field.kind !== 'checkbox',
  };

  switch (field.kind) {
    case 'text':
      return (
        <TextField
          {...common}
          type={field.inputType ?? 'text'}
          value={value ?? ''}
          lang={field.lang}
          onChange={(event) => set(event.target.value)}
          onBlur={ctx.onBlur}
        />
      );
    case 'slug':
      return <SlugField field={field} path={path} ctx={ctx} />;
    case 'textarea':
      return <CountedTextArea field={field} path={path} ctx={ctx} />;
    case 'select':
      return (
        <Select
          {...common}
          options={
            field.taxonomy
              ? taxonomyOptions(field.taxonomy, field.ids ?? [])
              : (field.options ?? []).map((o) => ({ id: o.id, label: ta(o.label) }))
          }
          value={value ?? ''}
          onChange={(event) => set(event.target.value)}
          onBlur={ctx.onBlur}
        />
      );
    case 'radio':
      return (
        <RadioGroup
          legend={label}
          name={id}
          hint={hint}
          error={error}
          required={field.required}
          options={
            field.taxonomy
              ? taxonomyOptions(field.taxonomy, field.ids ?? [])
              : (field.options ?? []).map((o) => ({ id: o.id, label: ta(o.label) }))
          }
          value={value ?? ''}
          onChange={(next) => set(next)}
          layout="pills"
          id={id}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          id={id}
          label={label}
          hint={hint}
          checked={Boolean(value)}
          onChange={(event) => set(event.target.checked)}
        />
      );
    case 'richtext':
      return (
        <Suspense fallback={<LiveRegion visible>{ta('editor.loadingEditor')}</LiveRegion>}>
          <RichTextEditor
            id={id}
            lang={field.lang}
            label={label}
            hint={hint}
            error={error}
            required={field.required}
            value={Array.isArray(value) ? value : []}
            onChange={set}
            onBlur={ctx.onBlur}
            onUpload={ctx.upload}
          />
        </Suspense>
      );
    case 'image':
      return <ImageField field={field} path={path} ctx={ctx} />;
    case 'file':
      return <FileField field={field} path={path} ctx={ctx} />;
    case 'datetime':
      return <DateTimeField field={field} path={path} ctx={ctx} />;
    case 'duration':
      return <DurationField field={field} path={path} ctx={ctx} />;
    case 'repeater':
      return <RepeaterField field={field} path={path} ctx={ctx} />;
    default:
      return null;
  }
}

/* ─── slug ─────────────────────────────────────────────────────────────── */

/**
 * მისამართი: სათაურიდან ავტომატურად (ქართული → ლათინური, ეროვნული სისტემა, აპოსტროფების
 * გარეშე); ხელით შეცვლის შემდეგ ავტომატიკა ითიშება. უნიკალურობა მოწმდება (`checkSlug`).
 * @param {{ field: FieldSchema, path: string, ctx: FieldContext }} props
 */
function SlugField({ field, path, ctx }) {
  const value = /** @type {string} */ (getIn(ctx.values, path) ?? '');
  const source = /** @type {string} */ (getIn(ctx.values, field.from ?? 'title') ?? '');
  const [auto, setAuto] = useState(() => !value || value === slugify(source));
  const [taken, setTaken] = useState(false);
  const id = fieldId(path);

  useEffect(() => {
    if (!auto) return;
    const next = slugify(source);
    if (next !== value) ctx.setValue(path, next);
    // ctx.setValue სტაბილურია (EntityEditor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, source]);

  useEffect(() => {
    if (!value) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      ctx
        .checkSlug(value)
        .then((available) => alive && setTaken(!available))
        .catch(() => {});
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const error = ctx.errorFor(path) ?? (taken ? ta('fieldErrors.slugTaken') : null);
  return (
    <div className="mc-slug">
      <TextField
        id={id}
        label={ta(field.label)}
        hint={
          auto
            ? ta('editor.slug.auto', { slug: value || '…' })
            : ta('editor.slug.manual', { slug: value || '…' })
        }
        error={error}
        required={field.required}
        value={value}
        lang="en"
        spellCheck={false}
        autoCapitalize="none"
        onChange={(event) => {
          setAuto(false);
          ctx.setValue(path, event.target.value);
        }}
        onBlur={ctx.onBlur}
      />
      {!auto && (
        <Button variant="link" size="sm" onClick={() => setAuto(true)}>
          {ta('editor.slug.reset')}
        </Button>
      )}
    </div>
  );
}

/* ─── ტექსტი მრიცხველით ───────────────────────────────────────────────── */

/**
 * „[n] / 160“ ხილულია (`aria-hidden`); ეკრანის მკითხველს ცხადდება მხოლოდ ზღვართან — 140-ზე
 * („დარჩა 20 სიმბოლო“) და 160-ზე („ზღვარია“) — ყოველ ასოზე არა.
 * @param {{ field: FieldSchema, path: string, ctx: FieldContext }} props
 */
function CountedTextArea({ field, path, ctx }) {
  const value = /** @type {string} */ (getIn(ctx.values, path) ?? '');
  const max = field.max;
  const length = [...value].length;
  const [announce, setAnnounce] = useState('');
  const previous = useRef(length);
  const id = fieldId(path);

  useEffect(() => {
    const before = previous.current;
    previous.current = length;
    if (!max) return;
    const warnAt = max - 20;
    if (before < max && length >= max) setAnnounce(ta('editor.counter.limit', { max }));
    else if (before < warnAt && length >= warnAt) {
      setAnnounce(ta('editor.counter.left', { left: max - length }));
    }
  }, [length, max]);

  return (
    <div className="mc-counted">
      <TextArea
        id={id}
        lang={field.lang}
        label={ta(field.label)}
        hint={field.hint ? ta(field.hint, { max: max ?? '' }) : undefined}
        error={ctx.errorFor(path)}
        required={field.required}
        optional={!field.required}
        rows={field.rows ?? 3}
        value={value}
        onChange={(event) => ctx.setValue(path, event.target.value)}
        onBlur={ctx.onBlur}
      />
      {max && (
        <p className="mc-counter" data-over={length > max || undefined} aria-hidden="true">
          {length} / {max}
        </p>
      )}
      {max && <LiveRegion>{announce}</LiveRegion>}
    </div>
  );
}

/* ─── ფოტო ─────────────────────────────────────────────────────────────── */

/**
 * ფოტო (3:2, 4:3, 16:9, 1:1): ატვირთვა ღილაკით ან გადათრევით (2.5.7 — გადათრევას ყოველთვის
 * ღილაკი ანაცვლებს), „შეცვლა“, „წაშლა“; alt სავალდებულოა („აღწერე, რა ხდება ფოტოზე“).
 * @param {{ field: FieldSchema, path: string, ctx: FieldContext }} props
 */
function ImageField({ field, path, ctx }) {
  const image = /** @type {import('@/content/model.js').Image | null} */ (
    getIn(ctx.values, path) ?? null
  );
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const id = fieldId(path);
  const ratio = field.ratio ?? '3:2';

  /** @param {File | undefined} file */
  async function take(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus(ta('editor.image.wrongType'));
      return;
    }
    setBusy(true);
    try {
      const src = await ctx.upload(file);
      ctx.setValue(path, { ...(image ?? { alt: '' }), src, ratio });
      setStatus(ta('editor.image.uploaded', { name: file.name }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset id={id} className="mc-fieldset mc-image-field" tabIndex={-1}>
      <legend className="mc-label">
        {ta(field.label)}{' '}
        <span className="mc-label__optional">
          ({ta(field.required ? 'editor.required' : 'editor.optional')}, {ratio})
        </span>
      </legend>
      {/* გადათრევა დამატებითი გზაა: ატვირთვა ყოველთვის ღილაკითაც ხდება (2.5.7) */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="mc-image-field__drop"
        data-dragging={dragging || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files?.[0]);
        }}
      >
        <Media
          image={
            image
              ? { ...image, alt: image.alt || ta('editor.image.placeholder', { ratio }) }
              : { src: null, alt: ta('editor.image.placeholder', { ratio }), ratio }
          }
          ratio={ratio}
          kind="photo"
          decorative
          compact
          className="mc-image-field__preview"
        />
        <div className="mc-image-field__body">
          <p className="mc-hint">{ta('editor.image.dropHint')}</p>
          <div className="mc-image-field__actions">
            <input
              ref={inputRef}
              id={`${id}-file`}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => take(event.target.files?.[0])}
            />
            <Button
              variant="secondary"
              size="sm"
              icon="image"
              loading={busy}
              onClick={() => inputRef.current?.click()}
            >
              {image?.src ? ta('editor.image.replace') : ta('editor.image.upload')}
            </Button>
            {image && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  ctx.setValue(path, field.required ? { src: null, alt: '', ratio } : null);
                  setStatus(ta('editor.image.removed'));
                }}
              >
                {ta('editor.image.remove')}
              </Button>
            )}
          </div>
          <TextField
            id={`${id}-alt`}
            label={ta('editor.image.alt')}
            hint={ta('editor.altHint')}
            error={ctx.errorFor(`${path}.alt`)}
            required={field.required || Boolean(image?.src)}
            value={image?.alt ?? ''}
            onChange={(event) =>
              ctx.setValue(path, { ...(image ?? { src: null, ratio }), alt: event.target.value })
            }
            onBlur={ctx.onBlur}
          />
        </div>
      </div>
      <LiveRegion>{status}</LiveRegion>
    </fieldset>
  );
}

/* ─── ფაილი ────────────────────────────────────────────────────────────── */

/**
 * ფაილი (`accept`): PDF — სათაური, ენა, „PDF/UA დადასტურებულია“; VTT / აუდიო / ვიდეო — ბილიკი.
 * `template` — ატვირთვისას ობიექტის საწყისი ველები; `[0]`-ით დამთავრებული გზა (captions[0]) —
 * წაშლისას მასივი ცარიელდება.
 * @param {{ field: FieldSchema, path: string, ctx: FieldContext }} props
 */
function FileField({ field, path, ctx }) {
  const value = /** @type {Record<string, any> | null} */ (getIn(ctx.values, path) ?? null);
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const id = fieldId(path);
  const isPdf = field.accept?.includes('pdf');
  const arrayPath = path.endsWith('[0]') ? path.slice(0, -3) : null;

  /** @param {File | undefined} file */
  async function take(file) {
    if (!file) return;
    setBusy(true);
    try {
      const src = await ctx.upload(file);
      ctx.setValue(path, {
        ...(field.template ?? {}),
        ...(value ?? {}),
        src,
        ...(isPdf && { label: value?.label || file.name, size: file.size }),
        ...(field.template?.type === undefined && !isPdf && file.type && { type: file.type }),
      });
      setStatus(ta('editor.file.uploaded', { name: file.name }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset id={id} className="mc-fieldset mc-file-field" tabIndex={-1}>
      <legend className="mc-label">
        {ta(field.label)}{' '}
        <span className="mc-label__optional">
          ({ta(field.required ? 'editor.required' : 'editor.optional')})
        </span>
      </legend>
      {field.hint && <FieldHint id={`${id}-hint`}>{ta(field.hint)}</FieldHint>}
      <p className="mc-file-field__state">
        {value?.src
          ? ta('editor.file.attached', {
              name: value.label || value.src,
              size: value.size ? formatFileSize(value.size) : '',
            })
          : ta('editor.file.none')}
      </p>
      <div className="mc-image-field__actions">
        <input
          ref={inputRef}
          type="file"
          accept={field.accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => take(event.target.files?.[0])}
        />
        <Button
          variant="secondary"
          size="sm"
          icon="download"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {value?.src ? ta('editor.file.replace') : ta('editor.file.upload')}
          <span className="sr-only">: {ta(field.label)}</span>
        </Button>
        {value && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              ctx.setValue(arrayPath ?? path, arrayPath ? [] : null);
              setStatus(ta('editor.file.removed'));
            }}
          >
            {ta('editor.file.remove')}
            <span className="sr-only">: {ta(field.label)}</span>
          </Button>
        )}
      </div>
      {isPdf && value && (
        <div className="mc-file-field__meta">
          <TextField
            id={`${id}-label`}
            label={ta('editor.file.title')}
            value={value.label ?? ''}
            required
            onChange={(event) => ctx.setValue(`${path}.label`, event.target.value)}
            onBlur={ctx.onBlur}
          />
          <Select
            id={`${id}-lang`}
            label={ta('editor.file.lang')}
            options={[
              { id: 'ka', label: ta('editor.langs.ka') },
              { id: 'en', label: ta('editor.langs.en') },
            ]}
            value={value.lang ?? 'ka'}
            onChange={(event) => ctx.setValue(`${path}.lang`, event.target.value)}
          />
          <Checkbox
            id={`${id}-tagged`}
            label={ta('editor.file.tagged')}
            hint={ta('editor.file.taggedHint')}
            checked={Boolean(value.tagged)}
            onChange={(event) => ctx.setValue(`${path}.tagged`, event.target.checked)}
          />
        </div>
      )}
      {ctx.errorFor(path) && <FieldError id={`${id}-error`}>{ctx.errorFor(path)}</FieldError>}
      <LiveRegion>{status}</LiveRegion>
    </fieldset>
  );
}

/* ─── თარიღი / დრო / ხანგრძლივობა ────────────────────────────────────── */

/**
 * თარიღი + დრო Asia/Tbilisi-ით (ორი ნატიური ველი; ISO `+04:00`).
 * @param {{ field: FieldSchema, path: string, ctx: FieldContext }} props
 */
export function DateTimeField({ field, path, ctx }) {
  const iso = /** @type {string | null} */ (getIn(ctx.values, path) ?? null);
  const [parts, setParts] = useState(() => splitTbilisi(iso));
  const [lastIso, setLastIso] = useState(iso);
  if (iso !== lastIso) {
    setLastIso(iso);
    const next = splitTbilisi(iso);
    if (iso && (next.date !== parts.date || next.time !== parts.time)) setParts(next);
  }
  const id = fieldId(path);
  const error = ctx.errorFor(path);

  /** @param {{ date?: string, time?: string }} patch */
  function update(patch) {
    const next = { ...parts, ...patch };
    setParts(next);
    const joined = joinTbilisi(next.date, next.time);
    if (joined) ctx.setValue(path, joined);
  }

  return (
    <fieldset
      id={id}
      className="mc-fieldset mc-datetime"
      tabIndex={-1}
      aria-describedby={error ? `${id}-error` : `${id}-hint`}
    >
      <legend className="mc-label">
        {ta(field.label)}{' '}
        <span className="mc-label__optional">
          ({ta(field.required ? 'editor.required' : 'editor.optional')})
        </span>
      </legend>
      <div className="mc-datetime__row">
        <TextField
          id={`${id}-date`}
          type="date"
          label={ta('editor.date')}
          value={parts.date}
          aria-invalid={error ? true : undefined}
          onChange={(event) => update({ date: event.target.value })}
          onBlur={ctx.onBlur}
        />
        <TextField
          id={`${id}-time`}
          type="time"
          label={ta('editor.time')}
          value={parts.time}
          aria-invalid={error ? true : undefined}
          onChange={(event) => update({ time: event.target.value })}
          onBlur={ctx.onBlur}
        />
      </div>
      <FieldHint id={`${id}-hint`}>{ta('editor.timezone')}</FieldHint>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </fieldset>
  );
}

/** @param {{ field: FieldSchema, path: string, ctx: FieldContext }} props */
function DurationField({ field, path, ctx }) {
  const seconds = /** @type {number | undefined} */ (getIn(ctx.values, path));
  const [text, setText] = useState(() => (seconds === undefined ? '' : toClock(seconds)));
  const [invalid, setInvalid] = useState(false);
  return (
    <TextField
      id={fieldId(path)}
      label={ta(field.label)}
      hint={ta('editor.durationHint')}
      error={invalid ? ta('editor.durationInvalid') : ctx.errorFor(path)}
      required={field.required}
      optional={!field.required}
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = fromClock(event.target.value);
        setInvalid(Number.isNaN(parsed) && event.target.value.trim() !== '');
        if (!Number.isNaN(parsed)) ctx.setValue(path, parsed);
      }}
      onBlur={ctx.onBlur}
    />
  );
}

/* ─── repeater ─────────────────────────────────────────────────────────── */

/**
 * სია (სლაიდები, გუნდი, ტრანსკრიპტი…): ყოველი ელემენტი — `<fieldset>` სათაურით; გადალაგება
 * ღილაკებით „ზემოთ / ქვემოთ“ (გადათრევის გარეშე, 2.5.7), ფოკუსი გადატანილ ელემენტს მიჰყვება;
 * ცვლილება `role="status"`-ით ცხადდება. `importVtt` — ტრანსკრიპტის შევსება VTT ფაილიდან.
 * @param {{ field: FieldSchema, path: string, ctx: FieldContext }} props
 */
function RepeaterField({ field, path, ctx }) {
  const items = /** @type {Record<string, any>[]} */ (getIn(ctx.values, path) ?? []);
  const [status, setStatus] = useState('');
  const pendingFocus = useRef(/** @type {{ index: number, action: string } | null} */ (null));
  const listRef = useRef(/** @type {HTMLOListElement | null} */ (null));
  const vttRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const id = fieldId(path);
  const itemLabel = (/** @type {number} */ i) =>
    ta(field.itemLabel ?? 'editor.repeater.item', { n: i + 1 });

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const node = listRef.current?.querySelector(
      `[data-index="${target.index}"] [data-action="${target.action}"]`,
    );
    /** @type {HTMLElement | null} */ (
      node ?? listRef.current?.querySelector(`[data-index="${target.index}"] legend`)
    )?.focus?.();
  });

  /** @param {number} from @param {number} to @param {string} action */
  function move(from, to, action) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    ctx.setValue(path, next);
    // ფოკუსი იმავე ღილაკზე გადატანილ ელემენტში (ზღვარზე ის aria-disabled-ია და ფოკუსს იღებს)
    pendingFocus.current = { index: to, action };
    setStatus(
      ta('editor.repeater.moved', { item: itemLabel(from), position: to + 1, total: next.length }),
    );
  }

  return (
    <fieldset id={id} className="mc-fieldset mc-repeater" tabIndex={-1}>
      <legend className="mc-repeater__title">{ta(field.label)}</legend>
      {field.hint && <p className="mc-hint">{ta(field.hint)}</p>}
      {ctx.errorFor(path) && <FieldError id={`${id}-error`}>{ctx.errorFor(path)}</FieldError>}
      <ol ref={listRef} role="list" className="mc-repeater__list">
        {items.map((item, i) => (
          <li key={i} data-index={i} className="mc-repeater__item">
            <fieldset className="mc-fieldset">
              <legend tabIndex={-1} className="mc-repeater__legend">
                {itemLabel(i)}
                {field.itemTitle && item?.[field.itemTitle] ? `: ${item[field.itemTitle]}` : ''}
              </legend>
              <div className="mc-repeater__fields">
                {(field.fields ?? []).map((sub) => (
                  <FieldRenderer
                    key={sub.name}
                    field={sub}
                    path={`${path}[${i}].${sub.name}`}
                    ctx={ctx}
                  />
                ))}
              </div>
              <div className="mc-repeater__actions">
                <Button
                  variant="secondary"
                  size="sm"
                  data-action="up"
                  disabled={i === 0}
                  disabledReason={i === 0 ? ta('editor.repeater.first') : undefined}
                  onClick={() => move(i, i - 1, 'up')}
                >
                  {ta('editor.repeater.up')}
                  <span className="sr-only">: {itemLabel(i)}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  data-action="down"
                  disabled={i === items.length - 1}
                  disabledReason={i === items.length - 1 ? ta('editor.repeater.last') : undefined}
                  onClick={() => move(i, i + 1, 'down')}
                >
                  {ta('editor.repeater.down')}
                  <span className="sr-only">: {itemLabel(i)}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  data-action="remove"
                  onClick={() => {
                    ctx.setValue(
                      path,
                      items.filter((_, j) => j !== i),
                    );
                    setStatus(ta('editor.repeater.removed', { item: itemLabel(i) }));
                    pendingFocus.current = { index: Math.max(0, i - 1), action: 'remove' };
                  }}
                >
                  {ta('editor.repeater.remove')}
                  <span className="sr-only">: {itemLabel(i)}</span>
                </Button>
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="mc-repeater__add">
        <Button
          variant="secondary"
          size="sm"
          icon="plus"
          onClick={() => {
            const next = [...items, structuredClone(field.newItem?.(items.length) ?? {})];
            ctx.setValue(path, next);
            pendingFocus.current = { index: next.length - 1, action: 'none' };
            setStatus(ta('editor.repeater.added', { item: itemLabel(next.length - 1) }));
          }}
        >
          {ta(field.addLabel ?? 'editor.repeater.add')}
        </Button>
        {field.importVtt && (
          <>
            <input
              ref={vttRef}
              type="file"
              accept=".vtt,text/vtt"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const lines = parseVtt(await file.text());
                ctx.setValue(path, lines);
                setStatus(ta('editor.repeater.imported', { count: lines.length }));
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              icon="transcript"
              onClick={() => vttRef.current?.click()}
            >
              {ta('editor.repeater.importVtt')}
            </Button>
          </>
        )}
      </div>
      <LiveRegion>{status}</LiveRegion>
    </fieldset>
  );
}
