import { Mark, Node, mergeAttributes } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';

/**
 * რედაქტორის სქემა — მხოლოდ მოდელის ბლოკები (serialize.js). StarterKit-იდან ამოღებულია:
 * კურსივი, ხაზგასმა, ზედხაზი, კოდი, კოდის ბლოკი, ჰორიზონტალური ხაზი; სათაური — მხოლოდ 2 და 3
 * (H1 სტატიის სათაურია). ბმული ავტომატურად არ იქმნება და რედაქტორში დაწკაპებით არ იხსნება.
 */

/** უცხოენოვანი ფრაგმენტი (`<span lang="en">`) — მოდელის `TextRun.lang`; ღილაკი არ აქვს, ინახება. */
const Lang = Mark.create({
  name: 'lang',
  addAttributes() {
    return { lang: { default: 'en' } };
  },
  parseHTML() {
    return [
      {
        tag: 'span[lang]',
        getAttrs: (el) => ({ lang: /** @type {HTMLElement} */ (el).getAttribute('lang') }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});

/** ციტატის ავტორი (`QuoteBlock.cite`). */
const Quote = Blockquote.extend({
  addAttributes() {
    return { cite: { default: null, rendered: false } };
  },
});

/** ფოტო: alt სავალდებულოა (ჩეკლისტი), პროპორცია და წარწერა მოდელისაა. */
const Figure = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ratio: { default: '3:2', rendered: false },
      caption: { default: null, rendered: false },
    };
  },
}).configure({ inline: false, allowBase64: false });

/** ბმული-ბლოკი (`LinkBlock`): ატომი, ტექსტით ჩანს; ცვლა — ტექსტის რედაქტორის გარეთ არ ხდება. */
const LinkCard = Node.create({
  name: 'linkCard',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      text: { default: '' },
      href: { default: '' },
      description: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'p[data-link-card]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, { 'data-link-card': '', class: 'mc-rte__card' }),
      `${node.attrs.text} — ${node.attrs.href}`,
    ];
  },
});

export const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    italic: false,
    strike: false,
    underline: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    blockquote: false,
    link: { openOnClick: false, autolink: false, HTMLAttributes: { rel: null, target: null } },
  }),
  Quote,
  Figure,
  LinkCard,
  Lang,
];
