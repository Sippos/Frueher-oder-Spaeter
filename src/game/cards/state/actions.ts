import type { Card } from "../cards";
import type {
  GameState,
  PlayedCard,
  PlayedMonsterCard,
  PlayedSpellCard,
  PlayerId,
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

function cloneGame(game: GameState): GameState {
  return structuredClone(game) as GameState;
}

function findPlayedCard(game: GameState, target: TargetRef): PlayedCard | undefined {
  const player = game.players[target.playerId];

  return [...player.monsterZone, ...player.spellZone].find(
    (card) => card.instanceId === target.instanceId
  );
}

function findMonster(game: GameState, target: TargetRef): PlayedMonsterCard | undefined {
  return game.players[target.playerId].monsterZone.find(
    (card) => card.instanceId === target.instanceId
  );
}

function isMonsterCard(card: Card): card is Extract<Card, { type: "monster" }> {
  return card.type === "monster";
}

function isSpellCard(card: Card): card is Extract<Card, { type: "spell" }> {
  return card.type === "spell";
}

export function getTargetRequirement(card: Card): TargetRequirement | undefined {
  if (card.type === "monster") return undefined;

  if (card.effectType === "buff" || card.effectType === "permanent") {
    return "ownMonster";
  }

  if (card.effectType === "debuff") {
    return "enemyMonster";
  }

  switch (card.id) {
    case "aufschieberitis":
      return "enemyFieldCard";
    case "suesse-gruesse":
    case "der-ganze-wald":
      return "enemyMonster";
    default:
      return undefined;
  }
}

export function canTargetMonster(
  game: GameState,
  playerId: PlayerId,
  target: TargetRef,
  requirement: TargetRequirement
): boolean {
  const opponentId = getOpponentId(playerId);
  const targetCard = findPlayedCard(game, target);

  if (!targetCard) return false;

  if (requirement === "ownMonster") {
    return target.playerId === playerId && targetCard.type === "monster";
  }

  if (requirement === "enemyMonster") {
    return target.playerId === opponentId && targetCard.type === "monster";
  }

  if (requirement === "anyMonster") {
    return targetCard.type === "monster";
  }

  if (requirement === "enemyFieldCard") {
    return target.playerId === opponentId;
  }

  return false;
}

function applySpellEffect(
  game: GameState,
  playerId: PlayerId,
  spell: PlayedSpellCard
): void {
  const player = game.players[playerId];
  const opponentId = getOpponentId(playerId);
  const opponent = game.players[opponentId];

  if (!spell.target) return;

  const targetMonster = findMonster(game, spell.target);

  if (spell.effectType === "buff" && targetMonster) {
    const multiplier = player.nextBuffMultiplier;
    targetMonster.currentStrength += 300 * multiplier;
    player.nextBuffMultiplier = 1;
    return;
  }

  if (spell.effectType === "debuff" && targetMonster) {
    if (game.blockNextDebuff) {
      game.blockNextDebuff = false;
      return;
    }

    targetMonster.currentStrength -= 300;
    return;
  }

  if (spell.id === "fokusblume" && targetMonster) {
    game.ongoingEffects.push({
      id: createInstanceId(spell.id),
      sourceCardId: spell.id,
      target: spell.target,
      amount: 100,
      timing: "roundStart",
    });
    return;
  }

  if (spell.id === "auf-in-den-kampf") {
    player.nextBuffMultiplier = 2;
    return;
  }

  if (spell.id === "auszeit") {
    game.blockNextDebuff = true;
    return;
  }

  if (spell.id === "aufschieberitis") {
    const targetCard = findPlayedCard(game, spell.target);

    if (!targetCard) return;

    if (targetCard.type === "monster") {
      opponent.monsterZone = opponent.monsterZone.filter(
        (card) => card.instanceId !== targetCard.instanceId
      );
    } else {
      opponent.spellZone = opponent.spellZone.filter(
        (card) => card.instanceId !== targetCard.instanceId
      );
    }

    opponent.graveyard.push(targetCard);
  }
}

export function playCardFromHand(
  game: GameState,
  playerId: PlayerId,
  cardId: string,
  target?: TargetRef
): GameState {
  const nextGame = cloneGame(game);
  const player = nextGame.players[playerId];
  const card = player.hand.find((handCard) => handCard.id === cardId);

  if (!card) return game;
  if (player.mana < card.mana) return game;

  const targetRequirement = getTargetRequirement(card);

  if (targetRequirement) {
    if (!target) return game;

    const isValidTarget = canTargetMonster(
      nextGame,
      playerId,
      target,
      targetRequirement
    );

    if (!isValidTarget) return game;
  }

  player.hand = player.hand.filter((handCard) => handCard.id !== cardId);
  player.mana -= card.mana;

  if (isMonsterCard(card)) {
    const baseStrength = typeof card.strength === "number" ? card.strength : 0;

    const playedMonster: PlayedMonsterCard = {
      ...card,
      instanceId: createInstanceId(card.id),
      baseStrength,
      currentStrength: baseStrength,
    };

    player.monsterZone.push(playedMonster);
    return nextGame;
  }

  if (isSpellCard(card)) {
    const playedSpell: PlayedSpellCard = {
      ...card,
      instanceId: createInstanceId(card.id),
      target,
    };

    player.spellZone.push(playedSpell);
    applySpellEffect(nextGame, playerId, playedSpell);
  }

  return nextGame;
}

export function startPlayPhase(game: GameState): GameState {
  const nextGame = cloneGame(game);

  nextGame.phase = "play";
  nextGame.players.player1.mana = 2 + nextGame.players.player1.bonusManaNextRound;
  nextGame.players.player2.mana = 2 + nextGame.players.player2.bonusManaNextRound;
  nextGame.players.player1.bonusManaNextRound = 0;
  nextGame.players.player2.bonusManaNextRound = 0;

  return nextGame;
}

export function endRound(game: GameState): GameState {
  const nextGame = cloneGame(game);

  for (const effect of nextGame.ongoingEffects) {
    if (effect.timing !== "roundStart") continue;

    const targetMonster = findMonster(nextGame, effect.target);

    if (targetMonster) {
      targetMonster.currentStrength += effect.amount;
    }
  }

  if (nextGame.round >= nextGame.maxRounds) {
    nextGame.phase = "gameEnd";
    return nextGame;
  }

  nextGame.round += 1;
  nextGame.phase = "draw";

  for (const player of Object.values(nextGame.players)) {
    const drawnCard = player.deck[0];

    if (drawnCard) {
      player.hand.push(drawnCard);
      player.deck = player.deck.slice(1);
    }
  }

  return nextGame;
}

export function getWinner(game: GameState): PlayerId | "draw" | undefined {
  if (game.phase !== "gameEnd") return undefined;

  const player1Strength = game.players.player1.monsterZone.reduce(
    (sum, monster) => sum + monster.currentStrength,
    0
  );

  const player2Strength = game.players.player2.monsterZone.reduce(
    (sum, monster) => sum + monster.currentStrength,
    0
  );

  if (player1Strength > player2Strength) return "player1";
  if (player2Strength > player1Strength) return "player2";
  return "draw";
}