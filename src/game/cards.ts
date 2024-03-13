import { Card, VillageCard, KaijuCard, Token, Block, SankaiDie } from "./index.js";

export const villageCards: Partial<VillageCard>[] = [{
    // seems OK
    cardName: 'Warehouse',
    playWhen: 'construction',
    actionName: 'initWarehouse',
    flavorText: 'A place to store materials instead of placing them immediately.',
    forceShuffle: true,    
    description: 
        `Play this card into your tableau; it comes with a wall. While this card is in play, 
    it can hold one block. Swap freely during your construction phase. If it is empty, you 
    may put a block into it; if you have no block, you may take the block in it.
        `,
}, {
    // seems OK
    cardName: 'Research',
    playWhen: 'construction',
    actionName: 'initResearch',
    flavorText: 'Our scientists are working on a plan.',
    description:
        `Play this card into your tableau. Each turn after that, put cards from your deck 
    onto this until it has 2 cards, then discard one of them. On any future turn, put the 
    card here into your hand and discard this card.
        `,
}, {
    // seems OK
    cardName: 'Decoy',
    playWhen: 'construction',
    actionName: 'initDecoy',
    flavorText: 'Bait to lure Harapeko',
    dismissible: true,
    // pawn: () => $.box.first(Token, 'Decoy'),
    description: 
        `Play this card into your tableau and put the Decoy token on the map. The Decoy is 
    impassable, and nothing can be built in its square. On future turns, you 
    may put a new block onto this card. While a block on this card matches Harapeko's appetite, 
    Harapeko must move toward the Decoy if and as possible as their action. If Harapeko can reach
    the Decoy, they may remove a block as their action. If Harapeko has a Wild block, they may
    destroy the decoy. When the Decoy is destroyed, remove the token from the map and discard this card.
        `,
}, {
    // seems OK, but the code feels inelegant
    cardName: 'Radio',
    playWhen: 'construction',
    canPlay: (player) => player.game.kaiju().my('hand')!.has(Block, 'wild'),
    actionName: 'initRadio',
    flavorText: 'Call for an airdrop',
    description: 
        `Play this card into your tableau on a turn when your opponent has a Wild block. At the end 
    of that turn, put a wild block on this card. On any future turn when your opponent has a Wild 
    block, take the wild block off this card and discard this card.
    `,
}, {
    // untested
    cardName: 'Trap',
    playWhen: 'move',
    canPlay: (player) => player.game.kaiju().pawn!.isAlone(),
    actionName: 'trap',
    flavorText: 'Catch Harapeko in a trap',
    // pawn: () => $.box.first(Token, 'Trap'),
}, {
    // seems OK
    cardName: 'Supplies: Lumber',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'lumber'},
    flavorText: 'Lumber up!',
}, {
    cardName: 'Supplies: Wall',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'wall'},
    flavorText: "Handy, when you're up against it",
}, {
    cardName: 'Supplies: Room',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'room'},
    flavorText: 'A room of your own',
}, {
    cardName: 'Supplies: Wild',
    playWhen: 'construction',
    actionName: 'supplies',
    actionArgs: {kind: 'wild'},
    flavorText: 'Whatever you need',
}, {
    // seems OK
    cardName: 'Winch',
    playWhen: 'construction',
    actionName: 'winch',
    flavorText: 'Shift that over there',
}, {
    // TODO
    cardName: 'Dawn',
    playWhen: 'endTurn',
    canPlay: (player) => player.game.kaiju().my('tableau')!.all(Card).length > 1
                        || player.game.kaiju().my('hand')!.all(Card).length > 4,
    actionName: 'dawn',
    flavorText: 'It got pretty dark. But now...',
}, {
    // Mostly works
    // has some very weird timing issues; game.followUp() does not work as expected?  and game.addDelay()?
    cardName: "Military Involvement",
    playWhen: 'now',
    actionName: 'militaryInvolvement',
    flavorText: "Who died and made him General?",
    forceShuffle: true,
}, {
    // Done? needs testing, but basics seem to work
    cardName: 'Bukibuki',
    playWhen: 'now',
    actionName: 'initBukibuki',
    flavorText: "A challenger appears.",
    dismissible: true,
    addDice: 1,
    // pawn: () => $.box.first(Token, 'Bukibuki'),
}];


