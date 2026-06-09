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
  GameState,
  PlayedCard,
  PlayerId,
  PlayerState,
  TargetRef,
} from "./game/cards/state/gameTypes";
import type { Card, DeckId } from "./game/cards/cards";
import "./App.css";
import "./PhaseControls.css";
import "./Onboarding.css";

type DisplayCard = Card | PlayedCard;
type CoinSide = DeckId;

type SetupStep = {
  title: string;
  text: string;
  animation: "coins" | "monster" | "shuffle" | "draw";
};

const setupSteps: SetupStep[] = [
  {
    title: "1. Decks verteilen",
    text: "Per Münzwurf wird entschieden, wer welches Deck spielt. Du kannst das Ergebnis danach noch tauschen.",
    animation: "coins",
  },
  {
    title: "2. Startmonster wählen",
    text: "Aus den 4 Monstern deines Decks zieht die Gegenseite 1 verdeckte Karte. Sie startet auf deiner Hand.",
    animation: "monster",
  },
  {
    title: "3. Restdeck mischen",
    text: "Die übrigen 3 Monster und alle 11 Zauber werden zu deinem verdeckten Kartenstapel gemischt.",
    animation: "shuffle",
  },
  {
    title: "4. Zwei Karten ziehen",
    text: "Ziehe 2 Karten. Zusammen mit dem Monster hast du 3 Handkarten. Runde 1 startet mit dem Auge.",
    animation: "draw",
  },
];

function getDeckName(deckId: DeckId) {
  return deckId === "eye" ? "Auge des Fokus" : "Finger des Aufschubs";
}

function getOpponentDeckId(deckId: DeckId): DeckId {
  return deckId === "eye" ? "finger" : "eye";
}

function DeckBack({ deckId, small = false }: { deckId: DeckId; small?: boolean }) {
  return (
    <div className={`deck-back deck-back--${deckId} ${small ? "deck-back--small" : ""}`}>
      <span className="deck-back__logo" aria-hidden="true">
        {deckId === "eye" ? "◉" : "◒"}
      </span>
      <span className="deck-back__title">Früher oder Später</span>
    </div>
  );
}

function OnboardingAnimation({ step, playerDeckId }: { step: SetupStep; playerDeckId: DeckId }) {
  if (step.animation === "coins") {
    return (
      <div className="coin-stage" aria-hidden="true">
        <div className="coin coin--eye"><span>◉</span></div>
        <div className="coin coin--finger"><span>◒</span></div>
      </div>
    );
  }

  if (step.animation === "monster") {
    return (
      <div className="setup-card-fan" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <button className="setup-card-choice" key={index} type="button">
            <DeckBack deckId={playerDeckId} small />
          </button>
        ))}
      </div>
    );
  }

  if (step.animation === "shuffle") {
    return (
      <div className="shuffle-stack" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="shuffle-card" key={index} style={{ animationDelay: `${index * 90}ms` }}>
            <DeckBack deckId={playerDeckId} small />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="draw-animation" aria-hidden="true">
      <div className="mini-deck"><DeckBack deckId={playerDeckId} small /></div>
      <div className="drawn-card drawn-card--one"><DeckBack deckId={playerDeckId} small /></div>
      <div className="drawn-card drawn-card--two"><DeckBack deckId={playerDeckId} small /></div>
    </div>
  );
}

