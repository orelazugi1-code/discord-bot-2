const {
  SlashCommandBuilder, PermissionFlagsBits,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alien-attack')
    .setDescription('Deploy a futuristic multi-action command panel')
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Create an Alien Command Center panel in a channel')
      .addChannelOption(o =>
        o.setName('channel').setDescription('Channel to post the panel in').setRequired(true))
      .addStringOption(o =>
        o.setName('title').setDescription('Panel title').setRequired(true))
      .addStringOption(o =>
        o.setName('b1_label').setDescription('Button 1 label (assigns a role)').setRequired(true))
      .addRoleOption(o =>
        o.setName('b1_role').setDescription('Role to toggle via Button 1').setRequired(true))
      .addStringOption(o =>
        o.setName('b2_label').setDescription('Button 2 label (opens a ticket)').setRequired(true))
      .addStringOption(o =>
        o.setName('description').setDescription('Panel description / flavour text').setRequired(false))
      .addStringOption(o =>
        o.setName('b3_label').setDescription('Button 3 label (opens a form)').setRequired(false))
      .addIntegerOption(o =>
        o.setName('b3_form_id')
          .setDescription('Form ID for Button 3 (use /form-setup to create one first)')
          .setRequired(false)
          .setMinValue(1))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'setup') return;

    const channel  = interaction.options.getChannel('channel');
    const title    = interaction.options.getString('title');
    const desc     = interaction.options.getString('description') || '';
    const b1Label  = interaction.options.getString('b1_label');
    const b1Role   = interaction.options.getRole('b1_role');
    const b2Label  = interaction.options.getString('b2_label');
    const b3Label  = interaction.options.getString('b3_label');
    const b3FormId = interaction.options.getInteger('b3_form_id');

    // ── ANSI art header inside a code block ────────────────────────────────────
    const ansi =
      '\u001b[2;35m╔══════════════════════════════════╗\n' +
      '\u001b[1;36m║  \u001b[1;35m⚡\u001b[1;36m  A L I E N  C O M M A N D  \u001b[1;35m⚡\u001b[1;36m  ║\n' +
      '\u001b[1;36m║       C E N T E R                ║\n' +
      '\u001b[2;35m╚══════════════════════════════════╝\u001b[0m';

    const embed = new EmbedBuilder()
      .setTitle('🛸  ' + title)
      .setDescription(
        '```ansi\n' + ansi + '\n```' +
        (desc ? '\n\n' + desc : '') +
        '\n\n🌌  *Select an action below:*',
      )
      .setColor(0x00E5FF)
      .setFooter({ text: '⚡ VECTOR  •  Galactic Interface' })
      .setTimestamp();

    // ── Buttons ────────────────────────────────────────────────────────────────
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('alien_role:' + b1Role.id)
        .setLabel(b1Label)
        .setEmoji('👾')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket:open')
        .setLabel(b2Label)
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Secondary),
    );

    if (b3Label && b3FormId) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('form:open:' + b3FormId)
          .setLabel(b3Label)
          .setEmoji('📋')
          .setStyle(ButtonStyle.Success),
      );
    }

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      content: '✅ **Alien Attack panel** deployed in ' + channel + '!',
      ephemeral: true,
    });
  },
};
