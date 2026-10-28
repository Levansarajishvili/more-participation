import { contentLang } from '@/content/localize.js';
import { label } from '@/content/taxonomy.js';

import Card from '../Card.jsx';
import Media from '../Media.jsx';

/**
 * პარტნიორი (`Partner`): ლოგო (3:2, contain), სახელი, ტიპი. `url` → ბარათი ბმულია (ახალ ჩანართში);
 * `url: null` — ბმულის გარეშე. ლოგოს alt ცარიელია, რადგან სახელი სათაურშია.
 *
 * @param {object} props
 * @param {import('@/content/model.js').Partner} props.partner
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.className]
 */
export default function PartnerCard({ partner, headingLevel = 'h3', className, ...rest }) {
  const { name, kind, logo, url } = partner;
  return (
    <Card
      contentLang={contentLang(partner)}
      href={url ?? undefined}
      newTab={Boolean(url)}
      title={name}
      headingLevel={headingLevel}
      eyebrow={label('partnerKind', kind)}
      media={<Media image={logo} ratio="3:2" kind="logo" fit="contain" decorative />}
      className={className ? `mc-card--partner ${className}` : 'mc-card--partner'}
      {...rest}
    />
  );
}
