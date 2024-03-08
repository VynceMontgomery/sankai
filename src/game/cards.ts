import { Card, VillageCard, KaijuCard, Token } from "./index.js";

export const villageCards: Partial<VillageCard>[] = [{
    // seems OK
    cardName: 'Warehouse',
    playWhen: 'construction',
    actionName: 'initWarehouse',
    description: 'A place to store materials instead of placing them immediately.',
    addDice: 0,
    forceShuffle: true,
}, {
    // TODO
    cardName: 'Decoy',
    playWhen: 'construction',
    actionName: 'initDecoy',
    description: 'Bait to lure Harapeko',
    addDice: 0,
    // pawn: () => $.box.first(Token, 'decoy'),
}, {
    // seems OK, except that it highlights as playable whn it isn't playable.
    // Or rather, the card is playable but the action it triggers isn't available
    // Not sure how to shake that all the way forward.
    cardName: 'Radio',
    playWhen: 'construction',
    actionName: 'initRadio',
    description: 'Call for an airdrop',
    addDice: 0,
}, {
    // TODO
    cardName: 'Trap',
    playWhen: 'move',
    actionName: 'setTrap',
    description: 'Catch Harapeko in a trap',
    addDice: 0,
    // pawn: () => $.box.first(Token, 'trap'),
}, {
    // seems OK
    cardName: 'Supplies: Lumber',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'lumber'},
    description: 'Lumber up!',
    addDice: 0,
}, {
    cardName: 'Supplies: Wall',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'wall'},
    description: "Handy, when you're up against it",
    addDice: 0,
}, {
    cardName: 'Supplies: Room',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'room'},
    description: 'A room of your own',
    addDice: 0,
}, {
    cardName: 'Supplies: Wild',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'wild'},
    description: 'Whatever you need',
    addDice: 0,
}, {
    // TODO should be easy
    cardName: 'Winch',
    playWhen: 'construction',
    actionName: 'applyWinch',
    description: 'Shift that over there',
    addDice: 0,
}, {
    // TODO
    cardName: 'Dawn',
    playWhen: 'endTurn',
    actionName: 'dawn',
    description: 'It got pretty dark. But now...',
    addDice: 0,
}, {
    // Mostly works
    // has some very weird timing issues; game.followUp() does not work as expected?  and game.addDelay()?
    cardName: "Military Involvement",
    playWhen: 'now',
    actionName: 'militaryInvolvement',
    description: "Who died and made him General?",
    addDice: 0,
    forceShuffle: true,
}, {
    // Done? needs testing, but basics seem to work
    cardName: 'Bukibuki',
    playWhen: 'now',
    actionName: 'initBukibuki',
    description: "A challenger appears.",
    addDice: 1,
    // pawn: () => $.box.first(Token, 'bukibuki'),
}];


export const kaijuCards: Partial<KaijuCard>[] = [{
    // urges are implented and seem... fine, actually?
    cardName: 'Urge: Lumber',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'lumber'},
    description: "It's OK.",
    addDice: 0,
}, {
    cardName: 'Urge: Wall',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'wall'},
    description: "Build it up to tear it dowm.",
    addDice: 0,
}, {
    cardName: 'Urge: Room',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'room'},
    description: "Everybody needs a little...",
    addDice: 0,
}, {
    cardName: 'Urge: Building',
    playWhen: 'rollDice',
    actionName: 'urge',
    actionArgs: {kind: 'building'},
    description: "B is for Building, that's good enough for me!",
    addDice: 0,
}, {
    // looks good
    cardName: 'Entwined Fates',
    playWhen: 'rollDice',
    actionName: 'entwinedFates',
    description: "All for one and one for all",
    addDice: 0,
}, {
    // looks good
    cardName: 'Storm',
    playWhen: 'takeDie',
    actionName: 'storm',
    description: "Everything is topsy turvy",
    addDice: 0,
    forceShuffle: true,
}, {
    // looks good, needs more testing
    cardName: 'Earthquake',
    playWhen: 'action',
    actionName: 'earthquake',
    description: "There may be doubt and remorse.",
    addDice: 0,
    forceShuffle: true,
}, {
    // implemented, seems to work
    cardName: 'Hunger',
    playWhen: 'eat',
    actionName: 'eat',
    description: "Back for seconds.",
    addDice: 0,
}, {
    // looks good
    cardName: 'Tunnel',
    playWhen: 'action',
    actionName: 'tunnel',
    description: "I gotta get out of this place.",
    addDice: 0,
}, {
    // TODO
    cardName: 'Jump Stomp',
    playWhen: 'wreck',
    actionName: 'jumpStomp',
    description: "Mario would be proud",
    addDice: 0,
}, {
    // TODO
    cardName: 'Rampage',
    playWhen: 'action',
    actionName: 'initRampage',
    description: "My arms are too small to flip the table.",
    addDice: 0,
}, {
    // TODO
    cardName: 'Laser Vision',
    playWhen: 'action',
    actionName: 'initLaser',
    description: "I see all.",
    addDice: 0,
}, {
    // TODO
    cardName: 'Lightning Speed',
    playWhen: 'action',
    actionName: 'initSpeed',
    description: "A dashing young kaiju.",
    addDice: 0,
}];
