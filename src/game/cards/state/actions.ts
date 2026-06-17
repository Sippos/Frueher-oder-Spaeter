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
  if (card.type === "monster") {
    if (card.id === "du") return "enemyMonster";
    return undefined;
  }

  if (card.effectType === "buff" || card.effectType === "permanent") {
    return "ownMonster";
  }

  if (card.effectType === "debuff") {
    if (card.id === "hab-dich") return undefined;
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

  const targetMonster = spell.target ? findMonster(game, spell.target) : undefined;

  // Handle Debuffs
  if (spell.effectType === "debuff") {
    // Rhyzer immunity
    if (targetMonster && targetMonster.id === "rhyzer-der-lichtgejagte" && [1, 3, 5].includes(game.round)) {
      return;
    }

    if (game.blockNextDebuff) {
      game.blockNextDebuff = false;
      return;
    }

    if (targetMonster) {
      targetMonster.currentStrength = Math.max(0, targetMonster.currentStrength - 300);
    }
    return;
  }

  // Handle Buffs
  if (spell.effectType === "buff" && targetMonster) {
    let amount = 300;
    if (spell.id === "motivationsspritze" || spell.id === "pomodoro-technik") amount = 600;

    const multiplier = player.nextBuffMultiplier;
    targetMonster.currentStrength += amount * multiplier;
    player.nextBuffMultiplier = 1;
    return;
  }

  // Handle Gefühl cards
  if (spell.id.startsWith("gefuehl-")) {
    const gefuehlCount = player.spellZone.filter(c => c.id.startsWith("gefuehl-")).length;
    if (targetMonster) {
      let buffAmount = 100;
      if (gefuehlCount === 2) buffAmount = spell.deck === "finger" ? 300 : 500;
      if (gefuehlCount >= 3) buffAmount = spell.deck === "finger" ? 500 : 1000;
      
      targetMonster.currentStrength += buffAmount;

      if (gefuehlCount >= 3 && spell.deck === "finger") {
        player.bonusManaNextRound = (player.bonusManaNextRound || 0) + 1;
      }
    }
    return;
  }

  if (spell.id === "fokusblume" && targetMonster) {
    game.ongoingEffects.push({
      id: createInstanceId(spell.id),
      sourceCardId: spell.id,
      target: spell.target as import('./gameTypes').TargetRef,
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
    if (spell.target) {
      const targetCard = findPlayedCard(game, spell.target);
      if (targetCard) {
        if (targetCard.type === "monster") {
          opponent.monsterZone = opponent.monsterZone.filter(c => c.instanceId !== targetCard.instanceId);
        } else {
          opponent.spellZone = opponent.spellZone.filter(c => c.instanceId !== targetCard.instanceId);
        }
        opponent.graveyard.push(targetCard);
      }
    } else {
      if (opponent.hand.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.length);
        const discardedCard = opponent.hand.splice(randomIndex, 1)[0];
        opponent.graveyard.push(discardedCard);
      }
    }
    return;
  }

  if (spell.id === "falsche-goetter") {
    if (opponent.hand.length > 0) {
      const randomIndex = Math.floor(Math.random() * opponent.hand.length);
      const discardedCard = opponent.hand.splice(randomIndex, 1)[0];
      opponent.graveyard.push(discardedCard);
    }
    return;
  }

  if (spell.id === "hab-dich") {
    opponent.bonusManaNextRound = (opponent.bonusManaNextRound || 0) - 1;
    return;
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
      target,
    };

    player.stagedCards.push(playedMonster);
    return nextGame;
  }

  if (isSpellCard(card)) {
    const playedSpell: PlayedSpellCard = {
      ...card,
      instanceId: createInstanceId(card.id),
      target,
    };

    player.stagedCards.push(playedSpell);
  }

  return nextGame;
}

