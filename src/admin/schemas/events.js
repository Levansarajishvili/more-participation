import { ACCESS_LEVELS, EVENT_FORMATS } from '@/content/taxonomy.js';

import { isoDays, slugField, titleField } from './common.js';

/** @param {string} name @param {string} label @returns {import('./index.js').FieldSchema} */
const access = (name, label) => ({
  name: `accessibility.${name}`,
  kind: 'select',
  label,
  options: ACCESS_LEVELS.map((id) => ({ id, label: `editor.access.${id}` })),
  required: true,
});

/** ღონისძიება: ხელმისაწვდომობის ველები `A11yBadge`-ის წყაროა (სიახლეების გვერდი). */
/** @type {import('./index.js').EntitySchema} */
export default {
  type: 'events',
  sections: [
    {
      id: 'main',
      title: 'editor.sections.main',
      fields: [
        titleField(),
        slugField(),
        {
          name: 'excerpt',
          kind: 'textarea',
          label: 'editor.fields.excerpt',
          hint: 'editor.hints.excerpt',
          max: 160,
          required: true,
        },
        { name: 'start', kind: 'datetime', label: 'editor.fields.start', required: true },
        { name: 'end', kind: 'datetime', label: 'editor.fields.end', required: true },
        { name: 'location', kind: 'text', label: 'editor.fields.location', required: true },
        {
          name: 'registrationUrl',
          kind: 'text',
          label: 'editor.fields.registrationUrl',
          inputType: 'url',
          lang: 'en',
        },
      ],
    },
    {
      id: 'access',
      title: 'editor.sections.access',
      fields: [
        {
          name: 'accessibility.format',
          kind: 'radio',
          label: 'editor.fields.format',
          taxonomy: 'eventFormat',
          ids: EVENT_FORMATS,
          required: true,
        },
        access('wheelchair', 'editor.fields.wheelchair'),
        access('signInterpreter', 'editor.fields.signInterpreter'),
        access('captions', 'editor.fields.liveCaptions'),
        {
          name: 'accessibility.notes',
          kind: 'textarea',
          label: 'editor.fields.accessNotes',
          hint: 'editor.hints.accessNotes',
          rows: 3,
        },
      ],
    },
  ],
  defaults: (now) => ({
    title: '',
    slug: '',
    excerpt: '',
    start: isoDays(now, 14),
    end: isoDays(now, 14).replace('T10:00', 'T12:00'),
    location: '',
    accessibility: {
      wheelchair: 'on-request',
      signInterpreter: 'on-request',
      captions: 'on-request',
      format: 'in-person',
      notes: null,
    },
    registrationUrl: null,
    newsSlug: null,
    status: 'draft',
    publishedAt: isoDays(now, 0),
  }),
  rules: ['required', 'eventAccess', 'contrast'],
};
