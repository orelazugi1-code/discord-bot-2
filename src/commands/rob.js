const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const { fmtTime, rand } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder().setName('rob').setDescription('שדוד משתמש אחר').setDescriptionLocalizations({ 'en-US': 'Rob another user', 'en-GB': 'Rob another user' })
    .addUserOption(o => o.setName('user').setDescription('מי לשדוד').setDescriptionLocalizations({ 'en-US': 'Who to rob', 'en-GB': 'Who to rob' }).setRequired(true)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) return interaction.reply({ content: t(lang, 'rob_self'), ephemeral: true });
    if (target.bot) return interaction.reply({ content: t(lang, 'rob_bot'), ephemeral: true });
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    const now = Date.now();
    const last = e.last_rob ? new Date(e.last_rob).getTime() : 0;
    const cd = 7200000;
    if (now - last < cd) {
      return interaction.reply({ content: t(lang, 'rob_wait', { time: fmtTime(cd - (now - last), lang) }), ephemeral: true });
    }
    const te = db.getEcon(target.id, interaction.guild.id);
    if (te.wallet < 50) return interaction.reply({ content: t(lang, 'rob_broke', { target: target.displayName }), ephemeral: true });
    db.setRob(interaction.user.id, interaction.guild.id, new Date(now).toISOString());
    const success = Math.random() < 0.4;

    if (success) {
      const pct = rand(10, 30) / 100;
      const amount = Math.floor(te.wallet * pct);
      db.addCoins(interaction.user.id, interaction.guild.id, amount);
      db.addCoins(target.id, interaction.guild.id, -amount);
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('💰 ' + t(lang, 'rob_success_title'))
        .setDescription(
          '🏃💨\n\n' +
          t(lang, 'rob_got', { target: target.displayName, amount })
        )
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .setFooter({ text: t(lang, 'rob_footer_success') });
      await interaction.reply({ embeds: [embed] });
    } else {
      const amount = rand(100, 300);
      db.addCoins(interaction.user.id, interaction.guild.id, -amount);
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🚨 ' + t(lang, 'rob_busted_title') + ' 🚨')
        .setDescription(
          '━━━━━━━━━━━━━━━━━\n' +
          '🚔🚔🚔🚔🚔🚔🚔🚔🚔\n' +
          '━━━━━━━━━━━━━━━━━\n\n' +
          '👮 **' + t(lang, 'rob_busted_header') + '** 👮\n\n' +
          t(lang, 'rob_fail', { amount }) + '\n\n' +
          '🔒 ' + t(lang, 'rob_busted_jail')
        )
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: t(lang, 'rob_footer_fail') });
      await interaction.reply({ embeds: [embed] });
    }
  },
};
