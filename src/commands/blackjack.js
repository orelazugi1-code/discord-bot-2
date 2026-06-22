const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../i18n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardVal(rank) {
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank);
}

function handTotal(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    total += cardVal(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function cardStr(c) { return `**${c.rank}**${c.suit}`; }
function handStr(hand) { return hand.map(cardStr).join('  '); }

function buildEmbed(lang, pHand, dHand, hideDealer, status, color, bet) {
  const pTotal = handTotal(pHand);
  const dShow = hideDealer ? [dHand[0]] : dHand;
  const dTotal = hideDealer ? cardVal(dHand[0].rank) : handTotal(dHand);
  const dealerDisplay = hideDealer
    ? cardStr(dHand[0]) + '  🂠'
    : handStr(dHand);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle('🃏  ' + t(lang, 'bj_title') + '  🃏')
    .setDescription(
      '🤵 **' + t(lang, 'bj_dealer') + ':**\n' +
      dealerDisplay + '  =  **' + dTotal + '**' +
      (hideDealer ? ' + ❓' : '') +
      '\n\n━━━━━━━━━━━━━━━\n\n' +
      '👤 **' + t(lang, 'bj_you') + ':**\n' +
      handStr(pHand) + '  =  **' + pTotal + '**' +
      (status ? '\n\n' + status : '')
    )
    .setFooter({ text: t(lang, 'bj_bet_footer', { amount: bet }) });
}

const activeGames = new Map();

module.exports = {
  activeGames,
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('שחק בלאק ג\'ק מטורף')
    .setDescriptionLocalizations({ 'en-US': 'Play epic Blackjack', 'en-GB': 'Play epic Blackjack' })
    .addIntegerOption(o => o.setName('bet').setDescription('כמה להמר').setDescriptionLocalizations({ 'en-US': 'How much to bet', 'en-GB': 'How much to bet' }).setRequired(true).setMinValue(10)),

  async execute(interaction, db) {
    const lang = db.getLang(interaction.user.id);
    const bet = interaction.options.getInteger('bet');
    const e = db.getEcon(interaction.user.id, interaction.guild.id);
    if (e.wallet < bet) return interaction.reply({ content: t(lang, 'bj_broke'), ephemeral: true });

    const gameKey = `${interaction.user.id}:${interaction.guild.id}`;
    if (activeGames.has(gameKey)) return interaction.reply({ content: t(lang, 'bj_already'), ephemeral: true });

    await interaction.deferReply();

    const deck = createDeck();
    const pHand = [deck.pop(), deck.pop()];
    const dHand = [deck.pop(), deck.pop()];

    const game = { deck, pHand, dHand, bet, userId: interaction.user.id, guildId: interaction.guild.id, lang, db, doubled: false };
    activeGames.set(gameKey, game);

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🃏  ' + t(lang, 'bj_title') + '  🃏')
      .setDescription('🂠🂠🂠🂠\n\n' + t(lang, 'bj_dealing'))
    ] });
    await sleep(1000);

    if (handTotal(pHand) === 21) {
      const winnings = Math.floor(bet * 1.5);
      db.addCoins(interaction.user.id, interaction.guild.id, winnings);
      activeGames.delete(gameKey);
      return interaction.editReply({ embeds: [
        buildEmbed(lang, pHand, dHand, false, '🌟✨ **BLACKJACK!** ✨🌟\n' + t(lang, 'bj_blackjack', { amount: winnings }), 0xFFD700, bet)
      ] });
    }

    if (handTotal(dHand) === 21) {
      db.addCoins(interaction.user.id, interaction.guild.id, -bet);
      activeGames.delete(gameKey);
      return interaction.editReply({ embeds: [
        buildEmbed(lang, pHand, dHand, false, '😱 ' + t(lang, 'bj_dealer_bj', { amount: bet }), 0xE74C3C, bet)
      ] });
    }

    const canDouble = e.wallet >= bet * 2;
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit:${gameKey}`).setLabel('🃏 ' + t(lang, 'bj_hit')).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand:${gameKey}`).setLabel('✋ ' + t(lang, 'bj_stand')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`bj_double:${gameKey}`).setLabel('💰 ' + t(lang, 'bj_double')).setStyle(ButtonStyle.Success).setDisabled(!canDouble),
    );

    await interaction.editReply({
      embeds: [buildEmbed(lang, pHand, dHand, true, '🎯 ' + t(lang, 'bj_your_turn'), 0x3498DB, bet)],
      components: [buttons],
    });

    setTimeout(() => {
      if (activeGames.has(gameKey)) {
        activeGames.delete(gameKey);
        interaction.editReply({ components: [] }).catch(() => {});
      }
    }, 60000);
  },

  async handleButton(interaction, action, gameKey, db) {
    const game = activeGames.get(gameKey);
    if (!game) return interaction.reply({ content: '❌', ephemeral: true });
    if (interaction.user.id !== game.userId) return interaction.reply({ content: t(game.lang, 'bj_not_yours'), ephemeral: true });

    await interaction.deferUpdate();
    const { deck, pHand, dHand, lang } = game;
    let bet = game.bet;

    if (action === 'hit' || action === 'double') {
      if (action === 'double') {
        game.bet = bet * 2;
        bet = game.bet;
        game.doubled = true;
      }
      pHand.push(deck.pop());
      const pTotal = handTotal(pHand);

      if (pTotal > 21) {
        db.addCoins(game.userId, game.guildId, -bet);
        activeGames.delete(gameKey);
        return interaction.editReply({
          embeds: [buildEmbed(lang, pHand, dHand, false, '💥 ' + t(lang, 'bj_bust', { amount: bet }), 0xE74C3C, bet)],
          components: [],
        });
      }

      if (pTotal === 21 || action === 'double') {
        return this.dealerPlay(interaction, gameKey);
      }

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bj_hit:${gameKey}`).setLabel('🃏 ' + t(lang, 'bj_hit')).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bj_stand:${gameKey}`).setLabel('✋ ' + t(lang, 'bj_stand')).setStyle(ButtonStyle.Secondary),
      );
      return interaction.editReply({
        embeds: [buildEmbed(lang, pHand, dHand, true, '🎯 ' + t(lang, 'bj_your_turn'), 0x3498DB, bet)],
        components: [buttons],
      });
    }

    if (action === 'stand') {
      return this.dealerPlay(interaction, gameKey);
    }
  },

  async dealerPlay(interaction, gameKey) {
    const game = activeGames.get(gameKey);
    if (!game) return;
    const { deck, pHand, dHand, bet, lang, db } = game;

    await interaction.editReply({
      embeds: [buildEmbed(lang, pHand, dHand, false, '🤵 ' + t(lang, 'bj_dealer_turn'), 0xFFD700, bet)],
      components: [],
    });
    await sleep(800);

    while (handTotal(dHand) < 17) {
      dHand.push(deck.pop());
      await interaction.editReply({
        embeds: [buildEmbed(lang, pHand, dHand, false, '🤵 ' + t(lang, 'bj_dealer_draws'), 0xFFD700, bet)],
      });
      await sleep(700);
    }

    const pTotal = handTotal(pHand);
    const dTotal = handTotal(dHand);
    let status, color;

    if (dTotal > 21) {
      db.addCoins(game.userId, game.guildId, bet);
      status = '🎉 ' + t(lang, 'bj_dealer_bust', { amount: bet });
      color = 0x2ECC71;
    } else if (pTotal > dTotal) {
      db.addCoins(game.userId, game.guildId, bet);
      status = '🎉 ' + t(lang, 'bj_win', { amount: bet });
      color = 0x2ECC71;
    } else if (pTotal < dTotal) {
      db.addCoins(game.userId, game.guildId, -bet);
      status = '😢 ' + t(lang, 'bj_lose', { amount: bet });
      color = 0xE74C3C;
    } else {
      status = '🤝 ' + t(lang, 'bj_push');
      color = 0xF39C12;
    }

    activeGames.delete(gameKey);
    await interaction.editReply({
      embeds: [buildEmbed(lang, pHand, dHand, false, status, color, bet)],
    });
  },
};
