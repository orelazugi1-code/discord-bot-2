const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t, get } = require('../i18n');
const { fmtTime, rand, pick } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder().setName('crime').setDescription('בצע פשע — מסוכן אבל משתלם').setDescriptionLocalizations({ 'en-US': 'Commit a crime — risky but rewarding', 'en-GB': 'Commit a crime — risky but rewarding' }),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    const now = Date.now();
    const last = e.last_crime ? new Date(e.last_crime).getTime() : 0;
    const cd = 3600000;
    if (now - last < cd) {
      return interaction.reply({ content: t(lang, 'crime_wait', { time: fmtTime(cd - (now - last), lang) }), ephemeral: true });
    }
    db.setCrime(interaction.user.id, interaction.guild.id, new Date(now).toISOString());
    const success = Math.random() < 0.5;
    if (success) {
      const amount = rand(300, 1000);
      db.addCoins(interaction.user.id, interaction.guild.id, amount);
      const crime = pick(get(lang, 'crimes'));
      const embed = new EmbedBuilder().setColor(0x2ECC71)
        .setDescription(t(lang, 'crime_got', { crime, amount }));
      await interaction.reply({ embeds: [embed] });
    } else {
      const amount = rand(200, 500);
      db.addCoins(interaction.user.id, interaction.guild.id, -amount);
      const embed = new EmbedBuilder().setColor(0xE74C3C)
        .setDescription(t(lang, 'crime_fail', { amount }));
      await interaction.reply({ embeds: [embed] });
    }
  },
};
