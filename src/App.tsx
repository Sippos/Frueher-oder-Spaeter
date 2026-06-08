import { useState } from "react";
import { createGame } from "./game/cards/state/createGame";
import {
  canTargetMonster,
  endRound,
  getTargetRequirement,
  getWinner,
  playCardFromHand,
  startPlayPhase,
} from "./game/cards/state/actions";
import type {
  PlayedCard,
  PlayedMonsterCard,
  PlayerId,
  PlayerState,
  TargetRef,
} from "./game/cards/state/gameTypes";
import type { Card } from "./game/cards/cards";
import "./App.css";
import "./PhaseControls.css";

type DisplayCard = Card | PlayedCard;

function CardView({
  card,
  variant = "board",
  isOpponent = false,
  isTargetable = false,
  onClick,
  onInspect,
}: {
  card: DisplayCard;
  variant?: "hand" | "opponentHand" | "board";
  isOpponent?: boolean;
  isTargetable?: boolean;
  onClick?: () => void;
  onInspect?: (card: DisplayCard) => void;
}) {
  return (
    <button
      className={`card-view card-view--${variant} ${
        isOpponent ? "card-view--opponent" : ""
      } ${isTargetable ? "card-view--targetable" : ""}`}
      onClick={onClick}
      onFocus={() => onInspect?.(card)}
      onMouseEnter={() => onInspect?.(card)}
      title={card.name}
      type="button"
    >
      <img src={card.imagePath} alt={card.name} />
      {"currentStrength" in card && (
        <strong className="strength-badge">{card.currentStrength}</strong>
      )}
    </button>
  );
}

function EmptySlot() {
  return <div className="empty-slot" />;
}

function Pile({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div className="pile">
      <span>{label}</span>
      <strong>{count}</strong>
    </div>
  );
}

function PlayerPiles({ player }: { player: PlayerState }) {
  return (
    <div className="pile-row">
      <Pile label="Deck" count={player.deck.length} />
      <Pile label="Spielstapel" count={0} />
      <Pile label="Friedhof" count={player.graveyard.length} />
    </div>
  );
}

function ZoneCards({
  cards,
  slots,
  playerId,
  isOpponent = false,
  onInspect,
  onTargetMonster,
  canTarget,
}: {
  cards: PlayedCard[];
  slots: number;
  playerId: PlayerId;
  isOpponent?: boolean;
  onInspect: (card: DisplayCard) => void;
  onTargetMonster?: (target: TargetRef) => void;
  canTarget?: (playerId: PlayerId, card: PlayedCard) => boolean;
}) {
  return (
    <div className="zone-cards">
      {Array.from({ length: slots }, (_, index) => {
        const card = cards[index];
        const isTargetable = card ? canTarget?.(playerId, card) ?? false : false;

        return card ? (
          <CardView
            key={card.instanceId}
            card={card}
            isOpponent={isOpponent}
            isTargetable={isTargetable}
            onClick={() => {
              if (isTargetable) {
                onTargetMonster?.({ playerId, instanceId: card.instanceId });
              }
            }}
            onInspect={onInspect}
          />
        ) : (
          <EmptySlot key={index} />
        );
      })}
    </div>
  );
}

function BattlefieldSide({
  player,
  isOpponent = false,
  onInspect,
  onTargetMonster,
  canTarget,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  onInspect: (card: DisplayCard) => void;
  onTargetMonster?: (target: TargetRef) => void;
  canTarget?: (playerId: PlayerId, card: PlayedCard) => boolean;
}) {
  return (
    <section className={`battlefield-side ${isOpponent ? "is-opponent" : ""}`}>
      <div className="player-strip">
        <strong>{player.name}</strong>
        <span>Mana: {player.mana}</span>
        <span>Stärke: {player.score}</span>
      </div>

      <div className="field-zones">
        <div className="field-zone">
          <span className="zone-label">Monster</span>
          <ZoneCards
            cards={player.monsterZone}
            slots={4}
            playerId={player.id}
            isOpponent={isOpponent}
            onInspect={onInspect}
            onTargetMonster={onTargetMonster}
            canTarget={(targetPlayerId, card) =>
              card.type === "monster" && (canTarget?.(targetPlayerId, card) ?? false)
            }
          />
        </div>

        <div className="field-zone">
          <span className="zone-label">Zauber</span>
          <ZoneCards
            cards={player.spellZone}
            slots={4}
            playerId={player.id}
            isOpponent={isOpponent}
            onInspect={onInspect}
          />
        </div>

        <PlayerPiles player={player} />
      </div>
    </section>
  );
}

function Hand({
  player,
  isOpponent = false,
  selectedCardId,
  onPlayCard,
  onInspect,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  selectedCardId?: string;
  onPlayCard: (playerId: PlayerId, cardId: string) => void;
  onInspect: (card: DisplayCard) => void;
}) {
  return (
    <section className={`hand-zone ${isOpponent ? "hand-zone--opponent" : ""}`}>
      <div className="hand-label">
        <span>{isOpponent ? "Gegnerische Hand" : "Deine Hand"}</span>
        <strong>{player.hand.length}</strong>
      </div>

      <div className="hand-cards">
        {player.hand.map((card) => (
          <CardView
            key={card.id}
            card={card}
            variant={isOpponent ? "opponentHand" : "hand"}
            isOpponent={isOpponent}
            isTargetable={selectedCardId === card.id}
            onClick={() => onPlayCard(player.id, card.id)}
            onInspect={onInspect}
          />
        ))}
      </div>
    </section>
  );
}

