import { useState, type Dispatch, type SetStateAction } from "react";
import eyeCardBackUrl from "./assets/card-backs/eye_card_back.webp";
import fingerCardBackUrl from "./assets/card-backs/finger_card_back.webp";
import eyeCoinUrl from "./assets/icons/eye_coin.webp";
import fingerCoinUrl from "./assets/icons/finger_coin.webp";
import { cards, type Card, type DeckId } from "./game/cards/cards";
import { createGame } from "./game/cards/state/createGame";
import {
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
import "./App.css";
import "./PhaseControls.css";
import "./Onboarding.css";
import "./MonsterPick.css";
import "./SleekOnboarding.css";

type DisplayCard = Card | PlayedCard;
type MonsterCard = Extract<Card, { type: "monster" }>;
type CoinSide = DeckId;

const deckBackImages: Record<DeckId, string> = {
  eye: eyeCardBackUrl,
  finger: fingerCardBackUrl,
};

const coinImages: Record<CoinSide, string> = {
  eye: eyeCoinUrl,
  finger: fingerCoinUrl,
};

type SetupStep = {
  title: string;
  text: string;
  animation: "coins" | "monster" | "shuffle";
};

const setupSteps: SetupStep[] = [
  {
    title: "1. Decks verteilen",
    text: "Wirf die Münze oder tausche die Decks direkt. Danach zieht ihr gegenseitig verdeckt ein Startmonster.",
    animation: "coins",
  },
  {
    title: "2. Startmonster verdeckt ziehen",
    text: "Jede Seite bietet 4 Monster verdeckt an. Das Gegenüber wählt 1 Karte; sie kommt als erstes Monster auf die Starthand.",
    animation: "monster",
  },
  {
    title: "3. Restdeck mischen",
    text: "Die übrigen 3 Monster und alle 11 Zauber werden gemischt und als verdeckter Kartenstapel bereitgelegt. Die zwei Karten ziehst du gleich direkt vom Deck auf dem Spielbrett.",
    animation: "shuffle",
  },
];

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function getDeckName(deckId: DeckId) {
  return deckId === "eye" ? "Auge des Fokus" : "Finger des Aufschubs";
}

function getOpponentDeckId(deckId: DeckId): DeckId {
  return deckId === "eye" ? "finger" : "eye";
}

function getDeckMonsters(deckId: DeckId): MonsterCard[] {
  return cards.filter((card) => card.deck === deckId && card.type === "monster") as MonsterCard[];
}

function DeckBack({ deckId, small = false }: { deckId: DeckId; small?: boolean }) {
  return (
    <div className={`deck-back deck-back--${deckId} ${small ? "deck-back--small" : ""}`}>
      <img className="deck-back__image" src={deckBackImages[deckId]} alt={`${getDeckName(deckId)} Kartenrücken`} />
    </div>
  );
}

function DeckCoinBadge({ deckId, isWinner }: { deckId: DeckId; isWinner: boolean }) {
  return (
    <span
      className={`deck-assignment-coin deck-assignment-coin--${deckId} ${isWinner ? "deck-assignment-coin--winner" : ""}`}
      aria-label={`${getDeckName(deckId)} Münzseite${isWinner ? " gewinnt den Münzwurf" : ""}`}
    >
      <img src={coinImages[deckId]} alt="" aria-hidden="true" />
    </span>
  );
}

function HiddenMonsterPickRow({
  title,
  helper,
  deckId,
  monsterOrder,
  selectedMonsterId,
  onSelect,
}: {
  title: string;
  helper: string;
  deckId: DeckId;
  monsterOrder: MonsterCard[];
  selectedMonsterId?: string;
  onSelect: (cardId: string) => void;
}) {
  return (
    <div className="monster-pick-row monster-pick-row--hidden">
      <div className="monster-pick-copy">
        <strong>{title}</strong>
        <span>{helper}</span>
      </div>
      <div className="hidden-pick-cards">
        {monsterOrder.map((card, index) => (
          <button
            className={`hidden-pick-card ${selectedMonsterId === card.id ? "hidden-pick-card--selected" : ""}`}
            key={card.id}
            onClick={() => onSelect(card.id)}
            type="button"
            aria-label={`Verdecktes Monster ${index + 1} aus ${getDeckName(deckId)}`}
          >
            <DeckBack deckId={deckId} small />
          </button>
        ))}
      </div>
    </div>
  );
}

function OnboardingAnimation({
  step,
  coinSide,
  playerDeckId,
  opponentDeckId,
  monsterOrders,
  selectedStartingMonsterIds,
  onSelectStartingMonster,
}: {
  step: SetupStep;
  coinSide: CoinSide;
  playerDeckId: DeckId;
  opponentDeckId: DeckId;
  monsterOrders: Record<DeckId, MonsterCard[]>;
  selectedStartingMonsterIds: Partial<Record<DeckId, string>>;
  onSelectStartingMonster: (deckId: DeckId, cardId: string) => void;
}) {
  if (step.animation === "coins") {
    return (
      <div className="coin-overview" aria-label="Münzwurf: Vorder- und Rückseite">
        {(["eye", "finger"] as CoinSide[]).map((side) => (
          <figure className={`coin-face coin-face--${side} ${coinSide === side ? "coin-face--active" : ""}`} key={side}>
            <img src={coinImages[side]} alt={`${getDeckName(side)} Münzseite`} />
            <figcaption>{getDeckName(side)}</figcaption>
          </figure>
        ))}
      </div>
    );
  }

  if (step.animation === "monster") {
    return (
      <div className="monster-pick-stage monster-pick-stage--hidden">
        <HiddenMonsterPickRow
          title="Du ziehst beim Gegenüber"
          helper={`Wähle 1 verdecktes Monster aus ${getDeckName(opponentDeckId)}.`}
          deckId={opponentDeckId}
          monsterOrder={monsterOrders[opponentDeckId]}
          selectedMonsterId={selectedStartingMonsterIds[opponentDeckId]}
          onSelect={(cardId) => onSelectStartingMonster(opponentDeckId, cardId)}
        />
        <HiddenMonsterPickRow
          title="Gegenüber zieht bei dir"
          helper="Simuliere, welches deiner 4 Monster gezogen wird."
          deckId={playerDeckId}
          monsterOrder={monsterOrders[playerDeckId]}
          selectedMonsterId={selectedStartingMonsterIds[playerDeckId]}
          onSelect={(cardId) => onSelectStartingMonster(playerDeckId, cardId)}
        />
      </div>
    );
  }

  return (
    <div className="shuffle-stack shuffle-stack--sleek" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="shuffle-card" key={index} style={{ animationDelay: `${index * 90}ms` }}>
          <DeckBack deckId={playerDeckId} small />
        </div>
      ))}
    </div>
  );
}

