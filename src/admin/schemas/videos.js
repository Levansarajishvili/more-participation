import { VIDEO_CATEGORIES } from '@/content/taxonomy.js';

import { excerptField, isoDays, slugField, titleField } from './common.js';

/**
 * ვიდეო: პოსტერი 16:9, ფაილი, VTT სუბტიტრები, ტრანსკრიპტი (VTT-დან იმპორტით), აუდიოაღწერა
 * (ან „ვიზუალური ინფორმაცია აუდიოშიცაა“), ჟესტური ენის ვიდეო.
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
          name: 'poster',
          kind: 'image',
          label: 'editor.fields.poster',
          ratio: '16:9',
          required: true,
        },
        {
          name: 'sources[0]',
          kind: 'file',
          label: 'editor.fields.videoFile',
          accept: 'video/*',
          template: { type: 'video/mp4' },
        },
        {
          name: 'captions[0]',
          kind: 'file',
          label: 'editor.fields.captions',
          hint: 'editor.hints.captions',
          accept: '.vtt,text/vtt',
          required: true,
          template: { kind: 'captions', srclang: 'ka', label: 'ქართული', default: true },
        },
        {
          name: 'audioDescription',
          kind: 'file',
          label: 'editor.fields.audioDescription',
          hint: 'editor.hints.audioDescription',
          accept: 'audio/*,video/*',
          template: { srclang: 'ka', label: 'აუდიოაღწერა' },
        },
        {
          name: 'visualInAudio',
          kind: 'checkbox',
          label: 'editor.fields.visualInAudio',
          hint: 'editor.hints.visualInAudio',
        },
        {
          name: 'signLanguage',
          kind: 'file',
          label: 'editor.fields.signLanguage',
          hint: 'editor.hints.signLanguage',
          accept: 'video/*',
          template: { label: 'ჟესტური ენა' },
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
    poster: { src: null, alt: '', ratio: '16:9' },
    duration: 0,
    language: 'ka',
    status: 'draft',
    publishedAt: isoDays(now, 0),
    featured: false,
    sources: [],
    captions: [],
    audioDescription: null,
    signLanguage: null,
    transcript: [],
    visualInAudio: false,
  }),
  rules: [
    'required',
    'altMissing',
    'captionsMissing',
    'transcriptMissing',
    'audioDescriptionMissing',
    'signLanguageMissing',
    'contrast',
  ],
};
