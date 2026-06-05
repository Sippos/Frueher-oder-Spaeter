import type { GameState, PlayerId } from "./gameTypes";

export function playCardFromHand(
  game: GameState,
  playerId: PlayerId,
  cardId: string
): GameState {
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

  const newHand = player.hand.filter((_, index) => index !== cardIndex);

  const updatedPlayer = {
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