function Onboarding({ onStart }: { onStart: (playerDeckId: DeckId) => void }) {
  const [coinSide, setCoinSide] = useState<CoinSide>("eye");
  const [playerDeckId, setPlayerDeckId] = useState<DeckId>("eye");
  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = setupSteps[stepIndex];
  const opponentDeckId = getOpponentDeckId(playerDeckId);

  function tossCoin() {
    const result: CoinSide = Math.random() > 0.5 ? "eye" : "finger";
    setCoinSide(result);
    setPlayerDeckId(result);
    setStepIndex(0);
  }

  function swapDecks() {
    setPlayerDeckId((currentDeckId) => getOpponentDeckId(currentDeckId));
  }

  return (
    <main className="app onboarding-app">
      <section className="onboarding-panel">
        <div className="onboarding-copy">
          <p className="eyebrow">Spielaufbau</p>
          <h1>Früher oder Später?</h1>
          <p>
            Starte wie im Handbuch: Deck per Münzwurf bestimmen, 1 Monster verdeckt ziehen,
            Restdeck mischen und 2 Karten nachziehen.
          </p>
        </div>

        <section className="deck-assignment" aria-label="Deckzuordnung">
          <button className="deck-assignment-card" onClick={swapDecks} type="button">
            <span>Du spielst</span>
            <DeckBack deckId={playerDeckId} />
            <strong>{getDeckName(playerDeckId)}</strong>
          </button>
          <button className="coin-toss-button" onClick={tossCoin} type="button">
            <span className={`coin-result coin-result--${coinSide}`}>
              {coinSide === "eye" ? "◉" : "◒"}
            </span>
            Münze werfen
          </button>
          <button className="deck-assignment-card" onClick={swapDecks} type="button">
            <span>Gegenüber spielt</span>
            <DeckBack deckId={opponentDeckId} />
            <strong>{getDeckName(opponentDeckId)}</strong>
          </button>
        </section>

        <section className="setup-walkthrough">
          <OnboardingAnimation step={activeStep} playerDeckId={playerDeckId} />
          <div className="setup-copy">
            <p className="step-counter">Schritt {stepIndex + 1} / {setupSteps.length}</p>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.text}</p>
            <div className="setup-actions">
              <button
                className="secondary-button"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
                type="button"
              >
                Zurück
              </button>
              {stepIndex < setupSteps.length - 1 ? (
                <button
                  className="primary-button"
                  onClick={() => setStepIndex((index) => Math.min(setupSteps.length - 1, index + 1))}
                  type="button"
                >
                  Weiter
                </button>
              ) : (
                <button className="primary-button" onClick={() => onStart(playerDeckId)} type="button">
                  Spiel starten
                </button>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function CardView({
  card,
  variant = "board",
  isOpponent = false,
  isTargetable = false,
  isHidden = false,
  onClick,
  onInspect,
}: {
  card: DisplayCard;
  variant?: "hand" | "opponentHand" | "board";
  isOpponent?: boolean;
  isTargetable?: boolean;
  isHidden?: boolean;
  onClick?: () => void;
  onInspect?: (card: DisplayCard) => void;
}) {
  return (
    <button
      className={`card-view card-view--${variant} ${
        isOpponent ? "card-view--opponent" : ""
      } ${isTargetable ? "card-view--targetable" : ""} ${isHidden ? "card-view--hidden" : ""}`}
      onClick={onClick}
      onFocus={() => onInspect?.(card)}
      onMouseEnter={() => onInspect?.(card)}
      type="button"
    >
      {isHidden ? <DeckBack deckId={card.deck} /> : <img src={card.imagePath} alt={card.name} />}
      {!isHidden && "currentStrength" in card && (
        <strong className="strength-badge">{card.currentStrength}</strong>
      )}
      {!isHidden && "noBuffsUntilRound" in card && card.noBuffsUntilRound && (
        <span className="status-badge">No Buff</span>
      )}
    </button>
  );
}

function EmptySlot({ small = false }: { small?: boolean }) {
  return <div className={`empty-slot ${small ? "empty-slot--small" : ""}`} />;
}

function Pile({ label, count, deckId }: { label: string; count: number; deckId?: DeckId }) {
  return (
    <div className={`pile ${deckId ? "pile--deck" : ""}`}>
      {deckId && <DeckBack deckId={deckId} small />}
      <span>{label}</span>
      <strong>{count}</strong>
    </div>
  );
}

function PlayerPiles({ player }: { player: PlayerState }) {
  return (
    <aside className="field-piles" aria-label={`${player.name} Stapel`}>
      <div className="deck-graveyard-stack">
        <Pile label="Deck" count={player.deck.length} deckId={player.deckId} />
        <Pile label="Friedhof" count={player.graveyard.length} />
      </div>
      <Pile label="Spielstapel" count={0} deckId={player.deckId} />
    </aside>
  );
}

function canTargetPlayedCard(
  pendingPlayerId: PlayerId | undefined,
  pendingRequirement: ReturnType<typeof getTargetRequirement>,
  targetPlayerId: PlayerId,
  card: PlayedCard
) {
  if (!pendingPlayerId || !pendingRequirement) {
    return false;
  }

  if (pendingRequirement !== "enemyFieldCard" && card.type !== "monster") {
    return false;
  }

  return canTargetMonster(pendingPlayerId, pendingRequirement, targetPlayerId);
}

function PlayedCardSlot({
  card,
  playerId,
  isOpponent = false,
  pendingPlayerId,
  pendingRequirement,
  onTargetCard,
  onInspect,
  small = false,
}: {
  card?: PlayedCard;
  playerId: PlayerId;
  isOpponent?: boolean;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onTargetCard?: (target: TargetRef) => void;
  onInspect: (card: DisplayCard) => void;
  small?: boolean;
}) {
  if (!card) {
    return <EmptySlot small={small} />;
  }

  const isTargetable = canTargetPlayedCard(
    pendingPlayerId,
    pendingRequirement,
    playerId,
    card
  );

  return (
    <CardView
      card={card}
      isOpponent={isOpponent}
      isTargetable={isTargetable}
      onClick={() => {
        if (isTargetable) {
          onTargetCard?.({ playerId, instanceId: card.instanceId });
        }
      }}
      onInspect={onInspect}
    />
  );
}

function CardStack({
  cards,
  playerId,
  isOpponent = false,
  pendingPlayerId,
  pendingRequirement,
  onTargetCard,
  onInspect,
}: {
  cards: PlayedCard[];
  playerId: PlayerId;
  isOpponent?: boolean;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onTargetCard?: (target: TargetRef) => void;
  onInspect: (card: DisplayCard) => void;
}) {
  if (cards.length === 0) {
    return <EmptySlot small />;
  }

  return (
    <div className="spell-card-stack">
      {cards.map((card) => (
        <PlayedCardSlot
          key={card.instanceId}
          card={card}
          playerId={playerId}
          isOpponent={isOpponent}
          pendingPlayerId={pendingPlayerId}
          pendingRequirement={pendingRequirement}
          onTargetCard={onTargetCard}
          onInspect={onInspect}
          small
        />
      ))}
    </div>
  );
}

function MonsterZone({
  player,
  isOpponent = false,
  pendingPlayerId,
  pendingRequirement,
  onTargetCard,
  onInspect,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onTargetCard?: (target: TargetRef) => void;
  onInspect: (card: DisplayCard) => void;
}) {
  return (
    <div className="monster-row">
      {Array.from({ length: 4 }, (_, index) => (
        <PlayedCardSlot
          key={player.monsterZone[index]?.instanceId ?? index}
          card={player.monsterZone[index]}
          playerId={player.id}
          isOpponent={isOpponent}
          pendingPlayerId={pendingPlayerId}
          pendingRequirement={pendingRequirement}
          onTargetCard={onTargetCard}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
}

function SpellZone({
  player,
  isOpponent = false,
  pendingPlayerId,
  pendingRequirement,
  onTargetCard,
  onInspect,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onTargetCard?: (target: TargetRef) => void;
  onInspect: (card: DisplayCard) => void;
}) {
  const permanentCards = player.spellZone.filter(
    (card) => card.effectType === "permanent"
  );
  const specialCards = player.spellZone.filter((card) => card.effectType === "special");
  const buffCards = player.spellZone.filter((card) => card.effectType === "buff");

  return (
    <div className="spell-board">
      <div className="spell-wing spell-wing--permanent">
        <span>Permanent</span>
        <CardStack
          cards={permanentCards}
          playerId={player.id}
          isOpponent={isOpponent}
          pendingPlayerId={pendingPlayerId}
          pendingRequirement={pendingRequirement}
          onTargetCard={onTargetCard}
          onInspect={onInspect}
        />
      </div>

      <div className="buff-grid" aria-label="Verstärkungen unter Monstern">
        {Array.from({ length: 4 }, (_, index) => {
          const monster = player.monsterZone[index];
          const cardsForMonster = buffCards.filter(
            (card) => card.target?.instanceId === monster?.instanceId
          );
          const looseBuffs = index === 0
            ? buffCards.filter((card) => !card.target)
            : [];

          return (
            <div className="buff-stack" key={monster?.instanceId ?? index}>
              <CardStack
                cards={[...cardsForMonster, ...looseBuffs]}
                playerId={player.id}
                isOpponent={isOpponent}
                pendingPlayerId={pendingPlayerId}
                pendingRequirement={pendingRequirement}
                onTargetCard={onTargetCard}
                onInspect={onInspect}
              />
            </div>
          );
        })}
      </div>

      <div className="spell-wing spell-wing--special">
        <span>Spezial</span>
        <CardStack
          cards={specialCards}
          playerId={player.id}
          isOpponent={isOpponent}
          pendingPlayerId={pendingPlayerId}
          pendingRequirement={pendingRequirement}
          onTargetCard={onTargetCard}
          onInspect={onInspect}
        />
      </div>
    </div>
  );
}

function BattlefieldSide({
  player,
  isOpponent = false,
  pendingPlayerId,
  pendingRequirement,
  onInspect,
  onTargetCard,
  isCurrentPlayer = false,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onInspect: (card: DisplayCard) => void;
  onTargetCard?: (target: TargetRef) => void;
  isCurrentPlayer?: boolean;
}) {
  return (
    <section className={`battlefield-side ${isOpponent ? "is-opponent" : ""} ${isCurrentPlayer ? "is-current-player" : ""}`}>
      <div className="player-strip">
        <strong>{player.name}</strong>
        <span>Mana: {player.mana}</span>
        <span>Stärke: {player.score}</span>
        {isCurrentPlayer && <span>beginnt</span>}
        {player.forcedCardId && <span>Pflichtkarte!</span>}
      </div>

      <div className="field-board">
        <div className="field-main">
          <div className="field-zone field-zone--monsters">
            <span className="zone-label">Monsterzone</span>
            <MonsterZone
              player={player}
              isOpponent={isOpponent}
              pendingPlayerId={pendingPlayerId}
              pendingRequirement={pendingRequirement}
              onTargetCard={onTargetCard}
              onInspect={onInspect}
            />
          </div>

          <div className="field-zone field-zone--spells">
            <span className="zone-label">Zauberzone</span>
            <SpellZone
              player={player}
              isOpponent={isOpponent}
              pendingPlayerId={pendingPlayerId}
              pendingRequirement={pendingRequirement}
              onTargetCard={onTargetCard}
              onInspect={onInspect}
            />
          </div>
        </div>

        <PlayerPiles player={player} />
      </div>
    </section>
  );
}

function DebuffZone({
  players,
  pendingPlayerId,
  pendingRequirement,
  onTargetCard,
  onInspect,
}: {
  players: Record<PlayerId, PlayerState>;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onTargetCard?: (target: TargetRef) => void;
  onInspect: (card: DisplayCard) => void;
}) {
  const debuffs = (["player2", "player1"] as const).flatMap((playerId) =>
    players[playerId].spellZone
      .filter((card) => card.effectType === "debuff")
      .map((card) => ({ playerId, card }))
  );

  return (
    <div className="conflict-line">
      <span>Schwächungszone</span>
      <div className="debuff-cards">
        {debuffs.length === 0 ? (
          <span className="zone-hint">Schwächungen liegen hier</span>
        ) : (
          debuffs.map(({ playerId, card }) => (
            <PlayedCardSlot
              key={card.instanceId}
              card={card}
              playerId={playerId}
              pendingPlayerId={pendingPlayerId}
              pendingRequirement={pendingRequirement}
              onTargetCard={onTargetCard}
              onInspect={onInspect}
              small
            />
          ))
        )}
      </div>
    </div>
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
            isHidden={isOpponent}
            isTargetable={selectedCardId === card.id || player.forcedCardId === card.id}
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
        <p>Bewege die Maus über eine Karte.</p>
      </aside>
    );
  }

  return (
    <aside className="card-preview">
      <img src={card.imagePath} alt={card.name} />
    </aside>
  );
}

function GameScreen({ game, setGame }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const [inspectedCard, setInspectedCard] = useState<DisplayCard | undefined>(() =>
    game.players.player1.hand[0] ?? game.players.player2.hand[0]
  );
  const [pendingSpell, setPendingSpell] = useState<{ playerId: PlayerId; cardId: string } | null>(null);

  function hasEnemyFieldCards(playerId: PlayerId) {
    const enemy = game.players[playerId === "player1" ? "player2" : "player1"];
    return enemy.monsterZone.length + enemy.spellZone.length > 0;
  }

  function handlePlayCard(playerId: PlayerId, cardId: string) {
    const card = game.players[playerId].hand.find((handCard) => handCard.id === cardId);

    if (!card) {
      return;
    }

    const targetRequirement = getTargetRequirement(card);

    if (targetRequirement && !(card.id === "aufschieberitis" && !hasEnemyFieldCards(playerId))) {
      setPendingSpell({ playerId, cardId });
      setInspectedCard(card);
      return;
    }

    setGame((currentGame) => currentGame ? playCardFromHand(currentGame, playerId, cardId) : currentGame);
  }

  function handleTargetCard(target: TargetRef) {
    if (!pendingSpell) {
      return;
    }

    setGame((currentGame) =>
      currentGame ? playCardFromHand(currentGame, pendingSpell.playerId, pendingSpell.cardId, target) : currentGame
    );
    setPendingSpell(null);
  }

  function handlePhaseAction() {
    setPendingSpell(null);

    setGame((currentGame) => {
      if (!currentGame) return currentGame;

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

  function getPhaseButtonText() {
    if (game.phase === "draw") return "Karten ziehen";
    if (game.phase === "play") return game.repeatPlayPhase ? "Spielphase wiederholen" : "Runde beenden";

    if (game.phase === "gameEnd") {
      if (winner === "draw") return "Unentschieden";
      if (winner === "player1") return `${game.players.player1.name} gewinnt`;
      if (winner === "player2") return `${game.players.player2.name} gewinnt`;
    }

    return "Weiter";
  }

  return (
    <main className="app">
      <section className="game-layout">
        <section className="game-table">
          <div className="game-status">
            <span>
              Runde {game.round} / {game.maxRounds} · {game.phase} · {game.players[game.currentPlayerId].name} beginnt
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
              isCurrentPlayer={game.currentPlayerId === opponent.id}
              pendingPlayerId={pendingSpell?.playerId}
              pendingRequirement={pendingRequirement}
              onInspect={setInspectedCard}
              onTargetCard={handleTargetCard}
            />

            <DebuffZone
              players={game.players}
              pendingPlayerId={pendingSpell?.playerId}
              pendingRequirement={pendingRequirement}
              onTargetCard={handleTargetCard}
              onInspect={setInspectedCard}
            />

            <BattlefieldSide
              player={player}
              isCurrentPlayer={game.currentPlayerId === player.id}
              pendingPlayerId={pendingSpell?.playerId}
              pendingRequirement={pendingRequirement}
              onInspect={setInspectedCard}
              onTargetCard={handleTargetCard}
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

function App() {
  const [game, setGame] = useState<GameState | null>(null);

  if (!game) {
    return <Onboarding onStart={(playerDeckId) => setGame(createGame({ player1DeckId: playerDeckId }))} />;
  }

  return <GameScreen game={game} setGame={setGame} />;
}

export default App;
