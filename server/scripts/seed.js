import '../alias.js';

/**
 * `npm run server:seed [-- --reset]` — mock-ის მონაცემი ბაზაში (dev / staging). ჯერ მიგრაცია, მერე
 * seed ერთ ტრანზაქციაში, ბოლოს `validateContent` ბაზიდან წაკითხულზე (შენიშვნა → exit 1).
 * წარმოებაში არ ეშვება; მომხმარებელს არ ქმნის (B3).
 */

const { CliError, runCli } = await import('./db-cli.js');
const { migrate } = await import('../migrations/index.js');
const { seedDatabase } = await import('../db/seed.js');

const args = process.argv.slice(2);
const reset = args.includes('--reset');

await runCli(
  'seed',
  async (database, config) => {
    const unknown = args.filter((arg) => arg !== '--reset');
    if (unknown.length)
      throw new CliError(`უცნობი არგუმენტი: ${unknown.join(' ')} (მხოლოდ --reset)`);
    await migrate(database.db, { retention: config.retention });
    const { counts, issues } = await seedDatabase(database, { reset });
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    console.log(
      `seed: ${total} მასალა (${Object.entries(counts)
        .map(([type, n]) => `${type} ${n}`)
        .join(', ')}), პარამეტრები 1, მომხმარებელი 0`,
    );
    console.log(`validateContent: ${issues.length} შენიშვნა`);
    for (const { severity, entity, id, field, code } of issues) {
      console.log(`  ${severity} · ${entity}/${id} · ${field} — ${code}`);
    }
    if (issues.length) process.exitCode = 1;
  },
  { production: false },
);
