import { VIDEO_CATEGORIES } from '@/content/taxonomy.js';

import { excerptField, isoDays, slugField, titleField } from './common.js';

/**
 * ვიდეო (F10, B0 / B0.1): წყარო — YouTube-ის ბმული (ინახება მხოლოდ id; ფაილი საიტზე არ
 * იტვირთება); სათაური და მოკლე აღწერა რედაქტორი წერს — ბმულის ჩასმა მათ არ ავსებს და არ ცვლის,
 * YouTube-ის oEmbed / Data API არ გამოიძახება. კადრი id-იდან ითვლება (`<img>`). სუბტიტრი — ჩვენი VTT
 * (ქართული სავალდებულო; ინგლისური — English ჩანართში), აუდიოაღწერა — ცალკე YouTube-ვერსია ან
 * „ვიზუალური ინფორმაცია აუდიოშიცაა“, ტრანსკრიპტი (VTT-დან იმპორტით). ჟესტური ენის ვერსია არ კეთდება.
 */
/** @type {import('./index.js').EntitySchema} */
export default {
  type: 'videos',
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
          taxonomy: 'videoCategory',
          ids: VIDEO_CATEGORIES,
          required: true,
        },
        excerptField(),
        { name: 'person.name', kind: 'text', label: 'editor.fields.personName', required: true },
        { name: 'person.role', kind: 'text', label: 'editor.fields.personRole' },
        { name: 'duration', kind: 'duration', label: 'editor.fields.duration', required: true },
      ],
    },
    {
      id: 'media',
      title: 'editor.sections.video',
      fields: [
        {
          name: 'youtube.id',
          kind: 'youtube',
          label: 'editor.fields.youtube',
          hint: 'editor.hints.youtube',
          required: true,
          preview: true,
        },
        {
          name: 'captions',
          kind: 'captions',
          label: 'editor.fields.captions',
          hint: 'editor.hints.captions',
          srclang: 'ka',
          required: true,
          translate: 'track',
        },
        {
          name: 'youtube.adId',
          kind: 'youtube',
          label: 'editor.fields.youtubeAd',
          hint: 'editor.hints.youtubeAd',
          differentFrom: 'youtube.id',
        },
        {
          name: 'visualInAudio',
          kind: 'checkbox',
          label: 'editor.fields.visualInAudio',
          hint: 'editor.hints.visualInAudio',
        },
      ],
    },
    {
      id: 'transcript',
      title: 'editor.sections.transcript',
      fields: [
        {
          name: 'transcript',
          kind: 'repeater',
          label: 'editor.fields.transcript',
          hint: 'editor.hints.transcript',
          itemLabel: 'editor.repeater.line',
          addLabel: 'editor.repeater.addLine',
          importVtt: true,
          newItem: () => ({ start: 0, kind: 'speech', text: '' }),
          fields: [
            { name: 'start', kind: 'duration', label: 'editor.fields.lineStart', required: true },
            {
              name: 'kind',
              kind: 'select',
              label: 'editor.fields.lineKind',
              options: [
                { id: 'speech', label: 'editor.lineKinds.speech' },
                { id: 'description', label: 'editor.lineKinds.description' },
              ],
              required: true,
            },
            { name: 'speaker', kind: 'text', label: 'editor.fields.speaker' },
            {
              name: 'text',
              kind: 'textarea',
              label: 'editor.fields.lineText',
              rows: 2,
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
    excerpt: '',
    category: VIDEO_CATEGORIES[0],
    person: { name: '', role: '' },
    duration: 0,
    language: 'ka',
    status: 'draft',
    publishedAt: isoDays(now, 0),
    featured: false,
    youtube: { id: '' },
    captions: [],
    transcript: [],
    visualInAudio: false,
  }),
  rules: [
    'required',
    'videoSource',
    'captionsMissing',
    'transcriptMissing',
    'audioDescriptionMissing',
    'contrast',
  ],
};
