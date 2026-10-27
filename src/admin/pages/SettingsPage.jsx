import { useCallback, useState } from 'react';

import {
  Button,
  ContentState,
  Icon,
  LiveRegion,
  Select,
  SkeletonGroup,
} from '@/components/ui/index.js';
import { OFFICE_FEATURES, SOCIAL_NETWORKS } from '@/content/taxonomy.js';
import { useContent } from '@/hooks/useContent.js';

import { content, settings } from '../api/adminAdapter.js';
import FieldRenderer from '../editor/fields/FieldRenderer.jsx';
import { setIn } from '../editor/path.js';
import { ta } from '../i18n/index.js';
import '../editor/editor.css';

/** @type {import('../schemas/index.js').SectionSchema[]} */
const SECTIONS = [
  {
    id: 'contacts',
    title: 'settings.sections.contacts',
    fields: [
      {
        name: 'contacts.phone',
        kind: 'text',
        label: 'settings.fields.phone',
        inputType: 'tel',
        required: true,
      },
      {
        name: 'contacts.email',
        kind: 'text',
        label: 'settings.fields.email',
        inputType: 'email',
        lang: 'en',
        required: true,
      },
      { name: 'contacts.messenger.label', kind: 'text', label: 'settings.fields.messengerLabel' },
      { name: 'contacts.messenger.value', kind: 'text', label: 'settings.fields.messengerValue' },
      {
        name: 'contacts.messenger.url',
        kind: 'text',
        label: 'settings.fields.messengerUrl',
        inputType: 'url',
        lang: 'en',
      },
      { name: 'contacts.signVideo.schedule', kind: 'text', label: 'settings.fields.signSchedule' },
      {
        name: 'contacts.signVideo.bookingUrl',
        kind: 'text',
        label: 'settings.fields.signBooking',
        inputType: 'url',
        lang: 'en',
      },
      {
        name: 'contacts.address.text',
        kind: 'text',
        label: 'settings.fields.address',
        required: true,
      },
      {
        name: 'contacts.address.directions',
        kind: 'textarea',
        label: 'settings.fields.directions',
        hint: 'settings.hints.directions',
        rows: 3,
      },
      {
        name: 'contacts.address.mapUrl',
        kind: 'text',
        label: 'settings.fields.mapUrl',
        inputType: 'url',
        lang: 'en',
      },
      {
        name: 'contacts.address.embedUrl',
        kind: 'text',
        label: 'settings.fields.embedUrl',
        hint: 'settings.hints.embedUrl',
        inputType: 'url',
        lang: 'en',
      },
      { name: 'responseTime', kind: 'text', label: 'settings.fields.responseTime', required: true },
    ],
  },
  {
    id: 'hours',
    title: 'settings.sections.hours',
    fields: [
      {
        name: 'hours',
        kind: 'repeater',
        label: 'settings.fields.hours',
        itemLabel: 'settings.items.hours',
        itemTitle: 'label',
        newItem: () => ({ label: '', value: '' }),
        fields: [
          { name: 'label', kind: 'text', label: 'settings.fields.days', required: true },
          { name: 'value', kind: 'text', label: 'settings.fields.time', required: true },
        ],
      },
    ],
  },
  {
    id: 'office',
    title: 'settings.sections.office',
    fields: [
      {
        name: 'officeAccessibility',
        kind: 'repeater',
        label: 'settings.fields.office',
        itemLabel: 'settings.items.office',
        newItem: () => ({ feature: OFFICE_FEATURES[0], value: '' }),
        fields: [
          {
            name: 'feature',
            kind: 'select',
            label: 'settings.fields.feature',
            taxonomy: 'officeFeature',
            ids: OFFICE_FEATURES,
            required: true,
          },
          { name: 'value', kind: 'text', label: 'settings.fields.featureValue', required: true },
        ],
      },
    ],
  },
  {
    id: 'social',
    title: 'settings.sections.social',
    fields: [
      {
        name: 'social',
        kind: 'repeater',
        label: 'settings.fields.social',
        itemLabel: 'settings.items.social',
        newItem: () => ({ network: SOCIAL_NETWORKS[0], url: null }),
        fields: [
          {
            name: 'network',
            kind: 'select',
            label: 'settings.fields.network',
            taxonomy: 'socialNetwork',
            ids: SOCIAL_NETWORKS,
            required: true,
          },
          {
            name: 'url',
            kind: 'text',
            label: 'settings.fields.socialUrl',
            inputType: 'url',
            lang: 'en',
          },
        ],
      },
      { name: 'socialHandle', kind: 'text', label: 'settings.fields.socialHandle' },
    ],
  },
];

