import { PARTNER_KINDS } from '@/content/taxonomy.js';

/**
 * 7 საჯარო გვერდი — სტრუქტურირებული ველები (`fields`): სათაური (h1), შესავალი, აღწერა
 * (საძიებოსთვის ≤ 160). „ჩვენ შესახებ“ — + გუნდი და პარტნიორები (repeater; შენახვისას საიტის
 * საცავშიც იწერება). საჯარო გვერდები ტექსტს ჯერ i18n-დან კითხულობს — CMS-თან ერთად (ღია საკითხი).
 */

/** @type {import('./index.js').SectionSchema[]} */
const base = [
  {
    id: 'main',
    title: 'editor.sections.page',
    fields: [
      { name: 'title', kind: 'text', label: 'editor.fields.pageName', required: true },
      {
        name: 'fields.heading',
        kind: 'text',
        label: 'editor.fields.heading',
        hint: 'editor.hints.heading',
      },
      { name: 'fields.lead', kind: 'textarea', label: 'editor.fields.lead', rows: 3 },
      {
        name: 'fields.description',
        kind: 'textarea',
        label: 'editor.fields.description',
        hint: 'editor.hints.excerpt',
        max: 160,
        rows: 2,
      },
    ],
  },
];

/** @type {import('./index.js').SectionSchema[]} */
export const ABOUT_SECTIONS = [
  ...base,
  {
    id: 'team',
    title: 'editor.sections.team',
    fields: [
      {
        name: 'team',
        kind: 'repeater',
        label: 'editor.fields.team',
        itemLabel: 'editor.repeater.member',
        itemTitle: 'name',
        addLabel: 'editor.repeater.addMember',
        newItem: (i) => ({
          slug: `member-${Date.now().toString(36)}`,
          name: '',
          role: '',
          bio: '',
          photo: { src: null, alt: '', ratio: '1:1' },
          order: i + 1,
        }),
        fields: [
          { name: 'name', kind: 'text', label: 'editor.fields.memberName', required: true },
          { name: 'role', kind: 'text', label: 'editor.fields.memberRole', required: true },
          { name: 'bio', kind: 'textarea', label: 'editor.fields.memberBio', rows: 2 },
          {
            name: 'photo',
            kind: 'image',
            label: 'editor.fields.photo',
            ratio: '1:1',
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'partners',
    title: 'editor.sections.partners',
    fields: [
      {
        name: 'partners',
        kind: 'repeater',
        label: 'editor.fields.partners',
        itemLabel: 'editor.repeater.partner',
        itemTitle: 'name',
        addLabel: 'editor.repeater.addPartner',
        newItem: () => ({
          slug: `partner-${Date.now().toString(36)}`,
          name: '',
          kind: PARTNER_KINDS[0],
          logo: { src: null, alt: '', ratio: '3:2' },
          url: null,
        }),
        fields: [
          { name: 'name', kind: 'text', label: 'editor.fields.partnerName', required: true },
          {
            name: 'kind',
            kind: 'select',
            label: 'editor.fields.partnerKind',
            taxonomy: 'partnerKind',
            ids: PARTNER_KINDS,
            required: true,
          },
          {
            name: 'logo',
            kind: 'image',
            label: 'editor.fields.logo',
            ratio: '3:2',
            required: true,
          },
          {
            name: 'url',
            kind: 'text',
            label: 'editor.fields.partnerUrl',
            inputType: 'url',
            lang: 'en',
          },
        ],
      },
    ],
  },
];

/** @type {import('./index.js').EntitySchema} */
export default {
  type: 'pages',
  sections: base,
  defaults: () => ({
    title: '',
    fields: { heading: '', lead: '', description: '' },
    status: 'published',
  }),
  rules: ['required', 'altMissing', 'contrast'],
};