function CardPreview({ card }: { card?: DisplayCard }) {
  if (!card) {
    return (
      <aside className="card-preview empty-preview">
        <h2>Karte ansehen</h2>
        <p>Bewege die Maus über eine Karte, um sie groß zu sehen.</p>
      </aside>
    );
  }

  return (
    <aside className="card-preview">
      <img src={card.imagePath} alt={card.name} />
      <h2>{card.name}</h2>
      <p>
        {card.type === "monster" ? "Monster" : "Zauber"} · Mana: {card.mana}
      </p>
      {card.type === "monster" && (
        <p>
          Stärke: {"currentStrength" in card ? card.currentStrength : card.strength}
        </p>
      )}
      {card.type === "spell" && <p>Effekt: {card.effectType}</p>}
      <p className="preview-text">{card.text}</p>
    </aside>
  );
}

function App() {
  const [game, setGame] = useState(() => createGame());
  const [inspectedCard, setInspectedCard] = useState<DisplayCard | undefined>(() =>
    game.players.player1.hand[0] ?? game.players.player2.hand[0]
  );
  const [pendingSpell, setPendingSpell] = useState<{
    playerId: PlayerId;
    cardId: string;
  } | null>(null);

  function handlePlayCard(playerId: PlayerId, cardId: string) {
    const card = game.players[playerId].hand.find((handCard) => handCard.id === cardId);

    if (!card) {
      return;
    }

    const targetRequirement = getTargetRequirement(card);

    if (targetRequirement) {
      setPendingSpell({ playerId, cardId });
      setInspectedCard(card);
      return;
    }

    setGame((currentGame) => playCardFromHand(currentGame, playerId, cardId));
  }

  function handleTargetMonster(target: TargetRef) {
    if (!pendingSpell) {
      return;
    }

    setGame((currentGame) =>
      playCardFromHand(currentGame, pendingSpell.playerId, pendingSpell.cardId, target)
    );
    setPendingSpell(null);
  }

  function handlePhaseAction() {
    setPendingSpell(null);

    setGame((currentGame) => {
      if (currentGame.phase === "draw") {
        return startPlayPhase(currentGame);
      }

      if (currentGame.phase === "play") {
        return endRound(currentGame);
      }

      return currentGame;
    });
  }

  const opponent = game.players.player2;
  const player = game.players.player1;
  const winner = getWinner(game);
  const pendingCard = pendingSpell
    ? game.players[pendingSpell.playerId].hand.find((card) => card.id === pendingSpell.cardId)
    : undefined;
  const pendingRequirement = pendingCard ? getTargetRequirement(pendingCard) : null;

  function canTargetCard(targetPlayerId: PlayerId, card: PlayedCard) {
    if (!pendingSpell || !pendingRequirement || card.type !== "monster") {
      return false;
    }

    return canTargetMonster(pendingSpell.playerId, pendingRequirement, targetPlayerId);
  }

  function getPhaseButtonText() {
    if (game.phase === "draw") {
      return "Karten ziehen";
    }

    if (game.phase === "play") {
      return "Runde beenden";
    }

    if (game.phase === "gameEnd") {
      if (winner === "draw") {
        return "Unentschieden";
      }

      if (winner === "player1") {
        return "Auge gewinnt";
      }

      if (winner === "player2") {
        return "Finger gewinnt";
      }
    }

    return "Weiter";
  }

  return (
    <main className="app">
      <section className="game-layout">
        <section className="game-table">
          <div className="game-status">
            <span>
              Runde {game.round} / {game.maxRounds} · {game.phase}
            </span>

            <button
              className="phase-button"
              disabled={game.phase === "gameEnd"}
              onClick={handlePhaseAction}
              type="button"
            >
              {getPhaseButtonText()}
            </button>
          </div>

          {pendingCard && (
            <div className="target-banner">
              Ziel wählen für: <strong>{pendingCard.name}</strong>
              <button onClick={() => setPendingSpell(null)} type="button">
                Abbrechen
              </button>
            </div>
          )}

          <Hand
            player={opponent}
            isOpponent
            selectedCardId={pendingSpell?.cardId}
            onPlayCard={handlePlayCard}
            onInspect={setInspectedCard}
          />

          <section className="battlefield">
            <BattlefieldSide
              player={opponent}
              isOpponent
              onInspect={setInspectedCard}
              onTargetMonster={handleTargetMonster}
              canTarget={canTargetCard}
            />

            <div className="conflict-line">
              <span>Schwächungszone</span>
            </div>

            <BattlefieldSide
              player={player}
              onInspect={setInspectedCard}
              onTargetMonster={handleTargetMonster}
              canTarget={canTargetCard}
            />
          </section>

          <Hand
            player={player}
            selectedCardId={pendingSpell?.cardId}
            onPlayCard={handlePlayCard}
            onInspect={setInspectedCard}
          />
        </section>

        <CardPreview card={inspectedCard} />
      </section>
    </main>
  );
}

export default App;
