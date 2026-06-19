const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('pay').setDescription('שלם מטבעות למישהו').setDescriptionLocalizations({ 'en-US': 'Pay coins to someone', 'en-GB': 'Pay coins to someone' })
    .addUserOption(o => o.setName('user').setDescription('למי לשלם').setDescriptionLocalizations({ 'en-US': 'Who to pay', 'en-GB': 'Who to pay' }).setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('כמה').setDescriptionLocalizations({ 'en-US': 'How much', 'en-GB': 'How much' }).setRequired(true).setMinValue(1)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    if (target.id === interaction.user.id) return interaction.reply({ content: t(lang, 'pay_self'), ephemeral: true });
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < amount) return interaction.reply({ content: t(lang, 'pay_broke'), ephemeral: true });
    db.addCoins(interaction.user.id, interaction.guild.id, -amount);
    db.addCoins(target.id, interaction.guild.id, amount);
    const embed = new EmbedBuilder().setColor(0x2ECC71)
      .setDescription(t(lang, 'pay_done', { amount, target: target.displayName }));
    await interaction.reply({ embeds: [embed] });
  },
};
