import { TextField } from '@/components/ui/index.js';

import { ta } from '../i18n/index.js';

import FieldRenderer from './fields/FieldRenderer.jsx';
import { EN_PREFIX, isTranslatable } from './translation.js';
import { fieldId, getIn } from './path.js';

/**
 * F9: მასალის ინგლისური ვერსიის ველები (`translations.en.<გზა>`). მხოლოდ ტექსტი ითარგმნება —
 * text / textarea / richtext, ფოტოს alt და repeater-ის ტექსტური ქვეველები; slug, თარიღი, select,
 * ფაილი, ფოტო და სტრუქტურა (დამატება, წაშლა, რიგი) ქართული ვერსიისაა. ყოველი ველი
 * არასავალდებულოა: ცარიელი საიტზე ქართულად ჩანს. მინიშნება — ქართული ორიგინალი.
 *
 * @typedef {import('../schemas/index.js').FieldSchema & { translate?: boolean }} TranslatableField
 */

/** ქართული ორიგინალი მინიშნებად (≤ 140 სიმბოლო). @param {unknown} value */
function original(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.length > 140 ? `${value.slice(0, 140)}…` : value;
  return (
    <p className="mc-hint mc-en-original">
      {ta('editor.lang.originalLabel')} <span lang="ka">{text}</span>
    </p>
  );
}

/**
 * @param {object} props
 * @param {import('../schemas/index.js').SectionSchema[]} props.sections
 * @param {import('./fields/FieldRenderer.jsx').FieldContext} props.ctx
 * @param {'h2' | 'h3'} [props.headingLevel='h3']
 */
export default function TranslationFields({ sections, ctx, headingLevel: Heading = 'h3' }) {
  return sections.map((section) => {
    const fields = /** @type {TranslatableField[]} */ (section.fields).filter(isTranslatable);
    if (!fields.length) return null;
    return (
      <section
        key={section.id}
        className="mc-admin-panel mc-editor__section"
        aria-labelledby={`sec-en-${section.id}`}
      >
        <Heading id={`sec-en-${section.id}`} className="mc-admin-panel__title">
          {ta(section.title)} <span lang="en">(English)</span>
        </Heading>
        {fields.map((field) => (
          <EnField key={field.name} field={field} path={field.name} ctx={ctx} />
        ))}
      </section>
    );
  });
}

/**
 * @param {{ field: TranslatableField, path: string, ctx: import('./fields/FieldRenderer.jsx').FieldContext }} props
 */
function EnField({ field, path, ctx }) {
  const enPath = `${EN_PREFIX}.${path}`;
  if (field.kind === 'image') {
    const id = fieldId(`${enPath}.alt`);
    return (
      <div className="mc-en-field">
        <TextField
          id={id}
          lang="en"
          label={`${ta(field.label)}: ${ta('editor.image.alt')}`}
          hint={ta('editor.altHint')}
          error={ctx.errorFor(`${enPath}.alt`)}
          optional
          value={getIn(ctx.values, `${enPath}.alt`) ?? ''}
          onChange={(event) => ctx.setValue(`${enPath}.alt`, event.target.value)}
          onBlur={ctx.onBlur}
        />
        {original(getIn(ctx.values, `${path}.alt`))}
      </div>
    );
  }
  if (field.kind === 'repeater') {
    const items = /** @type {Record<string, any>[]} */ (getIn(ctx.values, path) ?? []);
    const subs = /** @type {TranslatableField[]} */ (field.fields ?? []).filter(isTranslatable);
    if (!items.length || !subs.length) return null;
    return (
      <fieldset id={fieldId(enPath)} className="mc-fieldset mc-repeater" tabIndex={-1}>
        <legend className="mc-repeater__title">{ta(field.label)}</legend>
        <p className="mc-hint">{ta('editor.lang.structure')}</p>
        <ol role="list" className="mc-repeater__list">
          {items.map((item, i) => (
            <li key={i} className="mc-repeater__item">
              <fieldset className="mc-fieldset">
                <legend className="mc-repeater__legend">
                  {ta(field.itemLabel ?? 'editor.repeater.item', { n: i + 1 })}
                  {field.itemTitle && item?.[field.itemTitle] ? `: ${item[field.itemTitle]}` : ''}
                </legend>
                <div className="mc-repeater__fields">
                  {subs.map((sub) => (
                    <EnField
                      key={sub.name}
                      field={sub}
                      path={`${path}[${i}].${sub.name}`}
                      ctx={ctx}
                    />
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
      </fieldset>
    );
  }
  return (
    <div className="mc-en-field">
      <FieldRenderer field={{ ...field, required: false, lang: 'en' }} path={enPath} ctx={ctx} />
      {field.kind !== 'richtext' && original(getIn(ctx.values, path))}
    </div>
  );
}
