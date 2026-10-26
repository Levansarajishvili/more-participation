import { usePageTitle } from '@/components/layout/usePageTitle.js';

/**
 * სტატიის გვერდი (`/articles/:slug`). სათაური adapter-იდან მოვა — F6; დოკუმენტის სათაური
 * `usePageTitle`-ით (დინამიკური სათაურის ნიმუში).
 */
export default function ArticlePage() {
  const title = '[სტატიის სათაური]';
  usePageTitle(title);
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{title}</h1>
    </div>
  );
}
