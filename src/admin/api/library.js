import { ContentError } from '@/content/errors.js';
import { formatFileSize } from '@/i18n/index.js';

import { CONTENT_TYPES } from '../content-types.js';
import { getIn, setIn } from '../editor/path.js';
import { ta } from '../i18n/index.js';

/**
 * მედიის ბიბლიოთეკა (B5) — ერთი წესი ადმინის mock-სა (`mock.js`) და სერვერზე (`server/routes/media.js`).
 *
 * ფოტო მასალაში ჩადგმული ობიექტია (`{ src, alt, ratio }`, B2): ავტორიტეტული alt მასალაშია, ფაილის
 * ჩანაწერი (`FileRecord` — mock: `up:001`, სერვერი: `m-…`, `media` კოლექცია) კი რეესტრია. ბიბლიოთეკაში:
 *
 * - **ფაილი** — თითო ბარათი ატვირთულ ფაილზე; გამოყენება = ყველა ობიექტი, რომლის `src` ფაილის
 *   მისამართია (გამოქვეყნებული ვერსია + სამუშაო ასლი). alt: თუ რომელიმე გამოყენებას alt აკლია → ''
 *   („ხარვეზი“), სხვაგვარად პირველი გამოყენებისა; გამოუყენებელზე — ატვირთვისას მიცემული. alt-ის
 *   შეცვლა ყველა გამოყენებაში აისახება.
 * - **ჩადგმული ფოტო / PDF**, რომლის `src` რეესტრში არ არის (seed — `src: null`, გარე მისამართი) —
 *   ბარათი თითო გამოყენებაზე, id `img:<მასალა>:<ველი>` / `doc:<მასალა>:<ველი>` (F8-ის ფორმატი).
 *
 * VTT (`track`) ბიბლიოთეკაში არ ჩანს (F10), მაგრამ გამოყენება და წაშლის ბლოკი მასზეც მოქმედებს.
 */

/** @typedef {import('../content-types.js').ContentType} ContentType */
/** @typedef {import('./adminAdapter.js').MediaItem} MediaItem */
/** @typedef {MediaItem['usage'][number]} MediaUsage */

/**
 * @typedef {object} FileRecord
 * @property {string} id
 * @property {'image' | 'document' | 'track'} kind
 * @property {string} src            mock — blob-ის მისამართი; სერვერი — `/media/<key>`
 * @property {number | null} size
 * @property {string} title          დოკუმენტის სათაური / ფაილის სახელი
 * @property {string} alt            ფოტო: ატვირთვისას მიცემული (შემოთავაზება)
 * @property {import('@/content/model.js').Ratio | null} ratio
 * @property {'ka' | 'en' | null} lang
 * @property {boolean | null} tagged
 * @property {number | null} [cues]  VTT: სუბტიტრების რაოდენობა (სერვერის `parseCaptions`)
 * @property {number | null} [end]   VTT: ბოლო cue-ს დასასრული, წმ
 */

/**
 * @typedef {object} LibraryRecord
 * @property {string} id
 * @property {Record<string, any>} item
 * @property {{ item: Record<string, any> } | null} [working]
 */

/** @typedef {Partial<Record<ContentType, LibraryRecord[]>>} RecordsByType */

/** @typedef {'image' | 'document' | 'track' | 'other'} NodeKind */

/**
 * ფაილის კვანძის სახე: alt-იანი — ფოტო; `pdf` / `tagged`-იანი — დოკუმენტი; `captions[]` / `srclang`
 * — სუბტიტრი; სხვა (აუდიო) — `other`.
 * @param {string} path
 * @param {Record<string, any>} node
 * @returns {NodeKind}
 */
export function nodeKind(path, node) {
  if ('alt' in node) return 'image';
  if (path === 'pdf' || path.endsWith('.pdf') || 'tagged' in node) return 'document';
  if (path.startsWith('captions[') || 'srclang' in node) return 'track';
  return 'other';
}

/**
 * მასალის ყველა ფაილის კვანძი — ობიექტი `src`-ით (სტრიქონი ან null), ველის გზით (`cover`,
 * `body[2].image`, `team[0].photo`, `captions[1]`, `pdf`). `translations` არ შედის (მხოლოდ ტექსტია).
 * @param {unknown} item
 * @returns {{ path: string, node: Record<string, any>, kind: NodeKind }[]}
 */
