import type { Card } from "../cards";

export type PlayerId = "player1" | "player2";

export type SetupState = {
  stepIndex: number;
  coinSide?: "eye" | "finger";
  player1DeckId?: "eye" | "finger";
  player2DeckId?: "eye" | "finger";
  selectedStartingMonsters: { player1?: string; player2?: string };
};

export type Phase = "play" | "reveal" | "roundEnd" | "gameEnd";

export type TargetRef = {
  playerId: PlayerId;
  instanceId: string;
};

export type TargetRequirement =
  | "ownMonster"
  | "enemyMonster"
  | "anyMonster"
  | "enemyFieldCard";

export type PlayedMonsterCard = Extract<Card, { type: "monster" }> & {
  instanceId: string;
  baseStrength: number;
  currentStrength: number;
  noBuffsUntilRound?: number;
  target?: TargetRef;
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

export type BuffRedirect = {
  controllerPlayerId: PlayerId;
  affectedPlayerId: PlayerId;
  target: TargetRef;
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
  stagedCards: PlayedCard[];
  mana: number;
  bonusManaNextRound: number;
  nextBuffMultiplier: number;
  forcedCardId?: string;
  forcedCardIdNextRound?: string;
  score: number;
};

export type GameState = {
  round: number;
  maxRounds: number;
  phase: Phase;
  currentPlayerId: PlayerId;
  players: Record<PlayerId, PlayerState>;
  ongoingEffects: OngoingEffect[];
  blockNextDebuff: boolean;
  buffRedirect?: BuffRedirect;
  repeatPlayPhase: boolean;
};
