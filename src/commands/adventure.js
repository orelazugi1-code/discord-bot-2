const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t, get } = require('../i18n');
const { fmtTime, rand, pick } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder().setName('adventure').setDescription('צא להרפתקה וחפש אוצרות').setDescriptionLocalizations({ 'en-US': 'Go on an adventure and find treasures', 'en-GB': 'Go on an adventure and find treasures' }),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const c = db.getChar(interaction.user.id, interaction.guild.id);
    if (!c) return interaction.reply({ content: t(lang, 'rpg_no_char'), ephemeral: true });
    if (c.hp <= 0) return interaction.reply({ content: t(lang, 'rpg_dead'), ephemeral: true });
    const now = Date.now();
    const last = c.last_adventure ? new Date(c.last_adventure).getTime() : 0;
    const cd = 300000;
    if (now - last < cd) return interaction.reply({ content: t(lang, 'adv_wait', { time: fmtTime(cd - (now - last), lang) }), ephemeral: true });
    c.last_adventure = new Date(now).toISOString();
    const roll = Math.random();
    const embed = new EmbedBuilder().setTitle(t(lang, 'adv_title'));
    if (roll < 0.25) {
      const amount = rand(50, 200) * Math.ceil(c.level / 3);
      db.addCoins(interaction.user.id, interaction.guild.id, amount);
      embed.setColor(0xFFD700).setDescription(t(lang, 'adv_coins', { amount }));
    } else if (roll < 0.45) {
      const amount = rand(20, 60) * Math.ceil(c.level / 2);
      c.xp += amount;
      const xpNeeded = c.level * 100;
      let lvlText = '';
      while (c.xp >= xpNeeded) {
        c.xp -= c.level * 100;
        c.level++;
        c.max_hp += 10;
        c.hp = c.max_hp;
        c.attack += 3;
        c.defense += 2;
      }
      embed.setColor(0x3498DB).setDescription(t(lang, 'adv_xp', { amount }));
    } else if (roll < 0.65) {
      const isWeapon = Math.random() < 0.5;
      const list = isWeapon ? get(lang, 'weapons') : get(lang, 'armors');
      const idx = Math.min(Math.floor(c.level / 3), list.length - 1);
      const minIdx = Math.max(0, idx - 2);
      const name = list[rand(minIdx, idx)];
      const type = isWeapon ? 'weapon' : 'armor';
      const power = rand(1, 3) + Math.floor(c.level / 2);
      db.addItem(interaction.user.id, interaction.guild.id, name, type, power);
      const typeText = t(lang, isWeapon ? 'type_weapon' : 'type_armor');
      embed.setColor(0xE67E22).setDescription(t(lang, 'adv_item', { item: name, power, type: typeText }));
    } else if (roll < 0.85) {
      const monsters = get(lang, 'monsters').filter(m => c.level >= m.minLvl && c.level <= m.maxLvl + 3);
      const monster = pick(monsters.length ? monsters : get(lang, 'monsters').slice(0, 3));
      embed.setColor(0xE74C3C).setDescription(t(lang, 'adv_monster', { monster: monster.name }));
    } else {
      embed.setColor(0x95A5A6).setDescription(t(lang, 'adv_nothing'));
    }
    db.saveChar(interaction.user.id, interaction.guild.id, c);
    await interaction.reply({ embeds: [embed] });
  },
};
