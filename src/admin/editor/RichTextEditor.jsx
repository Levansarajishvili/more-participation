import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button, TextField } from '@/components/ui/index.js';
import { FieldError, FieldHint } from '@/components/ui/fields/Field.jsx';
import { describedBy } from '@/components/ui/fields/field-utils.js';

import Dialog from '../components/Dialog.jsx';
import { ta } from '../i18n/index.js';

import { EDITOR_EXTENSIONS } from './extensions.js';
import { sameValue } from './path.js';
import { blocksToDoc, docToBlocks } from './serialize.js';

/**
 * ტექსტის რედაქტორი (TipTap, ცალკე lazy chunk): სქემა მოდელის ბლოკებით შეზღუდულია
 * (extensions.js), შედეგი — ბლოკები (serialize.js), HTML არა.
 *
 * - შემცველი: `role="textbox"` + `aria-multiline`, სახელი — ხილული ლეიბლი, აღწერა — მინიშნება /
 *   შეცდომა; ხაზის სიგრძე 68ch (როგორც საიტზე წაიკითხება).
 * - ხელსაწყოები: `role="toolbar"`, roving tabindex (← → Home End), აქტიურ ფორმატზე `aria-pressed`;
 *   Ctrl/⌘+B — მუქი (TipTap-ის მალსახმობი); დაფის „B“ → „მუქი“ (label-in-name).
 * - ბმული და ფოტო — დიალოგით (ბმულის ტექსტი, alt სავალდებულოა — ჩეკლისტი ამოწმებს).
 *
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {import('react').ReactNode} [props.hint]
 * @param {string | null} [props.error]
 * @param {import('@/content/model.js').Block[]} props.value
 * @param {(blocks: import('@/content/model.js').Block[]) => void} props.onChange
 * @param {() => void} [props.onBlur]
 * @param {(file: File) => Promise<string | null>} props.onUpload
 * @param {boolean} [props.required]
 */
export default function RichTextEditor({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  onBlur,
  onUpload,
  required,
  lang = 'ka',
}) {
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const lastEmitted = useRef(value);
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: blocksToDoc(value),
    immediatelyRender: true,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        ...(describedBy(hint && hintId, error && errorId) && {
          'aria-describedby': /** @type {string} */ (describedBy(hint && hintId, error && errorId)),
        }),
        ...(error && { 'aria-invalid': 'true' }),
        ...(required && { 'aria-required': 'true' }),
        class: 'mc-rte__content mc-prose',
        spellcheck: 'true',
        lang,
      },
    },
    onUpdate: ({ editor: instance }) => {
      const blocks = docToBlocks(/** @type {any} */ (instance.getJSON()));
      lastEmitted.current = blocks;
      onChange(blocks);
    },
    onBlur: () => onBlur?.(),
  });

  // გარედან შეცვლილი მნიშვნელობა (ვერსიის აღდგენა, კონფლიქტი) რედაქტორში აისახება
  useEffect(() => {
    if (!editor || sameValue(value, lastEmitted.current)) return;
    lastEmitted.current = value;
    editor.commands.setContent(blocksToDoc(value), { emitUpdate: false });
  }, [editor, value]);

  // aria-invalid / describedby შეცდომის ცვლილებისას (view-ი mount-ის შემდეგ ჩნდება)
  useEffect(() => {
    if (!editor) return undefined;
    const apply = () => {
      /** @type {HTMLElement} */
      let dom;
      try {
        dom = editor.view.dom;
      } catch {
        return;
      }
      const desc = describedBy(hint && hintId, error && errorId);
      if (desc) dom.setAttribute('aria-describedby', desc);
      else dom.removeAttribute('aria-describedby');
      if (error) dom.setAttribute('aria-invalid', 'true');
      else dom.removeAttribute('aria-invalid');
    };
    apply();
    editor.on('create', apply);
    return () => {
      editor.off('create', apply);
    };
  }, [editor, error, hint, hintId, errorId]);

  return (
    <div className="mc-field mc-rte">
      <span id={labelId} className="mc-label">
        {label} {required && <span className="mc-label__optional">({ta('editor.required')})</span>}
      </span>
      {editor && <Toolbar editor={editor} controls={id} onUpload={onUpload} />}
      <EditorContent editor={editor} className="mc-rte__frame" />
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

/**
 * @param {{ editor: import('@tiptap/react').Editor, controls: string, onUpload: (file: File) => Promise<string | null> }} props
 */
function Toolbar({ editor, controls, onUpload }) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [dialog, setDialog] = useState(/** @type {'link' | 'image' | null} */ (null));
  const refs = useRef(/** @type {(HTMLButtonElement | null)[]} */ ([]));
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      link: e.isActive('link'),
      blockquote: e.isActive('blockquote'),
    }),
  });

  const tools = [
    { id: 'h2', text: 'H2', run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: 'h3', text: 'H3', run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: 'bold', run: () => editor.chain().focus().toggleBold().run(), keys: 'Control+B Meta+B' },
    { id: 'bulletList', run: () => editor.chain().focus().toggleBulletList().run() },
    { id: 'orderedList', run: () => editor.chain().focus().toggleOrderedList().run() },
    { id: 'link', run: () => setDialog('link') },
    { id: 'blockquote', run: () => editor.chain().focus().toggleBlockquote().run() },
    { id: 'image', run: () => setDialog('image'), toggle: false },
  ];

  /** @param {import('react').KeyboardEvent} event */
  function onKeyDown(event) {
    /** @type {number | null} */
    let next = null;
    if (event.key === 'ArrowRight') next = (focusIndex + 1) % tools.length;
    else if (event.key === 'ArrowLeft') next = (focusIndex - 1 + tools.length) % tools.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tools.length - 1;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label={ta('editor.toolbar')}
        aria-controls={controls}
        className="mc-rte__toolbar"
        onKeyDown={onKeyDown}
      >
        {tools.map((tool, i) => (
          <button
            key={tool.id}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            className={`mc-rte__tool mc-rte__tool--${tool.id}`}
            tabIndex={i === focusIndex ? 0 : -1}
            aria-pressed={
              tool.toggle === false ? undefined : Boolean(/** @type {any} */ (active)[tool.id])
            }
            aria-keyshortcuts={tool.keys}
            onFocus={() => setFocusIndex(i)}
            onClick={tool.run}
          >
            {tool.text ? (
              <>
                <span className="sr-only">{ta('editor.tools.heading')} </span>
                {tool.text}
              </>
            ) : (
              ta(`editor.tools.${tool.id}`)
            )}
          </button>
        ))}
      </div>
      <LinkDialog editor={editor} open={dialog === 'link'} onClose={() => setDialog(null)} />
      <ImageDialog
        editor={editor}
        open={dialog === 'image'}
        onClose={() => setDialog(null)}
        onUpload={onUpload}
      />
    </>
  );
}