const FEATURED = /** @type {const} */ ([
  ['weeklyVideo', 'videos'],
  ['featuredArticle', 'articles'],
  ['featuredSeries', 'series'],
  ['featuredNews', 'news'],
]);

/**
 * პარამეტრები (`/admin/settings`, მხოლოდ ადმინისტრატორი): `SiteSettings` (კონტაქტები, საათები,
 * ოფისის ხელმისაწვდომობა, სოციალური ქსელები) და რჩეული მასალა — საჯარო გვერდების „რჩეული“
 * ბლოკების წყარო (ახალი რჩეული წინას ხსნის). დაფაზე ეს ეკრანი არ არის.
 */
export default function SettingsPage() {
  const state = useContent(() => settings.get(), []);
  const options = useContent(
    () =>
      Promise.all(
        FEATURED.map(([, type]) => content.list({ type, status: 'published', limit: 50 })),
      ),
    [],
  );
  const [site, setSite] = useState(/** @type {Record<string, any> | null} */ (null));
  const [featured, setFeatured] = useState(/** @type {Record<string, string | null>} */ ({}));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (state.status === 'success' && state.data && site === null) {
    setSite(state.data.site);
    setFeatured(state.data.featured);
  }

  const setValue = useCallback(
    (/** @type {string} */ path, /** @type {unknown} */ value) =>
      setSite((current) => setIn(current ?? {}, path, value)),
    [],
  );

  return (
    <ContentState
      status={state.status}
      error={state.error}
      onRetry={state.reload}
      label={ta('nav.settings')}
      skeleton={<SkeletonGroup count={3} variant="text" />}
    >
      {() =>
        site && (
          <form
            noValidate
            className="mc-editor__form mc-settings"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              try {
                await settings.update({
                  site: /** @type {any} */ (site),
                  featured: /** @type {any} */ (featured),
                });
                setMessage(ta('settings.saved'));
              } catch (error) {
                setMessage(
                  ta('editor.save.failed', { message: /** @type {Error} */ (error).message }),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                className="mc-admin-panel mc-editor__section"
                aria-labelledby={`set-${section.id}`}
              >
                <h2 id={`set-${section.id}`} className="mc-admin-panel__title">
                  {ta(section.title)}
                </h2>
                {section.fields.map((field) => (
                  <FieldRenderer
                    key={field.name}
                    field={field}
                    ctx={{
                      values: site,
                      setValue,
                      onBlur: () => {},
                      errorFor: () => null,
                      upload: async () => null,
                      checkSlug: async () => true,
                      type: 'pages',
                    }}
                  />
                ))}
              </section>
            ))}
            <section className="mc-admin-panel mc-editor__section" aria-labelledby="set-featured">
              <h2 id="set-featured" className="mc-admin-panel__title">
                {ta('settings.sections.featured')}
              </h2>
              <p className="mc-admin-note">{ta('settings.hints.featured')}</p>
              {FEATURED.map(([key], i) => (
                <Select
                  key={key}
                  label={ta(`settings.featured.${key}`)}
                  placeholder={ta('settings.featured.none')}
                  options={(options.data?.[i]?.items ?? []).map((row) => ({
                    id: row.id,
                    label: row.title,
                  }))}
                  value={featured[key] ?? ''}
                  onChange={(event) =>
                    setFeatured((f) => ({ ...f, [key]: event.target.value || null }))
                  }
                />
              ))}
            </section>
            <div className="mc-settings__actions">
              <Button type="submit" variant="cta" loading={busy}>
                {ta('settings.save')}
              </Button>
              <LiveRegion visible className="mc-editor__message">
                {message && (
                  <>
                    <Icon name="check" size="1.25rem" /> {message}
                  </>
                )}
              </LiveRegion>
            </div>
          </form>
        )
      }
    </ContentState>
  );
}
