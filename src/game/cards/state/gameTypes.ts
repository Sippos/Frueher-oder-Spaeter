import type { Card } from "../cards.ts";

export type PlayerId = "player1" | "player2";

export type Phase = "draw" | "play" | "reveal" | "roundEnd" | "gameEnd";

export type PlayerState = {
  id: PlayerId;
  name: string;
  deckId: "eye" | "finger";
  deck: Card[];
  hand: Card[];
  monsterZone: Card[];
  spellZone: Card[];
  graveyard: Card[];
  mana: number;
  score: number;
};

export type GameState = {
  round: number;
  maxRounds: number;
  phase: Phase;
  currentPlayerId: PlayerId;
  players: Record<PlayerId, PlayerState>;
};