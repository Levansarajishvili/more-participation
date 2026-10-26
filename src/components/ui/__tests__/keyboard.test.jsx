import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SAVED_STORAGE_KEY } from '@/hooks/useSaved.js';

import { Accordion, ArticleCard, ChipGroup, SaveToggle } from '../index.js';

import { article, renderUi } from './fixtures.jsx';

beforeEach(() => localStorage.clear());

const ITEMS = [
  { id: 'a', title: 'პირველი კითხვა', content: <p>პირველი პასუხი</p> },
  { id: 'b', title: 'მეორე კითხვა', content: <p>მეორე პასუხი</p> },
  { id: 'c', title: 'მესამე კითხვა', content: <p>მესამე პასუხი</p> },
];

describe('Accordion: კლავიატურა', () => {
  it('Enter და Space ხსნის/ხურავს; aria-expanded და hidden სინქრონულია', async () => {
    const user = userEvent.setup();
    renderUi(<Accordion items={ITEMS} />);
    const first = screen.getByRole('button', { name: 'პირველი კითხვა' });
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('პირველი პასუხი')).not.toBeVisible();

    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('პირველი პასუხი')).toBeVisible();
    expect(screen.getByRole('region', { name: 'პირველი კითხვა' })).toBeInTheDocument();

    await user.keyboard(' ');
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('aria-controls პანელზე მიუთითებს', () => {
    renderUi(<Accordion items={ITEMS} defaultOpen={['b']} />);
    const second = screen.getByRole('button', { name: 'მეორე კითხვა' });
    const panel = document.getElementById(second.getAttribute('aria-controls'));
    expect(panel).toHaveTextContent('მეორე პასუხი');
    expect(panel).toBeVisible();
  });

  it('↓ ↑ Home End სათაურებს შორის, წრიულად', async () => {
    const user = userEvent.setup();
    renderUi(<Accordion items={ITEMS} />);
    const [a, b, c] = screen.getAllByRole('button');
    a.focus();
    await user.keyboard('{ArrowDown}');
    expect(b).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(a).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(c).toHaveFocus();
    await user.keyboard('{Home}');
    expect(a).toHaveFocus();
    await user.keyboard('{End}');
    expect(c).toHaveFocus();
  });

  it('multiple={false}: ერთი პანელი ღიაა', async () => {
    const user = userEvent.setup();
    renderUi(<Accordion items={ITEMS} multiple={false} />);
    const [a, b] = screen.getAllByRole('button');
    await user.click(a);
    await user.click(b);
    expect(a).toHaveAttribute('aria-expanded', 'false');
    expect(b).toHaveAttribute('aria-expanded', 'true');
  });
});

const CATEGORIES = [
  { id: null, label: 'ყველა' },
  { id: 'career', label: 'კარიერა' },
  { id: 'rights', label: 'უფლებები' },
];

/** @param {{ multiple?: boolean, onChange?: (v: any) => void }} props */
function Filter({ multiple = false, onChange }) {
  const [value, setValue] = useState(multiple ? [] : null);
  return (
    <ChipGroup
      label="კატეგორია"
      options={multiple ? CATEGORIES.slice(1) : CATEGORIES}
      value={value}
      multiple={multiple}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('ChipGroup: კლავიატურა', () => {
  it('ჯგუფს სახელი აქვს; Tab ჩიპიდან ჩიპზე, Enter/Space ირჩევს, aria-pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderUi(<Filter onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'კატეგორია' })).toBeInTheDocument();
    const all = screen.getByRole('button', { name: 'ყველა' });
    const career = screen.getByRole('button', { name: 'კარიერა' });
    expect(all).toHaveAttribute('aria-pressed', 'true');

    await user.tab();
    expect(all).toHaveFocus();
    await user.tab();
    expect(career).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(career).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(onChange).toHaveBeenLastCalledWith('career');

    // არჩეულზე ხელახლა დაჭერა ერთარჩევნიანში არაფერს ცვლის
    await user.keyboard(' ');
    expect(career).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenCalledTimes(1);

    await user.tab({ shift: true });
    await user.keyboard(' ');
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('multiple: Space ჩართავს და გამორთავს, რიგი options-ისაა', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderUi(<Filter multiple onChange={onChange} />);
    const [career, rights] = screen.getAllByRole('button');
    rights.focus();
    await user.keyboard(' ');
    career.focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(['career', 'rights']);
    await user.keyboard('{Enter}');
    expect(career).toHaveAttribute('aria-pressed', 'false');
    expect(onChange).toHaveBeenLastCalledWith(['rights']);
  });
});

describe('SaveToggle: კლავიატურა', () => {
  it('Enter / Space ინახავს და შლის; aria-pressed და localStorage სინქრონულია', async () => {
    const user = userEvent.setup();
    renderUi(<SaveToggle slug="zrdis-azrovneba" title="ზრდის აზროვნება" />);
    const button = screen.getByRole('button', { name: 'შენახვა: ზრდის აზროვნება' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem(SAVED_STORAGE_KEY))).toEqual(['zrdis-azrovneba']);

    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(JSON.parse(localStorage.getItem(SAVED_STORAGE_KEY))).toEqual([]);
  });

  it('ლეიბლით: ხილული ტექსტი იცვლება, სახელში სათაურიც არის (label-in-name)', async () => {
    const user = userEvent.setup();
    renderUi(<SaveToggle slug="a-b" title="სათაური" variant="label" />);
    const button = screen.getByRole('button', { name: 'შენახვა: სათაური' });
    await user.click(button);
    expect(button).toHaveAccessibleName('შენახულია: სათაური');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('ორი ღილაკი ერთ slug-ზე ერთ მდგომარეობას აჩვენებს', async () => {
    const user = userEvent.setup();
    renderUi(
      <>
        <SaveToggle slug="a-b" title="ა" />
        <SaveToggle slug="a-b" title="ბ" variant="label" />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'შენახვა: ა' }));
    expect(screen.getByRole('button', { name: 'შენახულია: ბ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('Card: stretched-link', () => {
  it('ბარათში Tab-გაჩერებაა სათაურის ბმული და შენახვა; მთელ ბარათზე <a> არ არის', async () => {
    const user = userEvent.setup();
    const { container } = renderUi(<ArticleCard article={article} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(article.title);
    expect(links[0]).toHaveAttribute('href', `/articles/${article.slug}`);
    expect(container.querySelector('article > a')).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: article.title })).toBeInTheDocument();

    await user.tab();
    expect(links[0]).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: `შენახვა: ${article.title}` })).toHaveFocus();
  });
});
