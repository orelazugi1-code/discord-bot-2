const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('coinflip').setDescription('הימור על הטלת מטבע')
    .addStringOption(o => o.setName('side').setDescription('עץ או פלי').setRequired(true)
      .addChoices({ name: 'עץ / Heads', value: 'heads' }, { name: 'פלי / Tails', value: 'tails' }))
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setRequired(true).setMinValue(10)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const side = interaction.options.getString('side');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'cf_broke'), ephemeral: true });
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === side;
    db.addCoins(interaction.user.id, interaction.guild.id, won ? bet : -bet);
    const emoji = result === 'heads' ? '🪙' : '🔄';
    const key = won ? 'cf_win' : 'cf_lose';
    const embed = new EmbedBuilder()
      .setColor(won ? 0x2ECC71 : 0xE74C3C)
      .setTitle(t(lang, 'cf_title'))
      .setDescription(t(lang, key, { emoji, result: t(lang, result), amount: bet }));
    await interaction.reply({ embeds: [embed] });
  },
};
