const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('take-coins').setDescription('קח מטבעות ממשתמש').setDescriptionLocalizations({ 'en-US': 'Take coins from a user', 'en-GB': 'Take coins from a user' })
    .addUserOption(o => o.setName('user').setDescription('ממי').setDescriptionLocalizations({ 'en-US': 'From who', 'en-GB': 'From who' }).setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('כמה').setDescriptionLocalizations({ 'en-US': 'How much', 'en-GB': 'How much' }).setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ אי אפשר לקחת מטבעות מעצמך!', ephemeral: true });
    const amount = interaction.options.getInteger('amount');
    const econ = db.getEcon(target.id, interaction.guild.id);
    if (econ.wallet < amount) return interaction.reply({ content: `❌ ל-${target.displayName} אין מספיק מטבעות (יש ${econ.wallet})`, ephemeral: true });
    db.addCoins(target.id, interaction.guild.id, -amount);
    const embed = new EmbedBuilder().setColor(0xE74C3C)
      .setDescription(t(lang, 'admin_take', { amount, target: target.displayName }));
    await interaction.reply({ embeds: [embed] });
  },
};
