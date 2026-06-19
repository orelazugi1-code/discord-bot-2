const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

const CLASSES = {
  warrior: { hp: 120, atk: 15, def: 8 },
  mage:    { hp: 80,  atk: 20, def: 5 },
  tank:    { hp: 150, atk: 8,  def: 15 },
  rogue:   { hp: 90,  atk: 17, def: 6 },
};

module.exports = {
  data: new SlashCommandBuilder().setName('create').setDescription('צור דמות RPG חדשה')
    .addStringOption(o => o.setName('name').setDescription('שם הדמות').setRequired(true).setMaxLength(20))
    .addStringOption(o => o.setName('class').setDescription('בחר מחלקה').setRequired(true)
      .addChoices(
        { name: '⚔️ לוחם / Warrior', value: 'warrior' },
        { name: '🧙 קוסם / Mage', value: 'mage' },
        { name: '🛡️ מגן / Tank', value: 'tank' },
        { name: '🗡️ גנב / Rogue', value: 'rogue' },
      )),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const existing = db.getChar(interaction.user.id, interaction.guild.id);
    if (existing) return interaction.reply({ content: t(lang, 'rpg_exists'), ephemeral: true });
    const name = interaction.options.getString('name');
    const cls = interaction.options.getString('class');
    const stats = CLASSES[cls];
    db.createChar(interaction.user.id, interaction.guild.id, name, cls, stats.hp, stats.hp, stats.atk, stats.def);
    const embed = new EmbedBuilder().setColor(0x9B59B6)
      .setDescription(t(lang, 'rpg_created', { name, class: t(lang, cls) }))
      .addFields(
        { name: '❤️ HP', value: `${stats.hp}`, inline: true },
        { name: '⚔️ ATK', value: `${stats.atk}`, inline: true },
        { name: '🛡️ DEF', value: `${stats.def}`, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
