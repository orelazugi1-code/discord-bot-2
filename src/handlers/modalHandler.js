const {
  PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
} = require('discord.js');
const sessions = require('../utils/setupSessions');

async function handleModal(interaction, db) {

  // ── Ticket question modal ─────────────────────────────────────────────────
  if (interaction.customId.startsWith('tq_modal:')) {
    const parts   = interaction.customId.split(':');
    const key     = `${parts[1]}:${parts[2]}`;
    const session = sessions.get(key);
    if (!session || Date.now() > session.expiresAt) {
      return interaction.reply({ content: '⏱️ Session expired. Run /ticket-setup again.', ephemeral: true });
    }
    if (!session.questions) session.questions = [];
    session.questions.push(interaction.fields.getTextInputValue('question_text').trim());
    session.expiresAt = Date.now() + 10 * 60_000;

    const qList = session.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n');
    const atMax = session.questions.length >= 5;
    const next  = session.questions.length + 1;

    const btns = new ActionRowBuilder().addComponents(
      ...(atMax ? [] : [
        new ButtonBuilder()
          .setCustomId(`tq_add:${key}`)
          .setLabel(`➕ Add Question ${next}`)
          .setStyle(ButtonStyle.Primary),
      ]),
      new ButtonBuilder()
        .setCustomId(`tq_done:${key}`)
        .setLabel('✅ Done')
        .setStyle(ButtonStyle.Success),
    );

    return interaction.reply({
      content:
        `📝 **Ticket questions so far:**\n${qList}\n\n` +
        (atMax ? '_Maximum 5 questions (Discord modal limit)_' : `_You can add ${5 - session.questions.length} more_`),
      components: [btns],
      ephemeral: true,
    });
  }

  // ── Form submission ───────────────────────────────────────────────────────
  // customId: fsubmit:<type>:<formId>
  //   type: 'modal' (mode 1) | 'yes' (mode 2, Yes path)
  if (interaction.customId.startsWith('fsubmit:')) {
    const [, responseType, formIdStr] = interaction.customId.split(':');
    const formId = parseInt(formIdStr);
    const form   = db.getForm(formId);
    if (!form) return interaction.reply({ content: '❌ Form not found.', ephemeral: true });

    // Collect answers into a plain object
    const answers = {};
    for (const [key, comp] of interaction.fields.fields) {
      answers[key] = comp.value;
    }

    await interaction.deferReply({ ephemeral: true });
    const { handleFormSubmit } = require('./buttonHandler');
    await handleFormSubmit(interaction, form, answers, responseType, db);
    return;
  }

  // ── Legacy form submission (old customId format) ──────────────────────────
  if (interaction.customId.startsWith('form_submit:')) {
    const formId = parseInt(interaction.customId.split(':')[1]);
    const form   = db.getForm(formId);
    if (!form) return interaction.reply({ content: '❌ Form not found.', ephemeral: true });

    const answers = {};
    for (const [key, comp] of interaction.fields.fields) {
      answers[key] = comp.value;
    }

    await interaction.deferReply({ ephemeral: true });
    const { handleFormSubmit } = require('./buttonHandler');
    await handleFormSubmit(interaction, form, answers, 'modal', db);
    return;
  }

  // ── Ticket creation ───────────────────────────────────────────────────────
  if (interaction.customId !== 'ticket:create') return;

  await interaction.deferReply({ ephemeral: true });

  const { guild, user } = interaction;

  const questionsConfig = db.getTicketQuestions(guild.id);
  let subject, description;
  if (questionsConfig.length === 0) {
    subject     = interaction.fields.getTextInputValue('subject');
    description = interaction.fields.getTextInputValue('description');
  } else {
    const answers = questionsConfig.slice(0, 5).map(q => ({
      question: q.question,
      answer:   interaction.fields.getTextInputValue('q_' + q.id),
    }));
    subject     = answers[0]?.answer || 'Support Request';
    description = answers.map(a => `**${a.question}**\n${a.answer}`).join('\n\n');
  }

  const config = db.getGuildConfig(guild.id);

  const open = db.getOpenTicketsByUser(guild.id, user.id);
  if (open.length >= (config.max_tickets || 1)) {
    return interaction.editReply({
      content: `❌ You already have **${open.length}** open ticket(s). Please wait for it to be resolved.`,
    });
  }

  try {
    const overwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    const roleKeys = ['support_role_id', 'support_role_id_2', 'support_role_id_3', 'support_role_id_4', 'support_role_id_5'];
    const supportRoleIds = roleKeys.map(k => config[k]).filter(Boolean);
    for (const roleId of supportRoleIds) {
      overwrites.push({
        id:    roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }

    const channelOpts = {
      name:                 `ticket-${user.username}`,
      type:                 ChannelType.GuildText,
      permissionOverwrites: overwrites,
      topic:                `Ticket by ${user.username} | Subject: ${subject}`,
    };
    if (config.ticket_category_id) channelOpts.parent = config.ticket_category_id;

    const ticketChannel = await guild.channels.create(channelOpts);
    db.createTicket(ticketChannel.id, guild.id, user.id, subject, description);
    const ticket = db.getTicketByChannel(ticketChannel.id);

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket #${ticket.id} — ${subject}`)
      .setDescription(description)
      .setColor(0x7c5af7)
      .addFields(
        { name: 'Opened By', value: `<@${user.id}>`, inline: true },
        { name: 'Status',    value: '🟢 Open',       inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `User ID: ${user.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    );

    const mentions = supportRoleIds.map(id => `<@&${id}>`).join(' ');
    await ticketChannel.send({ content: `${user} ${mentions}`.trim(), embeds: [embed], components: [row] });

    if (config.log_channel_id) {
      const logCh = guild.channels.cache.get(config.log_channel_id);
      if (logCh) {
        await logCh.send({
          embeds: [new EmbedBuilder().setTitle('🎫 New Ticket Opened').setColor(0x3ddc84)
            .addFields(
              { name: 'Channel', value: `${ticketChannel}`, inline: true },
              { name: 'User',    value: `<@${user.id}>`,    inline: true },
              { name: 'Subject', value: subject },
            ).setTimestamp()],
        });
      }
    }

    await interaction.editReply({ content: `✅ Your ticket has been opened in ${ticketChannel}!` });
  } catch (err) {
    console.error('Error creating ticket:', err);
    await interaction.editReply({ content: '❌ Failed to create your ticket. Please try again.' });
  }
}

module.exports = { handleModal };