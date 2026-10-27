import { NEWS_TYPES } from '@/content/taxonomy.js';

import { excerptField, isoDays, slugField, titleField } from './common.js';

/** @type {import('./index.js').EntitySchema} */
export default {
  type: 'news',
  sections: [
    {
      id: 'main',
      title: 'editor.sections.main',
      fields: [
        titleField(),
        slugField(),
        {
          name: 'type',
          kind: 'select',
          label: 'editor.fields.newsType',
          taxonomy: 'newsType',
          ids: NEWS_TYPES,
          required: true,
        },
        excerptField(),
      ],
    },
    {
      id: 'media',
      title: 'editor.sections.cover',
      fields: [
        {
          name: 'cover',
          kind: 'image',
          label: 'editor.fields.cover',
          ratio: '3:2',
          required: true,
        },
      ],
    },
    {
      id: 'body',
      title: 'editor.sections.body',
      fields: [
        { name: 'body', kind: 'richtext', label: 'editor.fields.body', hint: 'editor.hints.body' },
        {
          name: 'action.text',
          kind: 'text',
          label: 'editor.fields.actionText',
          hint: 'editor.hints.actionText',
        },
        {
          name: 'action.href',
          kind: 'text',
          label: 'editor.fields.actionHref',
          inputType: 'url',
          lang: 'en',
        },
      ],
    },
  ],
  defaults: (now) => ({
    title: '',
    slug: '',
    excerpt: '',
    type: NEWS_TYPES[0],
    cover: { src: null, alt: '', ratio: '3:2' },
    status: 'draft',
    publishedAt: isoDays(now, 0),
    featured: false,
    body: [],
    action: null,
  }),
  rules: ['required', 'altMissing', 'headingOrder', 'linkText', 'contrast', 'voice'],
};
