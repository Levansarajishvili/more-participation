import '../alias.js';

/**
 * `npm run server:create-admin` — პირველი ადმინისტრატორი (B3). მონაცემი env-იდან (`ADMIN_EMAIL`,
 * `ADMIN_NAME`, `ADMIN_PASSWORD`) ან, თუ ტერმინალია, კითხვით (პაროლი ეკრანზე არ ჩანს, ორჯერ).
 * ნაგულისხმევი პაროლი არ არსებობს; პაროლი და ელფოსტა stdout / stderr-ში არ იბეჭდება — მხოლოდ id.
 * ჯერ მიგრაცია (კოლექცია და `email_unique`), მერე `createFirstAdmin`. env-ით გაშვების შემდეგ
 * `ADMIN_PASSWORD` shell-ის ისტორიიდან / `.env`-იდან წაშალე.
 */

const { CliError, runCli } = await import('./db-cli.js');
const { migrate } = await import('../migrations/index.js');
const { createRepositories } = await import('../db/index.js');
const { createFirstAdmin } = await import('../lib/first-admin.js');

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function ask(prompt) {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
}

/**
 * ფარული შეყვანა (raw mode): სიმბოლოები ეკრანზე არ გამოჩნდება; Backspace, Enter, Ctrl+C.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    /** @param {string} chunk */
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          done();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          done();
          reject(new CliError('შეწყდა'));
          return;
        }
        if (char === '\u007f' || char === '\b') value = [...value].slice(0, -1).join('');
        else value += char;
      }
    };
    const done = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    stdin.on('data', onData);
  });
}

/** @returns {Promise<{ email: string, name: string, password: string }>} */
async function readInput() {
  const env = process.env;
  const interactive = Boolean(process.stdin.isTTY);
  const missing = ['ADMIN_EMAIL', 'ADMIN_NAME', 'ADMIN_PASSWORD'].filter((key) => !env[key]);
  if (missing.length && !interactive) {
    throw new CliError(`${missing.join(', ')}: სავალდებულოა (env ან ტერმინალიდან გაშვება)`);
  }
  const email = env.ADMIN_EMAIL || (await ask('ელფოსტა: '));
  const name = env.ADMIN_NAME || (await ask('სახელი და გვარი: '));
  let password = env.ADMIN_PASSWORD ?? '';
  if (!password) {
    password = await askHidden('პაროლი (≥ 12 სიმბოლო): ');
    if ((await askHidden('პაროლი კიდევ ერთხელ: ')) !== password) {
      throw new CliError('პაროლები არ ემთხვევა');
    }
  }
  return { email, name, password };
}

await runCli('create-admin', async (database, config) => {
  if (process.argv.length > 2) throw new CliError('არგუმენტი არ მიიღება — env ან ტერმინალი');
  const input = await readInput();
  await migrate(database.db, { retention: config.retention });
  const user = await createFirstAdmin(createRepositories(database), input);
  console.log(`ადმინისტრატორი შეიქმნა: ${user._id} — შესვლა: /admin/login`);
});
