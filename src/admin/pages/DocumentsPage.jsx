import { useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import {
  Button,
  Checkbox,
  ContentState,
  LiveRegion,
  SkeletonGroup,
} from '@/components/ui/index.js';
import { FieldError } from '@/components/ui/fields/Field.jsx';
import { acceptFor, checkBlob } from '@/content/files.js';
import { useContent } from '@/hooks/useContent.js';
import { formatFileSize } from '@/i18n/index.js';

import { media } from '../api/adminAdapter.js';
import { usageCount } from '../api/library.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { checkMessage, uploadMessage } from '../components/upload-messages.js';
import { typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';

/**
 * დოკუმენტები (`/admin/documents`): PDF-ები სათაურით, ზომით, ენით და tagged-ის (PDF/UA)
 * დადასტურებით; დაუდასტურებელი — ჩეკლისტის გაფრთხილება სერიაზე.
 *
 * B5: მხოლოდ PDF (შიგთავსით, `files.js`); სერვერის უარი ხილულია (ხატულა + ტექსტი, `role="alert"`);
 * გამოყენებული ფაილის წაშლა → სია ახლდება.
 */
const PDF_ACCEPT = acceptFor(['document']);

export default function DocumentsPage() {
  const list = useContent(() => media.list({ kind: 'document' }), []);
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState(
    /** @type {import('../api/adminAdapter.js').MediaItem | null} */ (null),
  );
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const captionId = useId();
  const problemId = useId();
  const [problem, setProblem] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);

  /** @param {File | undefined} file */
  async function upload(file) {
    if (!file) return;
    setProblem(null);
    const local = checkMessage(
      await checkBlob(file, { kinds: ['document'] }),
      'documents.wrongType',
    );
    if (local) {
      setProblem(local);
      return;
    }
    setBusy(true);
    try {
      await media.upload(file, { title: file.name });
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
      const code = /** @type {{ code?: string }} */ (error).code;
      setStatus(code === 'conflict' ? ta('library.inUseNow') : uploadMessage(error));
    } finally {
      setRemoving(null);
      list.reload();
    }
  }

  return (
    <div className="mc-library">
      <div className="mc-admin-panel mc-library__upload">
        <p className="mc-hint">{ta('documents.hint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept={PDF_ACCEPT}
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
          icon="document"
          loading={busy}
          aria-describedby={problem ? problemId : undefined}
          onClick={() => inputRef.current?.click()}
        >
          {ta('documents.upload')}
        </Button>
        {problem && (
          <div role="alert" className="mc-library__problem">
            <FieldError id={problemId}>{problem}</FieldError>
          </div>
        )}
      </div>
      <LiveRegion>{status}</LiveRegion>
      <ContentState
        status={list.status}
        error={list.error}
        onRetry={list.reload}
        label={ta('nav.documents')}
        skeleton={<SkeletonGroup count={2} variant="row" />}
        empty={list.data?.length === 0}
        emptyText={ta('documents.empty')}
      >
        {() => (
          <div
            className="mc-table-scroll mc-admin-panel mc-admin-panel--flush"
            role="region"
            tabIndex={0}
            aria-labelledby={captionId}
          >
            <table className="mc-admin-table">
              <caption id={captionId} className="sr-only">
                {ta('documents.caption')}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{ta('documents.colTitle')}</th>
                  <th scope="col">{ta('documents.colSize')}</th>
                  <th scope="col">{ta('documents.colLang')}</th>
                  <th scope="col">{ta('documents.colTagged')}</th>
                  <th scope="col">{ta('documents.colUsage')}</th>
                  <th scope="col">{ta('list.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="mc-admin-table__title">
                        {doc.title || ta('documents.untitled')}
                      </span>
                      {!doc.src && (
                        <span className="mc-admin-table__meta">{ta('documents.pending')}</span>
                      )}
                    </td>
                    <td>{doc.size ? formatFileSize(doc.size) : ta('common.dash')}</td>
                    <td>{ta(`editor.langs.${doc.lang ?? 'ka'}`)}</td>
                    <td>
                      <Checkbox
                        label={ta('documents.tagged', { title: doc.title || doc.id })}
                        checked={Boolean(doc.tagged)}
                        onChange={async (event) => {
                          const tagged = event.target.checked;
                          try {
                            await media.update(doc.id, { tagged });
                            setStatus(ta(tagged ? 'documents.taggedOn' : 'documents.taggedOff'));
                          } catch (error) {
                            setStatus(uploadMessage(error));
                          }
                          list.reload();
                        }}
                      />
                    </td>
                    <td>
                      {doc.usage.length
                        ? doc.usage.map((u) => (
                            <Link
                              key={`${u.id}-${u.field}`}
                              to={`/admin/${u.type}/${u.id}`}
                              className="mc-admin-link"
                            >
                              {u.title} ({typeLabel(u.type, 'one')})
                            </Link>
                          ))
                        : ta('common.dash')}
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={doc.usage.length > 0}
                        disabledReason={
                          doc.usage.length
                            ? ta('library.inUse', { count: usageCount(doc.usage) })
                            : undefined
                        }
                        onClick={() => setRemoving(doc)}
                      >
                        {ta('library.remove')}
                        <span className="sr-only">: {doc.title}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentState>
      <ConfirmDialog
        open={removing !== null}
        title={ta('library.removeTitle')}
        description={ta('library.removeText', { name: removing?.title ?? '' })}
        confirmLabel={ta('library.remove')}
        cancelLabel={ta('editor.cancel')}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
