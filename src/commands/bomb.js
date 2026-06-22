const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../i18n');
const { rand } = require('../utils');

const MULT_TABLE = {
  2: [1.1, 1.25, 1.5, 1.8, 2.2, 2.8, 3.5],
  3: [1.15, 1.4, 1.8, 2.3, 3.0, 4.0],
  4: [1.2, 1.6, 2.2, 3.2, 5.0],
  5: [1.4, 2.0, 3.5, 6.0],
  6: [1.8, 3.0, 7.0],
};

const activeGames = new Map();

function buildMultList(game) {
  const mults = MULT_TABLE[game.bombCount];
  return mults.map((m, i) => {
    const done = i < game.found;
    const next = i === game.found;
    const icon = done ? '✅' : next ? '➡️' : '⬜';
    const val = next ? `**×${m.toFixed(2)}**` : `×${m.toFixed(2)}`;
    return `${icon} 💎×${i + 1} = ${val}`;
  }).join('\n');
}

function buildGrid(game, revealAll) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const tile = game.tiles[i];
      const btn = new ButtonBuilder().setCustomId(`bomb_tile:${game.key}:${i}`);
      if (tile.revealed || revealAll) {
        if (tile.type === 'diamond') {
          btn.setEmoji('💎').setStyle(ButtonStyle.Success).setDisabled(true);
        } else {
          btn.setEmoji('💣').setStyle(ButtonStyle.Danger).setDisabled(true);
        }
      } else {
        btn.setEmoji('⬜').setStyle(ButtonStyle.Secondary).setDisabled(!!game.ended);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  if (!game.ended) {
    const payout = Math.floor(game.bet * game.currentMult);
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bomb_out:${game.key}`)
        .setLabel(`💰 Cash Out — ${payout}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(game.found === 0)
    ));
  }
  return rows;
}

function buildEmbed(game, status, color) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle('💣 ' + t(game.lang, 'bomb_title') + ' 💎')
    .setDescription(buildMultList(game) + '\n\n' + (status || ''))
    .setFooter({ text: t(game.lang, 'bomb_bet_footer', { amount: game.bet, bombs: game.bombCount }) });
}

module.exports = {
  activeGames,
  data: new SlashCommandBuilder()
    .setName('bomb')
    .setDescription('משחק פצצות ויהלומים — מצא את היהלומים, תיזהר מפצצות!')
    .setDescriptionLocalizations({ 'en-US': 'Bombs & Diamonds — find diamonds, avoid bombs!', 'en-GB': 'Bombs & Diamonds — find diamonds, avoid bombs!' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'bomb_broke'), ephemeral: true });

    const gameKey = `${interaction.user.id}:${interaction.guild.id}`;
    if (activeGames.has(gameKey)) return interaction.reply({ content: t(lang, 'bomb_already'), ephemeral: true });

    await interaction.deferReply();

    const bombCount = rand(2, 6);
    const tiles = Array(9).fill(null).map(() => ({ type: 'diamond', revealed: false }));
    const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    for (let i = 0; i < bombCount; i++) tiles[positions[i]].type = 'bomb';

    const game = {
      key: gameKey, tiles, bet, bombCount,
      diamondCount: 9 - bombCount,
      found: 0, currentMult: 1.0,
      userId: interaction.user.id, guildId: interaction.guild.id,
      lang, ended: false,
    };
    activeGames.set(gameKey, game);

    await interaction.editReply({
      embeds: [buildEmbed(game, '🎯 ' + t(lang, 'bomb_pick'), 0xFFD700)],
      components: buildGrid(game, false),
    });

    setTimeout(() => {
      if (activeGames.has(gameKey) && !game.ended) {
        game.ended = true;
        activeGames.delete(gameKey);
        db.addCoins(game.userId, game.guildId, -bet);
        interaction.editReply({
          embeds: [buildEmbed(game, '⏰ ' + t(lang, 'bomb_timeout', { amount: bet }), 0xE74C3C)],
          components: buildGrid(game, true),
        }).catch(() => {});
      }
    }, 60000);
  },

  async handleButton(interaction, db) {
    const parts = interaction.customId.split(':');
    const action = parts[0];
    const gameKey = parts[1] + ':' + parts[2];
    const game = activeGames.get(gameKey);

    if (!game || game.ended) return interaction.deferUpdate().catch(() => {});
    if (interaction.user.id !== game.userId) return interaction.reply({ content: t(game.lang, 'bomb_not_yours'), ephemeral: true });

    await interaction.deferUpdate();

    if (action === 'bomb_out') {
      game.ended = true;
      activeGames.delete(gameKey);
      const total = Math.floor(game.bet * game.currentMult);
      const winnings = total - game.bet;
      db.addCoins(game.userId, game.guildId, winnings);
      return interaction.editReply({
        embeds: [buildEmbed(game, '💰 ' + t(game.lang, 'bomb_cashout', { mult: game.currentMult.toFixed(2), amount: total }), 0x2ECC71)],
        components: buildGrid(game, true),
      });
    }

    const index = parseInt(parts[3]);
    const tile = game.tiles[index];
    if (tile.revealed) return;

    tile.revealed = true;

    if (tile.type === 'bomb') {
      game.ended = true;
      activeGames.delete(gameKey);
      db.addCoins(game.userId, game.guildId, -game.bet);
      return interaction.editReply({
        embeds: [buildEmbed(game, '💥💣 ' + t(game.lang, 'bomb_exploded', { amount: game.bet }), 0xE74C3C)],
        components: buildGrid(game, true),
      });
    }

    game.found++;
    const mults = MULT_TABLE[game.bombCount];
    game.currentMult = mults[game.found - 1] || game.currentMult;

    if (game.found === game.diamondCount) {
      game.ended = true;
      activeGames.delete(gameKey);
      const total = Math.floor(game.bet * game.currentMult);
      const winnings = total - game.bet;
      db.addCoins(game.userId, game.guildId, winnings);
      return interaction.editReply({
        embeds: [buildEmbed(game, '🌟✨ ' + t(game.lang, 'bomb_all_found', { mult: game.currentMult.toFixed(2), amount: total }), 0xFFD700)],
        components: buildGrid(game, true),
      });
    }

    return interaction.editReply({
      embeds: [buildEmbed(game, '💎 ' + t(game.lang, 'bomb_diamond_found'), 0x3498DB)],
      components: buildGrid(game, false),
    });
  },
};
