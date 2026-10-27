import { ChipGroup, Select } from '@/components/ui/index.js';
import { NEWS_TYPES, options } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

/**
 * სიახლეების ფილტრი (NewsPage დაფა): ტიპის ჩიპები („ყველა“, „განცხადებები“, „ღონისძიებები“,
 * „პროგრამები“, „მედია“) და წელი (ნატიური `<select>`, „ყველა წელი“ + წლები, რომლებშიც არჩეული
 * ტიპის სიახლე არსებობს — `listNews().years`). URL: `?category=event&year=2025` (§10-ის ფილტრის
 * პარამეტრები; `category` = სიახლის ტიპი), push — „უკან“ წინა ფილტრს აბრუნებს.
 *
 * @param {object} props
 * @param {import('@/hooks/useUrlFilters.js').UrlFilters} props.filters
 * @param {number[]} props.years
 */
export default function NewsFilters({ filters, years }) {
  const chips = [{ id: null, label: t('common.all') }, ...options('newsTypePlural', NEWS_TYPES)];
  // არჩეული წელი სიაში რჩება, მაშინაც კი, როცა ამ ტიპში ის აღარ გვხვდება (ველის მნიშვნელობა არ იკარგება)
  const list = [...new Set([...(filters.year ? [filters.year] : []), ...years])].sort(
    (a, b) => b - a,
  );
  return (
    <div className="mc-filters">
      <div className="mc-filters__row">
        <ChipGroup
          label={t('news.typeLabel')}
          options={chips}
          value={filters.category}
          onChange={filters.setCategory}
        />
        <Select
          label={t('news.yearLabel')}
          placeholder={t('news.yearAll')}
          options={list.map((year) => ({ id: String(year), label: String(year) }))}
          value={filters.year ? String(filters.year) : ''}
          onChange={(event) =>
            filters.setYear(event.target.value ? Number(event.target.value) : null)
          }
          className="mc-filters__select"
        />
      </div>
    </div>
  );
}
