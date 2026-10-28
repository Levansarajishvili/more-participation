import { contentLang } from '@/content/localize.js';
import Card from '../Card.jsx';
import Media from '../Media.jsx';

/**
 * გუნდის წევრი (`TeamMember`): წრიული ფოტო 1:1 (თვალის დონე), სახელი, როლი, მოკლე ბიოგრაფია.
 * დაწკაპებადი არ არის. პირად ბარათზე ჯანმრთელობის / შეზღუდვის ინფორმაცია არ იწერება (F2).
 *
 * @param {object} props
 * @param {import('@/content/model.js').TeamMember} props.member
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.className]
 */
export default function TeamCard({ member, headingLevel = 'h3', className, ...rest }) {
  const { name, role, bio, photo } = member;
  return (
    <Card
      contentLang={contentLang(member)}
      title={name}
      headingLevel={headingLevel}
      eyebrow={role}
      media={<Media image={photo} ratio="1:1" kind="portrait" round />}
      className={className ? `mc-card--person ${className}` : 'mc-card--person'}
      {...rest}
    >
      <p>{bio}</p>
    </Card>
  );
}
