const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('give-coins').setDescription('תן מטבעות למשתמש')
    .addUserOption(o => o.setName('user').setDescription('למי').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('כמה').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    db.addCoins(target.id, interaction.guild.id, amount);
    const embed = new EmbedBuilder().setColor(0x2ECC71)
      .setDescription(t(lang, 'admin_give', { amount, target: target.displayName }));
    await interaction.reply({ embeds: [embed] });
  },
};
