import '../alias.js';

/**
 * `npm run server:restore -- --in <ფაილი> --confirm <MONGODB_DB> [--drop]` — ასლის აღდგენა
 * (`db/backup.js`): მიგრაცია → ჩაწერა (validator-ით) → რაოდენობის შედარება. `--confirm` სამიზნე ბაზის
 * სახელს უნდა ემთხვეოდეს (შემთხვევით სხვა ბაზაზე არ გაეშვება); ბაზა ცარიელი უნდა იყოს — `--drop`
 * არსებულს შლის (სესიების ჩათვლით: ყველა თავიდან შედის).
 */

const { CliError, runCli } = await import('./db-cli.js');
const { importDatabase } = await import('../db/backup.js');

const args = process.argv.slice(2);
/** @param {string} name */
const value = (name) => {
  const at = args.indexOf(name);
  return at > -1 ? args[at + 1] : undefined;
};

await runCli('restore', async (database, config) => {
  const file = value('--in');
  const confirm = value('--confirm');
  const known = new Set(['--in', '--confirm', '--drop', file, confirm]);
  const unknown = args.filter((arg) => !known.has(arg));
  if (!file || unknown.length) {
    throw new CliError('არგუმენტები: --in <ფაილი> --confirm <MONGODB_DB> [--drop]');
  }
  if (confirm !== config.mongo.dbName) {
    throw new CliError(
      `--confirm სამიზნე ბაზის სახელს უნდა ემთხვეოდეს (MONGODB_DB=${config.mongo.dbName})`,
    );
  }
  const { createdAt, counts } = await importDatabase(database, file, {
    drop: args.includes('--drop'),
    retention: config.retention,
  });
  console.log(
    `restore: ${createdAt}-ის ასლი → ${config.mongo.dbName} — ${Object.entries(counts)
      .map(([name, n]) => `${name} ${n}`)
      .join(', ')}`,
  );
});
