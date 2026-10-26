import { useSyncExternalStore } from 'react';

/**
 * ხმოვანი რეჟიმი — `window.speechSynthesis` (Web Speech API), გარე სერვისის გარეშე.
 *
 * ქართული (`ka`) ხმა ბევრ ბრაუზერსა და OS-ში არ არის. ამიტომ:
 * - `status: 'pending'`  — ხმების სია ჯერ იტვირთება (Chrome მას `voiceschanged`-ით აბრუნებს);
 * - `status: 'ready'`    — ქართული ხმა ნაპოვნია;
 * - `status: 'no-voice'` — API არის, ქართული ხმა — არა (VOICE_TIMEOUT_MS-ის შემდეგ);
 * - `status: 'unsupported'` — API საერთოდ არ არის.
 * მენიუ გადამრთველს 'ready'-ს გარდა ყველა შემთხვევაში გათიშავს და მიზეზს ტექსტით ხსნის.
 *
 * წაკითხვა: `#main`-ის ბლოკები (სათაურები, აბზაცები, სიის პუნქტები) თითო utterance-ად.
 * Esc ნებისმიერ ადგილას აჩერებს (WCAG 1.4.2 — ხმის შეჩერების საშუალება). გვერდის ჩატვირთვისას
 * ხმა თავისით არ ირთვება: წაკითხვა მხოლოდ მომხმარებლის ქმედებაზე იწყება (გადამრთველი ან
 * გვერდზე გადასვლა ჩართული რეჟიმით).
 */

/** @typedef {'unsupported' | 'pending' | 'ready' | 'no-voice'} SpeechStatus */
/** @typedef {'idle' | 'speaking' | 'done' | 'stopped'} SpeechPhase */
/**
 * @typedef {object} SpeechSnapshot
 * @property {SpeechStatus} status
 * @property {SpeechPhase} phase
 * @property {string | null} voiceName
 */

export const VOICE_TIMEOUT_MS = 2000;
export const SPEECH_LANG = 'ka-GE';
const MAX_CHUNK = 220;
const BLOCKS = 'h1, h2, h3, h4, p, li, blockquote, figcaption, dt, dd, caption';

/** @type {Set<() => void>} */
const listeners = new Set();
/** @type {SpeechSnapshot} */
let snapshot = { status: 'pending', phase: 'idle', voiceName: null };
/** @type {SpeechSynthesisVoice | null} */
let voice = null;
let initialized = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let voiceTimer = null;
/** ყოველ წაკითხვას საკუთარი ნომერი აქვს — ძველი utterance-ის onend ახალს არ ცვლის. */
let run = 0;

/** @param {Partial<SpeechSnapshot>} patch */
function set(patch) {
  snapshot = { ...snapshot, ...patch };
  for (const notify of listeners) notify();
}

/** @returns {SpeechSynthesis | null} */
function synth() {
  if (typeof window === 'undefined') return null;
  const api = /** @type {SpeechSynthesis | undefined} */ (window.speechSynthesis);
  if (!api || typeof window.SpeechSynthesisUtterance !== 'function') return null;
  return api;
}

/**
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {SpeechSynthesisVoice | null}
 */
export function findGeorgianVoice(voices) {
  const georgian = voices.filter((v) =>
    (v.lang || '').toLowerCase().replace('_', '-').startsWith('ka'),
  );
  return georgian.find((v) => v.localService) ?? georgian[0] ?? null;
}

function loadVoices() {
  const api = synth();
  if (!api) return;
  const found = findGeorgianVoice(api.getVoices() || []);
  if (found) {
    voice = found;
    if (voiceTimer) clearTimeout(voiceTimer);
    voiceTimer = null;
    set({ status: 'ready', voiceName: found.name });
  }
}

/** @param {KeyboardEvent} event */
function onKeyDown(event) {
  if (event.key === 'Escape' && snapshot.phase === 'speaking') cancelSpeech();
}

