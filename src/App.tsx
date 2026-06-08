import { useState } from "react";
import { createGame } from "./game/cards/state/createGame";
import { playCardFromHand } from "./game/cards/state/actions";
import type { PlayerId, PlayerState } from "./game/cards/state/gameTypes";
import type { Card } from "./game/cards/cards";
import "./App.css";

function CardView({
  card,
  variant = "board",
  isOpponent = false,
  onClick,
  onInspect,
}: {
  card: Card;
  variant?: "hand" | "opponentHand" | "board";
  isOpponent?: boolean;
  onClick?: () => void;
  onInspect?: (card: Card) => void;
}) {
  return (
    <button
      className={`card-view card-view--${variant} ${
        isOpponent ? "card-view--opponent" : ""
      }`}
      onClick={onClick}
      onFocus={() => onInspect?.(card)}
      onMouseEnter={() => onInspect?.(card)}
      title={card.name}
      type="button"
    >
      <img src={card.imagePath} alt={card.name} />
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
  isOpponent = false,
  onInspect,
}: {
  cards: Card[];
  slots: number;
  isOpponent?: boolean;
  onInspect: (card: Card) => void;
}) {
  return (
    <div className="zone-cards">
      {Array.from({ length: slots }, (_, index) => {
        const card = cards[index];

        return card ? (
          <CardView
            key={card.id}
            card={card}
            isOpponent={isOpponent}
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
}: {
  player: PlayerState;
  isOpponent?: boolean;
  onInspect: (card: Card) => void;
}) {
  return (
    <section className={`battlefield-side ${isOpponent ? "is-opponent" : ""}`}>
      <div className="player-strip">
        <strong>{player.name}</strong>
        <span>Mana: {player.mana}</span>
      </div>

      <div className="field-zones">
        <div className="field-zone">
          <span className="zone-label">Monster</span>
          <ZoneCards
            cards={player.monsterZone}
            slots={4}
            isOpponent={isOpponent}
            onInspect={onInspect}
          />
        </div>

        <div className="field-zone">
          <span className="zone-label">Zauber</span>
          <ZoneCards
            cards={player.spellZone}
            slots={4}
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
  onPlayCard,
  onInspect,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  onPlayCard: (playerId: PlayerId, cardId: string) => void;
  onInspect: (card: Card) => void;
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
            onClick={() => onPlayCard(player.id, card.id)}
            onInspect={onInspect}
          />
        ))}
      </div>
    </section>
  );
}

function CardPreview({ card }: { card?: Card }) {
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
      {card.type === "monster" && <p>Stärke: {card.strength}</p>}
      {card.type === "spell" && <p>Effekt: {card.effectType}</p>}
      <p className="preview-text">{card.text}</p>
    </aside>
  );
}

function App() {
  const [game, setGame] = useState(() => createGame());
  const [inspectedCard, setInspectedCard] = useState<Card | undefined>(() =>
    game.players.player1.hand[0] ?? game.players.player2.hand[0]
  );

  function handlePlayCard(playerId: PlayerId, cardId: string) {
    setGame((currentGame) => playCardFromHand(currentGame, playerId, cardId));
  }

  const opponent = game.players.player2;
  const player = game.players.player1;

  return (
    <main className="app">
      <section className="game-layout">
        <section className="game-table">
          <div className="game-status">
            Runde {game.round} / {game.maxRounds} · {game.phase}
          </div>

          <Hand
            player={opponent}
            isOpponent
            onPlayCard={handlePlayCard}
            onInspect={setInspectedCard}
          />

          <section className="battlefield">
            <BattlefieldSide
              player={opponent}
              isOpponent
              onInspect={setInspectedCard}
            />

            <div className="conflict-line">
              <span>Schwächungszone</span>
            </div>

            <BattlefieldSide player={player} onInspect={setInspectedCard} />
          </section>

          <Hand
            player={player}
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
