import { useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import {
  Button,
  Checkbox,
  ContentState,
  LiveRegion,
  SkeletonGroup,
} from '@/components/ui/index.js';
import { useContent } from '@/hooks/useContent.js';
import { formatFileSize } from '@/i18n/index.js';

import { media } from '../api/adminAdapter.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';

/**
 * დოკუმენტები (`/admin/documents`): PDF-ები სათაურით, ზომით, ენით და tagged-ის (PDF/UA)
 * დადასტურებით; დაუდასტურებელი — ჩეკლისტის გაფრთხილება სერიაზე.
 */
export default function DocumentsPage() {
  const list = useContent(() => media.list({ kind: 'document' }), []);
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState(
    /** @type {import('../api/adminAdapter.js').MediaItem | null} */ (null),
  );
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const captionId = useId();

  return (
    <div className="mc-library">
      <div className="mc-admin-panel mc-library__upload">
        <p className="mc-hint">{ta('documents.hint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await media.upload(file, { title: file.name });
            setStatus(ta('library.uploaded', { name: file.name }));
            list.reload();
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          icon="document"
          onClick={() => inputRef.current?.click()}
        >
          {ta('documents.upload')}
        </Button>
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
                          await media.update(doc.id, { tagged: event.target.checked });
                          setStatus(
                            ta(event.target.checked ? 'documents.taggedOn' : 'documents.taggedOff'),
                          );
                          list.reload();
                        }}
                      />
                    </td>
                    <td>
                      {doc.usage.length
                        ? doc.usage.map((u) => (
                            <Link
                              key={u.id}
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
                            ? ta('library.inUse', { count: doc.usage.length })
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
        onConfirm={async () => {
          if (!removing) return;
          await media.remove(removing.id);
          setRemoving(null);
          setStatus(ta('library.removed'));
          list.reload();
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
