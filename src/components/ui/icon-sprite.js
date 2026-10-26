import sprite from '@/assets/icons/icons.svg?raw';

/**
 * icons.svg → { [id]: { viewBox, strokeWidth, label, paths: [{ kind, d }] } }.
 * ფაილი ერთადერთი წყაროა: დიზაინერი ხატულას `<symbol>`-ად ამატებს, კოდი მას აქედან კითხულობს.
 *
 * @typedef {'main' | 'accent' | 'dot' | 'fill'} IconPathKind
 * @typedef {{ viewBox: string, strokeWidth: number, label: string, paths: { kind: IconPathKind, d: string }[] }} IconDef
 */

/**
 * @param {string} source
 * @returns {Record<string, IconDef>}
 */
export function parseSprite(source) {
  /** @type {Record<string, IconDef>} */
  const icons = {};
  const clean = source.replace(/<!--[\s\S]*?-->/g, '');
  for (const [, attrs, body] of clean.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g)) {
    const attr = (name) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    const id = attr('id');
    if (!id) continue;
    const paths = [...body.matchAll(/<path\b([^>]*?)\/?>/g)].map(([, pathAttrs]) => ({
      kind: /** @type {IconPathKind} */ (pathAttrs.match(/\bclass="([^"]*)"/)?.[1] ?? 'main'),
      d: pathAttrs.match(/\bd="([^"]*)"/)?.[1] ?? '',
    }));
    icons[id] = {
      viewBox: attr('viewBox') ?? '0 0 24 24',
      strokeWidth: Number(attr('stroke-width') ?? 2),
      label: attr('data-label') ?? id,
      paths,
    };
  }
  return icons;
}

export const ICONS = Object.freeze(parseSprite(sprite));

/** IconSet დაფის 18 ხატულა (თანმიმდევრობა დაფისაა). */
export const BRAND_ICONS = Object.freeze([
  'engagement',
  'growth',
  'change',
  'education',
  'employment',
  'art',
  'sport',
  'civic',
  'volunteer',
  'partnership',
  'event',
  'location',
  'contact',
  'accessibility',
  'voice',
  'font-size',
  'contrast',
  'layout',
]);

/** @typedef {keyof typeof ICONS} IconName */