export function fileNodes(item) {
  /** @type {{ path: string, node: Record<string, any>, kind: NodeKind }[]} */
  const out = [];
  /** @param {unknown} value @param {string} path */
  const walk = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((entry, i) => walk(entry, `${path}[${i}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    const node = /** @type {Record<string, any>} */ (value);
    if (path && 'src' in node && (typeof node.src === 'string' || node.src === null)) {
      out.push({ path, node, kind: nodeKind(path, node) });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (!path && key === 'translations') continue;
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(item, '');
  return out;
}

/** @param {Record<string, any>} item */
export const recordTitle = (item) => String(item?.title ?? item?.name ?? '');

/**
 * @param {string} id
 * @returns {{ kind: 'image' | 'document', recordId: string, path: string } | null}
 */
export function parseEmbeddedId(id) {
  const match = /^(img|doc):([^:]+):(.+)$/.exec(String(id));
  if (!match) return null;
  return { kind: match[1] === 'img' ? 'image' : 'document', recordId: match[2], path: match[3] };
}

/**
 * @param {ContentType} type
 * @param {LibraryRecord} record
 * @param {string} title
 * @param {string} path
 * @param {Record<string, any>} node
 * @param {'image' | 'document'} kind
 * @returns {MediaItem}
 */
function embeddedItem(type, record, title, path, node, kind) {
  const usage = [{ type, id: record.id, title, field: path }];
  if (kind === 'image') {
    return {
      id: `img:${record.id}:${path}`,
      kind,
      src: node.src ?? null,
      alt: String(node.alt ?? ''),
      title: String(node.credit ?? ''),
      ratio: node.ratio ?? null,
      size: null,
      lang: null,
      tagged: null,
      usage,
    };
  }
  return {
    id: `doc:${record.id}:${path}`,
    kind,
    src: node.src ?? null,
    alt: '',
    title: String(node.label ?? ''),
    ratio: null,
    size: node.size ?? null,
    lang: node.lang ?? 'ka',
    tagged: node.tagged ?? false,
    usage,
  };
}

/**
 * @typedef {object} FileState
 * @property {FileRecord} file
 * @property {MediaUsage[]} usage
 * @property {string[]} alts                 ფოტოს გამოყენებების alt-ები
 * @property {Record<string, any> | null} doc  პირველი გამოქვეყნებული PDF-ის კვანძი
 */

/**
 * @param {RecordsByType} recordsByType
 * @param {readonly FileRecord[]} files
 * @returns {{ embedded: MediaItem[], states: Map<string, FileState> }}
 */
function collect(recordsByType, files) {
  /** @type {Map<string, FileState>} */
  const states = new Map();
  /** @type {Map<string, FileState>} */
  const bySrc = new Map();
  for (const file of files) {
    const state = { file, usage: [], alts: [], doc: null };
    states.set(file.id, state);
    if (file.src) bySrc.set(file.src, state);
  }
  /** @type {MediaItem[]} */
  const embedded = [];
  for (const type of CONTENT_TYPES) {
    for (const record of recordsByType[type] ?? []) {
      const title = recordTitle(record.item);
      /** @type {Set<string>} */
      const seen = new Set();
      /** @param {Record<string, any>} item @param {boolean} live */
      const visit = (item, live) => {
        for (const { path, node, kind } of fileNodes(item)) {
          const state = typeof node.src === 'string' ? bySrc.get(node.src) : undefined;
          if (state) {
            const key = `${state.file.id}|${path}`;
            if (!seen.has(key)) {
              seen.add(key);
              state.usage.push({ type, id: record.id, title, field: path });
            }
            if (kind === 'image') state.alts.push(String(node.alt ?? ''));
            if (kind === 'document' && live && !state.doc) state.doc = node;
          } else if (live && (kind === 'image' || kind === 'document')) {
            embedded.push(embeddedItem(type, record, title, path, node, kind));
          }
        }
      };
      visit(record.item, true);
      if (record.working?.item) visit(record.working.item, false);
    }
  }
  return { embedded, states };
}

/**
 * @param {FileState} state
 * @returns {MediaItem}
 */
function fileItem({ file, usage, alts, doc }) {
  const isDoc = file.kind === 'document';
  const alt = alts.length ? (alts.some((a) => !a.trim()) ? '' : alts[0]) : (file.alt ?? '');
  return {
    id: file.id,
    kind: /** @type {any} */ (file.kind),
    src: file.src,
    alt: file.kind === 'image' ? alt : '',
    title: isDoc ? String(doc?.label || file.title || '') : String(file.title ?? ''),
    ratio: file.kind === 'image' ? (file.ratio ?? null) : null,
    size: file.size ?? null,
    lang: isDoc ? (doc?.lang ?? file.lang ?? 'ka') : null,
    tagged: isDoc ? Boolean(doc?.tagged ?? file.tagged ?? false) : null,
    usage,
  };
}

/**
 * ბიბლიოთეკა: ჯერ ჩადგმული (ტიპის, მასალის და ველის რიგით), მერე ფაილები (ატვირთვის რიგით).
 * VTT არ ჩანს.
 * @param {RecordsByType} recordsByType
 * @param {readonly FileRecord[]} [files]
 * @returns {MediaItem[]}
 */
export function buildLibrary(recordsByType, files = []) {
  const { embedded, states } = collect(recordsByType, files);
  return [
    ...embedded,
    ...[...states.values()].filter((s) => s.file.kind !== 'track').map(fileItem),
  ];
}

/**
 * ერთი ჩანაწერი id-ით (VTT-ის ჩათვლით) — `usage`, `remove`, `update`.
 * @param {RecordsByType} recordsByType
 * @param {readonly FileRecord[]} files
 * @param {string} id
 * @returns {MediaItem}
 */
export function findMediaItem(recordsByType, files, id) {
  const { embedded, states } = collect(recordsByType, files);
  const state = states.get(id);
  const found = state ? fileItem(state) : embedded.find((m) => m.id === id);
  if (!found) throw new ContentError('not-found', { detail: `media/${id}` });
  return found;
}

/**
 * @param {MediaItem[]} items
 * @param {{ kind?: 'image' | 'document' | null, missingAlt?: boolean | null }} [params]
 */
export function filterLibrary(items, { kind, missingAlt } = {}) {
  let out = items;
  if (kind) out = out.filter((m) => m.kind === kind);
  if (missingAlt) out = out.filter((m) => m.kind === 'image' && !m.alt.trim());
  return out;
}

/** დაფის მრიცხველი (`stats.library`). @param {MediaItem[]} items */
export function libraryCounts(items) {
  return {
    images: items.filter((m) => m.kind === 'image').length,
    documents: items.filter((m) => m.kind === 'document').length,
  };
}

/** რამდენ მასალაში გამოიყენება („N მასალაში“ — ველები არა). @param {MediaUsage[]} usage */
export const usageCount = (usage) => new Set(usage.map((u) => u.id)).size;

/* ─── ცვლილება ──────────────────────────────────────────────────────────── */

/**
 * @typedef {object} MediaPatch
 * @property {string} [alt]
 * @property {string} [title]
 * @property {'ka' | 'en'} [lang]
 * @property {boolean} [tagged]
 */

/**
 * კვანძის ცვლილება ფაილის სახის მიხედვით (ფოტო — alt; დოკუმენტი — სათაური / ენა / tagged);
 * სხვა ველი იგნორდება (F8-ის mock-ის წესი).
 * @param {Record<string, any>} node
 * @param {'image' | 'document' | 'track'} kind
 * @param {MediaPatch} patch
 * @returns {Record<string, any>}
 */
export function patchNode(node, kind, patch) {
  if (kind === 'image') return patch.alt === undefined ? node : { ...node, alt: patch.alt };
  if (kind === 'document') {
    return {
      ...node,
      ...(patch.title !== undefined && { label: patch.title }),
      ...(patch.lang !== undefined && { lang: patch.lang }),
      ...(patch.tagged !== undefined && { tagged: patch.tagged }),
    };
  }
  return node;
}

/**
 * ცვლილების შემოწმება: ფოტოს alt ცარიელი ვერ იქნება (გამოქვეყნებულ მასალაში alt-ის წაშლა
 * ბლოკერს გვერდს აუვლიდა) → `validation` (`fields.alt`).
 * @param {'image' | 'document' | 'track'} kind
 * @param {MediaPatch} patch
 * @returns {MediaPatch}
 */
export function normalizeMediaPatch(kind, patch) {
  /** @type {MediaPatch} */
  const out = { ...patch };
  if (kind === 'image' && out.alt !== undefined) {
    out.alt = String(out.alt).trim();
    if (!out.alt) {
      throw new ContentError('validation', {
        fields: {
          alt: { code: /** @type {any} */ ('required'), message: ta('fieldErrors.required') },
        },
        detail: 'alt',
      });
    }
  }
  if (out.title !== undefined) out.title = String(out.title).trim();
  return out;
}

/**
 * მასალის ცვლილება ბიბლიოთეკიდან: გამოქვეყნებული ვერსია და სამუშაო ასლი ერთად (სამუშაო ასლი
 * რჩება — F8-ის mock მას შლიდა და რედაქტორის ავტოშენახული ცვლილება იკარგებოდა).
 *
 * - ჩადგმული (`img:` / `doc:`) — მხოლოდ ეს ველი; სამუშაო ასლში — თუ იმავე ველში იგივე ფაილია;
 * - ფაილი — ყველა კვანძი, რომლის `src` ფაილის მისამართია.
 *
 * @param {Record<string, any>} item
 * @param {Record<string, any> | null} working
 * @param {{ path?: string, src?: string | null, kind: 'image' | 'document' | 'track' }} target
 * @param {MediaPatch} patch
 * @returns {{ item: Record<string, any> | null, working: Record<string, any> | null }}
 *   null — უცვლელია
 */
export function patchRecord(item, working, target, patch) {
  /**
   * @param {Record<string, any> | null} source
   * @param {boolean} live
   */
  const apply = (source, live) => {
    if (!source) return null;
    let next = source;
    let changed = false;
    if (target.path !== undefined) {
      const node = getIn(source, target.path);
      const liveSrc = getIn(item, target.path)?.src;
      if (node && typeof node === 'object' && (live || node.src === liveSrc)) {
        const patched = patchNode(node, target.kind, patch);
        if (patched !== node) {
          next = setIn(next, target.path, patched);
          changed = JSON.stringify(patched) !== JSON.stringify(node);
        }
      }
    } else {
      for (const { path, node, kind } of fileNodes(source)) {
        if (node.src !== target.src || typeof node.src !== 'string') continue;
        const patched = patchNode(node, kind === 'other' ? target.kind : kind, patch);
        if (JSON.stringify(patched) !== JSON.stringify(node)) {
          next = setIn(next, path, patched);
          changed = true;
        }
      }
    }
    return changed ? next : null;
  };
  return { item: apply(item, true), working: apply(working, false) };
}

/* ─── შეცდომები ────────────────────────────────────────────────────────── */

/**
 * ფაილის ველის შეცდომა (`fields.file`) — ტექსტი ადმინის ლექსიკონიდან.
 * @param {string} code  `fileType`, `fileTooLarge`… ან `vttTiming` (სტრიქონის ნომრით)
 * @param {{ max?: number, line?: number, megapixels?: number }} [vars]
 * @returns {{ code: string, message: string }}
 */
export function fileFieldError(code, vars = {}) {
  if (code.startsWith('vtt')) {
    const key = code.slice(3, 4).toLowerCase() + code.slice(4);
    return { code, message: ta(`editor.captions.errors.${key}`, { line: vars.line ?? 1 }) };
  }
  /** @type {Record<string, string | number>} */
  const values = {};
  if (vars.max !== undefined) values.max = formatFileSize(vars.max);
  if (vars.megapixels !== undefined) values.max = vars.megapixels;
  return { code, message: ta(`fieldErrors.${code}`, values) };
}

/**
 * ფაილის შეცდომა → 400 `bad-request` + `fields.file` (B5: ფაილის ტიპი / ზომა / შიგთავსი;
 * მეტა-ველის შეცდომა — 422). `http.js` ორივეს `validation`-ად კითხულობს — UI ველთან აჩვენებს.
 * @param {string} code
 * @param {{ max?: number, line?: number, megapixels?: number }} [vars]
 */
export function fileError(code, vars) {
  const field = fileFieldError(code, vars);
  return new ContentError('bad-request', {
    fields: { file: /** @type {any} */ (field) },
    message: field.message,
    detail: `file: ${code}`,
  });
}

/**
 * გამოყენებული ფაილის წაშლა → 409 `conflict`, ტექსტით „გამოიყენება N მასალაში“.
 * @param {MediaUsage[] | number} usage  გამოყენებები ან მასალების რაოდენობა
 */
export function inUseError(usage) {
  const count = typeof usage === 'number' ? usage : usageCount(usage);
  return new ContentError('conflict', {
    message: ta('library.inUse', { count }),
    detail: `media in use: ${count}`,
  });
}
