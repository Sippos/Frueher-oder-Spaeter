import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { io, Socket } from "socket.io-client";
import eyeCoinUrl from "./assets/icons/eye_coin.webp";
import fingerCoinUrl from "./assets/icons/finger_coin.webp";
import { cards, type Card, type DeckId } from "./game/cards/cards";
import { createGame } from "./game/cards/state/createGame";
import {
  endRound,
  getTargetRequirement,
  getWinner,
  playCardFromHand,
  revealStagedCards,
} from "./game/cards/state/actions";
import type {
  GameState,
  PlayedCard,
  PlayedMonsterCard,
  PlayedSpellCard,
  PlayerId,
  PlayerState,
  TargetRef,
  SetupState,
} from "./game/cards/state/gameTypes";
import "./App.css";
import "./PhaseControls.css";
import "./Onboarding.css";
import "./MonsterPick.css";
import "./SleekOnboarding.css";
import "./AssetImages.css";
import GameOverOverlay from "./components/GameOverOverlay";

type DisplayCard = Card | PlayedCard;
type MonsterCard = Extract<Card, { type: "monster" }>;
type CoinSide = DeckId;

const deckBackImages: Record<DeckId, string> = {
  eye: "/card-backs/eye_card_back.webp",
  finger: "/card-backs/finger_card_back.webp",
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

function ManaOrbs({ mana, maxMana = 2 }: { mana: number; maxMana?: number }) {
  return (
    <div className="mana-orbs" aria-label={`Mana: ${mana} von ${maxMana}`}>
      {Array.from({ length: maxMana }).map((_, i) => (
        <div key={i} className={`mana-orb ${i < mana ? "mana-orb--filled" : ""}`} />
      ))}
    </div>
  );
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
  pickDeckId,
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
  pickDeckId: DeckId;
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
            deckId={pickDeckId}
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
  isMultiplayer,
  localPlayerId,
  setupState,
  onSetupAction
}: {
  onStart?: (playerDeckId: DeckId, startingMonsterIds: Partial<Record<DeckId, string>>) => void;
  isMultiplayer?: boolean;
  localPlayerId?: PlayerId;
  setupState?: SetupState;
  onSetupAction?: (action: string, payload?: any) => void;
}) {
  const [localCoinSide, setLocalCoinSide] = useState<CoinSide>("eye");
  const [isTossingCoin, setIsTossingCoin] = useState(false);
  const [localPlayerDeckId, setLocalPlayerDeckId] = useState<DeckId>("eye");
  const [localStepIndex, setLocalStepIndex] = useState(0);
  const [localSelectedStartingMonsterIds, setLocalSelectedStartingMonsterIds] = useState<Partial<Record<DeckId, string>>>({});
  const [monsterOrders] = useState<Record<DeckId, MonsterCard[]>>(() => ({
    eye: shuffle(getDeckMonsters("eye")),
    finger: shuffle(getDeckMonsters("finger")),
  }));

  const coinSide = setupState?.coinSide ?? localCoinSide;
  const stepIndex = setupState?.stepIndex ?? localStepIndex;
  
  let playerDeckId = localPlayerDeckId;
  if (isMultiplayer && setupState) {
    if (localPlayerId === "player1" && setupState.player1DeckId) playerDeckId = setupState.player1DeckId;
    if (localPlayerId === "player2" && setupState.player2DeckId) playerDeckId = setupState.player2DeckId;
  }
  
  const opponentDeckId = getOpponentDeckId(playerDeckId);
  const selectedStartingMonsterIds = isMultiplayer ? 
    {
      [setupState?.player2DeckId || "finger"]: setupState?.selectedStartingMonsters.player1,
      [setupState?.player1DeckId || "eye"]: setupState?.selectedStartingMonsters.player2
    } : localSelectedStartingMonsterIds;
    
  const activeStep = setupSteps[stepIndex];
  const hasPickedBothMonsters = Boolean(selectedStartingMonsterIds[playerDeckId] && selectedStartingMonsterIds[opponentDeckId]);
  
  let canContinue = true;
  if (activeStep.animation === "coins") {
    canContinue = isMultiplayer ? Boolean(setupState?.coinSide) : true; // In local, we don't have a distinct "has tossed" state, but they can just click "Münze werfen"
  } else if (activeStep.animation === "monster") {
    canContinue = isMultiplayer 
      ? Boolean(setupState?.selectedStartingMonsters?.player1 && setupState?.selectedStartingMonsters?.player2) 
      : hasPickedBothMonsters;
  }

  function tossCoin() {
    setIsTossingCoin(true);
    window.setTimeout(() => {
      const result: CoinSide = Math.random() > 0.5 ? "eye" : "finger";
      
      // Update local state immediately so the UI doesn't flash the default 'eye'
      // before the server broadcasts the new state back to the client.
      setLocalCoinSide(result);
      
      if (isMultiplayer) {
        onSetupAction?.("tossCoin", result);
        // Do NOT auto-advance here, let Player 1 press Weiter
      } else {
        setLocalPlayerDeckId(result);
      }
      setIsTossingCoin(false);
    }, 650);
  }

  function swapDecks() {
    if (isMultiplayer) return;
    setLocalPlayerDeckId((currentDeckId: DeckId) => getOpponentDeckId(currentDeckId));
  }

  function selectStartingMonster(deckId: DeckId, cardId: string) {
    if (isMultiplayer) {
      if (deckId !== opponentDeckId) return; // Can only pick from opponent's deck
      onSetupAction?.("selectStartingMonster", cardId);
    } else {
      setLocalSelectedStartingMonsterIds((currentSelection) => ({
        ...currentSelection,
        [deckId]: cardId,
      }));
    }
  }

  function goForward() {
    if (!canContinue) return;
    const nextIndex = Math.min(setupSteps.length - 1, stepIndex + 1);
    if (isMultiplayer) {
      onSetupAction?.("setSetupStep", nextIndex);
    } else {
      setLocalStepIndex(nextIndex);
    }
  }
  
  function goBack() {
    const nextIndex = Math.max(0, stepIndex - 1);
    if (isMultiplayer) {
      onSetupAction?.("setSetupStep", nextIndex);
    } else {
      setLocalStepIndex(nextIndex);
    }
  }

  const isCoinTossActive = activeStep.animation === "coins";
  const canTossCoin = !isMultiplayer || localPlayerId === "player1";

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
            label={isMultiplayer ? "Du spielst" : "Spieler 1"}
            deckId={playerDeckId}
            pickDeckId={opponentDeckId}
            coinSide={coinSide}
            showMonsterPick={activeStep.animation === "monster"}
            monsterOrder={monsterOrders[opponentDeckId]}
            selectedMonsterId={selectedStartingMonsterIds[opponentDeckId]}
            pickTitle={isMultiplayer ? "Du ziehst beim Gegenüber" : "Spieler 1 zieht bei Spieler 2"}
            pickHelper={`Wähle 1 verdecktes Monster aus ${getDeckName(opponentDeckId)}.`}
            onSelectMonster={(cardId) => selectStartingMonster(opponentDeckId, cardId)}
            onSwap={isCoinTossActive && !isMultiplayer ? swapDecks : undefined}
          />

          {isCoinTossActive && (
            canTossCoin ? (
              <button className={`coin-toss-button coin-toss-button--sleek ${isTossingCoin ? "is-tossing" : ""}`} onClick={setupState?.coinSide ? undefined : tossCoin} disabled={isMultiplayer && !!setupState?.coinSide} type="button">
                <span className="coin-flip" aria-hidden="true">
                  <span className="coin-flip__face coin-flip__face--front">
                    <img src={coinImages[coinSide]} alt="" />
                  </span>
                  <span className="coin-flip__face coin-flip__face--back">
                    <img src={coinImages[coinSide === "eye" ? "finger" : "eye"]} alt="" />
                  </span>
                </span>
                <span>{isMultiplayer && setupState?.coinSide ? "Gewinner:" : "Münze werfen"}</span>
                {(!isMultiplayer || setupState?.coinSide) && (
                  <small>{getDeckName(coinSide)} {isMultiplayer ? "" : "gewinnt"}</small>
                )}
              </button>
            ) : (
              <div className="coin-toss-button coin-toss-button--sleek">
                {setupState?.coinSide ? (
                  <>
                    <span className="coin-flip__face coin-flip__face--front" style={{ position: "static", transform: "none" }}>
                      <img src={coinImages[setupState.coinSide]} alt="" style={{ width: 80, height: 80, display: "block", margin: "0 auto" }} />
                    </span>
                    <span>Gewinner:</span>
                    <small>{getDeckName(setupState.coinSide)}</small>
                  </>
                ) : (
                  <span>Warte auf<br/>Münzwurf...</span>
                )}
              </div>
            )
          )}

          {(!isMultiplayer || activeStep.animation === "coins" || activeStep.animation === "shuffle") && (
            <DeckAssignmentCard
              label={isMultiplayer ? "Gegenüber spielt" : "Spieler 2"}
              deckId={opponentDeckId}
              pickDeckId={playerDeckId}
              coinSide={coinSide}
              showMonsterPick={activeStep.animation === "monster"}
              monsterOrder={monsterOrders[playerDeckId]}
              selectedMonsterId={selectedStartingMonsterIds[playerDeckId]}
              pickTitle={isMultiplayer ? "Gegenüber zieht bei dir" : "Spieler 2 zieht bei Spieler 1"}
              pickHelper={isMultiplayer 
                ? `Wähle 1 verdecktes Monster aus ${getDeckName(playerDeckId)}.` 
                : `Spieler 2 wählt 1 verdecktes Monster aus ${getDeckName(playerDeckId)}.`}
              onSelectMonster={(cardId) => selectStartingMonster(playerDeckId, cardId)}
              onSwap={isCoinTossActive && !isMultiplayer ? swapDecks : undefined}
            />
          )}
        </section>

        <div className="setup-nav-bottom">
          {(!isMultiplayer || localPlayerId === "player1") && (
            <button
              onClick={goBack}
              disabled={stepIndex === 0}
              type="button"
            >
              Zurück
            </button>
          )}
          
          {stepIndex < setupSteps.length - 1 ? (
            (!isMultiplayer || (localPlayerId === "player1" && activeStep.animation !== "monster")) ? (
              <button className="primary-button" disabled={!canContinue} onClick={goForward} type="button">
                Weiter
              </button>
            ) : null
          ) : (
            !isMultiplayer ? (
              <button className="primary-button" onClick={() => onStart?.(playerDeckId, selectedStartingMonsterIds)} type="button">
                Spielbrett öffnen
              </button>
            ) : (
              <p>Spielbrett öffnet in Kürze...</p>
            )
          )}
        </div>

        <section className={`setup-walkthrough setup-walkthrough--sleek ${activeStep.animation !== "shuffle" ? "setup-walkthrough--text-only" : ""}`}>
          {activeStep.animation === "shuffle" && !isMultiplayer && (
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
            {activeStep.animation === "monster" && !canContinue && (
              <p className="setup-warning">
                {isMultiplayer && setupState?.selectedStartingMonsters?.[localPlayerId!]
                  ? "Warte auf Gegenüber..."
                  : "Wähle 1 verdecktes Monster vom Gegenüber."}
              </p>
            )}
            
            <div className="setup-actions">
              {(!isMultiplayer || localPlayerId === "player1") && (
                <button
                  className="secondary-button"
                  disabled={stepIndex === 0}
                  onClick={goBack}
                  type="button"
                >
                  Zurück
                </button>
              )}
              {stepIndex < setupSteps.length - 1 ? (
                (!isMultiplayer || (localPlayerId === "player1" && activeStep.animation !== "monster")) ? (
                  <button className="primary-button" disabled={!canContinue} onClick={goForward} type="button">
                    Weiter
                  </button>
                ) : null
              ) : (
                !isMultiplayer ? (
                  <button className="primary-button" onClick={() => onStart?.(playerDeckId, selectedStartingMonsterIds)} type="button">
                    Spielbrett öffnen
                  </button>
                ) : null
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
  isPlayable = false,
  isHidden = false,
  onClick,
  onInspect,
}: {
  card: DisplayCard;
  variant?: "hand" | "opponentHand" | "board";
  isOpponent?: boolean;
  isTargetable?: boolean;
  isPlayable?: boolean;
  isHidden?: boolean;
  onClick?: () => void;
  onInspect?: (card: DisplayCard) => void;
}) {
  return (
    <button
      className={`card-view card-view--${variant} ${isOpponent ? "card-view--opponent" : ""} ${isTargetable ? "card-view--targetable" : ""} ${isPlayable ? "card-view--playable" : ""} ${isHidden ? "card-view--hidden" : ""}`}
      onClick={onClick}
      onFocus={() => onInspect?.(card)}
      onMouseEnter={() => onInspect?.(card)}
      type="button"
    >
      {isHidden ? <DeckBack deckId={card.deck} /> : <img src={card.imagePath} alt={card.name} />}
      {!isHidden && "currentStrength" in card && (
        <strong 
          className="strength-badge" 
          style={{ 
            fontSize: `${Math.min(1.4, 0.72 + (card.currentStrength / 1500))}rem`, 
            padding: `${Math.min(8, 4 + (card.currentStrength / 600))}px`,
            transition: "all 0.3s ease-out" 
          }}
        >
          {card.currentStrength}
        </strong>
      )}
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
  spielstapelCount,
  onDrawFromDeck,
}: {
  player: PlayerState;
  drawRemaining?: number;
  spielstapelCount?: number;
  onDrawFromDeck?: (playerId: PlayerId) => void;
}) {
  const canDraw = drawRemaining > 0 && player.deck.length > 0;

  return (
    <aside className="field-piles" aria-label={`${player.name} Stapel`}>
      <div className="deck-graveyard-stack">
        <Pile label="Deck" count={player.deck.length} deckId={player.deckId} onClick={canDraw ? () => onDrawFromDeck?.(player.id) : undefined} isDrawable={canDraw} />
        <Pile label="Friedhof" count={player.graveyard.length} />
      </div>
      <Pile label="Spielstapel" count={spielstapelCount ?? player.stagedCards.length} deckId={player.deckId} />
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
  isRoundStarter = false,
  isActiveHotseatPlayer = false,
  isStagingAnimation = false,
  drawRemaining = 0,
  onDrawFromDeck,
}: {
  player: PlayerState;
  isOpponent?: boolean;
  pendingPlayerId?: PlayerId;
  pendingRequirement: ReturnType<typeof getTargetRequirement>;
  onInspect: (card: DisplayCard) => void;
  onTargetCard?: (target: TargetRef) => void;
  isRoundStarter?: boolean;
  isActiveHotseatPlayer?: boolean;
  isStagingAnimation?: boolean;
  drawRemaining?: number;
  onDrawFromDeck?: (playerId: PlayerId) => void;
}) {
  const renderStagedCards = isActiveHotseatPlayer;
  
  const displayPlayer: PlayerState = {
    ...player,
    monsterZone: renderStagedCards ? [...player.monsterZone, ...player.stagedCards.filter((c) => c.type === "monster") as PlayedMonsterCard[]] : player.monsterZone,
    spellZone: renderStagedCards ? [...player.spellZone, ...player.stagedCards.filter((c) => c.type === "spell") as PlayedSpellCard[]] : player.spellZone,
  };

  const spielstapelCount = renderStagedCards ? 0 : player.stagedCards.length;

  return (
    <section className={`battlefield-side ${isOpponent ? "is-opponent" : ""} ${isActiveHotseatPlayer ? "is-current-player" : ""} ${isRoundStarter ? "is-active-turn" : ""} ${isStagingAnimation ? "is-staging-animation" : ""}`}>
      <div className="player-strip">
        <strong>{player.name}</strong>
        <ManaOrbs mana={player.mana} />
        <div 
          className="player-strength" 
          style={{ 
            transform: `scale(${Math.min(1.8, 1 + (player.score / 3000))})`,
            transformOrigin: "left center",
            transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          }}
        >
          <span className="strength-label">Stärke</span>
          <span className="strength-value">{player.score}</span>
        </div>
        {player.forcedCardId && <span>Pflichtkarte!</span>}
      </div>

      <div className="field-board">
        <div className="field-main">
          <div className="field-zone field-zone--monsters">
            <span className="zone-label">Monsterzone</span>
            <MonsterZone player={displayPlayer} isOpponent={isOpponent} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} />
          </div>

          <div className="field-zone field-zone--spells">
            <span className="zone-label">Zauberzone</span>
            <SpellZone player={displayPlayer} isOpponent={isOpponent} pendingPlayerId={pendingPlayerId} pendingRequirement={pendingRequirement} onTargetCard={onTargetCard} onInspect={onInspect} />
          </div>
        </div>

        <PlayerPiles player={player} drawRemaining={drawRemaining} spielstapelCount={spielstapelCount} onDrawFromDeck={onDrawFromDeck} />
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
        {player.hand.map((card) => {
          const isPlayable = !isOpponent && card.mana <= player.mana;
          return (
            <CardView
              key={card.id}
              card={card}
              variant={isOpponent ? "opponentHand" : "hand"}
              isOpponent={isOpponent}
              isHidden={isOpponent}
              isTargetable={selectedCardId === card.id || player.forcedCardId === card.id}
              isPlayable={isPlayable}
              onClick={() => onPlayCard(player.id, card.id)}
              onInspect={onInspect}
            />
          );
        })}
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

function InGameMenu({ onResume, onLeave }: { onResume: () => void; onLeave: () => void }) {
  return (
    <div className="in-game-menu-overlay" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center"
    }}>
      <div className="in-game-menu-panel" style={{
        background: "rgba(22, 12, 8, 0.95)", border: "1px solid rgba(255, 244, 223, 0.2)",
        borderRadius: "20px", padding: "30px", width: "90%", maxWidth: "340px",
        boxShadow: "0 24px 48px rgba(0,0,0,0.5)", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px"
      }}>
        <h2 style={{ color: "#fff4df", margin: "0 0 10px 0" }}>Menü</h2>
        <button className="action-button action-button--primary" onClick={onResume} style={{ padding: "12px", fontSize: "1.1rem" }}>Weiter spielen</button>
        <button className="action-button" onClick={onLeave} style={{ padding: "12px", fontSize: "1.1rem", background: "rgba(200, 50, 50, 0.2)", color: "#ff8888", border: "1px solid rgba(200, 50, 50, 0.4)" }}>Spiel verlassen</button>
      </div>
    </div>
  );
}

function GameScreen({ game, setGame, socket, localPlayerId, isMultiplayer, onLeaveGame }: { game: GameState; setGame: Dispatch<SetStateAction<GameState | null>>; socket?: Socket; localPlayerId?: PlayerId; isMultiplayer?: boolean; onLeaveGame?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inspectedCard, setInspectedCard] = useState<DisplayCard | undefined>(() => game.players.player1.hand[0] ?? game.players.player2.hand[0]);
  const [pendingSpell, setPendingSpell] = useState<{ playerId: PlayerId; cardId: string } | null>(null);
  const [drawsRemaining, setDrawsRemaining] = useState<Record<PlayerId, number>>({ player1: 2, player2: 2 });
  const [currentRound, setCurrentRound] = useState(game.round);
  const [currentPhase, setCurrentPhase] = useState(game.phase);
  const [isStagingAnimation, setIsStagingAnimation] = useState(false);
  
  // View State
  const [localHotseatPlayerId, setLocalHotseatPlayerId] = useState<PlayerId>(game.currentPlayerId);
  const activeViewPlayerId = isMultiplayer ? localPlayerId! : localHotseatPlayerId;

  const [showPassDevice, setShowPassDevice] = useState(!isMultiplayer);
  const [playersDonePlaying, setPlayersDonePlaying] = useState<Set<PlayerId>>(new Set());

  // Sync state when new round or phase starts
  if (game.round !== currentRound || game.phase !== currentPhase) {
    setCurrentRound(game.round);
    setCurrentPhase(game.phase);
    setPlayersDonePlaying(new Set());
    setLocalHotseatPlayerId(game.currentPlayerId);
    if (game.round !== currentRound) {
      setDrawsRemaining({ player1: 1, player2: 1 });
    }
  }

  function hasEnemyFieldCards(playerId: PlayerId) {
    const enemy = game.players[playerId === "player1" ? "player2" : "player1"];
    return enemy.monsterZone.length + enemy.spellZone.length > 0;
  }

  function drawFromDeck(playerId: PlayerId) {
    if (game.phase !== "play" || drawsRemaining[playerId] <= 0) return;
    if (playerId !== activeViewPlayerId) return;

    if (socket) {
      socket.emit("drawCard");
      setDrawsRemaining((current) => ({
        ...current,
        [playerId]: Math.max(0, current[playerId] - 1),
      }));
      return;
    }

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

    setDrawsRemaining((current) => ({
      ...current,
      [playerId]: Math.max(0, current[playerId] - 1),
    }));
  }

  function handlePlayCard(playerId: PlayerId, cardId: string) {
    if (playerId !== activeViewPlayerId) return; // Only active viewer can play
    if (game.phase !== "play") return;
    if (drawsRemaining[playerId] > 0) return; // Must draw first

    const card = game.players[playerId].hand.find((handCard) => handCard.id === cardId);
    if (!card) return;

    if (card.mana > game.players[playerId].mana) return;

    const targetRequirement = getTargetRequirement(card);

    if (targetRequirement && !(card.id === "aufschieberitis" && !hasEnemyFieldCards(playerId))) {
      setPendingSpell({ playerId, cardId });
      setInspectedCard(card);
      return;
    }

    setPendingSpell(null);

    if (socket) {
      socket.emit("playCard", { cardId });
      return;
    }

    setGame((currentGame) => currentGame ? playCardFromHand(currentGame, playerId, cardId) : currentGame);
  }

  function handleTargetCard(target: TargetRef) {
    if (!pendingSpell) return;
    if (pendingSpell.playerId !== activeViewPlayerId) return;

    if (socket) {
      socket.emit("playCard", { cardId: pendingSpell.cardId, target });
      setPendingSpell(null);
      return;
    }

    setGame((currentGame) => currentGame ? playCardFromHand(currentGame, pendingSpell.playerId, pendingSpell.cardId, target) : currentGame);
    setPendingSpell(null);
  }

  function handlePhaseAction() {
    setPendingSpell(null);

    if (game.phase === "play") {
      if (drawsRemaining[activeViewPlayerId] > 0) return; // Must draw first

      const nextPlayerId = activeViewPlayerId === "player1" ? "player2" : "player1";
      const newDone = new Set(playersDonePlaying).add(activeViewPlayerId);
      
      if (newDone.size < 2 && !isMultiplayer) {
        setIsStagingAnimation(true);
        setTimeout(() => {
          setIsStagingAnimation(false);
          setPlayersDonePlaying(newDone);
          setShowPassDevice(true);
          setLocalHotseatPlayerId(nextPlayerId);
        }, 500);
      } else {
        setGame((currentGame) => {
          if (!currentGame) return currentGame;
          
          if (socket) {
            setPlayersDonePlaying(newDone);
            socket.emit("playerReady");
            return currentGame;
          }

          const nextGame = revealStagedCards(currentGame);
          return { ...nextGame, phase: "reveal" };
        });
      }
      return;
    }

    if (game.phase === "reveal") {
      if (socket) {
        setPlayersDonePlaying(new Set(playersDonePlaying).add(activeViewPlayerId));
        socket.emit("playerReady");
        return;
      }
      setGame((currentGame) => currentGame ? endRound(currentGame) : currentGame);
      return;
    }
  }

  if (showPassDevice) {
    const nextPlayer = game.players[localHotseatPlayerId];
    return (
      <main className="app onboarding-app onboarding-app--sleek">
        <section className="onboarding-panel onboarding-panel--sleek" style={{ alignItems: "center", textAlign: "center" }}>
          <div className="onboarding-copy onboarding-copy--sleek" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1 style={{ marginBottom: "0.5rem", color: "#fff4df" }}>{nextPlayer.name} ist dran!</h1>
            <p style={{ margin: 0, color: "#ffd6a8", letterSpacing: "0.05em" }}>Gebe das Gerät an {nextPlayer.name} weiter.</p>
            
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "3rem", margin: "3rem 0" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <img src={deckBackImages[nextPlayer.deckId]} alt="Deck" style={{ width: 140, borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }} />
                <strong style={{ color: "#ffd6a8" }}>{getDeckName(nextPlayer.deckId)}</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <img src={coinImages[nextPlayer.deckId]} alt="Coin" style={{ width: 100, height: 100, filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }} />
                <strong style={{ color: "#ffd6a8" }}>Münze</strong>
              </div>
            </div>

            <div className="setup-actions" style={{ justifyContent: "center" }}>
              <button className="primary-button" onClick={() => setShowPassDevice(false)} type="button" style={{ padding: "14px 32px", fontSize: "1.1rem" }}>
                Ich bin bereit
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const player = game.players[activeViewPlayerId];
  const opponentId = activeViewPlayerId === "player1" ? "player2" : "player1";
  const opponent = game.players[opponentId];
  const winner = getWinner(game);
  const pendingCard = pendingSpell ? game.players[pendingSpell.playerId].hand.find((card) => card.id === pendingSpell.cardId) : undefined;
  const pendingRequirement = pendingCard ? getTargetRequirement(pendingCard) : undefined;

  const hasPlayableCards = player.hand.some(card => card.mana <= player.mana);
  const shouldPhaseButtonGlow = 
    (game.phase === "reveal") ||
    (game.phase === "play" && !hasPlayableCards && drawsRemaining[activeViewPlayerId] === 0);

  function getPhaseButtonText() {
    if (game.phase === "play") {
      if (drawsRemaining[activeViewPlayerId] > 0) return "Zuerst Karte(n) ziehen";
      if (isMultiplayer && playersDonePlaying.has(activeViewPlayerId)) return "Warten auf Gegner...";
      return (playersDonePlaying.size === 0 && !isMultiplayer) ? "Zug beenden" : "Karten aufdecken";
    }
    if (game.phase === "reveal") {
      if (isMultiplayer && playersDonePlaying.has(activeViewPlayerId)) return "Warten auf Gegner...";
      return "Runde beenden";
    }

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
              isRoundStarter={game.currentPlayerId === opponent.id}
              isActiveHotseatPlayer={false}
              drawRemaining={0}
              onDrawFromDeck={drawFromDeck}
              pendingPlayerId={pendingSpell?.playerId}
              pendingRequirement={pendingRequirement}
              onInspect={setInspectedCard}
              onTargetCard={handleTargetCard}
            />

            <DebuffZone 
              players={{
                player1: activeViewPlayerId === "player1" ? { ...game.players.player1, spellZone: [...game.players.player1.spellZone, ...game.players.player1.stagedCards.filter((c) => c.type === "spell") as PlayedSpellCard[]] } : game.players.player1,
                player2: activeViewPlayerId === "player2" ? { ...game.players.player2, spellZone: [...game.players.player2.spellZone, ...game.players.player2.stagedCards.filter((c) => c.type === "spell") as PlayedSpellCard[]] } : game.players.player2,
              }} 
              pendingPlayerId={pendingSpell?.playerId} 
              pendingRequirement={pendingRequirement} 
              onTargetCard={handleTargetCard} 
              onInspect={setInspectedCard} 
            />

            <BattlefieldSide
              player={player}
              isRoundStarter={game.currentPlayerId === player.id}
              isActiveHotseatPlayer={true}
              isStagingAnimation={isStagingAnimation}
              drawRemaining={drawsRemaining[player.id]}
              onDrawFromDeck={drawFromDeck}
              pendingPlayerId={pendingSpell?.playerId}
              pendingRequirement={pendingRequirement}
              onInspect={setInspectedCard}
              onTargetCard={handleTargetCard}
            />
          </section>

          <Hand player={player} selectedCardId={pendingSpell?.cardId} onPlayCard={handlePlayCard} onInspect={setInspectedCard} />
        </section>
        <aside className="game-sidebar">
          <div className="game-status" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fff4df", margin: 0, lineHeight: 1 }}>
              Runde {game.round} / {game.maxRounds}
            </span>

            <button 
              className={`phase-button ${shouldPhaseButtonGlow ? "phase-button--glow" : ""}`} 
              disabled={game.phase === "gameEnd" || (game.phase === "play" && drawsRemaining[activeViewPlayerId] > 0) || (isMultiplayer && playersDonePlaying.has(activeViewPlayerId))} 
              onClick={handlePhaseAction} 
              type="button"
              style={{ padding: "8px 24px", minWidth: "160px" }}
            >
              {getPhaseButtonText()}
            </button>
            
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "1px", margin: 0, lineHeight: 1 }}>
              {game.phase === "play" ? "Spielen" : game.phase === "reveal" ? "Aufdecken" : game.phase}
            </span>
          </div>
        </aside>
      </section>
      <CardPreview card={inspectedCard} />
      {game.phase === "gameEnd" && (
        <GameOverOverlay 
          game={game} 
          onPlayAgain={() => window.location.reload()} 
          onGoHome={() => window.location.href = "/"} 
        />
      )}
      <button 
        className="top-right-menu-toggle"
        onClick={() => setIsMenuOpen(true)}
        title="Menü öffnen"
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 100,
          background: "radial-gradient(circle at 50% 0%, rgba(255, 244, 223, 0.15), transparent 65%), rgba(22, 12, 8, 0.9)",
          border: "1px solid rgba(255, 244, 223, 0.2)",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
          transition: "transform 0.2s, border-color 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 244, 223, 0.4)";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 244, 223, 0.2)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span style={{ fontSize: "1.5rem", color: "rgba(255, 244, 223, 0.9)" }}>⚙️</span>
      </button>
      {isMenuOpen && (
        <InGameMenu 
          onResume={() => setIsMenuOpen(false)} 
          onLeave={() => {
            setIsMenuOpen(false);
            if (onLeaveGame) onLeaveGame();
          }} 
        />
      )}
    </main>
  );
}

export default function App({ initialPlayMode = "local" }: { initialPlayMode?: "local" | "multiplayer" }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [socket, setSocket] = useState<Socket | undefined>();
  const [localPlayerId, setLocalPlayerId] = useState<PlayerId | undefined>();
  const [roomId, setRoomId] = useState<string>("");
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [playMode, setPlayMode] = useState<"local" | "multiplayer" | null>(initialPlayMode);

  const [setupState, setSetupState] = useState<any>(null);

  function joinMultiplayerGame(existingRoomId?: string) {
    setIsMultiplayer(true);
    // Connect to VITE_BACKEND_URL in production, or relative URL in development
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server", newSocket.id);
      if (existingRoomId) {
        let retries = 0;
        const tryJoin = () => {
          if (retries > 3) {
            console.error("Failed to join room after retries");
            return;
          }
          newSocket.emit("join_room", existingRoomId, (response: any) => {
            if (response?.error) {
              console.error(response.error);
              retries++;
              setTimeout(tryJoin, 1000);
            } else {
              setRoomId(existingRoomId);
              setRoomReady(true);
              setLocalPlayerId(response?.playerId || "player2");
            }
          });
        };
        tryJoin();
      } else {
        newSocket.emit("create_room", (response: { roomId: string, playerId: PlayerId }) => {
          setRoomId(response.roomId);
          setLocalPlayerId(response.playerId);
          setRoomReady(true);
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set("room", response.roomId);
          window.history.replaceState({}, "", `${window.location.pathname}?${urlParams.toString()}`);
        });
      }
    });

    newSocket.on("room_state", (state: GameState) => {
      setGame(state);
    });

    newSocket.on("setup_state", (state: any) => {
      setSetupState(state);
    });

    newSocket.on("player_joined", () => {
      console.log("Opponent joined!");
    });

    return newSocket;
  }

  useEffect(() => {
    let currentSocket: any = null;
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      setPlayMode("multiplayer");
      currentSocket = joinMultiplayerGame(roomParam);
    } else if (initialPlayMode === "multiplayer") {
      setPlayMode("multiplayer");
      const urlParams = new URLSearchParams(window.location.search);
      const existingRoomId = urlParams.get("room") || undefined;
      currentSocket = joinMultiplayerGame(existingRoomId);
    }
    return () => {
      if (currentSocket) {
        currentSocket.disconnect();
      }
    };
  }, [initialPlayMode]);
  if (isMultiplayer) {
    if (!roomReady) {
      const inviteLink = window.location.origin + window.location.pathname + (roomId ? `?room=${roomId}` : "");
      
      return (
        <main className="app onboarding-app onboarding-app--sleek" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <style>
            {`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}
          </style>
          <section className="onboarding-panel onboarding-panel--sleek" style={{ padding: "40px", maxWidth: "450px", width: "100%" }}>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "24px" }}>
              <h1 style={{ margin: 0, color: "#fff4df", fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.1 }}>Multiplayer Lobby</h1>
              
              {roomId ? (
                <>
                  <p style={{ color: "#fff4df", margin: 0, fontSize: "1.1rem", display: "block" }}>
                    Dein Raum ist bereit! Sende diesen Link an deine:n Mitspieler:in:
                  </p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ 
                      background: "rgba(255,255,255,0.05)", 
                      padding: "12px", 
                      borderRadius: "8px", 
                      wordBreak: "break-all",
                      color: "#f5efe7",
                      fontFamily: "monospace",
                      fontSize: "0.95rem"
                    }}>
                      {inviteLink}
                    </div>
                    
                    <button 
                      className="primary-button" 
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        alert("Link kopiert!");
                      }}
                      type="button"
                    >
                      Link kopieren
                    </button>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "10px" }}>
                    <div style={{ width: "20px", height: "20px", border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    <p style={{ color: "rgba(255,255,255,0.7)", margin: 0, fontSize: "1rem", fontStyle: "italic", display: "block" }}>
                      Warte auf Gegenüber...
                    </p>
                  </div>
                  
                  <div style={{ 
                    marginTop: "20px", 
                    padding: "20px", 
                    background: "rgba(0,0,0,0.2)", 
                    borderRadius: "16px",
                    border: "1px dashed rgba(255,255,255,0.15)",
                    textAlign: "left"
                  }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#fff4df", fontSize: "1.1rem" }}>Kurzanleitung:</h3>
                    <ul style={{ margin: 0, paddingLeft: "20px", color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <li>Jeder Spieler startet mit einer Auswahl an <b>Karten</b> und wählt ein <b>Startmonster</b>.</li>
                      <li>In jeder Runde zieht ihr eine Karte und spielt verdeckt eure Karten auf das Spielfeld.</li>
                      <li>Alle Karten werden gleichzeitig aufgedeckt – Strategie ist alles!</li>
                      <li>Zerstöre alle gegnerischen Monster, um das Spiel zu gewinnen.</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                  <div style={{ width: "20px", height: "20px", border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <p style={{ color: "#fff4df", margin: 0, display: "block" }}>Erstelle Raum...</p>
                </div>
              )}
            </div>
          </section>
        </main>
      );
    }

    if (!game) {
      return (
        <Onboarding
          isMultiplayer={true}
          localPlayerId={localPlayerId}
          setupState={setupState}
          onSetupAction={(action, payload) => socket?.emit(action, payload)}
        />
      );
    }
    
    const handleLeaveGame = () => {
      window.location.href = "/";
    };

    return <GameScreen game={game} setGame={setGame} socket={socket} localPlayerId={localPlayerId} isMultiplayer={true} onLeaveGame={handleLeaveGame} />;
  }

  if (playMode === "local") {
    if (!game) {
      return (
        <Onboarding
          isMultiplayer={false}
          setupState={setupState}
          onStart={(deckId, monsters) => {
            setGame(createGame({ player1DeckId: deckId, startingMonsterIds: monsters }));
          }}
        />
      );
    }
    
    const handleLeaveGame = () => {
      window.location.href = "/";
    };

    return <GameScreen game={game} setGame={setGame} onLeaveGame={handleLeaveGame} />;
  }

  return null;
}
