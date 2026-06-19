const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('language').setDescription('שנה את שפת הבוט אצלך').setDescriptionLocalizations({ 'en-US': 'Change bot language for you', 'en-GB': 'Change bot language for you' })
    .addStringOption(o => o.setName('lang').setDescription('בחר שפה').setDescriptionLocalizations({ 'en-US': 'Choose language', 'en-GB': 'Choose language' }).setRequired(true)
      .addChoices({ name: '🇮🇱 עברית', value: 'he' }, { name: '🇺🇸 English', value: 'en' })),
  async execute(interaction, db) {
    const newLang = interaction.options.getString('lang');
    db.setLang(interaction.user.id, newLang);
    const langName = t(newLang, newLang === 'he' ? 'lang_he' : 'lang_en');
    const embed = new EmbedBuilder().setColor(0x3498DB)
      .setDescription(t(newLang, 'lang_set', { lang: langName }));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
