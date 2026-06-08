import type { Card } from "../cards";
import type {
  GameState,
  OngoingEffect,
  PlayedMonsterCard,
  PlayedSpellCard,
  PlayerId,
  PlayerState,
  TargetRef,
  TargetRequirement,
} from "./gameTypes";

let nextInstanceNumber = 1;

function createInstanceId(cardId: string): string {
  const id = `${cardId}-${nextInstanceNumber}`;
  nextInstanceNumber += 1;
  return id;
}

function getOpponentId(playerId: PlayerId): PlayerId {
  return playerId === "player1" ? "player2" : "player1";
}

function getBaseMonsterStrength(card: Card): number {
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
    return total + card.currentStrength;
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

function updateScores(players: GameState["players"]): GameState["players"] {
  return {
    player1: {
      ...players.player1,
      score: calculateScore(players.player1),
    },
    player2: {
      ...players.player2,
      score: calculateScore(players.player2),
    },
  };
}

function applyStrengthChange(
  players: GameState["players"],
  target: TargetRef,
  amount: number
): GameState["players"] {
  const targetPlayer = players[target.playerId];

  return {
    ...players,
    [target.playerId]: {
      ...targetPlayer,
      monsterZone: targetPlayer.monsterZone.map((monster) => {
        if (monster.instanceId !== target.instanceId) {
          return monster;
        }

        return {
          ...monster,
          currentStrength: monster.currentStrength + amount,
        };
      }),
    },
  };
}

function applyRoundStartEffects(game: GameState): GameState {
  let players = game.players;

  for (const effect of game.ongoingEffects) {
    if (effect.timing === "roundStart") {
      players = applyStrengthChange(players, effect.target, effect.amount);
    }
  }

  for (const playerId of ["player1", "player2"] as const) {
    for (const monster of players[playerId].monsterZone) {
      if (monster.id === "gravis-der-unermuedliche") {
        players = applyStrengthChange(
          players,
          { playerId, instanceId: monster.instanceId },
          200
        );
      }

      if (monster.id === "murmoria-die-wirre") {
        players = applyStrengthChange(
          players,
          { playerId, instanceId: monster.instanceId },
          100
        );

        const opponentId = getOpponentId(playerId);
        const enemyTarget = players[opponentId].monsterZone[0];

        if (enemyTarget) {
          players = applyStrengthChange(
            players,
            { playerId: opponentId, instanceId: enemyTarget.instanceId },
            -100
          );
        }
      }
    }
  }

  return {
    ...game,
    players: updateScores(players),
  };
}

export function getTargetRequirement(card: Card): TargetRequirement | null {
  if (card.type !== "spell") {
    return null;
  }

  if (
    card.id === "eisenhauer-technik" ||
    card.id === "motivationsspritze" ||
    card.id === "pomodoro-technik" ||
    card.id === "fokusblume"
  ) {
    return "ownMonster";
  }

  if (
    card.id === "selbstsabotage" ||
    card.id === "deadline" ||
    card.id === "knoten-im-kopf" ||
    card.id === "hab-dich" ||
    card.id === "suesse-gruesse"
  ) {
    return "enemyMonster";
  }

  return null;
}

export function canTargetMonster(
  sourcePlayerId: PlayerId,
  requirement: TargetRequirement,
  targetPlayerId: PlayerId
): boolean {
  if (requirement === "ownMonster") {
    return sourcePlayerId === targetPlayerId;
  }

  if (requirement === "enemyMonster") {
    return sourcePlayerId !== targetPlayerId;
  }

  return true;
}

function applySpellEffect(
  game: GameState,
  playerId: PlayerId,
  card: Card,
  target?: TargetRef
): GameState {
  if (card.type !== "spell") {
    return game;
  }

  let players = game.players;
  let ongoingEffects: OngoingEffect[] = game.ongoingEffects;

  if (target) {
    if (card.id === "eisenhauer-technik") {
      players = applyStrengthChange(players, target, 300);
    }

    if (card.id === "motivationsspritze" || card.id === "pomodoro-technik") {
      players = applyStrengthChange(players, target, 600);
    }

    if (
      card.id === "selbstsabotage" ||
      card.id === "deadline" ||
      card.id === "knoten-im-kopf"
    ) {
      players = applyStrengthChange(players, target, -300);
    }

    if (card.id === "fokusblume") {
      ongoingEffects = [
        ...ongoingEffects,
        {
          id: createInstanceId("fokusblume-effect"),
          sourceCardId: card.id,
          target,
          amount: 100,
          timing: "roundStart",
        },
      ];
    }
  }

  const sourcePlayer = players[playerId];
  const playedSpell: PlayedSpellCard = {
    ...card,
    instanceId: createInstanceId(card.id),
    target,
  };

  players = {
    ...players,
    [playerId]: {
      ...sourcePlayer,
      spellZone: [...sourcePlayer.spellZone, playedSpell],
    },
  };

  return {
    ...game,
    players: updateScores(players),
    ongoingEffects,
  };
}

export function startPlayPhase(game: GameState): GameState {
  if (game.phase !== "draw") {
    return game;
  }

  const withRoundStartEffects = applyRoundStartEffects(game);

  return {
    ...withRoundStartEffects,
    phase: "play",
    players: updateScores({
      player1: resetMana(drawOneCard(withRoundStartEffects.players.player1)),
      player2: resetMana(drawOneCard(withRoundStartEffects.players.player2)),
    }),
  };
}

export function playCardFromHand(
  game: GameState,
  playerId: PlayerId,
  cardId: string,
  target?: TargetRef
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
  const targetRequirement = getTargetRequirement(card);

  if (targetRequirement && !target) {
    return game;
  }

  if (
    targetRequirement &&
    target &&
    !canTargetMonster(playerId, targetRequirement, target.playerId)
  ) {
    return game;
  }

  if (player.mana < card.mana) {
    return game;
  }

  if (card.type === "monster" && player.monsterZone.length >= 4) {
    return game;
  }

  if (card.type === "spell" && player.spellZone.length >= 4) {
    return game;
  }

  const handWithoutCard = player.hand.filter((_, index) => index !== cardIndex);
  const playerAfterCost = {
    ...player,
    hand: handWithoutCard,
    mana: player.mana - card.mana,
  };

  let nextGame: GameState = {
    ...game,
    players: {
      ...game.players,
      [playerId]: playerAfterCost,
    },
  };

  if (card.type === "monster") {
    const playedMonster: PlayedMonsterCard = {
      ...card,
      instanceId: createInstanceId(card.id),
      baseStrength: getBaseMonsterStrength(card),
      currentStrength: getBaseMonsterStrength(card),
    };

    const updatedPlayer: PlayerState = {
      ...playerAfterCost,
      monsterZone: [...playerAfterCost.monsterZone, playedMonster],
    };

    nextGame = {
      ...nextGame,
      players: updateScores({
        ...nextGame.players,
        [playerId]: updatedPlayer,
      }),
    };

    return nextGame;
  }

  return applySpellEffect(nextGame, playerId, card, target);
}

export function endRound(game: GameState): GameState {
  if (game.phase !== "play") {
    return game;
  }

  const updatedPlayers = updateScores(game.players);

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
