import type { Card } from "../cards";
import type { GameState, PlayedMonsterCard, PlayedSpellCard, PlayerId, TargetRef, TargetRequirement } from "./gameTypes";

let nextInstanceNumber = 1;

function createInstanceId(cardId: string): string {
  return `${cardId}-${nextInstanceNumber++}`;
}

function getOpponentId(playerId: PlayerId): PlayerId {
  return playerId === "player1" ? "player