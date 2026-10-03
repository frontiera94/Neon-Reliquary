import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Consume any stdin piped into this process (e.g. Antigravity hook payload)
let stdinBuffer = '';
if (!process.stdin.isTTY) {
  try {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      stdinBuffer += chunk;
    });
  } catch {
    // Ignore stdin read errors
  }
}

process.stderr.write('\n🔍 [Test Hook] Avvio validazione di tutti i test...\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const startTime = Date.now();
const result = spawnSync(npmCmd, ['test'], {
  cwd: projectRoot,
  stdio: ['inherit', 'pipe', 'pipe'],
  encoding: 'utf8',
  shell: isWindows
});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

// Stream test output to stderr so stdout remains clean JSON for Agent hook systems
if (result.stdout) {
  process.stderr.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.stderr.write(`\n❌ [Test Hook] FALLITO in ${elapsed}s! Alcuni test sono falliti.\n`);
  process.exit(result.status || 1);
} else {
  process.stderr.write(`\n✅ [Test Hook] SUCCESSO in ${elapsed}s! Tutti i test sono validati.\n`);
  // Antigravity PostToolUse hook contract expects `{}` on stdout
  process.stdout.write('{}\n');
  process.exit(0);
}
