import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SAVED_MAX, SAVED_STORAGE_KEY, parseSaved, useSaved } from './useSaved.js';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

/**
 * სხვა ჩანართის იმიტაცია: საცავი იცვლება და ამ ჩანართს `storage` event მოდის.
 * @param {string | null} value
 */
function otherTab(value) {
  if (value === null) localStorage.removeItem(SAVED_STORAGE_KEY);
  else localStorage.setItem(SAVED_STORAGE_KEY, value);
  window.dispatchEvent(new StorageEvent('storage', { key: SAVED_STORAGE_KEY, newValue: value }));
}

describe('parseSaved', () => {
  it('მხოლოდ slug-ები, დუბლიკატის გარეშე; დაზიანებული JSON → ცარიელი', () => {
    expect(parseSaved('["a-b","a-b","Bad",5,"c"]')).toEqual(['a-b', 'c']);
    expect(parseSaved('{oops')).toEqual([]);
    expect(parseSaved('{"a":1}')).toEqual([]);
    expect(parseSaved(null)).toEqual([]);
    expect(
      parseSaved(JSON.stringify(Array.from({ length: 300 }, (_, i) => `s-${i}`))),
    ).toHaveLength(SAVED_MAX);
  });
});

describe('useSaved', () => {
  it('toggle ინახავს localStorage-ში, ახალი — თავში', () => {
    const { result } = renderHook(() => useSaved());
    expect(result.current.count).toBe(0);

    let state = false;
    act(() => {
      state = result.current.toggle('pirveli');
    });
    expect(state).toBe(true);
    act(() => result.current.save('meore'));

    expect(result.current.slugs).toEqual(['meore', 'pirveli']);
    expect(result.current.isSaved('pirveli')).toBe(true);
    expect(JSON.parse(localStorage.getItem(SAVED_STORAGE_KEY) ?? '')).toEqual(['meore', 'pirveli']);

    act(() => {
      state = result.current.toggle('pirveli');
    });
    expect(state).toBe(false);
    expect(result.current.slugs).toEqual(['meore']);
  });

  it('ერთ ჩანართში ყველა კომპონენტი ერთ მდგომარეობას ხედავს', () => {
    const card = renderHook(() => useSaved());
    const header = renderHook(() => useSaved());
    act(() => card.result.current.save('statia'));
    expect(header.result.current.count).toBe(1);
    act(() => header.result.current.clear());
    expect(card.result.current.slugs).toEqual([]);
  });

  it('სხვა ჩანართთან სინქრონი storage event-ით', () => {
    const { result } = renderHook(() => useSaved());
    act(() => otherTab('["sxva-chanarti"]'));
    expect(result.current.slugs).toEqual(['sxva-chanarti']);
    act(() => otherTab(null));
    expect(result.current.slugs).toEqual([]);
  });

  it('არასწორი slug არ ინახება', () => {
    const { result } = renderHook(() => useSaved());
    act(() => result.current.save('Not A Slug'));
    expect(result.current.count).toBe(0);
  });

  it('localStorage მიუწვდომელია → მეხსიერებაში ინახება და შეცდომა არ ხდება', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const { result } = renderHook(() => useSaved());
    act(() => result.current.save('mexsiereba'));
    expect(result.current.slugs).toEqual(['mexsiereba']);
  });
});
