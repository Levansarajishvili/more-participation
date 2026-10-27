/**
 * ტექსტის რედაქტორის JSON (TipTap / ProseMirror) ↔ მოდელის ბლოკები (`model.js` → Block). HTML
 * არსად ინახება (§10). რედაქტორის სქემა მოდელის ბლოკებით შეზღუდულია:
 * paragraph · heading 2/3 · bulletList / orderedList · blockquote (cite) · image (alt, ratio,
 * caption) · linkCard (ბმული-ბლოკი); inline — bold, link, lang (`lang="en"` ფრაგმენტი).
 * H1, კურსივი, ხაზგასმა და ფერი არ არსებობს.
 */

/** @typedef {import('@/content/model.js').Block} Block */
/** @typedef {import('@/content/model.js').Inline} Inline */
/** @typedef {{ type: string, attrs?: Record<string, any>, content?: PMNode[], text?: string, marks?: { type: string, attrs?: Record<string, any> }[] }} PMNode */

/** @param {Inline[]} runs @returns {PMNode[]} */
function inlineToPM(runs = []) {
  return runs
    .filter((run) => run.text)
    .map((run) => {
      const marks = [];
      if (run.type === 'text' && run.strong) marks.push({ type: 'bold' });
      if (run.type === 'link') marks.push({ type: 'link', attrs: { href: run.href } });
      if (run.lang) marks.push({ type: 'lang', attrs: { lang: run.lang } });
      return { type: 'text', text: run.text, ...(marks.length && { marks }) };
    });
}

/** @param {string} text @returns {PMNode[]} */
const plain = (text) => (text ? [{ type: 'text', text }] : []);

/**
 * @param {Block[]} blocks
 * @returns {PMNode}
 */
export function blocksToDoc(blocks = []) {
  /** @type {PMNode[]} */
  const content = blocks.map((block) => {
    switch (block.type) {
      case 'h2':
      case 'h3':
        return {
          type: 'heading',
          attrs: { level: block.type === 'h2' ? 2 : 3 },
          content: plain(block.text),
        };
      case 'list':
        return {
          type: block.ordered ? 'orderedList' : 'bulletList',
          content: block.items.map((runs) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: inlineToPM(runs) }],
          })),
        };
      case 'quote':
        return {
          type: 'blockquote',
          attrs: { cite: block.cite ?? null },
          content: block.text
            .split('\n')
            .map((line) => ({ type: 'paragraph', content: plain(line) })),
        };
      case 'image':
        return {
          type: 'image',
          attrs: {
            src: block.image.src,
            alt: block.image.alt ?? '',
            ratio: block.image.ratio ?? '3:2',
            caption: block.caption ?? null,
          },
        };
      case 'link':
        return {
          type: 'linkCard',
          attrs: { text: block.text, href: block.href, description: block.description ?? null },
        };
      default:
        return { type: 'paragraph', content: inlineToPM(/** @type {any} */ (block).content) };
    }
  });
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

/** @param {PMNode | undefined} node @returns {string} */
function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(textOf).join('');
}

/**
 * მეზობელი ერთნაირი ფრაგმენტების გაერთიანება (`[a][b]` → `[ab]`).
 * @param {Inline[]} runs @returns {Inline[]}
 */
export function mergeRuns(runs) {
  /** @type {Inline[]} */
  const out = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    const same =
      last &&
      last.type === run.type &&
      (last.type === 'link'
        ? /** @type {any} */ (last).href === /** @type {any} */ (run).href
        : Boolean(/** @type {any} */ (last).strong) === Boolean(/** @type {any} */ (run).strong)) &&
      last.lang === run.lang;
    if (same) out[out.length - 1] = { ...last, text: last.text + run.text };
    else out.push({ ...run });
  }
  return out;
}

/** @param {PMNode[]} nodes @returns {Inline[]} */
function pmToInline(nodes = []) {
  /** @type {Inline[]} */
  const runs = [];
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      runs.push({ type: 'text', text: '\n' });
      continue;
    }
    if (node.type !== 'text' || !node.text) continue;
    const marks = node.marks ?? [];
    const link = marks.find((m) => m.type === 'link');
    const lang = marks.find((m) => m.type === 'lang')?.attrs?.lang;
    if (link) {
      runs.push({
        type: 'link',
        text: node.text,
        href: link.attrs?.href ?? '',
        ...(lang && { lang }),
      });
    } else {
      runs.push({
        type: 'text',
        text: node.text,
        ...(marks.some((m) => m.type === 'bold') && { strong: true }),
        ...(lang && { lang }),
      });
    }
  }
  return mergeRuns(runs);
}

/**
 * @param {PMNode} doc
 * @returns {Block[]}
 */
export function docToBlocks(doc) {
  /** @type {Block[]} */
  const blocks = [];
  for (const node of doc?.content ?? []) {
    switch (node.type) {
      case 'heading': {
        const text = textOf(node).trim();
        if (text) blocks.push({ type: node.attrs?.level === 3 ? 'h3' : 'h2', text });
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const items = (node.content ?? [])
          .map((item) => pmToInline((item.content ?? []).flatMap((p) => p.content ?? [])))
          .filter((runs) => runs.length);
        if (items.length)
          blocks.push({ type: 'list', ordered: node.type === 'orderedList', items });
        break;
      }
      case 'blockquote': {
        const text = (node.content ?? []).map(textOf).join('\n').trim();
        if (text)
          blocks.push({ type: 'quote', text, ...(node.attrs?.cite && { cite: node.attrs.cite }) });
        break;
      }
      case 'image':
        blocks.push({
          type: 'image',
          image: {
            src: node.attrs?.src ?? null,
            alt: node.attrs?.alt ?? '',
            ratio: node.attrs?.ratio ?? '3:2',
          },
          ...(node.attrs?.caption && { caption: node.attrs.caption }),
        });
        break;
      case 'linkCard':
        blocks.push({
          type: 'link',
          text: node.attrs?.text ?? '',
          href: node.attrs?.href ?? '',
          ...(node.attrs?.description && { description: node.attrs.description }),
        });
        break;
      default: {
        const content = pmToInline(node.content);
        if (content.some((run) => run.text.trim())) blocks.push({ type: 'p', content });
      }
    }
  }
  return blocks;
}
