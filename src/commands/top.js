const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('top').setDescription('טבלת המובילים'),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const menu = new StringSelectMenuBuilder()
      .setCustomId('top_select')
      .setPlaceholder(lang === 'he' ? 'בחר קטגוריה...' : 'Select category...')
      .addOptions([
        { label: t(lang, 'top_coins'), value: 'coins', emoji: '💰' },
        { label: t(lang, 'top_rpg'), value: 'rpg', emoji: '⚔️' },
      ]);
    const embed = await buildLeaderboard('coins', interaction.guild, db, lang);
    const row = new ActionRowBuilder().addComponents(menu);
    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 120000 });
    collector.on('collect', async i => {
      const uLang = db.getLang(i.user.id);
      const em = await buildLeaderboard(i.values[0], interaction.guild, db, uLang);
      await i.update({ embeds: [em], components: [row] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  },
};

async function buildLeaderboard(type, guild, db, lang) {
  const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(t(lang, 'top_title'));
  if (type === 'coins') {
    const rows = db.topEcon(guild.id);
    if (!rows.length) return embed.setDescription(t(lang, 'top_empty'));
    const medals = ['🥇', '🥈', '🥉'];
    const lines = await Promise.all(rows.map(async (r, i) => {
      const member = await guild.members.fetch(r.user_id).catch(() => null);
      const name = member?.displayName || `<@${r.user_id}>`;
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} ${name} — **${(r.wallet + r.bank).toLocaleString()}** 🪙`;
    }));
    embed.setDescription(lines.join('\n'));
  } else {
    const rows = db.topRpg(guild.id);
    if (!rows.length) return embed.setDescription(t(lang, 'top_empty'));
    const medals = ['🥇', '🥈', '🥉'];
    const lines = await Promise.all(rows.map(async (r, i) => {
      const member = await guild.members.fetch(r.user_id).catch(() => null);
      const name = member?.displayName || `<@${r.user_id}>`;
      const medal = medals[i] || `**${i + 1}.**`;
      const cls = t(lang, r.class);
      return `${medal} ${name} — ${cls} Lv.**${r.level}** (${r.monsters_killed} 💀)`;
    }));
    embed.setDescription(lines.join('\n'));
  }
  return embed;
}
