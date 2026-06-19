const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('take-coins').setDescription('קח מטבעות ממשתמש')
    .addUserOption(o => o.setName('user').setDescription('ממי').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('כמה').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    db.addCoins(target.id, interaction.guild.id, -amount);
    const embed = new EmbedBuilder().setColor(0xE74C3C)
      .setDescription(t(lang, 'admin_take', { amount, target: target.displayName }));
    await interaction.reply({ embeds: [embed] });
  },
};
