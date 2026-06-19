const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('heal').setDescription('רפא את הדמות שלך').setDescriptionLocalizations({ 'en-US': 'Heal your character', 'en-GB': 'Heal your character' }),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const c = db.getChar(interaction.user.id, interaction.guild.id);
    if (!c) return interaction.reply({ content: t(lang, 'rpg_no_char'), ephemeral: true });
    if (c.hp >= c.max_hp) return interaction.reply({ content: t(lang, 'heal_full'), ephemeral: true });
    const missing = c.max_hp - c.hp;
    const cost = Math.max(10, Math.ceil(missing * 2));
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < cost) return interaction.reply({ content: t(lang, 'heal_broke', { cost }), ephemeral: true });
    db.addCoins(interaction.user.id, interaction.guild.id, -cost);
    const dead = c.hp <= 0;
    c.hp = c.max_hp;
    db.saveChar(interaction.user.id, interaction.guild.id, c);
    const key = dead ? 'heal_revive' : 'heal_done';
    const embed = new EmbedBuilder().setColor(0x2ECC71)
      .setDescription(t(lang, key, { hp: c.hp, max_hp: c.max_hp, cost }));
    await interaction.reply({ embeds: [embed] });
  },
};
