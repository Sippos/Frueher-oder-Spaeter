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
    mana: 2 + player.bonusManaNextRound,
    bonusManaNextRound: 0,
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

function findMonster(
  players: GameState["players"],
  target?: TargetRef
): PlayedMonsterCard | undefined {
  if (!target) {
    return undefined;
  }

  return players[target.playerId].monsterZone.find(
    (monster) => monster.instanceId === target.instanceId
  );
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

function addBonusManaNextRound(
  players: GameState["players"],
  playerId: PlayerId,
  amount: number
): GameState["players"] {
  return {
    ...players,
    [playerId]: {
      ...players[playerId],
      bonusManaNextRound: players[playerId].bonusManaNextRound + amount,
    },
  };
}

function discardRandomHandCard(
  players: GameState["players"],
  playerId: PlayerId
): GameState["players"] {
  const player = players[playerId];

  if (player.hand.length === 0) {
    return players;
  }

  const randomIndex = Math.floor(Math.random() * player.hand.length);
  const discardedCard = player.hand[randomIndex];

  return {
    ...players,
    [playerId]: {
      ...player,
      hand: player.hand.filter((_, index) => index !== randomIndex),
      graveyard: [...player.graveyard, discardedCard],
    },
  };
}

function hasKomplexUndVisionaer(player: PlayerState): boolean {
  return player.spellZone.some((spell) => spell.id === "komplex-und-visionaer");
}

function applyBuff(
  players: GameState["players"],
  playerId: PlayerId,
  target: TargetRef,
  amount: number
): GameState["players"] {
  const multiplier = players[playerId].nextBuffMultiplier;
  const finalAmount = amount * multiplier;
  let nextPlayers = players;

  if (hasKomplexUndVisionaer(players[playerId])) {
    for (const monster of players[playerId].monsterZone) {
      nextPlayers = applyStrengthChange(
        nextPlayers,
        { playerId, instanceId: monster.instanceId },
        finalAmount
      );
    }
  } else {
    nextPlayers = applyStrengthChange(nextPlayers, target, finalAmount);
  }

  return {
    ...nextPlayers,
    [playerId]: {
      ...nextPlayers[playerId],
      nextBuffMultiplier: 1,
    },
  };
}

function isDebuffBlockedByRhyzer(
  game: GameState,
  target?: TargetRef
): boolean {
  const monster = findMonster(game.players, target);
  return (
    !!monster &&
    monster.id === "rhyzer-der-lichtgejagte" &&
    (game.round === 1 || game.round === 3 || game.round === 5)
  );
}

function applyDebuff(
  game: GameState,
  target: TargetRef,
  amount: number
): GameState {
  if (game.blockNextDebuff || isDebuffBlockedByRhyzer(game, target)) {
    return {
      ...game,
      blockNextDebuff: false,
    };
  }

  return {
    ...game,
    players: applyStrengthChange(game.players, target, amount),
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
    if (game.round === 6 && players[playerId].monsterZone.length === 1) {
      const onlyMonster = players[playerId].monsterZone[0];

      if (onlyMonster.id === "augri-die-sanfte-riesin") {
        players = applyStrengthChange(
          players,
          { playerId, instanceId: onlyMonster.instanceId },
          onlyMonster.currentStrength
        );
      }
    }

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

function isPositiveGefuehlCard(card: Card): boolean {
  return (
    card.id === "gefuehl-gelassenheit" ||
    card.id === "gefuehl-freude" ||
    card.id === "gefuehl-mut"
  );
}

function isNegativeGefuehlCard(card: Card): boolean {
  return (
    card.id === "gefuehl-angst" ||
    card.id === "gefuehl-scham" ||
    card.id === "gefuehl-trauer"
  );
}

function isGefuehlCard(card: Card): boolean {
  return isPositiveGefuehlCard(card) || isNegativeGefuehlCard(card);
}

function countGefuehleAfterPlay(player: PlayerState, card: Card): number {
  return player.spellZone.filter((spell) => isGefuehlCard(spell)).length +
    (isGefuehlCard(card) ? 1 : 0);
}

function getGefuehlStrengthAmount(card: Card, gefuehlCount: number): number {
  if (isPositiveGefuehlCard(card)) {
    if (gefuehlCount >= 3) {
      return 1000;
    }

    if (gefuehlCount === 2) {
      return 500;
    }

    return 100;
  }

  if (isNegativeGefuehlCard(card)) {
    if (gefuehlCount >= 3) {
      return 500;
    }

    if (gefuehlCount === 2) {
      return 300;
    }

    return 100;
  }

  return 0;
}

function isBuffCard(card: Card): boolean {
  return (
    card.id === "eisenhauer-technik" ||
    card.id === "motivationsspritze" ||
    card.id === "pomodoro-technik" ||
    isGefuehlCard(card)
  );
}

export function getTargetRequirement(card: Card): TargetRequirement | null {
  if (card.type === "monster" && card.id === "du") {
    return "enemyMonster";
  }

  if (card.type !== "spell") {
    return null;
  }

  if (
    card.id === "eisenhauer-technik" ||
    card.id === "motivationsspritze" ||
    card.id === "pomodoro-technik" ||
    card.id === "fokusblume" ||
    isGefuehlCard(card)
  ) {
    return "ownMonster";
  }

  if (
    card.id === "selbstsabotage" ||
    card.id === "deadline" ||
    card.id === "knoten-im-kopf" ||
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

function addSpellToZone(
  game: GameState,
  playerId: PlayerId,
  card: Extract<Card, { type: "spell" }>,
  target?: TargetRef
): GameState {
  const sourcePlayer = game.players[playerId];
  const playedSpell: PlayedSpellCard = {
    ...card,
    instanceId: createInstanceId(card.id),
    target,
  };

  return {
    ...game,
    players: {
      ...game.players,
      [playerId]: {
        ...sourcePlayer,
        spellZone: [...sourcePlayer.spellZone, playedSpell],
      },
    },
  };
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

  let nextGame = game;
  let players = nextGame.players;
  let ongoingEffects: OngoingEffect[] = nextGame.ongoingEffects;

  if (card.id === "auf-in-den-kampf") {
    players = {
      ...players,
      [playerId]: {
        ...players[playerId],
        nextBuffMultiplier: 2,
      },
    };
  }

  if (card.id === "auszeit") {
    nextGame = {
      ...nextGame,
      blockNextDebuff: true,
    };
  }

  if (card.id === "hab-dich") {
    players = addBonusManaNextRound(players, getOpponentId(playerId), -1);
  }

  nextGame = {
    ...nextGame,
    players,
    ongoingEffects,
  };

  if (target) {
    if (card.id === "eisenhauer-technik") {
      nextGame = {
        ...nextGame,
        players: applyBuff(nextGame.players, playerId, target, 300),
      };
    }

    if (card.id === "motivationsspritze" || card.id === "pomodoro-technik") {
      nextGame = {
        ...nextGame,
        players: applyBuff(nextGame.players, playerId, target, 600),
      };
    }

    if (
      card.id === "selbstsabotage" ||
      card.id === "deadline" ||
      card.id === "knoten-im-kopf"
    ) {
      nextGame = applyDebuff(nextGame, target, -300);
    }

    if (card.id === "fokusblume") {
      ongoingEffects = [
        ...nextGame.ongoingEffects,
        {
          id: createInstanceId("fokusblume-effect"),
          sourceCardId: card.id,
          target,
          amount: 100,
          timing: "roundStart",
        },
      ];

      nextGame = {
        ...nextGame,
        ongoingEffects,
      };
    }

    if (isGefuehlCard(card)) {
      const gefuehlCount = countGefuehleAfterPlay(nextGame.players[playerId], card);
      const strengthAmount = getGefuehlStrengthAmount(card, gefuehlCount);
      nextGame = {
        ...nextGame,
        players: applyBuff(nextGame.players, playerId, target, strengthAmount),
      };

      if (isNegativeGefuehlCard(card) && gefuehlCount >= 3) {
        nextGame = {
          ...nextGame,
          players: addBonusManaNextRound(nextGame.players, playerId, 1),
        };
      }
    }
  }

  return {
    ...addSpellToZone(nextGame, playerId, card, target),
    players: updateScores(addSpellToZone(nextGame, playerId, card, target).players),
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

  if (target && !findMonster(game.players, target)) {
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
    const copiedStrength = target
      ? findMonster(game.players, target)?.currentStrength
      : undefined;
    const baseStrength = card.id === "du" ? copiedStrength ?? 0 : getBaseMonsterStrength(card);

    const playedMonster: PlayedMonsterCard = {
      ...card,
      instanceId: createInstanceId(card.id),
      baseStrength,
      currentStrength: baseStrength,
    };

    let updatedPlayer: PlayerState = {
      ...playerAfterCost,
      monsterZone: [...playerAfterCost.monsterZone, playedMonster],
    };

    let players = {
      ...nextGame.players,
      [playerId]: updatedPlayer,
    };

    if (card.id === "nira-die-augenlose") {
      players = discardRandomHandCard(players, getOpponentId(playerId));
    }

    nextGame = {
      ...nextGame,
      players: updateScores(players),
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
