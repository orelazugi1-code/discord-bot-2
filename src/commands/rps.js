const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('אבן נייר ומספריים מטורף')
    .setDescriptionLocalizations({ 'en-US': 'Epic rock paper scissors', 'en-GB': 'Epic rock paper scissors' })
    .addStringOption(o => o.setName('choice').setDescription('מה תבחר').setDescriptionLocalizations({ 'en-US': 'Your choice', 'en-GB': 'Your choice' }).setRequired(true)
      .addChoices({ name: '🪨 אבן', value: 'rock' }, { name: '📄 נייר', value: 'paper' }, { name: '✂️ מספריים', value: 'scissors' }))
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const choice = interaction.options.getString('choice');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'rps_broke'), ephemeral: true });

    await interaction.deferReply();
    const choices = Object.keys(BEATS);
    const botChoice = choices[Math.floor(Math.random() * 3)];
    const footer = { text: t(lang, 'rps_bet_footer', { amount: bet }) };

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('✊ ' + t(lang, 'rps_title') + ' ✊')
      .setDescription('# ✊  ⚡  ✊\n\n' + t(lang, 'rps_shaking'))
      .setFooter(footer)
    ] });
    await sleep(1200);

    let key, color;
    if (choice === botChoice) { key = 'rps_tie'; color = 0xF39C12; }
    else if (BEATS[choice] === botChoice) { key = 'rps_win'; color = 0x2ECC71; db.addCoins(interaction.user.id, interaction.guild.id, bet); }
    else { key = 'rps_lose'; color = 0xE74C3C; db.addCoins(interaction.user.id, interaction.guild.id, -bet); }

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(color)
      .setTitle('✊ ' + t(lang, 'rps_title') + ' ✊')
      .setDescription(
        '# ' + EMOJI[choice] + '  ⚡  ' + EMOJI[botChoice] + '\n\n' +
        t(lang, key, { you: t(lang, choice), bot: t(lang, botChoice), amount: bet })
      )
      .setFooter(footer)
    ] });
  },
};
