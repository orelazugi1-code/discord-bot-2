require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const db   = require('./src/database');
const { calculateLevel } = require('./src/utils/levels');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const xpCooldowns = new Map();
const spamTracker = new Map();

// ── Load slash commands ───────────────────────────────────────────────────────

client.commands = new Collection();
const cmdDir = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
}

// ── Ready ─────────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async c => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  const rest     = new REST().setToken((process.env.BOT_TOKEN || '').trim());
  const commands = client.commands.map(cmd => cmd.data.toJSON());

  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`✅ Registered ${commands.length} global slash command(s)`);
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }

  // Auto-close tickets
  setInterval(async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      const config = db.getGuildConfig(guildId);
      if (!config.auto_close_hours || config.auto_close_hours <= 0) continue;
      const cutoff = new Date(Date.now() - config.auto_close_hours * 3_600_000);
      const stale  = db.getTicketsByGuild(guildId).filter(t => t.status === 'open' && new Date(t.created_at) < cutoff);
      for (const ticket of stale) {
        const ch = await guild.channels.fetch(ticket.channel_id).catch(() => null);
        if (ch) {
          const { closeTicketChannel } = require('./src/utils/ticketManager');
          await closeTicketChannel(ch, ticket, client.user, db, 'Auto-closed due to inactivity');
        }
      }
    }
    // Expire temp roles
    for (const tr of db.getExpiredTempRoles()) {
      const g = client.guilds.cache.get(tr.guild_id);
      if (g) {
        const m = await g.members.fetch(tr.user_id).catch(() => null);
        if (m) await m.roles.remove(tr.role_id).catch(() => {});
      }
      db.deleteTempRole(tr.id);
    }
  }, 3_600_000);
});

// ── Welcome card on member join ───────────────────────────────────────────────

client.on(Events.GuildMemberAdd, async member => {
  const config = db.getGuildConfig(member.guild.id);

  // Welcome card
  if (config.welcome_enabled && config.welcome_channel_id) {
    const ch = member.guild.channels.cache.get(config.welcome_channel_id);
    if (ch) {
      try {
        const { generateWelcomeCard } = require('./src/utils/welcomeCard');
        const cardBuf = await generateWelcomeCard(member, config);
        await ch.send({
          content: `Hey ${member}! 👋`,
          files: [{ attachment: cardBuf, name: 'welcome.png' }],
        });
      } catch (err) {
        console.error('[WelcomeCard] Error generating card:', err.message);
        // Fallback to text welcome
        const msg = (config.welcome_message || 'Welcome {user} to {server}!')
          .replace('{user}',        `<@${member.id}>`)
          .replace('{username}',    member.user.username)
          .replace('{server}',      member.guild.name)
          .replace('{membercount}', String(member.guild.memberCount));
        await ch.send(msg).catch(console.error);
      }
    }
  }

  // Auto-role on join
  if (config.auto_role_id) {
    await member.roles.add(config.auto_role_id).catch(() => {});
  }
});

// ── Goodbye on member leave ───────────────────────────────────────────────────

client.on(Events.GuildMemberRemove, async member => {
  const config = db.getGuildConfig(member.guild.id);
  if (!config.goodbye_enabled || !config.goodbye_channel_id) return;
  const ch = member.guild.channels.cache.get(config.goodbye_channel_id);
  if (!ch) return;
  const msg = (config.goodbye_message || 'Goodbye {user}, we will miss you!')
    .replace('{user}',     member.user.username)
    .replace('{username}', member.user.username)
    .replace('{server}',   member.guild.name);
  await ch.send(msg).catch(console.error);
});

// ── Interactions ──────────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction, db);
      return;
    }

    if (interaction.isButton() || interaction.isRoleSelectMenu() || interaction.isStringSelectMenu()) {
      const { handleButton } = require('./src/handlers/buttonHandler');
      await handleButton(interaction, db);
      return;
    }

    if (interaction.isModalSubmit()) {
      const { handleModal } = require('./src/handlers/modalHandler');
      await handleModal(interaction, db);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const msg = { content: '❌ An error occurred. Please try again.', ephemeral: true };
    if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {});
    else interaction.reply(msg).catch(() => {});
  }
});

