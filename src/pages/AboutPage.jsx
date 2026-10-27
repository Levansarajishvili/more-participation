import AboutHero from '@/features/about/AboutHero.jsx';
import AboutMission from '@/features/about/AboutMission.jsx';
import AboutPartners from '@/features/about/AboutPartners.jsx';
import AboutPath from '@/features/about/AboutPath.jsx';
import AboutTeam from '@/features/about/AboutTeam.jsx';
import AboutValues from '@/features/about/AboutValues.jsx';

import '@/features/about/about.css';

/**
 * ჩვენ შესახებ (`/about`; AboutPage 1440; 390 — HomeMobile-ის პატერნებით, მობილური დაფა არ არის).
 * სექციები: ჰერო + ფოტოები → მისია და სამი მიმართულება → ექვსი ღირებულება → ჩვენი გზა (`<ol>`)
 * → გუნდი (`#team`) → პარტნიორები (`#partners`) + „გახდი პარტნიორი“.
 */
export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutMission />
      <AboutValues />
      <AboutPath />
      <AboutTeam />
      <AboutPartners />
    </>
  );
}
