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
      return;
    }

    // Blackjack buttons
    if (interaction.isButton() && interaction.customId.startsWith('bj_')) {
      const [actionPart, ...keyParts] = interaction.customId.split(':');
      const action = actionPart.replace('bj_', '');
      const gameKey = keyParts.join(':');
      const bjCmd = client.commands.get('blackjack');
      if (bjCmd) await bjCmd.handleButton(interaction, action, gameKey, db);
      return;
    }

    // Crash cash-out button
    if (interaction.isButton() && interaction.customId.startsWith('crash_out:')) {
      const gameKey = interaction.customId.replace('crash_out:', '');
      const crashCmd = client.commands.get('crash');
      if (!crashCmd) return;
      const game = crashCmd.activeGames.get(gameKey);
      if (!game) return interaction.deferUpdate().catch(() => {});
      if (interaction.user.id !== game.userId) return interaction.reply({ content: '❌', ephemeral: true });
      game.cashedOut = true;
      game.cashOutMult = game.multiplier;
      await interaction.deferUpdate();
      return;
    }

    // Report feedback buttons
    if (interaction.isButton() && interaction.customId === 'report_solved') {
      await interaction.update({ content: '✅ שמחים לשמוע שהבעיה נפתרה! תודה שדיווחת 💪', embeds: interaction.message.embeds, components: [] });
      try {
        const creator = await interaction.client.users.fetch('1266854019767341107');
        await creator.send(`✅ **${interaction.user.tag}** דיווח שהבעיה **נפתרה** בהצלחה! (Victor)`);
        const logCh = await interaction.client.channels.fetch('1518219986198331422').catch(() => null);
        if (logCh) await logCh.send(`✅ **${interaction.user.tag}** — בעיה נפתרה`);
      } catch {}
      return;
    }
    if (interaction.isButton() && interaction.customId === 'report_unsolved') {
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const modal = new ModalBuilder().setCustomId('report_unsolved_modal').setTitle('הבעיה לא נפתרה');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('unsolved_detail').setLabel('מה עדיין לא עובד?').setStyle(TextInputStyle.Paragraph).setPlaceholder('תפרט...').setRequired(true).setMaxLength(500)
      ));
      await interaction.showModal(modal);
      return;
    }
    if (interaction.isModalSubmit() && interaction.customId === 'report_unsolved_modal') {
      const detail = interaction.fields.getTextInputValue('unsolved_detail');
      await interaction.update({ content: '📝 תודה על הפירוט! העברנו ליוצר.', embeds: interaction.message.embeds, components: [] });
      try {
        const { EmbedBuilder } = require('discord.js');
        const creator = await interaction.client.users.fetch('1266854019767341107');
        const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('❌ בעיה לא נפתרה (Victor)')
          .addFields({ name: '👤 מדווח', value: `${interaction.user.tag}`, inline: true }, { name: '📝 פירוט', value: detail }).setTimestamp();
        await creator.send({ embeds: [embed] });
        const logCh = await interaction.client.channels.fetch('1518219986198331422').catch(() => null);
        if (logCh) await logCh.send({ embeds: [embed] });
      } catch {}
      return;
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
