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

function findPlayedCard(game