/** @param {{ editor: import('@tiptap/react').Editor, open: boolean, onClose: () => void }} props */
function LinkDialog({ editor, open, onClose }) {
  const [href, setHref] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [wasOpen, setWasOpen] = useState(false);
  const hrefRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const hasSelection = !editor.state.selection.empty;
  if (open && !wasOpen) {
    setWasOpen(true);
    setHref(editor.getAttributes('link').href ?? '');
    setText('');
    setError('');
  }
  if (!open && wasOpen) setWasOpen(false);

  function apply() {
    const value = href.trim();
    if (!value) {
      setError(ta('editor.link.hrefRequired'));
      hrefRef.current?.focus();
      return;
    }
    const chain = editor.chain().focus();
    if (hasSelection || editor.isActive('link')) {
      chain.extendMarkRange('link').setLink({ href: value }).run();
    } else {
      chain
        .insertContent({
          type: 'text',
          text: text.trim() || value,
          marks: [{ type: 'link', attrs: { href: value } }],
        })
        .run();
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={ta('editor.link.title')}
      description={ta('editor.link.text')}
      initialFocus={hrefRef}
      actions={
        <>
          <Button variant="primary" size="sm" onClick={apply}>
            {ta('editor.link.apply')}
          </Button>
          {editor.isActive('link') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                onClose();
              }}
            >
              {ta('editor.link.remove')}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            {ta('editor.cancel')}
          </Button>
        </>
      }
    >
      <div className="mc-dialog__fields">
        <TextField
          ref={hrefRef}
          label={ta('editor.link.href')}
          hint={ta('editor.link.hrefHint')}
          value={href}
          required
          error={error || null}
          onChange={(event) => setHref(event.target.value)}
        />
        {!hasSelection && !editor.isActive('link') && (
          <TextField
            label={ta('editor.link.label')}
            hint={ta('editor.link.labelHint')}
            value={text}
            required
            onChange={(event) => setText(event.target.value)}
          />
        )}
      </div>
    </Dialog>
  );
}

/**
 * @param {{ editor: import('@tiptap/react').Editor, open: boolean, onClose: () => void, onUpload: (file: File) => Promise<string | null> }} props
 */
function ImageDialog({ editor, open, onClose, onUpload }) {
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [errors, setErrors] = useState(/** @type {{ file?: string, alt?: string }} */ ({}));
  const [busy, setBusy] = useState(false);
  const fileId = useId();
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  async function apply() {
    const next = {
      ...(!file && { file: ta('editor.image.fileRequired') }),
      ...(!alt.trim() && { alt: ta('editor.image.altRequired') }),
    };
    setErrors(next);
    if (next.file || next.alt) return;
    setBusy(true);
    try {
      const src = await onUpload(/** @type {File} */ (file));
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: { src, alt: alt.trim(), ratio: '3:2', caption: caption.trim() || null },
        })
        .run();
      setFile(null);
      setAlt('');
      setCaption('');
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={ta('editor.image.title')}
      initialFocus={fileRef}
      actions={
        <>
          <Button variant="primary" size="sm" loading={busy} onClick={apply}>
            {ta('editor.image.apply')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {ta('editor.cancel')}
          </Button>
        </>
      }
    >
      <div className="mc-dialog__fields">
        <div className="mc-field">
          <label htmlFor={fileId} className="mc-label">
            {ta('editor.image.file')}{' '}
            <span className="mc-label__optional">({ta('editor.required')})</span>
          </label>
          <input
            ref={fileRef}
            id={fileId}
            type="file"
            accept="image/*"
            className="mc-file-input"
            aria-invalid={errors.file ? true : undefined}
            aria-describedby={errors.file ? `${fileId}-error` : undefined}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {errors.file && <FieldError id={`${fileId}-error`}>{errors.file}</FieldError>}
        </div>
        <TextField
          label={ta('editor.image.alt')}
          hint={ta('editor.altHint')}
          value={alt}
          required
          error={errors.alt ?? null}
          onChange={(event) => setAlt(event.target.value)}
        />
        <TextField
          label={ta('editor.image.caption')}
          optional
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
