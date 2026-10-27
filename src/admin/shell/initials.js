/**
 * ინიციალები სახელიდან (ავატარი): ფრჩხილები და პუნქტუაცია იგნორდება („[სახელი გვარი]“ → „სგ“).
 * ქართული ასო მხედრულად რჩება — `toUpperCase()` მას მთავრულად (ᲡᲒ) აქცევდა; დიდდება მხოლოდ ლათინური.
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  const words = name
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => [...word][0])
    .map((ch) => (/[a-z]/.test(ch) ? ch.toUpperCase() : ch))
    .join('');
}
