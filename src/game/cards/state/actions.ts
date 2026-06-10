import type { Card } from "../cards";
import type {
  GameState,
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

function