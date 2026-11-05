/**
 * F9: ინგლისური ვერსიის ველები. @typedef {import('../schemas/index.js').FieldSchema} TranslatableField
 */

export const EN_PREFIX = 'translations.en';

/** ითარგმნება? ტექსტი (არა URL / ელფოსტა / ტელეფონი), ფოტოს alt, repeater-ის ტექსტური ქვეველები. @param {TranslatableField} field */
export function isTranslatable(field) {
  if (field.translate === false) return false;
  // F10: სუბტიტრი — English ჩანართში ინგლისური ბილიკი (ფაილი, არა თარგმანის ტექსტი)
  if (field.translate === 'track') return true;
  if (field.kind === 'image' || field.kind === 'repeater') return true;
  if (!['text', 'textarea', 'richtext'].includes(field.kind)) return false;
  return !['url', 'email', 'tel'].includes(field.inputType ?? '');
}
