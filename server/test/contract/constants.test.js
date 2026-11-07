import { describe, expect, it } from 'vitest';

import { CONTENT_TYPES, TYPE_CONFIG } from '@/admin/content-types.js';
import { PERMISSIONS, ROLES } from '@/admin/api/permissions.js';
import { ERROR_CODES } from '@/content/errors.js';
import {
  CONTACT_MAX,
  MESSAGE_MAX,
  NAME_MAX,
  SUBSCRIBE_TOKEN,
  SUPPORT_MAX,
  UNSUBSCRIBE_TOKEN,
} from '@/content/forms.js';
import { EXCERPT_MAX, RATIOS, STATUSES } from '@/content/model.js';
import { MAX_LIMIT, QUERY_MAX } from '@/content/query.js';
import { SLUG_MAX, SLUG_PATTERN } from '@/content/slug.js';
import * as taxonomy from '@/content/taxonomy.js';
import { YOUTUBE_ID } from '@/content/youtube.js';

import { SERVER_ERROR_CODES, STATUS_BY_CODE } from '../../lib/errors.js';
import { listOperations, loadSpec } from '../../lib/openapi.js';

/**
 * ერთი წესი ორივე მხარეს: spec-ის enum-ები, ზღვრები და pattern-ები frontend-ის საერთო
 * მოდულების კონსტანტებს ემთხვევა. ტაქსონომიის ან ზღვრის შეცვლა spec-ის განახლების გარეშე აქ ვარდება.
 */

const spec = loadSpec();
const schemas = spec.components.schemas;
const param = (/** @type {string} */ name) => spec.components.parameters[name].schema;

describe('spec ↔ frontend-ის კონსტანტები', () => {
  it.each([
    ['ArticleCategory', taxonomy.ARTICLE_CATEGORIES],
    ['ArticleSort', taxonomy.ARTICLE_SORTS],
    ['SeriesTopic', taxonomy.SERIES_TOPICS],
    ['SeriesTone', taxonomy.SERIES_TONES],
    ['VideoCategory', taxonomy.VIDEO_CATEGORIES],
    ['NewsType', taxonomy.NEWS_TYPES],
    ['EventFormat', taxonomy.EVENT_FORMATS],
    ['AccessLevel', taxonomy.ACCESS_LEVELS],
    ['ContactTopic', taxonomy.CONTACT_TOPICS],
    ['ReplyChannel', taxonomy.REPLY_CHANNELS],
    ['OfficeFeature', taxonomy.OFFICE_FEATURES],
    ['PartnerKind', taxonomy.PARTNER_KINDS],
    ['SocialNetwork', taxonomy.SOCIAL_NETWORKS],
    ['Status', STATUSES],
    ['Ratio', RATIOS],
    ['ContentType', CONTENT_TYPES],
    ['Role', ROLES],
  ])('%s = taxonomy / model', (name, values) => {
    expect(schemas[name].enum).toEqual([...values]);
  });

  it('ContentTypeOrAll და CreatableType — CONTENT_TYPES / TYPE_CONFIG-იდან', () => {
    expect(schemas.ContentTypeOrAll.enum).toEqual([...CONTENT_TYPES, 'all']);
    expect(schemas.CreatableType.enum).toEqual(
      CONTENT_TYPES.filter((t) => TYPE_CONFIG[t].creatable),
    );
  });

  it('ErrorCode = ERROR_CODES სერვერის ნაწილი; HTTP-ის ცხრილი', () => {
    expect([...schemas.ErrorCode.enum].sort()).toEqual([...SERVER_ERROR_CODES].sort());
    expect(ERROR_CODES.filter((c) => !SERVER_ERROR_CODES.includes(c))).toEqual([
      'network',
      'unknown',
    ]);
    expect(STATUS_BY_CODE).toEqual({
      'bad-request': 400,
      unauthorized: 401,
      forbidden: 403,
      'not-found': 404,
      conflict: 409,
      validation: 422,
      'rate-limited': 429,
      server: 500,
    });
  });

  it('pattern-ები და ზღვრები', () => {
    expect(schemas.Slug.pattern).toBe(SLUG_PATTERN.source);
    expect(schemas.Slug.maxLength).toBe(SLUG_MAX);
    expect(schemas.YouTubeId.pattern).toBe(YOUTUBE_ID.source);
    expect(param('SearchQuery').maxLength).toBe(QUERY_MAX);
    expect(param('PageLimit').maximum).toBe(MAX_LIMIT);
    for (const name of [
      'Article',
      'ArticleSummary',
      'Video',
      'VideoSummary',
      'NewsItem',
      'NewsSummary',
    ]) {
      expect(schemas[name].allOf[1].properties.excerpt.maxLength, name).toBe(EXCERPT_MAX);
    }
    const contact = schemas.ContactPayload.properties;
    expect(contact.name.maxLength).toBe(NAME_MAX);
    expect(contact.contact.maxLength).toBe(CONTACT_MAX);
    expect(contact.message.maxLength).toBe(MESSAGE_MAX);
    expect(contact.support.maxLength).toBe(SUPPORT_MAX);
    expect(schemas.SubscribeRequest.properties.email.maxLength).toBe(CONTACT_MAX);
    // B6: გამოწერის token-ის ფორმა — ერთი წესი (`forms.js` ↔ spec)
    expect(schemas.SubscribeToken.pattern).toBe(SUBSCRIBE_TOKEN.source);
    expect(schemas.UnsubscribeToken.pattern).toBe(UNSUBSCRIBE_TOKEN.source);
  });

  it('x-permission — permissions.js-ის უფლება; ადმინის ყოველ ოპერაციას (auth-ის გარდა) აქვს', () => {
    for (const op of listOperations(spec)) {
      const permission = op.operation['x-permission'];
      if (op.path.startsWith('/api/admin/') && !op.path.startsWith('/api/admin/auth/')) {
        expect(PERMISSIONS, op.operationId).toContain(permission);
      } else expect(permission, op.operationId).toBeUndefined();
    }
  });
});
