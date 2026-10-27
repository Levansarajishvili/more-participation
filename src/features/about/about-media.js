import { t } from '@/i18n/index.js';

/**
 * „ჩვენ შესახებ“-ის ჰეროს ორი ფოტო (AboutPage დაფა: „[ფოტო: ტრენინგი]“, „[ფოტო: გუნდი]“).
 * მოდელში ამ ფოტოების ველი ჯერ არ არის — CMS-ის არჩევისას `SiteSettings`-ში გადავა
 * (progress.md, F5 ღია საკითხი). `src: null` → ჩანაცვლების ჩარჩო ფოტოს მიმართულებით:
 * თვალის დონე, მოქმედების მომენტი; მონაწილეთა შორის ყრუ, უსინათლო და ინტელექტუალური
 * შეზღუდვის მქონე ადამიანები. ეტლის სიმბოლო დეკორაციად არ გამოიყენება.
 *
 * @returns {import('@/content/model.js').Image[]}
 */
export function aboutHeroPhotos() {
  return [
    { src: null, alt: t('about.photoTraining'), ratio: '1:1' },
    { src: null, alt: t('about.photoTeam'), ratio: '1:1' },
  ];
}
