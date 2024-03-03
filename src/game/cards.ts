import { Card, VillageCard, KaijuCard, Token } from "./index.js";

export const villageCards: Partial<VillageCard>[] = [{
    // fix putting something in the warehouse once you empty it?
    cardName: 'Warehouse',
    playWhen: 'construction',
    actionName: 'initWarehouse',
    description: 'A place to store materials instead of placing them immediately.',
    addDice: 0,
    forceShuffle: true,
}, {
    cardName: 'Decoy',
    playWhen: 'construction',
    actionName: 'initDecoy',
    description: 'Bait to lure Harapeko',
    addDice: 0,
    // pawn: () => $.box.first(Token, 'decoy'),
}, {
    // fix: make sure you cn' use it on the same turn, and it doesn't offer being used when you can't use it
    cardName: 'Radio',
    playWhen: 'construction',
    actionName: 'initRadio',
    description: 'Call for an airdrop',
    addDice: 0,
}, {
    cardName: 'Trap',
    playWhen: 'move',
    actionName: 'setTrap',
    description: 'Catch Harapeko in a trap',
    addDice: 0,
    // pawn: () => $.box.first(Token, 'trap'),
}, {
    // supplies are buggy in general, test & report
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
    cardName: 'Winch',
    playWhen: 'construction',
    actionName: 'applyWinch',
    description: 'Shift that over there',
    addDice: 0,
}, {
    cardName: 'Dawn',
    playWhen: 'endTurn',
    actionName: 'dawn',
    description: 'It was pretty dark. But now...',
    addDice: 0,
}, {
    // this one should be fun. 
    cardName: "Military Involvement",
    playWhen: 'now',
    actionName: 'militaryInvolvement',
    description: "Who died and made him General?",
    addDice: 0,
    forceShuffle: true,
}, {
    // also fun
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
    // should be easy
    cardName: 'Entwined Fates',
    playWhen: 'rollDice',
    actionName: 'entwinedFates',
    description: "All for one and one for all",
    addDice: 0,
}, {
    cardName: 'Storm',
    playWhen: 'takeDie',
    actionName: 'initStorm',
    description: "Everything is topsy turvy",
    addDice: 0,
    forceShuffle: true,
}, {
    cardName: 'Earthquake',
    playWhen: 'action',
    actionName: 'earthquake',
    description: "There may be doubt and remorse.",
    addDice: 0,
}, {
    cardName: 'Hunger',
    playWhen: 'eat',
    actionName: 'eat',
    description: "Back for seconds.",
    addDice: 0,
}, {    
    cardName: 'Tunnel',
    playWhen: 'action',
    actionName: 'tunnel',
    description: "I gotta get out of this place.",
    addDice: 0,
}, {
    cardName: 'Jump Stomp',
    playWhen: 'wreck',
    actionName: 'jumpStomp',
    description: "Mario would be proud",
    addDice: 0,
}, {
    cardName: 'Rampage',
    playWhen: 'action',
    actionName: 'initRampage',
    description: "My arms are too small to flip the table.",
    addDice: 0,
}, {
    cardName: 'Laser Vision',
    playWhen: 'action',
    actionName: 'initLaser',
    description: "I see all.",
    addDice: 0,
}, {
    cardName: 'Lightning Speed',
    playWhen: 'action',
    actionName: 'initSpeed',
    description: "A dashing young kaiju.",
    addDice: 0,
}];
