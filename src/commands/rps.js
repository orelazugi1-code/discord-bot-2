const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const KEYS = { rock: 'rock', paper: 'paper', scissors: 'scissors' };

module.exports = {
  data: new SlashCommandBuilder().setName('rps').setDescription('אבן נייר ומספריים')
    .addStringOption(o => o.setName('choice').setDescription('מה תבחר').setRequired(true)
      .addChoices({ name: '🪨 אבן', value: 'rock' }, { name: '📄 נייר', value: 'paper' }, { name: '✂️ מספריים', value: 'scissors' }))
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setRequired(true).setMinValue(10)),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const choice = interaction.options.getString('choice');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'rps_broke'), ephemeral: true });
    const choices = Object.keys(BEATS);
    const botChoice = choices[Math.floor(Math.random() * 3)];
    const you = t(lang, KEYS[choice]);
    const bot = t(lang, KEYS[botChoice]);
    let key, color;
    if (choice === botChoice) {
      key = 'rps_tie'; color = 0xF39C12;
    } else if (BEATS[choice] === botChoice) {
      key = 'rps_win'; color = 0x2ECC71;
      db.addCoins(interaction.user.id, interaction.guild.id, bet);
    } else {
      key = 'rps_lose'; color = 0xE74C3C;
      db.addCoins(interaction.user.id, interaction.guild.id, -bet);
    }
    const embed = new EmbedBuilder().setColor(color)
      .setTitle(t(lang, 'rps_title'))
      .setDescription(t(lang, key, { you, bot, amount: bet }));
    await interaction.reply({ embeds: [embed] });
  },
};
