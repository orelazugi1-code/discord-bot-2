const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SYMBOLS = ['🍒', '🍒', '🍒', '🍋', '🍋', '🍊', '🍊', '🍇', '💎', '7️⃣'];
function pick() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; }

function slotDisplay(s1, s2, s3) {
  return `━━━━━━━━━━━━━━━━━\n🎰  ${s1} **┃** ${s2} **┃** ${s3}  🎰\n━━━━━━━━━━━━━━━━━`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('שחק במכונת מזל מטורפת')
    .setDescriptionLocalizations({ 'en-US': 'Play the epic slot machine', 'en-GB': 'Play the epic slot machine' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'slots_broke'), ephemeral: true });

    await interaction.deferReply();
    const r = [pick(), pick(), pick()];
    const footer = { text: t(lang, 'slots_bet_footer', { amount: bet }) };

    const spinEmbed = (s1, s2, s3, status) => new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎰  ' + t(lang, 'slots_title') + '  🎰')
      .setDescription(slotDisplay(s1, s2, s3) + '\n\n' + status)
      .setFooter(footer);

    await interaction.editReply({ embeds: [spinEmbed('🔄', '🔄', '🔄', '⏳ ' + t(lang, 'slots_spinning'))] });
    await sleep(650);

    await interaction.editReply({ embeds: [spinEmbed(pick(), pick(), pick(), '⏳ ' + t(lang, 'slots_spinning'))] });
    await sleep(550);

    await interaction.editReply({ embeds: [spinEmbed(r[0], '🔄', '🔄', '⏳ ' + t(lang, 'slots_slowing'))] });
    await sleep(700);

    await interaction.editReply({ embeds: [spinEmbed(r[0], r[1], '🔄', '⏳ ' + t(lang, 'slots_almost'))] });
    await sleep(800);

    let mult = 0, key = 'slots_lose';
    if (r[0] === r[1] && r[1] === r[2]) {
      mult = r[0] === '7️⃣' ? 10 : r[0] === '💎' ? 7 : 5;
      key = r[0] === '7️⃣' ? 'slots_jackpot' : r[0] === '💎' ? 'slots_diamond' : 'slots_triple';
    } else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
      mult = 2;
      key = 'slots_double';
    }
    const winnings = mult > 0 ? bet * mult : -bet;
    db.addCoins(interaction.user.id, interaction.guild.id, winnings);

    const isJackpot = r[0] === '7️⃣' && r[1] === '7️⃣' && r[2] === '7️⃣';
    const isDiamond = r[0] === '💎' && r[1] === '💎' && r[2] === '💎';
    const isTriple = mult >= 5 && !isJackpot && !isDiamond;
    const isWin = mult > 0;

    const color = isJackpot ? 0xFF00FF : isDiamond ? 0x00FFFF : isTriple ? 0xFFD700 : isWin ? 0x2ECC71 : 0xE74C3C;
    const stars = isJackpot ? '\n\n🌟✨💫  **J A C K P O T**  💫✨🌟' :
      isDiamond ? '\n\n💎✨  **D I A M O N D**  ✨💎' :
      isTriple ? '\n\n🎉🎉🎉' : '';

    const result = (isWin ? `✅ ×${mult} — ` : '❌ ') + t(lang, key, { amount: Math.abs(winnings) });

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(color)
      .setTitle('🎰  ' + t(lang, 'slots_title') + '  🎰')
      .setDescription(slotDisplay(r[0], r[1], r[2]) + stars + '\n\n' + result)
      .setFooter(footer)
    ] });
  },
};