function init() {
  if (initialized) return;
  initialized = true;
  const api = synth();
  if (!api) {
    snapshot = { ...snapshot, status: 'unsupported' };
    return;
  }
  loadVoices();
  if (snapshot.status === 'ready') return;
  api.addEventListener?.('voiceschanged', loadVoices);
  voiceTimer = setTimeout(() => {
    voiceTimer = null;
    if (snapshot.status === 'pending') set({ status: 'no-voice' });
  }, VOICE_TIMEOUT_MS);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('pagehide', cancelSpeech);
}

/** @param {() => void} notify */
function subscribe(notify) {
  init();
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** @returns {SpeechSnapshot} */
export function getSpeechSnapshot() {
  init();
  return snapshot;
}

/**
 * ტექსტის დაყოფა წინადადებებად ≤ 220 სიმბოლოზე (Chrome გრძელ utterance-ს წყვეტს).
 * @param {string} text
 * @returns {string[]}
 */
export function chunkText(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK) return [clean];
  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean];
  /** @type {string[]} */
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * ელემენტის წასაკითხი ბლოკები DOM-ის რიგით: ჩადგმული ბლოკი (li > p) ორჯერ არ იკითხება,
 * `aria-hidden` და `hidden` გამოტოვებულია.
 * @param {Element} root
 * @returns {string[]}
 */
export function readableBlocks(root) {
  /** @type {string[]} */
  const blocks = [];
  for (const element of root.querySelectorAll(BLOCKS)) {
    const outer = element.parentElement?.closest(BLOCKS);
    if (outer && root.contains(outer)) continue;
    if (element.closest('[aria-hidden="true"], [hidden], [inert]')) continue;
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text) blocks.push(text);
  }
  return blocks;
}

/**
 * ტექსტის ბლოკების წაკითხვა ქართული ხმით. წინა წაკითხვა წყდება.
 * @param {string[]} blocks
 * @returns {boolean}  false — ხმა მზად არ არის ან ტექსტი ცარიელია
 */
export function speakBlocks(blocks) {
  const api = synth();
  init();
  if (!api || snapshot.status !== 'ready' || !voice) return false;
  const chunks = blocks.flatMap(chunkText);
  if (chunks.length === 0) return false;
  const id = ++run;
  api.cancel();
  chunks.forEach((chunk, index) => {
    const utterance = new window.SpeechSynthesisUtterance(chunk);
    utterance.lang = SPEECH_LANG;
    utterance.voice = voice;
    utterance.rate = 0.95;
    if (index === chunks.length - 1) {
      utterance.onend = () => {
        if (id === run) set({ phase: 'done' });
      };
    }
    utterance.onerror = () => {
      if (id === run && snapshot.phase === 'speaking') set({ phase: 'stopped' });
    };
    api.speak(utterance);
  });
  set({ phase: 'speaking' });
  return true;
}

/**
 * ელემენტის (ჩვეულებრივ `#main`) წაკითხვა.
 * @param {Element | null} element
 * @returns {boolean}
 */
export function readElement(element) {
  if (!element) return false;
  return speakBlocks(readableBlocks(element));
}

/** მიმდინარე წაკითხვის შეწყვეტა. */
export function cancelSpeech() {
  const api = synth();
  run += 1;
  api?.cancel();
  if (snapshot.phase === 'speaking') set({ phase: 'stopped' });
}

/**
 * ხმოვანი რეჟიმის მდგომარეობა React-ში.
 * @returns {SpeechSnapshot}
 */
export function useSpeech() {
  return useSyncExternalStore(subscribe, getSpeechSnapshot, getSpeechSnapshot);
}

/** მხოლოდ ტესტებისთვის: მოდულის მდგომარეობის გასუფთავება ახალი `speechSynthesis`-ის წინ. */
export function resetSpeechForTests() {
  if (voiceTimer) clearTimeout(voiceTimer);
  voiceTimer = null;
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('pagehide', cancelSpeech);
  }
  initialized = false;
  voice = null;
  run = 0;
  snapshot = { status: 'pending', phase: 'idle', voiceName: null };
}