function DeckAssignmentCard({
  label,
  deckId,
  coinSide,
  showMonsterPick,
  monsterOrder,
  selectedMonsterId,
  pickTitle,
  pickHelper,
  onSelectMonster,
  onSwap,
}: {
  label: string;
  deckId: DeckId;
  coinSide: CoinSide;
  showMonsterPick: boolean;
  monsterOrder: MonsterCard[];
  selectedMonsterId?: string;
  pickTitle: string;
  pickHelper: string;
  onSelectMonster: (cardId: string) => void;
  onSwap?: () => void;
}) {
  return (
    <div
      className={`deck-assignment-card deck-assignment-card--sleek ${showMonsterPick ? "deck-assignment-card--with-pick" : ""} ${onSwap ? "deck-assignment-card--clickable" : ""}`}
      onClick={onSwap}
      onKeyDown={(event) => {
        if (!onSwap) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSwap();
        }
      }}
      role={onSwap ? "button" : undefined}
      tabIndex={onSwap ? 0 : undefined}
    >
      <span className="deck-assignment-label">
        {label}
        {onSwap && <em>Zum Tauschen ein Deck anklicken</em>}
      </span>
      <span className="deck-assignment-visual">
        <DeckBack deckId={deckId} />
      </span>
      <DeckCoinBadge deckId={deckId} isWinner={coinSide === deckId} />
      <strong>{getDeckName(deckId)}</strong>

      {showMonsterPick && (
        <div className="deck-monster-pick">
          <HiddenMonsterPickRow
            title={pickTitle}
            helper={pickHelper}
            deckId={deckId}
            monsterOrder={monsterOrder}
            selectedMonsterId={selectedMonsterId}
            onSelect={onSelectMonster}
          />
        </div>
      )}
    </div>
  );
}

