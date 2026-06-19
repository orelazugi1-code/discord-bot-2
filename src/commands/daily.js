const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const { fmtTime } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('אסוף מתנה יומית').setDescriptionLocalizations({ 'en-US': 'Claim your daily reward', 'en-GB': 'Claim your daily reward' }),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    const now = Date.now();
    const last = e.last_daily ? new Date(e.last_daily).getTime() : 0;
    const diff = now - last;
    if (diff < 86400000) {
      return interaction.reply({ content: t(lang, 'daily_wait', { time: fmtTime(86400000 - diff, lang) }), ephemeral: true });
    }
    const streak = (diff < 172800000 && e.daily_streak > 0) ? e.daily_streak + 1 : 1;
    const bonus = Math.min(streak * 50, 500);
    const base = 500 + Math.floor(Math.random() * 501);
    const amount = base + bonus;
    db.addCoins(interaction.user.id, interaction.guild.id, amount);
    db.setDaily(interaction.user.id, interaction.guild.id, new Date(now).toISOString(), streak);
    const embed = new EmbedBuilder().setColor(0x2ECC71)
      .setDescription(t(lang, 'daily_got', { amount }) + '\n' + t(lang, 'daily_streak', { streak, bonus }));
    await interaction.reply({ embeds: [embed] });
  },
};
