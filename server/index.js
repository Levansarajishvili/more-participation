import './alias.js';

/**
 * სერვერის entry: `node server/index.js` (Render-ის start command, `npm run server:start`).
 * `alias.js` სტატიკურად პირველია — `@/` hook ჩაირთვება, სანამ აპი (და მისი საერთო მოდულები)
 * დინამიკურად ჩაიტვირთება.
 */

const { main, describeStartupError } = await import('./main.js');

try {
  await main();
} catch (error) {
  // მხოლოდ ტიპი და უსაფრთხო ტექსტი — env-ის მნიშვნელობა (connection string) აქ არ იბეჭდება
  console.error(`[mc-api] გაშვება ვერ მოხერხდა: ${describeStartupError(error)}`);
  process.exitCode = 1;
}
