const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('reset-player').setDescription('אפס את כל הנתונים של שחקן').setDescriptionLocalizations({ 'en-US': 'Reset all player data', 'en-GB': 'Reset all player data' })
    .addUserOption(o => o.setName('user').setDescription('מי לאפס').setDescriptionLocalizations({ 'en-US': 'Who to reset', 'en-GB': 'Who to reset' }).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user');
    db.resetPlayer(target.id, interaction.guild.id);
    const embed = new EmbedBuilder().setColor(0xE74C3C)
      .setDescription(t(lang, 'admin_reset', { target: target.displayName }));
    await interaction.reply({ embeds: [embed] });
  },
};