// ── Messages ──────────────────────────────────────────────────────────────────

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  const ticket = db.getTicketByChannel(message.channel.id);
  if (ticket?.status === 'open') {
    db.addTicketMessage(ticket.id, message.author.id, message.author.tag,
      message.content || '[attachment/embed]', message.createdAt.toISOString());
  }

  const automod = db.getAutomodConfig(message.guild.id);
  if (automod.anti_spam_enabled || automod.link_filter_enabled ||
      automod.mention_filter_enabled || automod.bad_words.length) {
    const deleted = await runAutomod(message, automod);
    if (deleted) return;
  }

  if (!message.content.startsWith('!')) await handleXp(message);

  if (!message.content.startsWith('!')) return;
  const cmdName = message.content.slice(1).split(/\s+/)[0].toLowerCase();
  const custom  = db.getCustomCommand(message.guild.id, cmdName);
  if (!custom) return;
  if (custom.admin_only && !message.member.permissions.has('Administrator')) return;
  await message.channel.send(custom.response);
});

// ── Auto-mod ──────────────────────────────────────────────────────────────────

async function runAutomod(message, cfg) {
  const content = message.content;
  const key     = `${message.guild.id}:${message.author.id}`;

  if (cfg.anti_spam_enabled) {
    const now   = Date.now();
    const times = (spamTracker.get(key) ?? []).filter(t => now - t < 5000);
    times.push(now);
    spamTracker.set(key, times);
    if (times.length >= 5) return warnAndDelete(message, '🚫 Slow down! Anti-spam triggered.');
  }
  if (cfg.link_filter_enabled && /https?:\/\//i.test(content))
    return warnAndDelete(message, '🚫 Links are not allowed here.');
  if (cfg.mention_filter_enabled &&
      message.mentions.users.size + message.mentions.roles.size > cfg.max_mentions)
    return warnAndDelete(message, `🚫 Too many mentions (max ${cfg.max_mentions}).`);
  if (cfg.bad_words.length) {
    const lower = content.toLowerCase();
    const hit   = cfg.bad_words.find(w => lower.includes(w));
    if (hit) return warnAndDelete(message, '🚫 Your message contained a prohibited word.');
  }
  return false;
}

async function warnAndDelete(message, reason) {
  try {
    await message.delete();
    const w = await message.channel.send(`<@${message.author.id}> ${reason}`);
    setTimeout(() => w.delete().catch(() => {}), 5000);
  } catch {}
  return true;
}

// ── XP ────────────────────────────────────────────────────────────────────────

async function handleXp(message) {
  const config = db.getGuildConfig(message.guild.id);
  if (config.xp_enabled === 0) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now  = Date.now();
  if (xpCooldowns.has(key) && now - xpCooldowns.get(key) < 60_000) return;
  xpCooldowns.set(key, now);

  const xpGain  = Math.floor(Math.random() * 11) + 15;
  const updated = db.addXp(message.guild.id, message.author.id, xpGain);
  const { level: newLevel } = calculateLevel(updated.xp);

  if (newLevel > updated.level) {
    db.updateLevel(message.guild.id, message.author.id, newLevel);
    const lvlCh = config.levelup_channel_id
      ? message.guild.channels.cache.get(config.levelup_channel_id)
      : message.channel;
    if (lvlCh) await lvlCh.send(`🎉 <@${message.author.id}> leveled up to **Level ${newLevel}**!`).catch(() => {});
    const levelRoles = db.getLevelRolesUpTo(message.guild.id, newLevel);
    for (const lr of levelRoles) await message.member.roles.add(lr.role_id).catch(() => {});
  }
}

// ── Dashboard HTTP server ────────────────────────────────────────────────────
// Runs in the same process so Render always detects an open port,
// regardless of which entry-point command is used.
require('./dashboard/server');

// ── Login ─────────────────────────────────────────────────────────────────────

const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const missing = ['BOT_TOKEN', 'CLIENT_ID', 'CLIENT_SECRET', 'SESSION_SECRET']
  .filter(k => !process.env[k]?.trim());
if (missing.length) console.warn('⚠️  Missing env vars:', missing.join(', '));
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection]', reason);
});

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set. Bot will not connect to Discord.');
  console.error('   Set BOT_TOKEN in Render dashboard → Environment.');
} else {
  client.login(BOT_TOKEN).catch(err => {
    console.error('Failed to login to Discord:', err.message);
  });
}
