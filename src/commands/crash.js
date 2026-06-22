const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../i18n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.04) return 1.00;
  return Math.floor((1 / (1 - r)) * 100) / 100;
}

function buildBar(mult) {
  const filled = Math.min(10, Math.floor(mult));
  const block = mult < 2 ? '🟩' : mult < 3.5 ? '🟨' : mult < 5 ? '🟧' : '🟥';
  return block.repeat(filled) + '⬛'.repeat(10 - filled);
}

function multColor(mult) {
  if (mult < 2) return 0x2ECC71;
  if (mult < 3.5) return 0xF1C40F;
  if (mult < 5) return 0xE67E22;
  return 0xE74C3C;
}

const activeGames = new Map();

module.exports = {
  activeGames,
  data: new SlashCommandBuilder()
    .setName('crash')
    .setDescription('משחק קראש — תצא לפני שזה קורס!')
    .setDescriptionLocalizations({ 'en-US': 'Crash game — cash out before it crashes!', 'en-GB': 'Crash game — cash out before it crashes!' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'crash_broke'), ephemeral: true });

    const gameKey = `${interaction.user.id}:${interaction.guild.id}`;
    if (activeGames.has(gameKey)) return interaction.reply({ content: t(lang, 'crash_already'), ephemeral: true });

    await interaction.deferReply();
    const crashPoint = generateCrashPoint();
    const game = {
      bet, crashPoint, multiplier: 1.00,
      userId: interaction.user.id, guildId: interaction.guild.id,
      cashedOut: false, lang,
    };
    activeGames.set(gameKey, game);

    const footer = { text: t(lang, 'crash_bet_footer', { amount: bet }) };
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`crash_out:${gameKey}`)
        .setLabel('💰 ' + t(lang, 'crash_cashout'))
        .setStyle(ButtonStyle.Success)
    );

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('📈  ' + t(lang, 'crash_title') + '  📈')
      .setDescription('**×1.00**\n\n' + buildBar(1) + '\n\n🚀 ' + t(lang, 'crash_starting'))
      .setFooter(footer)
    ], components: [row] });
    await sleep(1200);

    let ticks = 0;
    while (!game.cashedOut && game.multiplier < crashPoint && ticks < 30) {
      const increment = 0.1 + Math.random() * 0.2 + (game.multiplier - 1) * 0.04;
      game.multiplier = Math.round((game.multiplier + increment) * 100) / 100;

      if (game.multiplier >= crashPoint) break;
      if (game.cashedOut) break;

      const fire = game.multiplier >= 5 ? ' 🔥' : game.multiplier >= 3 ? ' ⚡' : '';

      await interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(multColor(game.multiplier))
        .setTitle('📈  ' + t(lang, 'crash_title') + '  📈')
        .setDescription('# ×' + game.multiplier.toFixed(2) + fire + '\n\n' + buildBar(game.multiplier) + '\n\n🚀 ' + t(lang, 'crash_running'))
        .setFooter(footer)
      ], components: [row] });

      ticks++;
      await sleep(1100);
    }

    activeGames.delete(gameKey);

    if (game.cashedOut) {
      const winnings = Math.floor(bet * game.cashOutMult) - bet;
      db.addCoins(interaction.user.id, interaction.guild.id, winnings);
      const totalPayout = Math.floor(bet * game.cashOutMult);
      const bigWin = game.cashOutMult >= 3;
      await interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('💰  ' + t(lang, 'crash_title') + '  💰')
        .setDescription(
          '# ×' + game.cashOutMult.toFixed(2) + ' ✅\n\n' +
          buildBar(game.cashOutMult) +
          (bigWin ? '\n\n🌟✨💫✨🌟' : '') +
          '\n\n' + t(lang, 'crash_win', { mult: game.cashOutMult.toFixed(2), amount: totalPayout })
        )
        .setFooter(footer)
      ], components: [] });
    } else {
      db.addCoins(interaction.user.id, interaction.guild.id, -bet);
      await interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('💥  ' + t(lang, 'crash_title') + '  💥')
        .setDescription(
          '# ×' + crashPoint.toFixed(2) + ' 💥\n\n' +
          '🟥'.repeat(10) +
          '\n\n💥 ' + t(lang, 'crash_crashed', { mult: crashPoint.toFixed(2), amount: bet })
        )
        .setFooter(footer)
      ], components: [] });
    }
  },
};
