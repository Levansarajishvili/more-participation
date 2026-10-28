import { createLocalizedT } from '@/i18n/index.js';

import en from './en.js';
import ka from './ka.js';

/**
 * ადმინის თარგმნის ფუნქცია (`ta('list.found', { count })`) — მიმდინარე ენით (F9: `/en/admin` —
 * ინგლისური, დაკარგული გასაღები — ქართულიდან). საჯარო ტექსტი — `t()`.
 */
export const ta = createLocalizedT(ka, en);

export { en as adminDictionaryEn, ka as adminDictionary };
