/** საერთო ველები და ნაგულისხმევები სქემებისთვის. */

/** @returns {import('./index.js').FieldSchema} */
export const titleField = () => ({
  name: 'title',
  kind: 'text',
  label: 'editor.fields.title',
  required: true,
});

/** @returns {import('./index.js').FieldSchema} */
export const slugField = () => ({
  name: 'slug',
  kind: 'slug',
  label: 'editor.fields.slug',
  required: true,
});

/** @param {number} [max] @returns {import('./index.js').FieldSchema} */
export const excerptField = (max = 160) => ({
  name: 'excerpt',
  kind: 'textarea',
  label: 'editor.fields.excerpt',
  hint: 'editor.hints.excerpt',
  max,
  rows: 3,
  required: true,
});

/** @param {number} now @param {number} days */
export function isoDays(now, days) {
  const local = new Date(now + days * 86_400_000 + 4 * 3_600_000);
  return `${local.toISOString().slice(0, 10)}T10:00:00+04:00`;
}