function Onboarding({
  onStart,
}: {
  onStart: (playerDeckId: DeckId, startingMonsterIds: Partial<Record<DeckId, string>>) => void;
}) {
  const [coinSide, setCoinSide] = useState<CoinSide>("eye");
  const [isTossingCoin, setIsTossingCoin] = useState(false);
  const [playerDeckId, setPlayerDeckId] = useState<DeckId>("eye");
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedStartingMonsterIds, setSelectedStartingMonsterIds] = useState<Partial<Record<DeckId, string>>>({});
  const [monsterOrders] = useState<Record<DeckId, MonsterCard[]>>(() => ({
    eye: shuffle(getDeckMonsters("eye")),
    finger: shuffle(getDeckMonsters("finger")),
  }));
  const activeStep = setupSteps[stepIndex];
  const opponentDeckId = getOpponentDeckId(playerDeckId);
  const hasPickedBothMonsters = Boolean(selectedStartingMonsterIds[playerDeckId] && selectedStartingMonsterIds[opponentDeckId]);
  const canContinue = activeStep.animation === "monster" ? hasPickedBothMonsters : true;

  function tossCoin() {
    setIsTossingCoin(true);
    window.setTimeout(() => {
      const result: CoinSide = Math.random() > 0.5 ? "eye" : "finger";
      setCoinSide(result);
      setPlayerDeckId(result);
      setStepIndex(0);
      setIsTossingCoin(false);
    }, 650);
  }

  function swapDecks() {
    setPlayerDeckId((currentDeckId) => getOpponentDeckId(currentDeckId));
  }

  function selectStartingMonster(deckId: DeckId, cardId: string) {
    setSelectedStartingMonsterIds((currentSelection) => ({
      ...currentSelection,
      [deckId]: cardId,
    }));
  }

  function goForward() {
    if (!canContinue) return;
    setStepIndex((index) => Math.min(setupSteps.length - 1, index + 1));
  }

  return (
    <main className="app onboarding-app onboarding-app--sleek">
      <section className="onboarding-panel onboarding-panel--sleek">
        <div className="onboarding-copy onboarding-copy--sleek">
          <p className="eyebrow">Spielaufbau</p>
          <h1>Früher oder Später?</h1>
          <p>Decks verteilen, Startmonster verdeckt ziehen, Restdeck mischen. Danach ziehst du auf dem Spielbrett.</p>
        </div>

        <section className="deck-assignment deck-assignment--sleek" aria-label="Deckzuordnung">
          <DeckAssignmentCard
            label="Du spielst"
            deckId={playerDeckId}
            coinSide={coinSide}
            showMonsterPick={activeStep.animation === "monster"}
            monsterOrder={monsterOrders[opponentDeckId]}
            selectedMonsterId={selectedStartingMonsterIds[opponentDeckId]}
            pickTitle="Du ziehst beim Gegenüber"
            pickHelper={`Wähle 1 verdecktes Monster aus ${getDeckName(opponentDeckId)}.`}
            onSelectMonster={(cardId) => selectStartingMonster(opponentDeckId, cardId)}
            onSwap={activeStep.animation === "coins" ? swapDecks : undefined}
          />

          {activeStep.animation === "coins" && (
            <button className={`coin-toss-button coin-toss-button--sleek ${isTossingCoin ? "is-tossing" : ""}`} onClick={tossCoin} type="button">
              <span className="coin-flip" aria-hidden="true">
                <span className="coin-flip__face coin-flip__face--front">
                  <img src={coinImages[coinSide]} alt="" />
                </span>
                <span className="coin-flip__face coin-flip__face--back">
                  <img src={coinImages[coinSide === "eye" ? "finger" : "eye"]} alt="" />
                </span>
              </span>
              <span>Münze werfen</span>
              <small>{getDeckName(coinSide)} gewinnt</small>
            </button>
          )}

          <DeckAssignmentCard
            label="Gegenüber spielt"
            deckId={opponentDeckId}
            coinSide={coinSide}
            showMonsterPick={activeStep.animation === "monster"}
            monsterOrder={monsterOrders[playerDeckId]}
            selectedMonsterId={selectedStartingMonsterIds[playerDeckId]}
            pickTitle="Gegenüber zieht bei dir"
            pickHelper={`Das Gegenüber wählt 1 verdecktes Monster aus ${getDeckName(playerDeckId)}.`}
            onSelectMonster={(cardId) => selectStartingMonster(playerDeckId, cardId)}
            onSwap={activeStep.animation === "coins" ? swapDecks : undefined}
          />
        </section>

        <section className={`setup-walkthrough setup-walkthrough--sleek ${activeStep.animation !== "shuffle" ? "setup-walkthrough--text-only" : ""}`}>
          {activeStep.animation === "shuffle" && (
          <OnboardingAnimation
            step={activeStep}
            coinSide={coinSide}
            playerDeckId={playerDeckId}
            opponentDeckId={opponentDeckId}
            monsterOrders={monsterOrders}
            selectedStartingMonsterIds={selectedStartingMonsterIds}
            onSelectStartingMonster={selectStartingMonster}
          />
          )}
          <div className="setup-copy setup-copy--sleek">
            <p className="step-counter">Schritt {stepIndex + 1} / {setupSteps.length}</p>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.text}</p>
            {activeStep.animation === "monster" && !hasPickedBothMonsters && (
              <p className="setup-warning">Wähle je 1 verdecktes Monster aus beiden Reihen.</p>
            )}
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
                <button className="primary-button" disabled={!canContinue} onClick={goForward} type="button">
                  Weiter
                </button>
              ) : (
                <button className="primary-button" onClick={() => onStart(playerDeckId, selectedStartingMonsterIds)} type="button">
                  Spielbrett öffnen
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
      className={`card-view card-view--${variant} ${isOpponent ? "card-view--opponent" : ""} ${isTargetable ? "card-view--targetable" : ""} ${isHidden ? "card-view--hidden" : ""}`}
      onClick={onClick}
      onFocus={() => onInspect?.(card)}
      onMouseEnter={() => onInspect?.(card)}
      type="button"
    >
      {isHidden ? <DeckBack deckId={card.deck} /> : <img src={card.imagePath} alt={card.name} />}
      {!isHidden && "currentStrength" in card && <strong className="strength-badge">{card.currentStrength}</strong>}
      {!isHidden && "noBuffsUntilRound" in card && card.noBuffsUntilRound && <span className="status-badge">No Buff</span>}
    </button>
  );
}

