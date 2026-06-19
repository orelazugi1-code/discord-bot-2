require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const db   = require('./src/database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
const cmdDir = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, async c => {
  console.log(`✅ ${c.user.tag} online | ${client.commands.size} commands | ${c.guilds.cache.size} guilds`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction, db);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const msg = { content: '❌ שגיאה, נסה שוב.', ephemeral: true };
    if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {});
    else interaction.reply(msg).catch(() => {});
  }
});

require('./dashboard/server');

const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set.');
} else {
  client.login(BOT_TOKEN).catch(err => console.error('Login failed:', err.message));
}
