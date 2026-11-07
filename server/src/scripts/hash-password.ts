// Usage: npm run hash-password            (prompts, input hidden)
//        npm run hash-password -- 'pass'  (argument, for scripts)
// Paste the printed hash into .env as ADMIN_PASSWORD_HASH.
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline';

async function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(prompt);
    // Swallow the echo so the password does not land in the terminal scrollback.
    const output = rl as unknown as { _writeToOutput: (s: string) => void };
    output._writeToOutput = () => {};
    rl.question('', (answer) => {
      process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

const given = process.argv[2];
const password = given ?? (await readHidden('Password: '));
if (password.length < 12) {
  console.error('Use at least 12 characters.');
  process.exit(1);
}
console.log(await bcrypt.hash(password, 12));
