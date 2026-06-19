const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('deposit').setDescription('הפקד מטבעות לבנק').setDescriptionLocalizations({ 'en-US': 'Deposit coins to bank', 'en-GB': 'Deposit coins to bank' })
    .addIntegerOption(o => o.setName('amount').setDescription('כמה (0 = הכל)').setDescriptionLocalizations({ 'en-US': 'How much (0 = all)', 'en-GB': 'How much (0 = all)' }).setRequired(true).setMinValue(0)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet <= 0) return interaction.reply({ content: t(lang, 'dep_broke'), ephemeral: true });
    let amount = interaction.options.getInteger('amount');
    if (amount === 0 || amount > e.wallet) amount = e.wallet;
    db.setWallet(interaction.user.id, interaction.guild.id, e.wallet - amount);
    db.setBank(interaction.user.id, interaction.guild.id, e.bank + amount);
    const embed = new EmbedBuilder().setColor(0x3498DB)
      .setDescription(t(lang, 'dep_done', { amount }));
    await interaction.reply({ embeds: [embed] });
  },
};
