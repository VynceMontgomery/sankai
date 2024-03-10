import { Card, VillageCard, KaijuCard, Token } from "./index.js";

export const villageCards: Partial<VillageCard>[] = [{
    // seems OK
    cardName: 'Warehouse',
    playWhen: 'construction',
    actionName: 'initWarehouse',
    description: 'A place to store materials instead of placing them immediately.',
    forceShuffle: true,
}, {
    // TODO
    cardName: 'Research',
    playWhen: 'construction',
    actionName: 'initResearch',
    description: 'Our scientists are working on a plan.',
}, {
    // seems OK
    cardName: 'Decoy',
    playWhen: 'construction',
    actionName: 'initDecoy',
    description: 'Bait to lure Harapeko',
    // pawn: () => $.box.first(Token, 'Decoy'),
}, {
    // seems OK, but the code feels inelegant
    cardName: 'Radio',
    playWhen: 'construction',
    actionName: 'initRadio',
    description: 'Call for an airdrop',
}, {
    // untested
    cardName: 'Trap',
    playWhen: 'move',
    actionName: 'trap',
    description: 'Catch Harapeko in a trap',
    // pawn: () => $.box.first(Token, 'Trap'),
}, {
    // seems OK
    cardName: 'Supplies: Lumber',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'lumber'},
    description: 'Lumber up!',
}, {
    cardName: 'Supplies: Wall',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'wall'},
    description: "Handy, when you're up against it",
}, {
    cardName: 'Supplies: Room',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'room'},
    description: 'A room of your own',
}, {
    cardName: 'Supplies: Wild',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'wild'},
    description: 'Whatever you need',
}, {
    // seems OK
    cardName: 'Winch',
    playWhen: 'construction',
    actionName: 'winch',
    description: 'Shift that over there',
}, {
    // TODO
    cardName: 'Dawn',
    playWhen: 'endTurn',
    actionName: 'dawn',
    description: 'It got pretty dark. But now...',
}, {
    // Mostly works
    // has some very weird timing issues; game.followUp() does not work as expected?  and game.addDelay()?
    cardName: "Military Involvement",
    playWhen: 'now',
    actionName: 'militaryInvolvement',
    description: "Who died and made him General?",
    forceShuffle: true,
}, {
    // Done? needs testing, but basics seem to work
    cardName: 'Bukibuki',
    playWhen: 'now',
    actionName: 'initBukibuki',
    description: "A challenger appears.",
    addDice: 1,
    // pawn: () => $.box.first(Token, 'Bukibuki'),
}];


export const kaijuCards: Partial<KaijuCard>[] = [{
    // urges are implented and seem... fine, actually?
    cardName: 'Urge: Lumber',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'lumber'},
    description: "It's OK.",
}, {
    cardName: 'Urge: Wall',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'wall'},
    description: "Build it up to tear it dowm.",
}, {
    cardName: 'Urge: Room',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'room'},
    description: "Everybody needs a little...",
}, {
    cardName: 'Urge: Building',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'building'},
    description: "B is for Building, that's good enough for me!",
}, {
    // looks good
    cardName: 'Entwined Fates',
    playWhen: 'rollDice',
    actionName: 'entwinedFates',
    description: "All for one and one for all",
}, {
    // looks good
    cardName: 'Storm',
    playWhen: 'takeDie',
    actionName: 'storm',
    description: "Everything is topsy turvy",
    forceShuffle: true,
}, {
    // looks good
    cardName: 'Earthquake',
    playWhen: 'action',
    actionName: 'earthquake',
    description: "There may be doubt and remorse.",
    forceShuffle: true,
}, {
    // TODO
    cardName: 'Evolve',
    playWhen: 'action',
    actionName: 'evolve',
    description: "Harder, Better, Faster, Stronger",
}, {
    // looks good
    cardName: 'Hunger',
    playWhen: 'eat',
    actionName: 'eat',
    description: "Back for seconds.",
}, {
    // looks good
    cardName: 'Tunnel',
    playWhen: 'action',
    actionName: 'tunnel',
    description: "I gotta get out of this place.",
}, {
    // looks good
    cardName: 'Jump Stomp',
    playWhen: 'wreck',
    actionName: 'jumpStomp',
    description: "Mario would be proud",
}, {
    // looks good
    cardName: 'Rampage',
    playWhen: 'action',
    actionName: 'initRampage',
    description: "My arms are too small to flip the table.",
}, {
    // looks good
    cardName: 'Laser Vision',
    playWhen: 'action',
    actionName: 'initLaser',
    description: "I see all.",
}, {
    // looks good
    cardName: 'Lightning Speed',
    playWhen: 'action',
    actionName: 'initSpeed',
    description: "A dashing young kaiju.",
}];
