const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t, get } = require('../i18n');
const { fmtTime, rand, pick } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder().setName('battle').setDescription('הילחם במפלצת').setDescriptionLocalizations({ 'en-US': 'Fight a monster', 'en-GB': 'Fight a monster' }),
  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const c = db.getChar(interaction.user.id, interaction.guild.id);
    if (!c) return interaction.reply({ content: t(lang, 'rpg_no_char'), ephemeral: true });
    if (c.hp <= 0) return interaction.reply({ content: t(lang, 'rpg_dead'), ephemeral: true });
    const now = Date.now();
    const last = c.last_battle ? new Date(c.last_battle).getTime() : 0;
    const cd = 60000;
    if (now - last < cd) return interaction.reply({ content: t(lang, 'bat_wait', { time: fmtTime(cd - (now - last), lang) }), ephemeral: true });
    c.last_battle = new Date(now).toISOString();
    const equipped = db.getEquipped(interaction.user.id, interaction.guild.id);
    const bonusAtk = equipped.filter(i => i.item_type === 'weapon').reduce((s, i) => s + i.power, 0);
    const bonusDef = equipped.filter(i => i.item_type === 'armor').reduce((s, i) => s + i.power, 0);
    const totalAtk = c.attack + bonusAtk;
    const totalDef = c.defense + bonusDef;
    const monsters = get(lang, 'monsters').filter(m => c.level >= m.minLvl && c.level <= m.maxLvl + 3);
    const monster = pick(monsters.length ? monsters : get(lang, 'monsters').slice(0, 3));
    const playerDmg = Math.max(1, totalAtk - Math.floor(monster.def * 0.5) + rand(-3, 5));
    const monsterDmg = Math.max(1, monster.atk - Math.floor(totalDef * 0.5) + rand(-3, 5));
    const turnsToKill = Math.ceil(monster.hp / playerDmg);
    const turnsToLose = Math.ceil(c.hp / monsterDmg);
    const crit = c.class === 'rogue' && Math.random() < 0.25;
    const won = crit || turnsToKill <= turnsToLose;
    const embed = new EmbedBuilder().setTitle(t(lang, 'bat_title'));
    if (won) {
      const xp = monster.xp + rand(0, Math.floor(monster.xp * 0.3));
      const coins = monster.coins + rand(0, Math.floor(monster.coins * 0.3));
      const hpLost = Math.max(0, Math.floor(monsterDmg * turnsToKill * 0.3));
      c.hp = Math.max(1, c.hp - hpLost);
      c.xp += xp;
      c.monsters_killed++;
      db.addCoins(interaction.user.id, interaction.guild.id, coins);
      let desc = t(lang, 'bat_won', { monster: monster.name, xp, coins });
      const xpNeeded = c.level * 100;
      if (c.xp >= xpNeeded) {
        c.xp -= xpNeeded;
        c.level++;
        const hpB = 10, atkB = 3, defB = 2;
        c.max_hp += hpB;
        c.hp = c.max_hp;
        c.attack += atkB;
        c.defense += defB;
        desc += t(lang, 'bat_levelup', { level: c.level, hp_bonus: hpB, atk_bonus: atkB, def_bonus: defB });
      }
      embed.setColor(0x2ECC71).setDescription(desc);
    } else {
      const hpLost = rand(Math.floor(monsterDmg * 0.5), monsterDmg * 2);
      c.hp = Math.max(0, c.hp - hpLost);
      embed.setColor(0xE74C3C).setDescription(t(lang, 'bat_lost', { monster: monster.name, hp: hpLost }));
    }
    db.saveChar(interaction.user.id, interaction.guild.id, c);
    await interaction.reply({ embeds: [embed] });
  },
};
