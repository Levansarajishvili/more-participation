import '../alias.js';

/**
 * `npm run server:migrate` — მიგრაციები რიგით (იდემპოტენტური; განმეორებით გაშვება უსაფრთხოა).
 * deploy-ის წინ (B7) და `MESSAGES_TTL_DAYS`-ის ცვლილების შემდეგ.
 */

const { runCli } = await import('./db-cli.js');
const { countChanges, migrate } = await import('../migrations/index.js');

/** @type {Record<string, string>} */
const LABEL = {
  created: 'შეიქმნა',
  updated: 'განახლდა',
  replaced: 'ხელახლა შეიქმნა',
  unchanged: 'უცვლელი',
  extra: 'დამატებითი (მიგრაცია არ ეხება)',
};

await runCli('migrate', async (database, config) => {
  const results = await migrate(database.db, { retention: config.retention });
  for (const { id, reports } of results) {
    for (const report of reports) {
      /** @type {Record<string, number>} */
      const byChange = {};
      for (const index of report.indexes)
        byChange[index.change] = (byChange[index.change] ?? 0) + 1;
      const indexes = Object.entries(byChange)
        .map(([change, n]) => `${n} ${LABEL[change]}`)
        .join(', ');
      console.log(
        `${id} · ${report.name}: ${LABEL[report.collection]}; ინდექსები — ${indexes || 'არ არის'}`,
      );
    }
  }
  const changes = countChanges(results);
  console.log(changes ? `ცვლილება: ${changes}` : 'ცვლილება: 0 — ბაზა უკვე განახლებულია');
});
