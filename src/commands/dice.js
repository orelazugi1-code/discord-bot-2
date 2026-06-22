const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const { rand } = require('../utils');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('הימור מטורף על קוביות')
    .setDescriptionLocalizations({ 'en-US': 'Bet on an epic dice roll', 'en-GB': 'Bet on an epic dice roll' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'dice_broke'), ephemeral: true });

    await interaction.deferReply();
    const d1 = rand(1, 6), d2 = rand(1, 6);
    const b1 = rand(1, 6), b2 = rand(1, 6);
    const you = d1 + d2, bot = b1 + b2;
    const footer = { text: t(lang, 'dice_bet_footer', { amount: bet }) };

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎲 ' + t(lang, 'dice_title') + ' 🎲')
      .setDescription(
        '🎲🎲 ' + t(lang, 'dice_rolling') + '\n\n' +
        '👤 **' + t(lang, 'dice_you') + ':**  🔄  🔄\n' +
        '🤖 **' + t(lang, 'dice_bot') + ':**  🔄  🔄'
      )
      .setFooter(footer)
    ] });
    await sleep(800);

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎲 ' + t(lang, 'dice_title') + ' 🎲')
      .setDescription(
        t(lang, 'dice_your_turn') + '\n\n' +
        '👤 **' + t(lang, 'dice_you') + ':**  ' + FACE[d1] + '  ' + FACE[d2] + '  = **' + you + '**\n' +
        '🤖 **' + t(lang, 'dice_bot') + ':**  🔄  🔄'
      )
      .setFooter(footer)
    ] });
    await sleep(900);

    let key, color;
    if (you > bot) { key = 'dice_win'; color = 0x2ECC71; db.addCoins(interaction.user.id, interaction.guild.id, bet); }
    else if (you < bot) { key = 'dice_lose'; color = 0xE74C3C; db.addCoins(interaction.user.id, interaction.guild.id, -bet); }
    else { key = 'dice_tie'; color = 0xF39C12; }

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(color)
      .setTitle('🎲 ' + t(lang, 'dice_title') + ' 🎲')
      .setDescription(
        '👤 **' + t(lang, 'dice_you') + ':**  ' + FACE[d1] + '  ' + FACE[d2] + '  = **' + you + '**\n' +
        '🤖 **' + t(lang, 'dice_bot') + ':**  ' + FACE[b1] + '  ' + FACE[b2] + '  = **' + bot + '**\n\n' +
        t(lang, key, { you, bot, amount: bet })
      )
      .setFooter(footer)
    ] });
  },
};