export const kaijuCards: Partial<KaijuCard>[] = [{
    // urges are implented and seem... fine, actually?
    cardName: 'Urge: Lumber',
    playWhen: 'rollDice',
    canPlay: (player) => $.tray.has(SankaiDie, (d) => d.face() !== 'lumber'),
    actionName: 'urge',
    actionArgs: {kind: 'lumber'},
    flavorText: "It's OK.",
    description: `
        Play this card after rolling dice but before choosing. Set any die to the indicated face.
    `,
}, {
    cardName: 'Urge: Wall',
    playWhen: 'rollDice',
    canPlay: (player) => $.tray.has(SankaiDie, (d) => d.face() !== 'wall'),
    actionName: 'urge',
    actionArgs: {kind: 'wall'},
    flavorText: "Build it up to tear it dowm.",
    description: `
        Play this card after rolling dice but before choosing. Set any die to the indicated face.
    `,
}, {
    cardName: 'Urge: Room',
    playWhen: 'rollDice',
    canPlay: (player) => $.tray.has(SankaiDie, (d) => d.face() !== 'room'),
    actionName: 'urge',
    actionArgs: {kind: 'room'},
    flavorText: "Everybody needs a little...",
    description: `
        Play this card after rolling dice but before choosing. Set any die to the indicated face.
    `,
}, {
    cardName: 'Urge: Building',
    playWhen: 'rollDice',
    canPlay: (player) => $.tray.has(SankaiDie, (d) => d.face() !== 'building'),
    actionName: 'urge',
    actionArgs: {kind: 'building'},
    flavorText: "B is for Building, that's good enough for me!",
    description: `
        Play this card after rolling dice but before choosing. Set any die to the indicated face.
    `,
}, {
    // looks good
    cardName: 'Entwined Fates',
    playWhen: 'rollDice',
    canPlay: (player) => $.tray.all(SankaiDie).map((d) => d.face()).filter((v,i,a) => a.indexOf(v) === i).length > 1,
    actionName: 'entwinedFates',
    flavorText: "All for one and one for all",
    description: `
        Play this card after rolling dice but before choosing. Select a die; set all dice in the tray to match it.
    `,
}, {
    // looks good
    cardName: 'Storm',
    playWhen: 'takeDie',
    actionName: 'storm',
    flavorText: "Everything is topsy turvy",
    forceShuffle: true,
}, {
    // looks good
    cardName: 'Earthquake',
    playWhen: 'action',
    actionName: 'earthquake',
    flavorText: "There may be doubt and remorse.",
    forceShuffle: true,
}, {
    // TODO
    cardName: 'Evolve',
    playWhen: 'action',
    actionName: 'evolve',
    flavorText: "Harder, Better, Faster, Stronger",
}, {
    // looks good
    cardName: 'Hunger',
    playWhen: 'eat',
    canPlay: (player) => player.edibleBlocks().length > 0,
    actionName: 'eatAgain',
    flavorText: "Back for seconds.",
}, {
    // looks good
    cardName: 'Tunnel',
    playWhen: 'action',
    actionName: 'tunnel',
    flavorText: "I gotta get out of this place.",
}, {
    // looks good
    cardName: 'Jump Stomp',
    playWhen: 'wreck',
    actionName: 'jumpStomp',
    flavorText: "Mario would be proud",
}, {
    // looks good
    cardName: 'Rampage',
    playWhen: 'action',
    actionName: 'initRampage',
    flavorText: "My arms are too small to flip the table.",
    dismissible: true,
}, {
    // looks good
    cardName: 'Laser Vision',
    playWhen: 'action',
    actionName: 'initLaser',
    flavorText: "I see all.",
    dismissible: true,
}, {
    // looks good
    cardName: 'Lightning Speed',
    playWhen: 'action',
    actionName: 'initSpeed',
    flavorText: "A dashing young kaiju.",
    dismissible: true,
}];