function EmptySlot({ small = false }: { small?: boolean }) {
  return <div className={`empty-slot ${small ? "empty-slot--small" : ""}`} />;
}

function Pile({
  label,
  count,
  deckId,
  onClick,
  isDrawable = false,
}: {
  label: string;
  count: number;
  deckId?: DeckId;
  onClick?: () => void;
  isDrawable?: boolean;
}) {
  const content = (
    <>
      {deckId && <DeckBack deckId={deckId} small />}
      <span>{label}</span>
      <strong>{count}</strong>
    </>
  );

  if (onClick) {
    return (
      <button className={`pile ${deckId ? "pile--deck" : ""} ${isDrawable ? "pile--drawable" : ""}`} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <div className={`pile ${deckId ? "pile--deck" : ""}`}>{content}</div>;
}

function PlayerPiles({
  player,
  drawRemaining = 0,
  onDrawFromDeck,
}: {
  player: PlayerState;
  drawRemaining?: number;
  onDrawFromDeck?: (playerId: PlayerId) => void;
}) {
  const canDraw = drawRemaining > 0 && player.deck.length > 0;

  return (
    <aside className="field-piles" aria-label={`${player.name} Stapel`}>
      {canDraw && <span className="draw-hint">Noch {drawRemaining} ziehen</span>}
      <div className="deck-graveyard-stack">
        <Pile label="Deck" count={player.deck.length} deckId={player.deckId} onClick={canDraw ? () => onDrawFromDeck?.(player.id) : undefined} isDrawable={canDraw} />
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
  if (!pendingPlayerId || !pendingRequirement) return false;

  const opponentId: PlayerId = pendingPlayerId === "player1" ? "player2" : "player1";

  if (pendingRequirement === "ownMonster") {
    return targetPlayerId === pendingPlayerId && card.type === "monster";
  }

  if (pendingRequirement === "enemyMonster") {
    return targetPlayerId === opponentId && card.type === "monster";
  }

  if (pendingRequirement === "anyMonster") {
    return card.type === "monster";
  }

  if (pendingRequirement === "enemyFieldCard") {
    return targetPlayerId === opponentId;
  }

  return false;
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
  if (!card) return <EmptySlot small={small} />;

  const isTargetable = canTargetPlayedCard(pendingPlayerId, pendingRequirement, playerId, card);

  return (
    <CardView
      card={card}
      isOpponent={isOpponent}
      isTargetable={isTargetable}
      onClick={() => {
        if (isTargetable) onTargetCard?.({ playerId, instanceId: card.instanceId });
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
  if (cards.length === 0) return <EmptySlot small />;

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
  const permanentCards = player.spellZone.filter((card) => card.effectType === "permanent");
  const specialCards = player.spellZone.filter((card) => card.effectType === "special");
  const buffCards = player.spellZone.filter((card) => card.effectType === "buff");

  return (
    <div className="spell-board">
      <div className="spell-wing spell-wing--permanent">
        <span>Permanent</span>
        <CardStack cards={permanentCards} playerId={player.id} isOpponent={isOpponent} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} />
      </div>

      <div className="buff-grid" aria-label="Verstärkungen unter Monstern">
        {Array.from({ length: 4 }, (_, index) => {
          const monster = player.monsterZone[index];
          const cardsForMonster = buffCards.filter((card) => card.target?.instanceId === monster?.instanceId);
          const looseBuffs = index === 0 ? buffCards.filter((card) => !card.target) : [];

          return (
            <div className="buff-stack" key={monster?.instanceId ?? index}>
              <CardStack cards={[...cardsForMonster, ...looseBuffs]} playerId={player.id} isOpponent={isOpponent} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} />
            </div>
          );
        })}
      </div>

      <div className="spell-wing spell-wing--special">
        <span>Spezial</span>
        <CardStack cards={specialCards} playerId={player.id} isOpponent={isOpponent} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} />
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
  drawRemaining = 0,
  onDrawFromDeck,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onInspect: (card: DisplayCard) => void;
  onTargetCard?: (target: TargetRef) => void;
  isCurrentPlayer?: boolean;
  drawRemaining?: number;
  onDrawFromDeck?: (playerId: PlayerId) => void;
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
            <MonsterZone player={player} isOpponent={isOpponent} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} />
          </div>

          <div className="field-zone field-zone--spells">
            <span className="zone-label">Zauberzone</span>
            <SpellZone player={player} isOpponent={isOpponent} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} />
          </div>
        </div>

        <PlayerPiles player={player} drawRemaining={drawRemaining} onDrawFromDeck={onDrawFromDeck} />
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
    players[playerId].spellZone.filter((card) => card.effectType === "debuff").map((card) => ({ playerId, card }))
  );

  return (
    <div className="conflict-line">
      <span>Schwächungszone</span>
      <div className="debuff-cards">
        {debuffs.length === 0 ? (
          <span className="zone-hint">Schwächungen liegen hier</span>
        ) : (
          debuffs.map(({ playerId, card }) => (
            <PlayedCardSlot key={card.instanceId} card={card} playerId={playerId} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} small />
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

function GameScreen({ game, setGame }: { game: GameState; setGame: Dispatch<SetStateAction<GameState | null>> }) {
  const [inspectedCard, setInspectedCard] = useState<DisplayCard | undefined>(() => game.players.player1.hand[0] ?? game.players.player2.hand[0]);
  const [pendingSpell, setPendingSpell] = useState<{ playerId: PlayerId; cardId: string } | null>(null);
  const [setupDrawRemaining, setSetupDrawRemaining] = useState<Record<PlayerId, number>>({ player1: 2, player2: 2 });

  const needsSetupDraw = game.round === 1 && game.phase === "draw" && (setupDrawRemaining.player1 > 0 || setupDrawRemaining.player2 > 0);

  function hasEnemyFieldCards(playerId: PlayerId) {
    const enemy = game.players[playerId === "player1" ? "player2" : "player1"];
    return enemy.monsterZone.length + enemy.spellZone.length > 0;
  }

  function drawFromDeck(playerId: PlayerId) {
    if (game.phase !== "draw" || setupDrawRemaining[playerId] <= 0) return;

    setGame((currentGame) => {
      if (!currentGame) return currentGame;
      const player = currentGame.players[playerId];
      const [drawnCard, ...remainingDeck] = player.deck;
      if (!drawnCard) return currentGame;

      return {
        ...currentGame,
        players: {
          ...currentGame.players,
          [playerId]: {
            ...player,
            deck: remainingDeck,
            hand: [...player.hand, drawnCard],
          },
        },
      };
    });

    setSetupDrawRemaining((current) => ({
      ...current,
      [playerId]: Math.max(0, current[playerId] - 1),
    }));
  }

  function handlePlayCard(playerId: PlayerId, cardId: string) {
    const card = game.players[playerId].hand.find((handCard) => handCard.id === cardId);
    if (!card) return;

    const targetRequirement = getTargetRequirement(card);

    if (targetRequirement && !(card.id === "aufschieberitis" && !hasEnemyFieldCards(playerId))) {
      setPendingSpell({ playerId, cardId });
      setInspectedCard(card);
      return;
    }

    setGame((currentGame) => currentGame ? playCardFromHand(currentGame, playerId, cardId) : currentGame);
  }

  function handleTargetCard(target: TargetRef) {
    if (!pendingSpell) return;

    setGame((currentGame) => currentGame ? playCardFromHand(currentGame, pendingSpell.playerId, pendingSpell.cardId, target) : currentGame);
    setPendingSpell(null);
  }

  function handlePhaseAction() {
    if (needsSetupDraw) return;
    setPendingSpell(null);

    setGame((currentGame) => {
      if (!currentGame) return currentGame;
      if (currentGame.phase === "draw") return startPlayPhase(currentGame);
      if (currentGame.phase === "play") return endRound(currentGame);
      return currentGame;
    });
  }

  const opponent = game.players.player2;
  const player = game.players.player1;
  const winner = getWinner(game);
  const pendingCard = pendingSpell ? game.players[pendingSpell.playerId].hand.find((card) => card.id === pendingSpell.cardId) : undefined;
  const pendingRequirement = pendingCard ? getTargetRequirement(pendingCard) : undefined;

  function getPhaseButtonText() {
    if (needsSetupDraw) return "Klicke beide Decks";
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

            <button className="phase-button" disabled={game.phase === "gameEnd" || needsSetupDraw} onClick={handlePhaseAction} type="button">
              {getPhaseButtonText()}
            </button>
          </div>

          {pendingCard && (
            <div className="target-banner">
              Ziel wählen für: <strong>{pendingCard.name}</strong>
              <button onClick={() => setPendingSpell(null)} type="button">Abbrechen</button>
            </div>
          )}

          <Hand player={opponent} isOpponent selectedCardId={pendingSpell?.cardId} onPlayCard={handlePlayCard} onInspect={setInspectedCard} />

          <section className="battlefield">
            <BattlefieldSide
              player={opponent}
              isOpponent
              isCurrentPlayer={game.currentPlayerId === opponent.id}
              drawRemaining={setupDrawRemaining.player2}
              onDrawFromDeck={drawFromDeck}
              pendingPlayerId={pendingSpell?.playerId}
              pendingRequirement={pendingRequirement}
              onInspect={setInspectedCard}
              onTargetCard={handleTargetCard}
            />

            <DebuffZone players={game.players} pendingPlayerId={pendingSpell?.playerId} pendingRequirement={pendingRequirement} onTargetCard={handleTargetCard} onInspect={setInspectedCard} />

            <BattlefieldSide
              player={player}
              isCurrentPlayer={game.currentPlayerId === player.id}
              drawRemaining={setupDrawRemaining.player1}
              onDrawFromDeck={drawFromDeck}
              pendingPlayerId={pendingSpell?.playerId}
              pendingRequirement={pendingRequirement}
              onInspect={setInspectedCard}
              onTargetCard={handleTargetCard}
            />
          </section>

          <Hand player={player} selectedCardId={pendingSpell?.cardId} onPlayCard={handlePlayCard} onInspect={setInspectedCard} />
        </section>

        <CardPreview card={inspectedCard} />
      </section>
    </main>
  );
}

function App() {
  const [game, setGame] = useState<GameState | null>(null);

  if (!game) {
    return (
      <Onboarding
        onStart={(playerDeckId, startingMonsterIds) =>
          setGame(createGame({ player1DeckId: playerDeckId, startingMonsterIds }))
        }
      />
    );
  }

  return <GameScreen game={game} setGame={setGame} />;
}

export default App;
