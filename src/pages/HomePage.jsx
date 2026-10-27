import HomeAbout from '@/features/home/HomeAbout.jsx';
import HomeArticles from '@/features/home/HomeArticles.jsx';
import HomeDevelopment from '@/features/home/HomeDevelopment.jsx';
import HomeHero from '@/features/home/HomeHero.jsx';
import HomeNews from '@/features/home/HomeNews.jsx';
import HomeVideos from '@/features/home/HomeVideos.jsx';
import { useHomeContent } from '@/features/home/useHomeContent.js';

import '@/features/home/home.css';

/**
 * მთავარი გვერდი (`/`; HomePage 1440, HomeMobile 390, მუქი — დაფის `dark` პალიტრა).
 * სექციები: ჰერო (CTA „ჩაერთე“ + სამი შესასვლელი + კვირის ვიდეო) → ჩვენ შესახებ → სტატიები →
 * პიროვნული განვითარება → ვიდეო-ისტორიები → სიახლეები. ყოველი სექცია `<section aria-labelledby>`-ია;
 * h1 პირველივე რენდერზე ჩანს (PageShell ფოკუსს მასზე გადაიტანს). სათაური — „მეტი ჩართულობა“
 * (როუტის `handle.title: null`).
 */
export default function HomePage() {
  const { articles, series, videos, news } = useHomeContent();
  const counts = {
    articles: articles.data?.total,
    series: series.data?.length,
    videos: videos.data?.length,
  };
  return (
    <>
      <HomeHero counts={counts} videos={videos} />
      <HomeAbout />
      <HomeArticles articles={articles} />
      <HomeDevelopment series={series} />
      <HomeVideos videos={videos} />
      <HomeNews news={news} />
    </>
  );
}