export function revealStagedCards(game: GameState): GameState {
  const nextGame = cloneGame(game);
  nextGame.phase = "reveal";
  
  const allStagedSpells: { playerId: PlayerId; spell: PlayedSpellCard }[] = [];

  // Phase 1: Place all monsters onto the field first
  for (const playerId of ["player1", "player2"] as PlayerId[]) {
    const player = nextGame.players[playerId];
    for (const playedCard of player.stagedCards) {
      if (playedCard.type === "monster") {
        player.monsterZone.push(playedCard);
      }
    }
  }

  // Phase 1.5: Apply onPlay monster effects
  for (const playerId of ["player1", "player2"] as PlayerId[]) {
    const player = nextGame.players[playerId];
    const opponent = nextGame.players[playerId === "player1" ? "player2" : "player1"];
    
    for (const playedCard of player.stagedCards) {
      if (playedCard.type === "monster") {
        if (playedCard.id === "nira-die-augenlose") {
          if (opponent.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * opponent.hand.length);
            const discardedCard = opponent.hand.splice(randomIndex, 1)[0];
            opponent.graveyard.push(discardedCard);
          }
        } else if (playedCard.id === "du" && playedCard.target) {
          const targetMonster = findMonster(nextGame, playedCard.target);
          if (targetMonster) {
            const duInstance = player.monsterZone.find(m => m.instanceId === playedCard.instanceId);
            if (duInstance) {
              duInstance.currentStrength = targetMonster.currentStrength;
            }
          }
        }
      }
    }
  }

  // Phase 2: Place all spells onto the field
  for (const playerId of ["player1", "player2"] as PlayerId[]) {
    const player = nextGame.players[playerId];
    for (const playedCard of player.stagedCards) {
      if (playedCard.type === "spell") {
        player.spellZone.push(playedCard);
        allStagedSpells.push({ playerId, spell: playedCard });
      }
    }
    // Clear staged cards since they are now on the field
    player.stagedCards = [];
  }

  // Phase 3: Apply all spell effects now that the board is fully populated
  for (const { playerId, spell } of allStagedSpells) {
    applySpellEffect(nextGame, playerId, spell);
  }

  return nextGame;
}

// startPlayPhase removed

export function endRound(game: GameState): GameState {
  const nextGame = cloneGame(game);

  for (const effect of nextGame.ongoingEffects) {
    if (effect.timing !== "roundStart") continue;

    const targetMonster = findMonster(nextGame, effect.target);

    if (targetMonster) {
      targetMonster.currentStrength = Math.max(0, targetMonster.currentStrength + effect.amount);
    }
  }

  if (nextGame.round >= nextGame.maxRounds) {
    nextGame.phase = "gameEnd";
    return nextGame;
  }

  nextGame.round += 1;
  nextGame.phase = "play";
  nextGame.players.player1.mana = Math.max(0, 2 + (nextGame.players.player1.bonusManaNextRound || 0));
  nextGame.players.player2.mana = Math.max(0, 2 + (nextGame.players.player2.bonusManaNextRound || 0));
  nextGame.players.player1.bonusManaNextRound = 0;
  nextGame.players.player2.bonusManaNextRound = 0;

  // Apply Start-of-Round Passive Monster Effects
  for (const playerId of ["player1", "player2"] as PlayerId[]) {
    const player = nextGame.players[playerId];
    const opponentId = getOpponentId(playerId);
    const opponent = nextGame.players[opponentId];

    for (const monster of player.monsterZone) {
      if (monster.id === "murmoria-die-wirre") {
        monster.currentStrength += 100;
        if (opponent.monsterZone.length > 0) {
          const randomIndex = Math.floor(Math.random() * opponent.monsterZone.length);
          const target = opponent.monsterZone[randomIndex];
          target.currentStrength = Math.max(0, target.currentStrength - 100);
        }
      } else if (monster.id === "gravis-der-unermuedliche") {
        monster.currentStrength += 200;
      } else if (monster.id === "augri-die-sanfte-riesin") {
        if (nextGame.round === 6 && player.monsterZone.length === 1) {
          monster.currentStrength *= 2;
        }
      }
    }
  }

  // Calculate dynamic turn order based on current score
  const p1Score = nextGame.players.player1.monsterZone.reduce((sum, m) => sum + m.currentStrength, 0);
  const p2Score = nextGame.players.player2.monsterZone.reduce((sum, m) => sum + m.currentStrength, 0);
  nextGame.players.player1.score = p1Score;
  nextGame.players.player2.score = p2Score;
  
  if (p1Score > p2Score) {
    nextGame.currentPlayerId = "player1";
  } else if (p2Score > p1Score) {
    nextGame.currentPlayerId = "player2";
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