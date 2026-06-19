const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('בדוק את המטבעות שלך')
    .setDescriptionLocalizations({ 'en-US': 'Check your coins', 'en-GB': 'Check your coins' })
    .addUserOption(o => o.setName('user').setDescription('משתמש אחר').setDescriptionLocalizations({ 'en-US': 'Another user', 'en-GB': 'Another user' })),
  async execute(interaction, db) {
    const target = interaction.options.getUser('user') || interaction.user;
    const lang = db.getLang(interaction.user.id);
    const e = db.getEcon(target.id, interaction.guild.id);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(t(lang, 'bal_title', { user: target.displayName }))
      .addFields(
        { name: t(lang, 'bal_wallet'), value: `${e.wallet.toLocaleString()} 🪙`, inline: true },
        { name: t(lang, 'bal_bank'), value: `${e.bank.toLocaleString()} 🪙`, inline: true },
        { name: t(lang, 'bal_net'), value: `${(e.wallet + e.bank).toLocaleString()} 🪙`, inline: true },
      )
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
