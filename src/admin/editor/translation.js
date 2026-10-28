/**
 * F9: ინგლისური ვერსიის ველები. @typedef {import('../schemas/index.js').FieldSchema & { translate?: boolean }} TranslatableField
 */

export const EN_PREFIX = 'translations.en';

/** ითარგმნება? ტექსტი (არა URL / ელფოსტა / ტელეფონი), ფოტოს alt, repeater-ის ტექსტური ქვეველები. @param {TranslatableField} field */
export function isTranslatable(field) {
  if (field.translate === false) return false;
  if (field.kind === 'image' || field.kind === 'repeater') return true;
  if (!['text', 'textarea', 'richtext'].includes(field.kind)) return false;
  return !['url', 'email', 'tel'].includes(field.inputType ?? '');
}
