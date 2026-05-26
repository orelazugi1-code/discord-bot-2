// In-memory store for multi-step setup flows (ticket-setup, button-panel).
// Key: `${guildId}:${userId}`, Value: session object with expiresAt.
const sessions = new Map();

// Purge expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (now > v.expiresAt) sessions.delete(k);
  }
}, 10 * 60_000);

module.exports = sessions;
