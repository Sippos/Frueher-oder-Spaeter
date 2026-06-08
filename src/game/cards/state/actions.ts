import type { Card } from "../cards";
import type { GameState, PlayerId, PlayerState } from "./gameTypes";

function getMonsterStrength(card: Card): number {
  if (card.type !== "monster") {
    return 0;
  }

  if (typeof card.strength === "number") {
    return card.strength;
  }

  // TODO: Implement the "Du" copy-strength effect properly.
  return 0;
}

function calculateScore(player: PlayerState): number {
  return player.monsterZone.reduce((total, card) => {
    return total + getMonsterStrength(card);
  }, 0);
}

function drawOneCard(player: PlayerState): PlayerState {
  const [drawnCard, ...remainingDeck] = player.deck;

  if (!drawnCard) {
    return player;
  }

  return {
    ...player,
    deck: remainingDeck,
    hand: [...player.hand, drawnCard],
  };
}

function resetMana(player: PlayerState): PlayerState {
  return {
    ...player,
    mana: 2,
  };
}

export function startPlayPhase(game: GameState): GameState {
  if (game.phase !== "draw") {
    return game;
  }

  return {
    ...game,
    phase: "play",
    players: {
      player1: resetMana(drawOneCard(game.players.player1)),
      player2: resetMana(drawOneCard(game.players.player2)),
    },
  };
}

export function playCardFromHand(
  game: GameState,
  playerId: PlayerId,
  cardId: string
): GameState {
  if (game.phase !== "play") {
    return game;
  }

  const player = game.players[playerId];
  const cardIndex = player.hand.findIndex((card) => card.id === cardId);

  if (cardIndex === -1) {
    return game;
  }

  const card = player.hand[cardIndex];

  if (player.mana < card.mana) {
    return game;
  }

  if (card.type === "monster" && player.monsterZone.length >= 4) {
    return game;
  }

  if (card.type === "spell" && player.spellZone.length >= 4) {
    return game;
  }

  const newHand = player.hand.filter((_, index) => index !== cardIndex);

  const updatedPlayer: PlayerState = {
    ...player,
    hand: newHand,
    mana: player.mana - card.mana,
    monsterZone:
      card.type === "monster"
        ? [...player.monsterZone, card]
        : player.monsterZone,
    spellZone:
      card.type === "spell"
        ? [...player.spellZone, card]
        : player.spellZone,
  };

  return {
    ...game,
    players: {
      ...game.players,
      [playerId]: updatedPlayer,
    },
  };
}

export function endRound(game: GameState): GameState {
  if (game.phase !== "play") {
    return game;
  }

  const player1Score = calculateScore(game.players.player1);
  const player2Score = calculateScore(game.players.player2);

  const updatedPlayers = {
    player1: {
      ...game.players.player1,
      score: player1Score,
    },
    player2: {
      ...game.players.player2,
      score: player2Score,
    },
  };

  if (game.round >= game.maxRounds) {
    return {
      ...game,
      phase: "gameEnd",
      players: updatedPlayers,
    };
  }

  return {
    ...game,
    round: game.round + 1,
    phase: "draw",
    players: updatedPlayers,
  };
}

export function getWinner(game: GameState): PlayerId | "draw" | null {
  if (game.phase !== "gameEnd") {
    return null;
  }

  const player1Score = game.players.player1.score;
  const player2Score = game.players.player2.score;

  if (player1Score > player2Score) {
    return "player1";
  }

  if (player2Score > player1Score) {
    return "player2";
  }

  return "draw";
}
