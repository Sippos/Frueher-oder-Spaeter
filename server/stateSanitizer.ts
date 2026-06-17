import { GameState, PlayerState, PlayedCard, PlayerId } from "../src/game/cards/state/gameTypes";

export function sanitizePlayerState(playerState: PlayerState, isOpponent: boolean): PlayerState {
  if (!isOpponent) {
    // For the player themselves, they see their hand, deck length, etc.
    // Wait, technically they shouldn't see their own deck order, but we can just map it to hidden cards or leave it as is if the client trusts itself.
    // Let's hide the deck just in case.
    return {
      ...playerState,
      deck: playerState.deck.map((c) => ({ ...c, id: "hidden", name: "Hidden", text: "Hidden" })) as any,
    };
  }

  // For the opponent, hide hand, deck, and unrevealed staged cards
  return {
    ...playerState,
    deck: playerState.deck.map((c) => ({ ...c, id: "hidden", name: "Hidden", text: "Hidden" })) as any,
    hand: playerState.hand.map((c) => ({ ...c, id: "hidden", name: "Hidden", text: "Hidden" })) as any,
    stagedCards: playerState.stagedCards.map((c) => {
      if (c.type === "monster") {
        return {
          id: "hidden",
          type: "monster",
          name: "Hidden",
          deck: c.deck,
          mana: c.mana,
          strength: 0,
          currentStrength: 0,
          baseStrength: 0,
          instanceId: c.instanceId,
          monsterEffect: "none",
          page: 0,
          imagePath: "",
          text: ""
        } as any;
      } else {
        return {
          id: "hidden",
          type: "spell",
          name: "Hidden",
          deck: c.deck,
          mana: c.mana,
          effectType: c.effectType,
          instanceId: c.instanceId,
          target: c.target,
          page: 0,
          imagePath: "",
          text: ""
        } as any;
      }
    })
  };
}

export function sanitizeGameState(game: GameState, playerId: PlayerId): GameState {
  return {
    ...game,
    players: {
      player1: sanitizePlayerState(game.players.player1, playerId !== "player1"),
      player2: sanitizePlayerState(game.players.player2, playerId !== "player2"),
    }
  };
}

export function sanitizeSetupState(setupState: any, playerId: PlayerId): any {
  const opponentId = playerId === "player1" ? "player2" : "player1";
  
  // If the opponent has picked but player hasn't, hide it
  if (setupState.selectedStartingMonsters[opponentId] && !setupState.selectedStartingMonsters[playerId]) {
    return {
      ...setupState,
      selectedStartingMonsters: {
        ...setupState.selectedStartingMonsters,
        [opponentId]: "hidden"
      }
    };
  }
  
  return setupState;
}
