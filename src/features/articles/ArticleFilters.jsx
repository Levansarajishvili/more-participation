import { Button, ChipGroup, Select, TextField } from '@/components/ui/index.js';
import { ARTICLE_CATEGORIES, ARTICLE_SORTS, options } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

/**
 * სტატიების ძიება და ფილტრები (ArticlesPage დაფა): `<search>` + ლეიბლიანი ველი + „ძიება“,
 * კატეგორიის ჩიპები („ყველა“ + 5) და დალაგება (ნატიური `<select>`). ყველაფერი URL-შია
 * (`useUrlFilters`): ჩიპი / დალაგება — push („უკან“ წინა ფილტრს აბრუნებს), ძიება — 300ms debounce +
 * replace, Enter / „ძიება“ — მყისიერად. შედეგს გვერდის `role="status"` აცხადებს — ფოკუსი
 * ფილტრზე რჩება.
 *
 * `<search role="search">`: ელემენტი Chrome 118+ / Safari 17+ / Firefox 118+-შია; `role` ძველ
 * ბრაუზერსა და ეკრანის მკითხველს იმავე landmark-ს აძლევს (ARIA in HTML-ში დაშვებული როლია).
 *
 * @param {{ filters: import('@/hooks/useUrlFilters.js').UrlFilters }} props
 */
export default function ArticleFilters({ filters }) {
  const chips = [
    { id: null, label: t('common.all') },
    ...options('articleCategory', ARTICLE_CATEGORIES),
  ];
  const sorts = options('articleSort', ARTICLE_SORTS);

  return (
    <div className="mc-filters">
      <search role="search" aria-label={t('articles.searchRegion')} className="mc-filters__search">
        <form
          className="mc-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            filters.submitQuery();
          }}
        >
          <TextField
            type="search"
            name="q"
            label={t('articles.searchLabel')}
            hint={t('articles.searchHint')}
            value={filters.query}
            onChange={(event) => filters.setQuery(event.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          <Button
            type="submit"
            variant="secondary"
            icon="search"
            className="mc-search-form__submit"
          >
            {t('common.search')}
          </Button>
        </form>
      </search>
      <div className="mc-filters__row">
        <ChipGroup
          label={t('articles.categoryLabel')}
          options={chips}
          value={filters.category}
          onChange={filters.setCategory}
        />
        <Select
          label={t('articles.sortLabel')}
          options={sorts}
          value={filters.sort ?? 'newest'}
          onChange={(event) =>
            filters.setSort(event.target.value === 'newest' ? null : event.target.value)
          }
          className="mc-filters__select"
        />
      </div>
    </div>
  );
}
