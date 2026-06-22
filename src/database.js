require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'data')
  : (process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'bot.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_prefs (
    user_id  TEXT PRIMARY KEY,
    language TEXT DEFAULT 'he'
  );
  CREATE TABLE IF NOT EXISTS economy (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    wallet     INTEGER DEFAULT 0,
    bank       INTEGER DEFAULT 0,
    last_daily TEXT,
    daily_streak INTEGER DEFAULT 0,
    last_work  TEXT,
    last_crime TEXT,
    last_rob   TEXT,
    PRIMARY KEY (user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS rpg_characters (
    user_id         TEXT NOT NULL,
    guild_id        TEXT NOT NULL,
    name            TEXT NOT NULL,
    class           TEXT NOT NULL,
    level           INTEGER DEFAULT 1,
    xp              INTEGER DEFAULT 0,
    hp              INTEGER DEFAULT 100,
    max_hp          INTEGER DEFAULT 100,
    attack          INTEGER DEFAULT 10,
    defense         INTEGER DEFAULT 5,
    monsters_killed INTEGER DEFAULT 0,
    last_adventure  TEXT,
    last_battle     TEXT,
    PRIMARY KEY (user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS rpg_inventory (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT NOT NULL,
    guild_id  TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    power     INTEGER DEFAULT 0,
    equipped  INTEGER DEFAULT 0
  );
`);

const q = {
  getLang:       db.prepare('SELECT language FROM user_prefs WHERE user_id = ?'),
  setLang:       db.prepare('INSERT OR REPLACE INTO user_prefs (user_id, language) VALUES (?, ?)'),

  getEcon:       db.prepare('SELECT * FROM economy WHERE user_id = ? AND guild_id = ?'),
  initEcon:      db.prepare('INSERT OR IGNORE INTO economy (user_id, guild_id) VALUES (?, ?)'),
  setWallet:     db.prepare('UPDATE economy SET wallet = ? WHERE user_id = ? AND guild_id = ?'),
  setBank:       db.prepare('UPDATE economy SET bank = ? WHERE user_id = ? AND guild_id = ?'),
  setDaily:      db.prepare('UPDATE economy SET last_daily = ?, daily_streak = ? WHERE user_id = ? AND guild_id = ?'),
  setWork:       db.prepare('UPDATE economy SET last_work = ? WHERE user_id = ? AND guild_id = ?'),
  setCrime:      db.prepare('UPDATE economy SET last_crime = ? WHERE user_id = ? AND guild_id = ?'),
  setRob:        db.prepare('UPDATE economy SET last_rob = ? WHERE user_id = ? AND guild_id = ?'),
  topEcon:       db.prepare('SELECT * FROM economy WHERE guild_id = ? ORDER BY (wallet + bank) DESC LIMIT 10'),

  getChar:       db.prepare('SELECT * FROM rpg_characters WHERE user_id = ? AND guild_id = ?'),
  createChar:    db.prepare('INSERT INTO rpg_characters (user_id, guild_id, name, class, hp, max_hp, attack, defense) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  saveChar:      db.prepare('UPDATE rpg_characters SET level=?, xp=?, hp=?, max_hp=?, attack=?, defense=?, monsters_killed=?, last_adventure=?, last_battle=? WHERE user_id=? AND guild_id=?'),
  deleteChar:    db.prepare('DELETE FROM rpg_characters WHERE user_id = ? AND guild_id = ?'),
  topRpg:        db.prepare('SELECT * FROM rpg_characters WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10'),

  getItems:      db.prepare('SELECT * FROM rpg_inventory WHERE user_id = ? AND guild_id = ?'),
  getEquipped:   db.prepare('SELECT * FROM rpg_inventory WHERE user_id = ? AND guild_id = ? AND equipped = 1'),
  addItem:       db.prepare('INSERT INTO rpg_inventory (user_id, guild_id, item_name, item_type, power) VALUES (?, ?, ?, ?, ?)'),
  equipItem:     db.prepare('UPDATE rpg_inventory SET equipped = 1 WHERE id = ? AND user_id = ?'),
  unequipType:   db.prepare('UPDATE rpg_inventory SET equipped = 0 WHERE user_id = ? AND guild_id = ? AND item_type = ?'),
  deleteItem:    db.prepare('DELETE FROM rpg_inventory WHERE id = ? AND user_id = ?'),
  clearInv:      db.prepare('DELETE FROM rpg_inventory WHERE user_id = ? AND guild_id = ?'),
};

function getEcon(userId, guildId) {
  q.initEcon.run(userId, guildId);
  return q.getEcon.get(userId, guildId);
}

function addCoins(userId, guildId, amount) {
  const e = getEcon(userId, guildId);
  const newVal = Math.max(0, e.wallet + amount);
  q.setWallet.run(newVal, userId, guildId);
  return newVal;
}

module.exports = {
  getLang:  userId => q.getLang.get(userId)?.language || 'he',
  setLang:  (userId, lang) => q.setLang.run(userId, lang),

  getEcon,
  addCoins,
  setWallet: (userId, guildId, v) => { getEcon(userId, guildId); q.setWallet.run(v, userId, guildId); },
  setBank:   (userId, guildId, v) => { getEcon(userId, guildId); q.setBank.run(v, userId, guildId); },
  setDaily:  (userId, guildId, time, streak) => q.setDaily.run(time, streak, userId, guildId),
  setWork:   (userId, guildId, time) => q.setWork.run(time, userId, guildId),
  setCrime:  (userId, guildId, time) => q.setCrime.run(time, userId, guildId),
  setRob:    (userId, guildId, time) => q.setRob.run(time, userId, guildId),
  topEcon:   guildId => q.topEcon.all(guildId),

  getChar:    (userId, guildId) => q.getChar.get(userId, guildId),
  createChar: (userId, guildId, name, cls, hp, maxHp, atk, def) => q.createChar.run(userId, guildId, name, cls, hp, maxHp, atk, def),
  saveChar:   (userId, guildId, c) => q.saveChar.run(c.level, c.xp, c.hp, c.max_hp, c.attack, c.defense, c.monsters_killed, c.last_adventure || null, c.last_battle || null, userId, guildId),
  deleteChar: (userId, guildId) => { q.deleteChar.run(userId, guildId); q.clearInv.run(userId, guildId); },
  topRpg:     guildId => q.topRpg.all(guildId),

  getItems:   (userId, guildId) => q.getItems.all(userId, guildId),
  getEquipped:(userId, guildId) => q.getEquipped.all(userId, guildId),
  addItem:    (userId, guildId, name, type, power) => q.addItem.run(userId, guildId, name, type, power),
  equipItem:  (userId, id, guildId, type) => { q.unequipType.run(userId, guildId, type); q.equipItem.run(id, userId); },
  deleteItem: (userId, id) => q.deleteItem.run(id, userId),

  resetPlayer: (userId, guildId) => {
    q.deleteChar.run(userId, guildId);
    q.clearInv.run(userId, guildId);
    getEcon(userId, guildId);
    q.setWallet.run(0, userId, guildId);
    q.setBank.run(0, userId, guildId);
  },
};
