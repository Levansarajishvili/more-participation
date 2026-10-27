import { ARTICLE_CATEGORIES } from '@/content/taxonomy.js';

import { excerptField, isoDays, slugField, titleField } from './common.js';

/** @type {import('./index.js').EntitySchema} */
export default {
  type: 'articles',
  sections: [
    {
      id: 'main',
      title: 'editor.sections.main',
      fields: [
        titleField(),
        slugField(),
        {
          name: 'category',
          kind: 'select',
          label: 'editor.fields.category',
          taxonomy: 'articleCategory',
          ids: ARTICLE_CATEGORIES,
          required: true,
        },
        excerptField(),
        { name: 'author', kind: 'text', label: 'editor.fields.author', required: true },
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
        {
          name: 'body',
          kind: 'richtext',
          label: 'editor.fields.body',
          hint: 'editor.hints.body',
          required: true,
        },
      ],
    },
  ],
  defaults: (now) => ({
    title: '',
    slug: '',
    excerpt: '',
    category: ARTICLE_CATEGORIES[0],
    cover: { src: null, alt: '', ratio: '3:2' },
    author: '',
    status: 'draft',
    publishedAt: isoDays(now, 0),
    featured: false,
    body: [],
    audio: null,
    readingMinutes: 1,
  }),
  rules: ['required', 'altMissing', 'headingOrder', 'linkText', 'contrast', 'voice'],
};
