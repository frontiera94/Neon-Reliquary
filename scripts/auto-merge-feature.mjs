#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const currentRepoDir = path.resolve(__dirname, '..');

// Consume any stdin piped into this process (e.g. Antigravity hook payload)
let stdinBuffer = '';
if (!process.stdin.isTTY) {
  try {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      stdinBuffer += chunk;
    });
  } catch {
    // Ignore stdin read errors
  }
}

function runGit(args, cwd = currentRepoDir) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_PREFIX;
  return execSync(`git ${args}`, { cwd, env, encoding: 'utf8' }).trim();
}

function log(msg) {
  process.stderr.write(`\n🔀 [Auto-Merge Hook] ${msg}\n`);
}

function findMainWorktree() {
  try {
    const raw = runGit('worktree list --porcelain');
    const lines = raw.split('\n');
    let currentWorktree = null;

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        currentWorktree = line.replace('worktree ', '').trim();
      } else if (line.startsWith('branch ')) {
        const branch = line.replace('branch ', '').trim();
        if (branch === 'refs/heads/main' || branch === 'refs/heads/master') {
          return {
            path: currentWorktree,
            branch: branch.replace('refs/heads/', ''),
          };
        }
      }
    }
  } catch {
    // Fallback if worktree parsing fails
  }
  return null;
}

async function main() {
  try {
    const currentBranch = runGit('rev-parse --abbrev-ref HEAD');
    if (currentBranch === 'main' || currentBranch === 'master') {
      log(`Sei già sul branch principale "${currentBranch}". Nessun merge necessario.`);
      process.stdout.write('{}\n');
      process.exit(0);
    }

    if (currentBranch === 'HEAD') {
      log('Attenzione: sei in stato detached HEAD. Impossibile fare merge automatico.');
      process.stdout.write('{}\n');
      process.exit(0);
    }

    log(`Rilevato branch feature: "${currentBranch}".`);

    // Verify uncommitted changes in current directory
    const status = runGit('status --porcelain');
    if (status.length > 0) {
      log(
        `Attenzione: ci sono modifiche non committate su "${currentBranch}". Effettua il commit prima di eseguire il merge.`
      );
      process.stdout.write('{}\n');
      process.exit(0);
    }

    // Locate main repository / worktree
    const mainTarget = findMainWorktree();
    if (!mainTarget) {
      log('❌ Impossibile individuare il worktree o branch principale (main/master).');
      process.exit(1);
    }

    const targetDir = mainTarget.path;
    const targetBranch = mainTarget.branch;

    log(`Target di merge identificato: directory "${targetDir}" su branch "${targetBranch}".`);

    // Check if targetDir is clean
    const targetStatus = runGit('status --porcelain', targetDir);
    if (targetStatus.length > 0) {
      log(
        `⚠️ La working directory di "${targetDir}" non è pulita. Impossibile eseguire il merge automatico senza rischiare conflitti.`
      );
      process.exit(1);
    }

    // Check if current branch is already merged into targetBranch
    const isMerged = runGit(
      `branch --merged ${targetBranch}`,
      targetDir
    )
      .split('\n')
      .map((b) => b.trim().replace(/^\*\s*/, ''))
      .includes(currentBranch);

    if (isMerged) {
      log(`Il branch "${currentBranch}" risulta già mergiato in "${targetBranch}". Nessuna azione necessaria.`);
      process.stdout.write('{}\n');
      process.exit(0);
    }

    const skipTests = process.argv.includes('--skip-tests');

    if (!skipTests) {
      // Run tests before merging to safeguard main
      log('Esecuzione validazione test pre-merge...');
      const testResult = spawnSync('node', ['scripts/validate-tests.mjs'], {
        cwd: currentRepoDir,
        stdio: ['inherit', 'pipe', 'inherit'],
      });

      if (testResult.status !== 0) {
        log(
          `❌ Impossibile effettuare il merge: i test su "${currentBranch}" non passano! Risolvi gli errori prima del merge.`
        );
        process.exit(1);
      }
    } else {
      log('Validazione test saltata (--skip-tests attivo).');
    }

    // Perform merge
    log(`Merge di "${currentBranch}" dentro "${targetBranch}"...`);
    const mergeOutput = runGit(
      `merge --no-ff "${currentBranch}" -m "Merge branch '${currentBranch}' into ${targetBranch}"`,
      targetDir
    );
    log(`✅ Merge completato con successo:\n${mergeOutput}`);

    // Push target branch to remote origin
    try {
      log(`Push del branch "${targetBranch}" su origin...`);
      const pushOutput = runGit(`push origin ${targetBranch}`, targetDir);
      log(`🚀 Push su origin/${targetBranch} completato con successo:\n${pushOutput}`);
    } catch (pushErr) {
      log(`⚠️ Push automatico non riuscito: ${pushErr.message}`);
    }

    process.stdout.write('{}\n');
    process.exit(0);
  } catch (err) {
    log(`❌ Errore durante l'auto-merge: ${err.message}`);
    process.exit(1);
  }
}

main();
