/**
 * კლასების შეერთება: falsy მნიშვნელობები გამოიტოვება.
 * @param {...(string | false | null | undefined)} parts
 * @returns {string}
 */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/**
 * ელემენტი „იძულებითი მდგომარეობით“ — მხოლოდ `/__kit`-ისთვის (`data-force="hover focus"`).
 * CSS-ში `:hover` და `[data-force~='hover']` ერთად წერია; წარმოების კოდი ამ ატრიბუტს არ იყენებს.
 * @typedef {'hover' | 'focus' | 'active'} ForcedState
 */
