const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const { rand } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder().setName('dice').setDescription('הימור על קוביות').setDescriptionLocalizations({ 'en-US': 'Bet on dice', 'en-GB': 'Bet on dice' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'dice_broke'), ephemeral: true });
    const you = rand(1, 6) + rand(1, 6);
    const bot = rand(1, 6) + rand(1, 6);
    let key, color;
    if (you > bot) {
      key = 'dice_win'; color = 0x2ECC71;
      db.addCoins(interaction.user.id, interaction.guild.id, bet);
    } else if (you < bot) {
      key = 'dice_lose'; color = 0xE74C3C;
      db.addCoins(interaction.user.id, interaction.guild.id, -bet);
    } else {
      key = 'dice_tie'; color = 0xF39C12;
    }
    const embed = new EmbedBuilder().setColor(color)
      .setTitle(t(lang, 'dice_title'))
      .setDescription(t(lang, key, { you, bot, amount: bet }));
    await interaction.reply({ embeds: [embed] });
  },
};
