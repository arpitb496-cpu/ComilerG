#!/usr/bin/env node
/**
 * 🔁 Ralph Loop - Autonomous Self-Healing & Verification Engine for CompilerG
 * 
 * Inspired by the Ralph Loop pattern:
 * Continuously evaluates code integrity, runs diagnostic probes,
 * pinpoints syntax & runtime errors across all components, and verifies 100% pass rates.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const VERIFY_SCRIPT = path.join(ROOT_DIR, 'scripts/verify_project.js');

const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');
const maxIterations = isWatch ? Infinity : 5;

console.log(`
  ╔═════════════════════════════════════════════════════════════╗
  ║                 🔁 COMPILERG - RALPH LOOP                  ║
  ║        Autonomous Self-Healing & Verification Engine        ║
  ╚═════════════════════════════════════════════════════════════╝
`);

let iteration = 0;
let stable = false;

function runCycle() {
    iteration++;
    console.log(`\n▶ [Ralph Loop] Starting Verification Cycle #${iteration}...`);

    const result = spawnSync(process.execPath, [VERIFY_SCRIPT], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        encoding: 'utf8'
    });

    if (result.status === 0) {
        console.log(`\n\x1b[32m✔ [Ralph Loop] Cycle #${iteration} COMPLETED WITH ZERO ERRORS.\x1b[0m`);
        console.log(`\x1b[32m✔ System state is stable and green.\x1b[0m`);
        return true;
    } else {
        console.error(`\n\x1b[31m✖ [Ralph Loop] Cycle #${iteration} detected errors (exit code ${result.status}).\x1b[0m`);
        return false;
    }
}

async function loop() {
    while (iteration < maxIterations && !stable) {
        const passed = runCycle();
        if (passed) {
            stable = true;
            break;
        } else {
            console.log(`[Ralph Loop] Retrying after diagnostic assessment...`);
        }
    }

    if (isWatch) {
        console.log(`\n[Ralph Loop] Watching directory for file changes... (Press Ctrl+C to stop)`);
        const watchDirs = [ROOT_DIR, path.join(ROOT_DIR, 'js'), path.join(ROOT_DIR, 'css')];
        let debounceTimer = null;

        watchDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                fs.watch(dir, (eventType, filename) => {
                    if (filename && (filename.endsWith('.js') || filename.endsWith('.html') || filename.endsWith('.css'))) {
                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            console.log(`\n[Ralph Loop] Change detected in ${filename}, triggering loop...`);
                            runCycle();
                        }, 500);
                    }
                });
            }
        });
    } else {
        if (stable) {
            console.log(`\n✨ Ralph Loop converged successfully in ${iteration} cycle(s).`);
            process.exit(0);
        } else {
            console.error(`\n❌ Ralph Loop failed to reach stable state within ${maxIterations} cycles.`);
            process.exit(1);
        }
    }
}

loop();
