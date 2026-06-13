export type DeckId = "eye" | "finger";

export type CardType = "monster" | "spell";

export type SpellEffectType =
  | "buff"
  | "debuff"
  | "permanent"
  | "special";

export type MonsterEffectType =
  | "none"
  | "passive"
  | "onPlay";

export type BaseCard = {
  id: string;
  name: string;
  deck: DeckId;
  mana: 1 | 2;
  page: number;
  imagePath: string;
  text: string;
};

export type MonsterCard = BaseCard & {
  type: "monster";
  strength: number | "copy";
  monsterEffect: MonsterEffectType;
};

export type SpellCard = BaseCard & {
  type: "spell";
  effectType: SpellEffectType;
};

export type Card = MonsterCard | SpellCard;

export const cards = [
  {
    id: "augri-die-sanfte-riesin",
    name: "Augri, die sanfte Riesin",
    deck: "eye",
    type: "monster",
    mana: 2,
    strength: 0,
    monsterEffect: "passive",
    page: 1,
    imagePath: "/src/assets/cards/card-01.webp",
    text: "Sollte diese Karte am Beginn der Runde 6 das einzige Monster auf deiner Seite sein, verdopple ihre aktuelle Stärke.",
  },
  {
    id: "rhyzer-der-lichtgejagte",
    name: "Rhyzer, der Lichtgejagte",
    deck: "eye",
    type: "monster",
    mana: 2,
    strength: 500,
    monsterEffect: "passive",
    page: 2,
    imagePath: "/src/assets/cards/card-02.webp",
    text: "Zauber der Kategorie Schwächung können in Runde 1, 3 und 5 nicht auf diese Karte angewendet werden.",
  },
  {
    id: "sol-der-entspannte",
    name: "Sol, der Entspannte",
    deck: "eye",
    type: "monster",
    mana: 1,
    strength: 500,
    monsterEffect: "none",
    page: 3,
    imagePath: "/src/assets/cards/card-03.webp",
    text: "Wie entspannt kann man eigentlich sein?",
  },
  {
    id: "gravis-der-unermuedliche",
    name: "Gravis, der Unermüdliche",
    deck: "eye",
    type: "monster",
    mana: 2,
    strength: 200,
    monsterEffect: "passive",
    page: 4,
    imagePath: "/src/assets/cards/card-04.webp",
    text: "Dieses Monster erhält zu Beginn jeder Runde +200 Stärke.",
  },
  {
    id: "fokusblume",
    name: "Fokusblume",
    deck: "eye",
    type: "spell",
    mana: 2,
    effectType: "permanent",
    page: 5,
    imagePath: "/src/assets/cards/card-05.webp",
    text: "Ein Monster deiner Wahl erhält zu Beginn jeder Runde +100 Stärke.",
  },
  {
    id: "auf-in-den-kampf",
    name: "Auf in den Kampf!",
    deck: "eye",
    type: "spell",
    mana: 1,
    effectType: "special",
    page: 6,
    imagePath: "/src/assets/cards/card-06.webp",
    text: "Der nächste Zauber mit dem Effekt Verstärkung, den du spielst, verdoppelt seine Wirkung.",
  },
  {
    id: "auszeit",
    name: "Auszeit",
    deck: "eye",
    type: "spell",
    mana: 1,
    effectType: "special",
    page: 7,
    imagePath: "/src/assets/cards/card-07.webp",
    text: "Der nächste Zauber mit dem Effekt Schwächung, der gespielt wird, verliert seine Wirkung.",
  },
  {
    id: "eisenhauer-technik",
    name: "Eisenhauer-Technik",
    deck: "eye",
    type: "spell",
    mana: 1,
    effectType: "buff",
    page: 8,
    imagePath: "/src/assets/cards/card-08.webp",
    text: "Ein Monster deiner Wahl erhält +300 Stärke.",
  },
  {
    id: "gefuehl-gelassenheit",
    name: "Gefühl, Gelassenheit",
    deck: "eye",
    type: "spell",
    mana: 1,
    effectType: "permanent",
    page: 9,
    imagePath: "/src/assets/cards/card-09.webp",
    text: "1. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +100 Stärke. 2. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +500 Stärke. 3. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +1000 Stärke und deine Karten können nicht zerstört werden.",
  },
  {
    id: "gefuehl-freude",
    name: "Gefühl, Freude",
    deck: "eye",
    type: "spell",
    mana: 1,
    effectType: "permanent",
    page: 10,
    imagePath: "/src/assets/cards/card-10.webp",
    text: "1. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +100 Stärke. 2. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +500 Stärke. 3. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +1000 Stärke und deine Karten können nicht zerstört werden.",
  },
  {
    id: "gefuehl-mut",
    name: "Gefühl, Mut",
    deck: "eye",
    type: "spell",
    mana: 1,
    effectType: "permanent",
    page: 11,
    imagePath: "/src/assets/cards/card-11.webp",
    text: "1. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +100 Stärke. 2. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +500 Stärke. 3. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +1000 Stärke und deine Karten können nicht zerstört werden.",
  },
  {
    id: "komplex-und-visionaer",
    name: "Komplex & Visionär",
    deck: "eye",
    type: "spell",
    mana: 2,
    effectType: "permanent",
    page: 12,
    imagePath: "/src/assets/cards/card-12.webp",
    text: "Während diese Karte auf dem Spielfeld liegt, zählen gespielte Zauber mit dem Effekt Verstärkung für alle deine Monster.",
  },
  {
    id: "motivationsspritze",
    name: "Motivationsspritze",
    deck: "eye",
    type: "spell",
    mana: 2,
    effectType: "buff",
    page: 13,
    imagePath: "/src/assets/cards/card-13.webp",
    text: "Ein Monster deiner Wahl erhält +600 Stärke.",
  },
  {
    id: "pomodoro-technik",
    name: "Po(modoro-Technik)",
    deck: "eye",
    type: "spell",
    mana: 2,
    effectType: "buff",
    page: 14,
    imagePath: "/src/assets/cards/card-14.webp",
    text: "Ein Monster deiner Wahl erhält +600 Stärke.",
  },
  {
    id: "der-weg-ist-das-ziel",
    name: "Der Weg ist das Ziel",
    deck: "eye",
    type: "spell",
    mana: 2,
    effectType: "special",
    page: 15,
    imagePath: "/src/assets/cards/card-15.webp",
    text: "Die soeben gespielte Spielphase wird wiederholt. Die Gegenseite darf keine der abgelegten Karten erneut ausspielen.",
  },

  {
    id: "hand-des-aufschubs",
    name: "Hand des Aufschubs",
    deck: "finger",
    type: "monster",
    mana: 1,
    strength: 500,
    monsterEffect: "none",
    page: 16,
    imagePath: "/src/assets/cards/card-16.webp",
    text: "Für dich gibt’s kein High Five!",
  },
  {
    id: "murmoria-die-wirre",
    name: "Murmoria, die Wirre",
    deck: "finger",
    type: "monster",
    mana: 2,
    strength: 0,
    monsterEffect: "passive",
    page: 17,
    imagePath: "/src/assets/cards/card-17.webp",
    text: "Ziehe zu Beginn jeder Runde einem gegnerischen Monster 100 Stärke ab. Diese Karte erhält am Beginn jeder Runde +100 Stärke.",
  },
  {
    id: "nira-die-augenlose",
    name: "Nira, die Augenlose",
    deck: "finger",
    type: "monster",
    mana: 1,
    strength: 300,
    monsterEffect: "onPlay",
    page: 18,
    imagePath: "/src/assets/cards/card-18.webp",
    text: "Wähle eine zufällige Karte aus der Hand deines Gegenübers. Die Karte muss auf dem Friedhof abgelegt werden.",
  },
  {
    id: "du",
    name: "Du",
    deck: "finger",
    type: "monster",
    mana: 2,
    strength: "copy",
    monsterEffect: "onPlay",
    page: 19,
    imagePath: "/src/assets/cards/card-19.webp",
    text: "Kopiere die Stärke, die ein Monster deines Gegenübers aktuell hat.",
  },
  {
    id: "gefuehl-angst",
    name: "Gefühl, Angst",
    deck: "finger",
    type: "spell",
    mana: 1,
    effectType: "permanent",
    page: 20,
    imagePath: "/src/assets/cards/card-20.webp",
    text: "1. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +100 Stärke. 2. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +300 Stärke. 3. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +500 Stärke und du erhältst in der nächsten Runde +1 Mana.",
  },
  {
    id: "gefuehl-scham",
    name: "Gefühl, Scham",
    deck: "finger",
    type: "spell",
    mana: 1,
    effectType: "permanent",
    page: 21,
    imagePath: "/src/assets/cards/card-21.webp",
    text: "1. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +100 Stärke. 2. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +300 Stärke. 3. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +500 Stärke und du erhältst in der nächsten Runde +1 Mana.",
  },
  {
    id: "gefuehl-trauer",
    name: "Gefühl, Trauer",
    deck: "finger",
    type: "spell",
    mana: 1,
    effectType: "permanent",
    page: 22,
    imagePath: "/src/assets/cards/card-22.webp",
    text: "1. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +100 Stärke. 2. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +300 Stärke. 3. Gefühl auf dem Feld: Ein Monster deiner Wahl erhält +500 Stärke und du erhältst in der nächsten Runde +1 Mana.",
  },
  {
    id: "aufschieberitis",
    name: "Aufschieberitis",
    deck: "finger",
    type: "spell",
    mana: 2,
    effectType: "special",
    page: 23,
    imagePath: "/src/assets/cards/card-23.webp",
    text: "Zerstöre eine Karte auf dem Feld deines Gegenübers. Du kannst auch zufällig eine Karte aus der Hand deines Gegenübers wählen, die auf den Friedhof abgelegt werden muss.",
  },
  {
    id: "selbstsabotage",
    name: "Selbstsabotage",
    deck: "finger",
    type: "spell",
    mana: 1,
    effectType: "debuff",
    page: 24,
    imagePath: "/src/assets/cards/card-24.webp",
    text: "Ein Monster deiner Wahl verliert -300 Stärke.",
  },
  {
    id: "deadline",
    name: "Deadline",
    deck: "finger",
    type: "spell",
    mana: 1,
    effectType: "debuff",
    page: 25,
    imagePath: "/src/assets/cards/card-25.webp",
    text: "Ein Monster deiner Wahl verliert -300 Stärke.",
  },
  {
    id: "falsche-goetter",
    name: "Falsche Götter",
    deck: "finger",
    type: "spell",
    mana: 2,
    effectType: "special",
    page: 26,
    imagePath: "/src/assets/cards/card-26.webp",
    text: "Wähle zufällig eine Karte aus der Hand deines Gegenübers. Diese Karte muss in der nächsten Runde gespielt werden.",
  },
  {
    id: "knoten-im-kopf",
    name: "Knoten im Kopf",
    deck: "finger",
    type: "spell",
    mana: 1,
    effectType: "debuff",
    page: 27,
    imagePath: "/src/assets/cards/card-27.webp",
    text: "Ein Monster deiner Wahl verliert -300 Stärke.",
  },
  {
    id: "hab-dich",
    name: "Hab’ dich",
    deck: "finger",
    type: "spell",
    mana: 1,
    effectType: "debuff",
    page: 28,
    imagePath: "/src/assets/cards/card-28.webp",
    text: "Dein Gegenüber hat in der nächsten Runde -1 Mana.",
  },
  {
    id: "suesse-gruesse",
    name: "Süße Grüße",
    deck: "finger",
    type: "spell",
    mana: 2,
    effectType: "special",
    page: 29,
    imagePath: "/src/assets/cards/card-29.webp",
    text: "Wähle ein Monster auf dem Spielfeld deines Gegenübers. Zauber mit dem Effekt Verstärkung wirken 2 Runden nicht auf dieses Monster.",
  },
  {
    id: "der-ganze-wald",
    name: "Der ganze Wald",
    deck: "finger",
    type: "spell",
    mana: 2,
    effectType: "special",
    page: 30,
    imagePath: "/src/assets/cards/card-30.webp",
    text: "Der nächste Zauber mit dem Effekt Verstärkung, den dein Gegenüber spielt, geht auf ein Monster deiner Wahl über.",
  },
] as const satisfies readonly Card[];

export const eyeDeck = cards.filter((card) => card.deck === "eye");
export const fingerDeck = cards.filter((card) => card.deck === "finger");

export const monsterCards = cards.filter((card) => card.type === "monster");
export const spellCards = cards.filter((card) => card.type === "spell");

export function getCardById(id: string): Card | undefined {
  return cards.find((card) => card.id === id);
}