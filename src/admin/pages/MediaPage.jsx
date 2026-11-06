import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import {
  Button,
  ChipGroup,
  ContentState,
  Icon,
  LiveRegion,
  Media,
  SkeletonGroup,
  TextField,
} from '@/components/ui/index.js';
import { FieldError } from '@/components/ui/fields/Field.jsx';
import { acceptFor, checkBlob } from '@/content/files.js';
import { useContent } from '@/hooks/useContent.js';

import { media } from '../api/adminAdapter.js';
import { usageCount } from '../api/library.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { checkMessage, uploadMessage } from '../components/upload-messages.js';
import { typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';

/**
 * მედიის ბიბლიოთეკა (`/admin/media`): ბადე; alt-ის გარეშე ფაილს „ხარვეზის“ ნიშანი აქვს
 * (ხატულა + ტექსტი); alt-ის რედაქტირება ადგილზე (ყველა გამოყენებაში აისახება); ჩანს, სად
 * გამოიყენება ფაილი; წაშლა — დადასტურებით, გამოყენებული ფაილისა — იბლოკება (მიზეზი ხილულია).
 * ატვირთვა ღილაკით ან გადათრევით (2.5.7). ფილტრი URL-შია (`?filter=missing-alt`).
 *
 * B5: ფაილი ჯერ ბრაუზერში მოწმდება (`files.js` — JPG / PNG / WebP, შიგთავსით, ზომა — მხოლოდ UX),
 * სერვერის უარი (`fields.file`) ველთან ჩანს ხატულით და ტექსტით (`role="alert"`); წაშლის 409 →
 * სია ახლდება და ღილაკი მიზეზით ითიშება.
 */
const IMAGE_ACCEPT = acceptFor(['image']);
export default function MediaPage() {
  const [params, setParams] = useSearchParams();
  const missing = params.get('filter') === 'missing-alt';
  const list = useContent(() => media.list({ kind: 'image', missingAlt: missing }), [missing]);
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState(
    /** @type {import('../api/adminAdapter.js').MediaItem | null} */ (null),
  );
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const problemId = useId();

  /** @param {File | undefined} file */
  async function upload(file) {
    if (!file) return;
    setProblem(null);
    const local = checkMessage(
      await checkBlob(file, { kinds: ['image'] }),
      'editor.image.wrongType',
    );
    if (local) {
      setProblem(local);
      return;
    }
    setBusy(true);
    try {
      await media.upload(file);
      setStatus(ta('library.uploaded', { name: file.name }));
      list.reload();
    } catch (error) {
      setProblem(ta('library.uploadFailed', { message: uploadMessage(error) }));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await media.remove(removing.id);
      setStatus(ta('library.removed'));
    } catch (error) {
      // ამასობაში მასალაში ჩაისვა — სიის განახლებით ღილაკი მიზეზით ითიშება
      const code = /** @type {{ code?: string }} */ (error).code;
      setStatus(code === 'conflict' ? ta('library.inUseNow') : uploadMessage(error));
    } finally {
      setRemoving(null);
      list.reload();
    }
  }

  return (
    <div className="mc-library">
      {/* გადათრევა დამატებითი გზაა: ატვირთვა ყოველთვის ღილაკითაც ხდება (2.5.7) */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="mc-admin-panel mc-library__upload"
        data-dragging={dragging || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files?.[0]);
        }}
      >
        <p className="mc-hint">{ta('library.dropHint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          icon="image"
          loading={busy}
          aria-describedby={problem ? problemId : undefined}
          onClick={() => inputRef.current?.click()}
        >
          {ta('library.upload')}
        </Button>
        {problem && (
          <div role="alert" className="mc-library__problem">
            <FieldError id={problemId}>{problem}</FieldError>
          </div>
        )}
        <ChipGroup
          label={ta('library.filter')}
          options={[
            { id: null, label: ta('list.all') },
            { id: 'missing-alt', label: ta('library.missingAlt') },
          ]}
          value={missing ? 'missing-alt' : null}
          onChange={(value) =>
            setParams(value ? { filter: value } : {}, { preventScrollReset: true })
          }
        />
      </div>
      <LiveRegion visible className="mc-admin-list__status">
        {list.status === 'success' ? ta('library.count', { count: list.data?.length ?? 0 }) : ''}
      </LiveRegion>
      <LiveRegion>{status}</LiveRegion>
      <ContentState
        status={list.status}
        error={list.error}
        onRetry={list.reload}
        label={ta('nav.media')}
        skeleton={<SkeletonGroup count={4} variant="card" className="mc-media-grid" />}
        empty={list.data?.length === 0}
        emptyText={ta(missing ? 'library.emptyMissing' : 'library.empty')}
      >
        {() => (
          <ul role="list" className="mc-media-grid">
            {(list.data ?? []).map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onSaved={(text) => {
                  setStatus(text);
                  list.reload();
                }}
                onRemove={() => setRemoving(item)}
              />
            ))}
          </ul>
        )}
      </ContentState>
      <ConfirmDialog
        open={removing !== null}
        title={ta('library.removeTitle')}
        description={ta('library.removeText', { name: removing?.title || removing?.id || '' })}
        confirmLabel={ta('library.remove')}
        cancelLabel={ta('editor.cancel')}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

/**
 * @param {{ item: import('../api/adminAdapter.js').MediaItem, onSaved: (text: string) => void, onRemove: () => void }} props
 */
function MediaCard({ item, onSaved, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [alt, setAlt] = useState(item.alt);
  const [error, setError] = useState('');
  const titleId = useId();
  const altId = useId();
  const usage = item.usage[0];
  // „alt-ის რედაქტირება“ → ფოკუსი ველზე (autoFocus-ის ნაცვლად)
  useEffect(() => {
    if (editing) document.getElementById(altId)?.focus();
  }, [editing, altId]);
  const name = usage
    ? `${usage.title} — ${ta(`library.fields.${usage.field.split('[')[0]}`)}`
    : item.title || item.id;
  const missing = !item.alt.trim();

  return (
    <li className="mc-media-card mc-admin-panel" aria-labelledby={titleId}>
      <Media
        image={{ src: item.src, alt: item.alt || ta('library.noAlt'), ratio: item.ratio ?? '3:2' }}
        ratio={item.ratio ?? '3:2'}
        kind="photo"
        compact
        decorative
      />
      <h2 id={titleId} className="mc-media-card__title">
        {name}
      </h2>
      {missing ? (
        <p className="mc-issue">
          <Icon name="alert" size="1.125rem" />
          <span>{ta('library.issue')}</span>
        </p>
      ) : (
        <p className="mc-media-card__alt">
          <span className="mc-admin-table__meta">{ta('library.altLabel')}</span> {item.alt}
        </p>
      )}
      {item.usage.length > 0 && (
        <p className="mc-admin-table__meta">
          {ta('library.usedIn')}{' '}
          {item.usage.map((u) => (
            <Link
              key={`${u.id}-${u.field}`}
              to={`/admin/${u.type}/${u.id}`}
              className="mc-admin-link"
            >
              {u.title} ({typeLabel(u.type, 'one')})
            </Link>
          ))}
        </p>
      )}
      {editing ? (
        <form
          className="mc-media-card__form"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (!alt.trim()) {
              setError(ta('editor.image.altRequired'));
              return;
            }
            try {
              await media.updateAlt(item.id, alt.trim());
            } catch (failure) {
              setError(uploadMessage(failure));
              return;
            }
            setError('');
            setEditing(false);
            onSaved(ta('library.altSaved'));
          }}
        >
          <TextField
            label={ta('editor.image.alt')}
            hint={ta('editor.altHint')}
            value={alt}
            required
            id={altId}
            error={error || null}
            onChange={(event) => setAlt(event.target.value)}
          />
          <span className="mc-admin-table__actions">
            <Button type="submit" variant="primary" size="sm">
              {ta('library.save')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              {ta('editor.cancel')}
            </Button>
          </span>
        </form>
      ) : (
        <span className="mc-admin-table__actions">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {ta('library.editAlt')}
            <span className="sr-only">: {name}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={item.usage.length > 0}
            disabledReason={
              item.usage.length > 0
                ? ta('library.inUse', { count: usageCount(item.usage) })
                : undefined
            }
            onClick={onRemove}
          >
            {ta('library.remove')}
            <span className="sr-only">: {name}</span>
          </Button>
        </span>
      )}
    </li>
  );
}
