const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const CREATOR_ID = '1266854019767341107';

module.exports = {
  data: new SlashCommandBuilder().setName('report').setDescription('שלח דיווח ליוצר הבוט').setDescriptionLocalizations({ 'en-US': 'Send a report to the bot creator', 'en-GB': 'Send a report to the bot creator' })
    .addStringOption(o => o.setName('text').setDescription('מה הבעיה?').setDescriptionLocalizations({ 'en-US': 'What is the issue?', 'en-GB': 'What is the issue?' }).setRequired(true)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const text = interaction.options.getString('text');
    const embed = new EmbedBuilder()
      .setColor(0x7C5AF7)
      .setTitle(t('he', 'report_title'))
      .addFields(
        { name: t('he', 'report_from'), value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
        { name: t('he', 'report_server'), value: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DM', inline: true },
        { name: t('he', 'report_text'), value: text },
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();
    try {
      const creator = await interaction.client.users.fetch(CREATOR_ID);
      await creator.send({ embeds: [embed] });
      await interaction.reply({ content: t(lang, 'report_sent'), ephemeral: true });
    } catch {
      await interaction.reply({ content: t(lang, 'report_fail'), ephemeral: true });
    }
  },
};
