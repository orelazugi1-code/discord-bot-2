require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/', (req, res) => res.send(`
  <html><body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <div style="text-align:center">
      <h1>⚔️ Victor Bot</h1>
      <p>Games | Economy | RPG</p>
      <p style="color:#888">Bot is online and running.</p>
    </div>
  </body></html>
`));

app.listen(PORT, () => {
  console.log('✅ Dashboard → http://localhost:' + PORT);
  const url = process.env.REDIRECT_URI?.replace('/auth/callback', '/health');
  if (url) setInterval(() => { fetch(url).catch(() => {}); }, 5 * 60 * 1000);
});
