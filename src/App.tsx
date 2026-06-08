import { useState } from "react";
import { createGame } from "./game/cards/state/createGame";
import { playCardFromHand } from "./game/cards/state/actions";
import type { PlayerId, PlayerState } from "./game/cards/state/gameTypes";
import type { Card } from "./game/cards/cards";
import "./App.css";

function SmallCard({
  card,
  isOpponent = false,
  onClick,
}: {
  card: Card;
  isOpponent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`small-card ${isOpponent ? "opponent-facing" : ""}`}
      onClick={onClick}
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

function PlayerBoard({
  player,
  isOpponent = false,
  onPlayCard,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  onPlayCard: (playerId: PlayerId, cardId: string) => void;
}) {
  const monsterSlots = Array.from({ length: 4 }, (_, index) => {
    return player.monsterZone[index] ?? null;
  });

  return (
    <section className={`player-board ${isOpponent ? "opponent-board" : ""}`}>
      <header className="player-header">
        <h2>{player.name}</h2>
        <p>Mana: {player.mana}</p>
      </header>

      <div className="table-row">
        <div className="zones">
          <div className="zone-label">Monsterzone</div>
          <div className="monster-zone">
            {monsterSlots.map((card, index) =>
              card ? (
                <SmallCard
                  key={card.id}
                  card={card}
                  isOpponent={isOpponent}
                />
              ) : (
                <EmptySlot key={index} />
              )
            )}
          </div>

          <div className="debuff-zone">
            Schwächungszone
          </div>

          <div className="zone-label">Zauberzone</div>
          <div className="spell-zone">
            {player.spellZone.length === 0 ? (
              <EmptySlot />
            ) : (
              player.spellZone.map((card) => (
                <SmallCard
                  key={card.id}
                  card={card}
                  isOpponent={isOpponent}
                />
              ))
            )}
          </div>
        </div>

        <aside className="side-piles">
          <Pile label="Deck" count={player.deck.length} />
          <Pile label="Spielstapel" count={0} />
          <Pile label="Friedhof" count={player.graveyard.length} />
        </aside>
      </div>

      <div className="hand-area">
        <div className="zone-label">Hand</div>

        <div className="hand">
          {player.hand.map((card) => (
            <SmallCard
              key={card.id}
              card={card}
              isOpponent={isOpponent}
              onClick={() => onPlayCard(player.id, card.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [game, setGame] = useState(() => createGame());

  function handlePlayCard(playerId: PlayerId, cardId: string) {
    setGame((currentGame) => playCardFromHand(currentGame, playerId, cardId));
  }

  return (
    <main className="app">
      <header className="game-topbar">
        <h1>Früher oder Später?</h1>
        <div>
          Runde {game.round} / {game.maxRounds} · Phase: {game.phase}
        </div>
      </header>

      <section className="game-table">
        <PlayerBoard
          player={game.players.player2}
          isOpponent
          onPlayCard={handlePlayCard}
        />

        <div className="center-line">
          <span>Schwächungen / Konfliktzone</span>
        </div>

        <PlayerBoard
          player={game.players.player1}
          onPlayCard={handlePlayCard}
        />
      </section>
    </main>
  );
}

export default App;