const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder().setName('profile').setDescription('צפה בדמות ה-RPG שלך').setDescriptionLocalizations({ 'en-US': 'View your RPG character', 'en-GB': 'View your RPG character' })
    .addUserOption(o => o.setName('user').setDescription('משתמש אחר').setDescriptionLocalizations({ 'en-US': 'Another user', 'en-GB': 'Another user' })),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const target = interaction.options.getUser('user') || interaction.user;
    const c = db.getChar(target.id, interaction.guild.id);
    if (!c) return interaction.reply({ content: t(lang, 'rpg_no_char'), ephemeral: true });
    const xpNeeded = c.level * 100;
    const equipped = db.getEquipped(target.id, interaction.guild.id);
    const eqWeapon = equipped.find(i => i.item_type === 'weapon');
    const eqArmor = equipped.find(i => i.item_type === 'armor');
    const totalAtk = c.attack + (eqWeapon?.power || 0);
    const totalDef = c.defense + (eqArmor?.power || 0);
    const eqText = [];
    if (eqWeapon) eqText.push(`⚔️ ${eqWeapon.item_name} (+${eqWeapon.power})`);
    if (eqArmor) eqText.push(`🛡️ ${eqArmor.item_name} (+${eqArmor.power})`);
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(t(lang, 'profile_title', { name: c.name, class: t(lang, c.class) }))
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: t(lang, 'profile_level'), value: `${c.level}`, inline: true },
        { name: t(lang, 'profile_xp'), value: `${c.xp}/${xpNeeded}`, inline: true },
        { name: t(lang, 'profile_hp'), value: `${c.hp}/${c.max_hp}`, inline: true },
        { name: t(lang, 'profile_atk'), value: `${totalAtk}`, inline: true },
        { name: t(lang, 'profile_def'), value: `${totalDef}`, inline: true },
        { name: t(lang, 'profile_kills'), value: `${c.monsters_killed}`, inline: true },
        { name: t(lang, 'profile_equipped'), value: eqText.length ? eqText.join('\n') : t(lang, 'profile_none') },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
