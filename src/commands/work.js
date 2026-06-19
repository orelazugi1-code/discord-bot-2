const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t, get } = require('../i18n');
const { fmtTime, rand, pick } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('עבוד והרווח מטבעות'),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    const now = Date.now();
    const last = e.last_work ? new Date(e.last_work).getTime() : 0;
    const cd = 1800000;
    if (now - last < cd) {
      return interaction.reply({ content: t(lang, 'work_wait', { time: fmtTime(cd - (now - last), lang) }), ephemeral: true });
    }
    const amount = rand(100, 500);
    const job = pick(get(lang, 'jobs'));
    db.addCoins(interaction.user.id, interaction.guild.id, amount);
    db.setWork(interaction.user.id, interaction.guild.id, new Date(now).toISOString());
    const embed = new EmbedBuilder().setColor(0x3498DB)
      .setDescription(t(lang, 'work_got', { job, amount }));
    await interaction.reply({ embeds: [embed] });
  },
};
