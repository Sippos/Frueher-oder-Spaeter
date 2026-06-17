import { cards } from "../cards";
function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
}
function getOpponentDeckId(deckId) {
    return deckId === "eye" ? "finger" : "eye";
}
function getDeckName(deckId) {
    return deckId === "eye" ? "Auge des Fokus" : "Finger des Aufschubs";
}
function getPlayerIdForDeck(player1DeckId, deckId) {
    return player1DeckId === deckId ? "player1" : "player2";
}
function createPlayer(id, name, deckId, selectedStartingMonsterId) {
    const fullDeck = cards.filter((card) => card.deck === deckId);
    const monsters = fullDeck.filter((card) => card.type === "monster");
    const spells = fullDeck.filter((card) => card.type === "spell");
    const shuffledMonsters = shuffle(monsters);
    const selectedStartingMonster = shuffledMonsters.find((card) => card.id === selectedStartingMonsterId);
    const startingMonster = selectedStartingMonster ?? shuffledMonsters[0];
    const deck = shuffle([
        ...shuffledMonsters.filter((card) => card.id !== startingMonster.id),
        ...spells,
    ]);
    const startingHand = [startingMonster];
    return {
        id,
        name,
        deckId,
        deck,
        hand: startingHand,
        monsterZone: [],
        spellZone: [],
        graveyard: [],
        stagedCards: [],
        mana: 2,
        bonusManaNextRound: 0,
        nextBuffMultiplier: 1,
        score: 0,
    };
}
export function createGame(options = {}) {
    const player1DeckId = options.player1DeckId ?? "eye";
    const player2DeckId = getOpponentDeckId(player1DeckId);
    return {
        round: 1,
        maxRounds: 6,
        phase: "play",
        currentPlayerId: getPlayerIdForDeck(player1DeckId, "eye"),
        players: {
            player1: createPlayer("player1", getDeckName(player1DeckId), player1DeckId, options.startingMonsterIds?.[player1DeckId]),
            player2: createPlayer("player2", getDeckName(player2DeckId), player2DeckId, options.startingMonsterIds?.[player2DeckId]),
        },
        ongoingEffects: [],
        blockNextDebuff: false,
        repeatPlayPhase: false,
    };
}
