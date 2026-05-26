// Entry point — delegates to index.js which starts both the bot and the
// Express dashboard server in one process. This keeps things simple and ensures
// Render always detects an open port regardless of which file it runs.
require('./index');
