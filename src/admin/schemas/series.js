import { SERIES_TONES, SERIES_TOPICS } from '@/content/taxonomy.js';

import { excerptField, isoDays, slugField, titleField } from './common.js';

/** სერია: ყდა 4:3, სლაიდები (სათაური, ტექსტი, მარტივი ენის ვერსია) — გადალაგება ღილაკებით, PDF. */
/** @type {import('./index.js').EntitySchema} */
export default {
  type: 'series',
  sections: [
    {
      id: 'main',
      title: 'editor.sections.main',
      fields: [
        titleField(),
        slugField(),
        {
          name: 'topic',
          kind: 'select',
          label: 'editor.fields.topic',
          taxonomy: 'seriesTopic',
          ids: SERIES_TOPICS,
          required: true,
        },
        excerptField(),
        {
          name: 'tone',
          kind: 'select',
          label: 'editor.fields.tone',
          hint: 'editor.hints.tone',
          options: SERIES_TONES.map((id) => ({ id, label: `editor.tones.${id}` })),
          required: true,
        },
      ],
    },
    {
      id: 'media',
      title: 'editor.sections.cover',
      fields: [
        {
          name: 'cover',
          kind: 'image',
          label: 'editor.fields.seriesCover',
          hint: 'editor.hints.seriesCover',
          ratio: '4:3',
        },
        {
          name: 'pdf',
          kind: 'file',
          label: 'editor.fields.pdf',
          accept: 'application/pdf',
          template: { label: '', lang: 'ka', tagged: false },
        },
      ],
    },
    {
      id: 'slides',
      title: 'editor.sections.slides',
      fields: [
        {
          name: 'slides',
          kind: 'repeater',
          label: 'editor.fields.slides',
          hint: 'editor.hints.slides',
          itemLabel: 'editor.repeater.slide',
          itemTitle: 'title',
          addLabel: 'editor.repeater.addSlide',
          newItem: (i) => ({
            id: `slide-${Date.now().toString(36)}-${i}`,
            kind: i === 0 ? 'cover' : 'step',
            number: i === 0 ? null : i,
            title: '',
            body: '',
            plain: '',
          }),
          fields: [
            { name: 'title', kind: 'text', label: 'editor.fields.slideTitle', required: true },
            {
              name: 'body',
              kind: 'textarea',
              label: 'editor.fields.slideBody',
              rows: 3,
              required: true,
            },
            {
              name: 'plain',
              kind: 'textarea',
              label: 'editor.fields.slidePlain',
              hint: 'editor.hints.slidePlain',
              rows: 3,
              required: true,
            },
          ],
        },
      ],
    },
  ],
  defaults: (now) => ({
    title: '',
    slug: '',
    topic: SERIES_TOPICS[0],
    excerpt: '',
    tone: 'navy',
    cover: null,
    status: 'draft',
    publishedAt: isoDays(now, 0),
    featured: false,
    slides: [{ id: 'slide-1', kind: 'cover', number: null, title: '', body: '', plain: '' }],
    pdf: null,
    readingMinutes: 1,
  }),
  rules: ['required', 'altMissing', 'plainMissing', 'pdfUntagged', 'contrast'],
};
