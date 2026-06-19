const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];

module.exports = {
  data: new SlashCommandBuilder().setName('slots').setDescription('שחק במכונת מזל')
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setRequired(true).setMinValue(10)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'slots_broke'), ephemeral: true });
    const r = [SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
               SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
               SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]];
    let mult = 0, key = 'slots_lose';
    if (r[0] === r[1] && r[1] === r[2]) {
      mult = r[0] === '7️⃣' ? 10 : r[0] === '💎' ? 7 : 5;
      key = r[0] === '7️⃣' ? 'slots_jackpot' : 'slots_win';
    } else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
      mult = 2;
      key = 'slots_win';
    }
    const winnings = mult > 0 ? bet * mult : -bet;
    db.addCoins(interaction.user.id, interaction.guild.id, winnings);
    const color = mult > 0 ? 0x2ECC71 : 0xE74C3C;
    const embed = new EmbedBuilder().setColor(color)
      .setTitle(t(lang, 'slots_title'))
      .setDescription(t(lang, 'slots_spin', { r1: r[0], r2: r[1], r3: r[2] }) + '\n\n' +
        t(lang, key, { amount: Math.abs(winnings) }));
    await interaction.reply({ embeds: [embed] });
  },
};
