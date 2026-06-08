import type { Card } from "../cards";

export type PlayerId = "player1" | "player2";

export type Phase = "draw" | "play" | "reveal" | "roundEnd" | "gameEnd";

export type TargetRef = {
  playerId: PlayerId;
  instanceId: string;
};

export type TargetRequirement = "ownMonster" | "enemyMonster" | "anyMonster";

export type PlayedMonsterCard = Extract<Card, { type: "monster" }> & {
  instanceId: string;
  baseStrength: number;
  currentStrength: number;
};

export type PlayedSpellCard = Extract<Card, { type: "spell" }> & {
  instanceId: string;
  target?: TargetRef;
};

export type PlayedCard = PlayedMonsterCard | PlayedSpellCard;

export type OngoingEffect = {
  id: string;
  sourceCardId: string;
  target: TargetRef;
  amount: number;
  timing: "roundStart";
};

export type PlayerState = {
  id: PlayerId;
  name: string;
  deckId: "eye" | "finger";
  deck: Card[];
  hand: Card[];
  monsterZone: PlayedMonsterCard[];
  spellZone: PlayedSpellCard[];
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
  ongoingEffects: OngoingEffect[];
};
