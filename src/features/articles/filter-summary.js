import { label } from '@/content/taxonomy.js';

/**
 * ჩართული ფილტრების წარწერა რაოდენობის სტატუსისთვის: „„ჩვევა“, კარიერა, მოკლე“.
 * @param {{ q?: string, category?: string | null, sort?: string | null }} filters
 * @returns {string}
 */
export function articleFilterSummary({ q, category, sort }) {
  return [
    q && `„${q}“`,
    category && label('articleCategory', category),
    sort && label('articleSort', sort),
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * სიახლეების ფილტრი: „ღონისძიებები, 2025“.
 * @param {{ type?: string | null, year?: number | null }} filters
 * @returns {string}
 */
export function newsFilterSummary({ type, year }) {
  return [type && label('newsTypePlural', type), year && String(year)].filter(Boolean).join(', ');
}
