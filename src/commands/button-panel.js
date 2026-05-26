const {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, RoleSelectMenuBuilder,
} = require('discord.js');
const sessions = require('../utils/setupSessions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('button-panel')
    .setDescription('Create a self-assignable role button panel in a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post the panel in').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('Panel title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Panel description').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    const channel     = interaction.options.getChannel('channel');
    const title       = interaction.options.getString('title');
    const description = interaction.options.getString('description') ?? '';

    const key = `${interaction.guildId}:${interaction.user.id}`;
    sessions.set(key, {
      type:        'button_panel',
      channelId:   channel.id,
      guildId:     interaction.guildId,
      title,
      description,
      expiresAt:   Date.now() + 5 * 60_000,
    });

    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`bpanel:${key}`)
        .setPlaceholder('Select roles users can assign themselves...')
        .setMinValues(1)
        .setMaxValues(25),
    );

    await interaction.reply({
      content:
        `Setting up **"${title}"** panel in ${channel}.\n\n` +
        `**Select all the roles** users should be able to self-assign from this panel.\n` +
        `Each role will get its own toggle button:`,
      components: [row],
      ephemeral:  true,
    });
  },
};
