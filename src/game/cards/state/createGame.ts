import { cards } from "../cards";
import type { Card } from "../cards";
import type { GameState, PlayerState } from "./gameTypes";

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function createPlayer(
  id: "player1" | "player2",
  name: string,
  deckId: "eye" | "finger"
): PlayerState {
  const fullDeck = cards.filter((card) => card.deck === deckId);
  const monsters = fullDeck.filter((card) => card.type === "monster");
  const spells = fullDeck.filter((card) => card.type === "spell");

  const shuffledMonsters = shuffle(monsters);
  const startingMonster = shuffledMonsters[0];

  const remainingCards = shuffle([
    ...shuffledMonsters.slice(1),
    ...spells,
  ]);

  const startingHand: Card[] = [
    startingMonster,
    ...remainingCards.slice(0, 2),
  ];

  const deck = remainingCards.slice(2);

  return {
    id,
    name,
    deckId,
    deck,
    hand: startingHand,
    monsterZone: [],
    spellZone: [],
    graveyard: [],
    mana: 2,
    score: 0,
  };
}

export function createGame(): GameState {
  return {
    round: 1,
    maxRounds: 6,
    phase: "draw",
    currentPlayerId: "player1",
    players: {
      player1: createPlayer("player1", "Auge des Fokus", "eye"),
      player2: createPlayer("player2", "Finger des Aufschubs", "finger"),
    },
  };
}