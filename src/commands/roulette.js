const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function getColor(n) {
  if (n === 0) return 'green';
  return RED.has(n) ? 'red' : 'black';
}
function colorEmoji(c) { return c === 'red' ? '🔴' : c === 'black' ? '⚫' : '🟢'; }
function colorBlock(c) { return c === 'red' ? '🟥' : c === 'black' ? '⬛' : '🟩'; }

function buildWheel(highlight) {
  const nums = [];
  for (let i = 0; i < 9; i++) {
    const n = i === 4 ? highlight : Math.floor(Math.random() * 37);
    nums.push(colorBlock(getColor(n)));
  }
  return nums.join('') + '\n' + '⠀'.repeat(4) + '🔺';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('רולטה מטורפת')
    .setDescriptionLocalizations({ 'en-US': 'Play epic Roulette', 'en-GB': 'Play epic Roulette' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10))
    .addStringOption(o => o.setName('type').setDescription('על מה להמר').setDescriptionLocalizations({ 'en-US': 'What to bet on', 'en-GB': 'What to bet on' }).setRequired(true)
      .addChoices(
        { name: '🔴 אדום / Red', value: 'red' },
        { name: '⚫ שחור / Black', value: 'black' },
        { name: '🟢 ירוק (0) / Green', value: 'green' },
        { name: '🔢 זוגי / Even', value: 'even' },
        { name: '🔢 אי-זוגי / Odd', value: 'odd' },
      ))
    .addIntegerOption(o => o.setName('number').setDescription('מספר ספציפי (0-36)').setDescriptionLocalizations({ 'en-US': 'Specific number (0-36)', 'en-GB': 'Specific number (0-36)' }).setMinValue(0).setMaxValue(36)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const type = interaction.options.getString('type');
    const specificNum = interaction.options.getInteger('number');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'rl_broke'), ephemeral: true });

    await interaction.deferReply();
    const result = Math.floor(Math.random() * 37);
    const resultColor = getColor(result);
    const betLabel = specificNum != null ? `#${specificNum}` : t(lang, 'rl_' + type);
    const footer = { text: t(lang, 'rl_bet_footer', { amount: bet, type: betLabel }) };

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎡  ' + t(lang, 'rl_title') + '  🎡')
      .setDescription(buildWheel(-1) + '\n\n🔄 ' + t(lang, 'rl_spinning'))
      .setFooter(footer)
    ] });
    await sleep(700);

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎡  ' + t(lang, 'rl_title') + '  🎡')
      .setDescription(buildWheel(-1) + '\n\n🔄 ' + t(lang, 'rl_spinning'))
      .setFooter(footer)
    ] });
    await sleep(700);

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎡  ' + t(lang, 'rl_title') + '  🎡')
      .setDescription(buildWheel(result) + '\n\n⏳ ' + t(lang, 'rl_ball_landing'))
      .setFooter(footer)
    ] });
    await sleep(800);

    let won = false;
    let mult = 0;
    if (specificNum != null && result === specificNum) { won = true; mult = 36; }
    else if (type === 'red' && resultColor === 'red') { won = true; mult = 2; }
    else if (type === 'black' && resultColor === 'black') { won = true; mult = 2; }
    else if (type === 'green' && resultColor === 'green') { won = true; mult = 14; }
    else if (type === 'even' && result !== 0 && result % 2 === 0) { won = true; mult = 2; }
    else if (type === 'odd' && result % 2 === 1) { won = true; mult = 2; }

    const winnings = won ? bet * mult : -bet;
    db.addCoins(interaction.user.id, interaction.guild.id, winnings);

    const resLine = colorEmoji(resultColor) + '  **' + result + '**  —  ' + t(lang, 'rl_' + resultColor);
    const outcomeText = won
      ? '✅ ×' + mult + ' — ' + t(lang, 'rl_win', { amount: Math.abs(winnings) })
      : '❌ ' + t(lang, 'rl_lose', { amount: bet });
    const bigWin = mult >= 14;

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(won ? (bigWin ? 0xFFD700 : 0x2ECC71) : 0xE74C3C)
      .setTitle('🎡  ' + t(lang, 'rl_title') + '  🎡')
      .setDescription(
        buildWheel(result) + '\n\n' +
        '🎯 ' + resLine +
        (bigWin ? '\n\n🌟✨💫✨🌟' : '') +
        '\n\n' + outcomeText
      )
      .setFooter(footer)
    ] });
  },
};
