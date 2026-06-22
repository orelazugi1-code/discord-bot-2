const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('הימור מטורף על הטלת מטבע')
    .setDescriptionLocalizations({ 'en-US': 'Bet on a wild coin flip', 'en-GB': 'Bet on a wild coin flip' })
    .addStringOption(o => o.setName('side').setDescription('עץ או פלי').setDescriptionLocalizations({ 'en-US': 'Heads or tails', 'en-GB': 'Heads or tails' }).setRequired(true)
      .addChoices({ name: '🟡 עץ / Heads', value: 'heads' }, { name: '⚪ פלי / Tails', value: 'tails' }))
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const side = interaction.options.getString('side');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'cf_broke'), ephemeral: true });

    await interaction.deferReply();
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === side;
    const footer = { text: t(lang, 'cf_bet_footer', { amount: bet, side: t(lang, side) }) };

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🪙 ' + t(lang, 'cf_title'))
      .setDescription('# 🪙\n\n⬆️ ' + t(lang, 'cf_tossing'))
      .setFooter(footer)
    ] });
    await sleep(600);

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🪙 ' + t(lang, 'cf_title'))
      .setDescription('# ⚪\n\n🔄 ' + t(lang, 'cf_spinning'))
      .setFooter(footer)
    ] });
    await sleep(500);

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🪙 ' + t(lang, 'cf_title'))
      .setDescription('# 🟡\n\n🔄 ' + t(lang, 'cf_spinning'))
      .setFooter(footer)
    ] });
    await sleep(600);

    db.addCoins(interaction.user.id, interaction.guild.id, won ? bet : -bet);
    const bigEmoji = result === 'heads' ? '🟡' : '⚪';

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(won ? 0x2ECC71 : 0xE74C3C)
      .setTitle('🪙 ' + t(lang, 'cf_title'))
      .setDescription(
        '# ' + bigEmoji + '\n\n**' + t(lang, result) + '!**\n\n' +
        (won ? '✅ ' + t(lang, 'cf_win', { amount: bet }) : '❌ ' + t(lang, 'cf_lose', { amount: bet }))
      )
      .setFooter(footer)
    ] });
  },
};
