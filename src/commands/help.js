const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { t, get } = require('../i18n');

const CATEGORIES = {
  economy: ['balance', 'daily', 'work', 'crime', 'rob', 'pay', 'deposit', 'withdraw'],
  games: ['slots', 'coinflip', 'rps', 'dice', 'duel', 'blackjack', 'roulette', 'crash', 'bomb'],
  rpg: ['create', 'profile', 'adventure', 'battle', 'heal'],
  admin: ['give-coins', 'take-coins', 'reset-player'],
  utility: ['top', 'language', 'report', 'help'],
};

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('הצג את כל הפקודות').setDescriptionLocalizations({ 'en-US': 'Show all commands', 'en-GB': 'Show all commands' }),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0x7C5AF7)
      .setTitle(t(lang, 'help_title'))
      .setDescription(t(lang, 'help_desc'))
      .setThumbnail(interaction.client.user.displayAvatarURL());
    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder(lang === 'he' ? 'בחר קטגוריה...' : 'Select category...')
      .addOptions([
        { label: t(lang, 'help_econ_title'), value: 'economy', emoji: '💰' },
        { label: t(lang, 'help_games_title'), value: 'games', emoji: '🎮' },
        { label: t(lang, 'help_rpg_title'), value: 'rpg', emoji: '⚔️' },
        { label: t(lang, 'help_admin_title'), value: 'admin', emoji: '🔧' },
        { label: t(lang, 'help_util_title'), value: 'utility', emoji: '🛠️' },
      ]);
    const row = new ActionRowBuilder().addComponents(menu);
    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 120000 });
    collector.on('collect', async i => {
      const uLang = db.getLang(i.user.id);
      const cat = i.values[0];
      const cmds = get(uLang, 'help_cmds');
      const titleKey = cat === 'economy' ? 'help_econ_title' : cat === 'games' ? 'help_games_title' :
        cat === 'rpg' ? 'help_rpg_title' : cat === 'admin' ? 'help_admin_title' : 'help_util_title';
      const lines = CATEGORIES[cat].map(c => cmds[c] || c).join('\n');
      const catEmbed = new EmbedBuilder()
        .setColor(0x7C5AF7)
        .setTitle(t(uLang, titleKey))
        .setDescription(lines);
      await i.update({ embeds: [catEmbed], components: [row] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  },
};
