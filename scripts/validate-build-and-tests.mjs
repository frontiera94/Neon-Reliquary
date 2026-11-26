#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function readStdin(timeoutMs = 300) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    let data = '';
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stdin.pause();
      resolve(data);
    };

    const timer = setTimeout(finish, timeoutMs);

    try {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', finish);
      process.stdin.on('error', finish);
      process.stdin.resume();
    } catch {
      finish();
    }
  });
}

function truncateTail(text, maxChars = 2000) {
  const trimmed = (text || '').trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `...\n${trimmed.slice(-maxChars)}`;
}

function runNpmStep(label, args) {
  process.stderr.write(`\n🔍 [Post Hook] Avvio ${label} (npm ${args.join(' ')})...\n`);
  const start = Date.now();
  const result = spawnSync(npmCmd, args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: isWindows,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  if (result.stdout) {
    process.stderr.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  const ok = result.status === 0;
  if (ok) {
    process.stderr.write(`✅ [Post Hook] ${label} completata con successo in ${elapsed}s.\n`);
  } else {
    process.stderr.write(
      `❌ [Post Hook] ${label} fallita in ${elapsed}s (exit code ${result.status ?? 1}).\n`
    );
  }

  return {
    ok,
    status: result.status ?? 1,
    elapsed,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n'),
  };
}

async function main() {
  const rawStdin = await readStdin();
  let hookPayload = null;

  if (rawStdin.trim()) {
    try {
      hookPayload = JSON.parse(rawStdin);
    } catch {
      hookPayload = null;
    }
  }

  const isHookInvocation = hookPayload !== null;

  // Avoid blocking stop on cancellation, errors, or loop limits
  if (
    isHookInvocation &&
    hookPayload.terminationReason &&
    hookPayload.terminationReason !== 'NO_TOOL_CALL'
  ) {
    process.stdout.write(`${JSON.stringify({ decision: 'allow' })}\n`);
    process.exit(0);
  }

  const totalStart = Date.now();
  const lintResult = runNpmStep('Lint', ['run', 'lint']);
  const buildResult = runNpmStep('Build', ['run', 'build']);
  const testResult = runNpmStep('Test', ['test']);
  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(2);

  if (lintResult.ok && buildResult.ok && testResult.ok) {
    process.stderr.write(
      `\n✅ [Post Hook] Lint, Build e tutti i test superati con successo in ${totalElapsed}s!\n`
    );
    process.stdout.write(`${JSON.stringify({ decision: 'allow' })}\n`);
    process.exit(0);
  }

  const failures = [];
  const details = [];

  if (!lintResult.ok) {
    failures.push('lint (`npm run lint`)');
    details.push(`--- Output Lint ---\n${truncateTail(lintResult.output)}`);
  }
  if (!buildResult.ok) {
    failures.push('build (`npm run build`)');
    details.push(`--- Output Build ---\n${truncateTail(buildResult.output)}`);
  }
  if (!testResult.ok) {
    failures.push('test (`npm test`)');
    details.push(`--- Output Test ---\n${truncateTail(testResult.output)}`);
  }

  const summary = `Validazione post-hook fallita in ${totalElapsed}s per: ${failures.join(' e ')}.`;
  process.stderr.write(`\n❌ [Post Hook] ${summary}\n`);

  if (isHookInvocation) {
    const reason = `${summary} Correggi gli errori prima di concludere.\n\n${details.join('\n\n')}`;
    process.stdout.write(`${JSON.stringify({ decision: 'continue', reason })}\n`);
    process.exit(0);
  }

  process.exit(1);
}

main();
