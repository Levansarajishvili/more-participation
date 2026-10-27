import PageSection from '@/components/layout/PageSection.jsx';
import {
  Button,
  ContentState,
  PendingLink,
  SkeletonGroup,
  TeamCard,
} from '@/components/ui/index.js';
import { getSettings, getTeam } from '@/content/adapter.js';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

/** ფუტერის „გუნდი“ (`/about#team`) ამ სათაურზე მოდის — PageShell ფოკუსს მასზე გადაიტანს. */
export const TEAM_HEADING_ID = 'team';

/**
 * გუნდი (AboutPage): 8 `TeamCard`, 4 სვეტი. ტექსტი „გუნდის [N] წევრი თავად არის შშმ პირი…“ —
 * მხოლოდ ჯამური რიცხვი `SiteSettings.team.livedExperienceCount`-იდან; პირად ბარათზე
 * შეზღუდვის შესახებ არაფერი იწერება (F2). „ვაკანსიები“ — `links.vacancies`, null → „[ბმული მზადდება]“.
 */
export default function AboutTeam() {
  const team = useContent(() => getTeam(), []);
  const settings = useContent(() => getSettings(), []);
  const members = team.data ?? [];
  const site = settings.data;
  const vacancies = site?.links.vacancies;

  return (
    <PageSection
      headingId={TEAM_HEADING_ID}
      title={t('about.teamTitle')}
      lead={site ? t('about.teamLead', { count: site.team.livedExperienceCount }) : undefined}
      action={
        site &&
        (vacancies ? (
          <Button variant="link" href={vacancies} newTab>
            {t('about.vacancies')}
          </Button>
        ) : (
          <PendingLink>{t('about.vacancies')}</PendingLink>
        ))
      }
    >
      <ContentState
        status={team.status}
        error={team.error}
        onRetry={team.reload}
        label={t('about.teamTitle')}
        focusId={TEAM_HEADING_ID}
        skeleton={
          <SkeletonGroup count={8} variant="person" lines={3} className="mc-grid mc-grid--4" />
        }
        empty={members.length === 0}
        emptyText={t('about.teamEmpty')}
      >
        {() => (
          <ul className="mc-grid mc-grid--4 mc-team">
            {members.map((member) => (
              <li key={member.slug}>
                <TeamCard member={member} />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
