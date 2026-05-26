const { spawn } = require('child_process');
const path     = require('path');

// ── Dashboard runs in THIS process so Render's health-check always has an HTTP server ──
// The bot is spawned as a separate child so crashes don't kill the HTTP endpoint.
require('./dashboard/server');

// ── Bot child — auto-restart on crash ─────────────────────────────────────────
function runBot() {
  const bot = spawn(
    'node',
    ['--experimental-sqlite', path.join(__dirname, 'index.js')],
    { stdio: 'inherit', env: process.env },
  );
  bot.on('close', code => {
    console.error(`[Bot] exited with code ${code} — restarting in 3 s…`);
    setTimeout(runBot, 3000);
  });
  bot.on('error', err => console.error('[Bot] spawn error:', err));
}

runBot();
