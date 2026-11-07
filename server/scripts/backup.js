import '../alias.js';

/**
 * `npm run server:backup [-- --out <ფაილი>]` — ბაზის ლოგიკური ასლი (`db/backup.js`, gzip NDJSON, 0600).
 * ნაგულისხმევი ფაილი — `mc-backup-<თარიღი>.ndjson.gz` მიმდინარე საქაღალდეში; არსებულს არ გადაწერს.
 * წარმოების ბაზაზეც ეშვება (წაკითხვა). ფაილი პერსონალურ მონაცემს შეიცავს — `docs/deploy.md`.
 */

const { CliError, runCli } = await import('./db-cli.js');
const { exportDatabase } = await import('../db/backup.js');

const args = process.argv.slice(2);

await runCli('backup', async (database) => {
  const out = args[0] === '--out' && args[1] ? args[1] : null;
  if (args.length && (!out || args.length > 2)) {
    throw new CliError('არგუმენტი: --out <ფაილი>');
  }
  const file = out ?? `mc-backup-${new Date().toISOString().slice(0, 10)}.ndjson.gz`;
  try {
    const counts = await exportDatabase(database.db, file);
    console.log(
      `backup: ${file} — ${Object.entries(counts)
        .map(([name, n]) => `${name} ${n}`)
        .join(', ')}`,
    );
  } catch (error) {
    if (/** @type {any} */ (error)?.code === 'EEXIST') {
      throw new CliError(`ფაილი უკვე არსებობს: ${file}`);
    }
    throw error;
  }
});
