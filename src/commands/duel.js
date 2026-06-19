const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('duel').setDescription('אתגר שחקן אחר לדו-קרב').setDescriptionLocalizations({ 'en-US': 'Challenge another player to a duel', 'en-GB': 'Challenge another player to a duel' })
    .addUserOption(o => o.setName('user').setDescription('מי לאתגר').setDescriptionLocalizations({ 'en-US': 'Who to challenge', 'en-GB': 'Who to challenge' }).setRequired(true))
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user');
    const bet = interaction.options.getInteger('bet');
    if (target.id === interaction.user.id) return interaction.reply({ content: t(lang, 'duel_self'), ephemeral: true });
    if (target.bot) return interaction.reply({ content: t(lang, 'duel_bot'), ephemeral: true });
    const e1 = db.getEcon(interaction.user.id, interaction.guild.id);
    const e2 = db.getEcon(target.id, interaction.guild.id);
    if (e1.wallet < bet || e2.wallet < bet) return interaction.reply({ content: t(lang, 'duel_broke'), ephemeral: true });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duel_accept_${interaction.user.id}_${target.id}_${bet}`).setLabel(t(lang, 'duel_accept_btn')).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`duel_decline_${interaction.user.id}_${target.id}`).setLabel(t(lang, 'duel_decline_btn')).setStyle(ButtonStyle.Danger),
    );
    const embed = new EmbedBuilder().setColor(0x9B59B6)
      .setDescription(t(lang, 'duel_sent', { user: interaction.user.displayName, target: target.displayName, amount: bet }));
    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
      if (i.customId.startsWith('duel_accept')) {
        if (i.user.id !== target.id) return i.reply({ content: t(db.getLang(i.user.id), 'duel_not_yours'), ephemeral: true });
        collector.stop('accepted');
        const winner = Math.random() < 0.5 ? interaction.user : target;
        const loser = winner.id === interaction.user.id ? target : interaction.user;
        db.addCoins(winner.id, interaction.guild.id, bet);
        db.addCoins(loser.id, interaction.guild.id, -bet);
        const winEmbed = new EmbedBuilder().setColor(0xFFD700)
          .setDescription(t(lang, 'duel_won', { winner: winner.displayName, amount: bet }));
        await i.update({ embeds: [winEmbed], components: [] });
      } else if (i.customId.startsWith('duel_decline')) {
        if (i.user.id !== target.id) return i.reply({ content: t(db.getLang(i.user.id), 'duel_not_yours'), ephemeral: true });
        collector.stop('declined');
        const decEmbed = new EmbedBuilder().setColor(0x95A5A6)
          .setDescription(t(lang, 'duel_declined', { user: target.displayName }));
        await i.update({ embeds: [decEmbed], components: [] });
      }
    });
    collector.on('end', async (_, reason) => {
      if (reason === 'accepted' || reason === 'declined') return;
      const timeEmbed = new EmbedBuilder().setColor(0x95A5A6).setDescription(t(lang, 'duel_timeout'));
      await msg.edit({ embeds: [timeEmbed], components: [] }).catch(() => {});
    });
  },
};
