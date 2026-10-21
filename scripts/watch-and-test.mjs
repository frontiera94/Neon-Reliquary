import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const watchedDirs = ['src', 'api'];
const validExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css']);

let runningProcess = null;
let debounceTimer = null;
let isQueued = false;

function runValidation() {
  if (runningProcess) {
    isQueued = true;
    return;
  }

  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '🔄 [Watch Hook] Rilevata modifica al codice. Rilancio tutti i test...\n');

  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  const startTime = Date.now();
  runningProcess = spawn(npmCmd, ['test'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: isWindows
  });

  runningProcess.on('close', (code) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    runningProcess = null;

    if (code === 0) {
      console.log('\n\x1b[32m%s\x1b[0m', `✅ [Watch Hook] Tutti i test superati con successo in ${elapsed}s! In attesa di nuove modifiche...`);
    } else {
      console.log('\n\x1b[31m%s\x1b[0m', `❌ [Watch Hook] I test sono falliti (exit ${code}) in ${elapsed}s. Risolvi gli errori sopra! In attesa di modifiche...`);
    }

    if (isQueued) {
      isQueued = false;
      runValidation();
    }
  });
}

function scheduleValidation(filename) {
  const ext = path.extname(filename || '');
  if (filename && !validExtensions.has(ext)) {
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    runValidation();
  }, 300);
}

console.log('\x1b[35m%s\x1b[0m', '👀 [Watch Hook] File watcher attivo su src/ e api/ (test su ogni salvataggio)...');
console.log('Premi Ctrl+C per terminare.\n');

// Initial run
runValidation();

// Start watching
for (const dir of watchedDirs) {
  const fullPath = path.join(projectRoot, dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.watch(fullPath, { recursive: true }, (_eventType, filename) => {
        scheduleValidation(filename);
      });
    } catch (err) {
      console.error(`Errore nel monitoraggio della cartella ${dir}:`, err);
    }
  }
}
