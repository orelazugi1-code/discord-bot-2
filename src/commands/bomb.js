const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../i18n');
const { rand } = require('../utils');

const TOTAL = 9;

function getMultiplier(found, bombCount) {
  const diamonds = TOTAL - bombCount;
  let prob = 1.0;
  for (let i = 0; i < found; i++) prob *= (diamonds - i) / (TOTAL - i);
  return Math.max(1.0, Math.round((0.95 / prob) * 100) / 100);
}

const activeGames = new Map();

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
    const profit = Math.floor(game.bet * game.currentMult) - game.bet;
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bomb_out:${game.key}`)
        .setLabel('Cash Out')
        .setEmoji('💰')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`bomb_profit:${game.key}`)
        .setLabel(`Profit: ${profit}`)
        .setEmoji('💎')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    ));
  }
  return rows;
}

module.exports = {
  activeGames,
  data: new SlashCommandBuilder()
    .setName('bomb')
    .setDescription('משחק פצצות ויהלומים — מצא את היהלומים!')
    .setDescriptionLocalizations({ 'en-US': 'Bombs & Diamonds — find the diamonds!', 'en-GB': 'Bombs & Diamonds — find the diamonds!' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'bomb_broke'), ephemeral: true });

    const gameKey = `${interaction.user.id}:${interaction.guild.id}`;
    if (activeGames.has(gameKey)) return interaction.reply({ content: t(lang, 'bomb_already'), ephemeral: true });

    await interaction.deferReply();

    const bombCount = rand(2, 5);
    const tiles = Array(TOTAL).fill(null).map(() => ({ type: 'diamond', revealed: false }));
    const positions = Array.from({ length: TOTAL }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    for (let i = 0; i < bombCount; i++) tiles[positions[i]].type = 'bomb';

    const game = {
      key: gameKey, tiles, bet, bombCount,
      diamondCount: TOTAL - bombCount,
      found: 0, currentMult: 1.0,
      userId: interaction.user.id, guildId: interaction.guild.id,
      lang, ended: false,
    };
    activeGames.set(gameKey, game);

    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x2B2D31).setTitle('💣 Mines 💎')],
      components: buildGrid(game, false),
    });

    setTimeout(() => {
      if (activeGames.has(gameKey) && !game.ended) {
        game.ended = true;
        activeGames.delete(gameKey);
        db.addCoins(game.userId, game.guildId, -bet);
        interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle('💣💥').setDescription('⏰ ' + t(lang, 'bomb_timeout', { amount: bet }))],
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
        embeds: [new EmbedBuilder().setColor(0x2ECC71).setDescription('💰 **+' + winnings + '** ' + t(game.lang, 'bomb_coins'))],
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
        embeds: [new EmbedBuilder().setColor(0xE74C3C).setDescription('💣 **-' + game.bet + '** ' + t(game.lang, 'bomb_coins'))],
        components: buildGrid(game, true),
      });
    }

    game.found++;
    game.currentMult = getMultiplier(game.found, game.bombCount);

    if (game.found === game.diamondCount) {
      game.ended = true;
      activeGames.delete(gameKey);
      const total = Math.floor(game.bet * game.currentMult);
      const winnings = total - game.bet;
      db.addCoins(game.userId, game.guildId, winnings);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🌟💎🌟').setDescription('💰 **+' + winnings + '** ' + t(game.lang, 'bomb_coins'))],
        components: buildGrid(game, true),
      });
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x2B2D31).setTitle('💣 Mines 💎')],
      components: buildGrid(game, false),
    });
  },
};
