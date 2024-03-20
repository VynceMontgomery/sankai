import {
  createGame,
  createGameClasses,
  Player,
  Game,
  Do,
} from '@boardzilla/core';

function unique<Type>(v:Type,i:number,a:Array<Type>): boolean {
  return a.indexOf(v) === i;
}

import { villageCards, kaijuCards } from './cards.js';

// type BlockType = 'lumber' | 'wall' | 'room' | 'building' | 'tower' | 'fortress' | 'wild';
type BlockType = 'lumber' | 'wall' | 'room' | 'tower' | 'fortress' | 'wild';

export class SankaiPlayer extends Player<SankaiPlayer, SankaiGame> {
  /**
   * Any properties of your players that are specific to your game go here
   */
  score: number = 0;
  role!: 'Villager' | 'Kaiju';
  pawn: KaijuToken | undefined;
  hasActed: boolean = false;
  usedBonus: boolean = false;

  assureDeck (count: number = 1) {
    if (this.my('deck')!.all(Card).length < count) {
      this.shuffleDiscards();
    }

    if (this.my('deck')!.all(Card).length < count) {
      this.game.message(`{{ player }} is out of cards!`, {player: this});
    }

    return this.my('deck')!.all(Card).length > 0;
  }

  shuffleDiscards () {
    this.my('discard')!.all(Card).putInto(this.my('deck')!);
    this.my('deck')!.shuffle();
  }

  drawCard (count: number = 1) {
    this.assureDeck(count);
    this.my('deck')!.firstN(count, Card)?.putInto(this.my('hand')!);
  }

  // Kaiju-specific methods

  size (): number {
    return SankaiGame.size(this.appetite()!)!;
  }

  appetite (): BlockType {
    for (const food of SankaiGame.goods) {
      if (this.my('appetiteTrack')!.all(Block, (b) => b.kind === food).length < this.game.kaijuAppetiteSize) {
        return food;
      }
    }
    return 'fortress' as BlockType;
  }

  isLured (): boolean {
    if ($.village.has(Token, 'Decoy')) {
      const decoy = $.village.first(Token, 'Decoy')!;
      // console.log(`have decoy at ${decoy.cell()!.row}, ${decoy.cell()!.column}`);
      if (decoy.card!.has(Block, (b) => b.match(this.appetite()))) {
        const here = this.pawn!.cell()!;
        const there = decoy.cell()!;
        const walkables = here.walkableSteps(2);
        const range = Math.min(here.distanceTo(there)! - 1, ...walkables.map((c) => c.distanceTo(there)!));
        const closers = walkables.filter((c) => c.distanceTo(there) === range);
        // console.log('Options: ', closers);
        return closers.length > 0;
      }
    }

    return false;
  }

  edibleBlocks(): Block[] {
    if (this.role === 'Villager' 
      || !this.pawn 
      || !(this.pawn.cell() instanceof Cell)
      // || !this.my('hand')!.has(Block)
    ) return [];

    const appetiteBlock = $.box.last(Block, {kind: this.appetite()})!;
    const cravingBlocks = this.my('hand')!.all(Block).filter((b) => !(b.size() > appetiteBlock.size()));
    // cravingBlocks.push(appetiteBlock);

    const edibles = $.village.all(Block).filter(
      (b) =>  ((!(b.size() > appetiteBlock.size()))
              && cravingBlocks.some((a) => a.match(b))
              && this.pawn?.cell()?.reaches(b)));
    // console.log(`hungry for #${ appetiteBlock.size() } ${ appetiteBlock } (or #${ cravingBlocks[0].size() } ${ cravingBlocks[0] }); found ${ edibles.length } edibles from ${ this.pawn.cell() }`);
    return edibles;
  }

  climbableBlocks(): Block[] {
    if (this.role === 'Villager' 
      || !this.pawn 
      || !(this.pawn.cell() instanceof Cell)
      || !this.my('hand')!.has(Block)
    ) return [];

    const available = this.my('hand')!.all(Block);
    const climbable = this.pawn.neighbors().filter((b) => ((b instanceof Block) && (available.some((a) => a.match(b)))));

    return climbable as Block[];
  }

  wreckableBlocks(reach: boolean = false): Block[] {
    if (this.role === 'Villager' 
      || !this.pawn 
      || !(this.pawn.cell() instanceof Cell)
      || !this.my('hand')!.has(Block)
    ) return [];

    const available = this.my('hand')!.all(Block);
    const wreckable = this.pawn!.cell()!.all(Block, (b) => available.some((a) => a.match(b)));

    if (reach) {
      const reachable = $.village.all(Block,
                          (b) => this.pawn!.cell()!.reaches(b), 
                          (b) => available.some((a) => a.match(b))
                        ) as Block[];
      wreckable.push(...reachable);
    }

    return wreckable as Block[];
  }
};

class SankaiGame extends Game<SankaiPlayer, SankaiGame> {
  /**
   * Any overall properties of your game go here
   */
  phase: number = 1;
  gameTurn: 0;

  readonly boardSize = 6;
  readonly projectSize = 4;
  readonly kaijuAppetiteSize = 6;


  static goods: BlockType[] = ['lumber', 'wall', 'room', 'tower', 'fortress'];
  static size (item: string) {
    if (SankaiGame.goods.some((g) => g === item)) return SankaiGame.goods.indexOf(item as BlockType);
    return undefined;
  }

  theVillager!: SankaiPlayer;
  theKaiju!: SankaiPlayer;

  assignRoles() {
    const flip = Math.floor(2*this.game.random());
    this.theVillager = this.game.players[flip];
    this.theKaiju = this.game.players[1-flip];

    this.theVillager.role = 'Villager';
    this.theKaiju.role = 'Kaiju';
    this.theKaiju.pawn = this.first(KaijuToken);

    this.first(VillageCard, 'Warehouse')!.putInto(this.theVillager.my('hand')!);
    this.first('box')!.all(VillageCard).putInto(this.theVillager.my('deck')!);
    this.theVillager.my('deck')!.shuffle();

    this.all(KaijuCard).putInto(this.theKaiju.my('deck')!);
    this.theKaiju.my('deck')!.shuffle();

    // console.log(`${ this.theVillager } is the villager and ${ this.theKaiju } is the kaiju.`);
  }

  villager (): SankaiPlayer { return this.theVillager!; }
  kaiju (): SankaiPlayer { return this.theKaiju!; }

  rollDice () {
    const num = this.game.players.length + this.all('tableau'
                  ).flatMap(t => t.all(Card, (c) => c.isVisible())
                  ).reduce((sum: number, c) => sum += c.addDice, 0);
    this.first('box')!.lastN(num, SankaiDie).putInto(this.first('tray')!);
  }

  cleanUpDice () {
    this.first('tray')!.all(SankaiDie).putInto(this.first('box')!);
  }

  villageBlocks (kind: BlockType): Block[] {
    return this.first('village')!.all(Block, kind ? {kind} : {});
  }

  // STUB: think about this a little more. It works, but it sucks. Cna we do better?
  bukibuki () {
    const card = this.villager()!.my('tableau')!.first(Card, 'Bukibuki');
    const pawn = this.first(Token, 'Bukibuki');
    const size = !!card ? Math.max(...card.all(Block).map((d) => d.size() || 0)) : undefined;
    return {card, pawn, size};
  }

  bukibukiWalkable (): Cell[] {
    const options: Cell[] = [];
    const kaijuCell = this.kaiju()!.pawn!.cell()!;
    const here = this.bukibuki().pawn!.cell()!;

    if (!here) return options;

    const onestep: Cell[] = here.walkableSteps().filter((c) => c !== here);
    const twostep: Cell[] = onestep.flatMap((c) => c.walkableSteps()).filter((c) => c !== here);
    options.push(... [...onestep, ...twostep].filter((c) => 
      c.distanceTo(kaijuCell)! < here.distanceTo(kaijuCell)!
      && c !== kaijuCell
    ));
    return options;
  }
}

const { Space, Piece, Die } = createGameClasses<SankaiPlayer, SankaiGame>();

export { Space, Piece };

/**
 * Define your game's custom pieces and spaces.
 */

export class Cell extends Space {
  row: number;
  column: number;

  isEdge() {
    return ([1, this.game.boardSize].includes(this.row) || [1, this.game.boardSize].includes(this.column));
  }

  isCorner () {
    return ([1, this.game.boardSize].includes(this.row) && [1, this.game.boardSize].includes(this.column));
  }

  // hasStructure() {
  //   return this.has(Block, (b) => !!SankaiGame.size(b.kind));
  // }

  height(): number {
    return (
      this.has(Block)
        ? Math.max(...this.all(Block).map(b => b.size())) + 1
        : (this.has(Token, 'Trap')
          ? -1 
          :  0)
    );
  }

  walkableSteps(distance: number = 1): Cell[] {
    const departures: Cell[] = [this];
    const arrivals: Cell[] = [];
    for (let n=0; n<distance; n++) {
      const freshSteps = departures.flatMap((c) => 
        c.adjacencies(Cell).filter((a) => 
          a.height() <= c.height()
          && !departures.includes(a)
          && !a.has(Token)
        )).filter(unique);
      arrivals.push(...freshSteps);
      departures.push(...freshSteps);
    }
    return arrivals;
    // return this.adjacencies(Cell).filter((c) => c.height() <= this.height());
  }

  isDiagonalTo (cell: Cell): boolean {
    return !!( Math.abs(this.row - cell.row) === 1
            && Math.abs(this.column - cell.column) === 1);
  }

  reaches(target: Cell | Card | Token | Block | SankaiPlayer): boolean {
    if (target instanceof Cell) {
      if (this === target) {
        return true;
      } else if (this.isAdjacentTo(target)) {
        return true;
      } else if (this.isDiagonalTo(target)) {
        return true;
      } else { 
        return false;
      }
    } else if ('container' in target && target.container(Cell)) {
      return this.reaches( target.container(Cell) as Cell);
    } else if ('pawn' in target && target.pawn?.container(Cell)) {
      return this.reaches( target.pawn!.container(Cell) as Cell);
    } else if ('container' in target && target.container(Card)?.pawn?.container(Cell)) {
      return this.reaches( target.container(Card)!.pawn!.container(Cell) as Cell);
    } else {
      return false;
    }
  }
}

export class SankaiDie extends Die {
  static faces = ['lumber', 'wall', 'room', 'appetite', 'card', 'wild'];
  face () {
    if (this.current === 4) { 
      return this.game.kaiju()!.appetite()!;
    }

    return SankaiDie.faces[-1 + this.current];
  }

  // better to make a static match on class Block and implement this and Block.match in terms of it?
  match (target: Block | BlockType): boolean {
    if (this.current === 5) return false;
    const proxy = $.box.last(Block, {kind: this.face() as BlockType})!;
    return proxy.match(target);
  }
}

type TokenType = 'Harapeko'|'Bukibuki'|'Decoy'|'Trap';

export class Token extends Piece {
  player: SankaiPlayer;
  kind!: TokenType;
  card?: Card;

  cell (): Cell | undefined { return this.container(Cell) }

  isAlone (): boolean {
    return (!!(this.cell()?.all(Piece).length === 1));
  }

  neighbors (): Array<Token|Block> {
    return this.cell()?.adjacencies(Cell).flatMap((c) => [...c.all(Token), ...c.all(Block)]) || [];
  }

  reaches (target: Cell | Card | Token | Block | SankaiPlayer): boolean { 
    return this.cell()!.reaches(target);
  }
}

export class KaijuToken extends Token {
  readonly kind = 'Harapeko';
}

export class Block extends Piece {
  kind: BlockType;

  toString (): string {
    if (this.cell() instanceof Cell) {
      return `${ this.kind } at (${ this.cell()!.row }, ${this.cell()!.column})`;
    } else if (this.owner) {
      return `${ this.owner }'s ${ this.kind }`;
    } 
    return this.kind;
  }

  size(): number {
    return SankaiGame.size(this.kind)!;
  }

  cell (): Cell | undefined { return this.container(Cell) }

  isAlone (): boolean {
    return (!!(this.cell()?.all(Piece).length === 1));
  }

  neighbors (): Array<Token|Block> {
    return this.cell()?.adjacencies(Cell).flatMap((c) => [...c.all(Token), ...c.all(Block)]) || [];
  }

  availableNeighborBlocks (): Block[] {
    return this.cell()?.adjacencies(Cell).flatMap((c) => c.all(Block).filter((b) => b.isAlone())) || [];
  }

  isStructure (): boolean {
    return !!(this.container(Cell) && SankaiGame.size(this.kind));
  }

  // can't figure out how to do this with overloads, but the union type and instanceof works.
  // match (target: Block): boolean;
  // match (kind: BlockType): boolean;
  match (target: Block | BlockType): boolean {
    return (this.kind === (target instanceof Block ? target.kind : target) || this.kind === 'wild');
  }

  flood (wilds:Block[], wildas?: BlockType): Block[] {
    if (!this.isAlone()) return [];

    const flood: Block[] = []
    let adds: Block[] = [this];
    let target: BlockType;

    if (this.kind === 'wild' && wildas) {
      target = wildas;
    } else if (this.kind === 'wild') {
      console.log("bad news, fren");
      return [];
    } else {
      target = this.kind;
    }

    while (adds.length) {
      flood.push(...adds);
      adds = flood.flatMap((b) => b.availableNeighborBlocks()).filter(
        (b) => !flood.includes(b) && (b.kind === target || wilds.includes(b))
      );
    }

    // console.log(`Maybe ${ flood.length } != ${ flood.filter(unique).length } - if so, that's bad.`)

    return flood.filter(unique);
  }

  floodMax (wildas? : BlockType): Block[] { 
    if (wildas) {
      return this.flood(this.game.villageBlocks('wild'), wildas);
    } else {
      return this.flood(this.game.villageBlocks('wild'));
    }
  }

  floodWildOpts (): BlockType[] {
    if (this.kind !== 'wild') {
      console.log(`${ this } is not wild`);
      return [];
    }
    if (!this.isAlone()) return [];
    const flood = this.floodMax('wild');

    const types = flood.flatMap((b) => b.availableNeighborBlocks()).filter(
        (b) => (b.kind != this.kind)
      ).map((b) => b.kind).filter((v, i, a) => i === a.indexOf(v));

    return types;
  }

  floodWildMax (): Block[] {
    const maxes: Block[][] = [];
    for (const kind of this.floodWildOpts()) {
      maxes.push(this.floodMax(kind));
    }

    maxes.sort((a,b) => b.length - a.length);

    if (maxes.length > 0) {
      // console.log(`${ maxes.length } floods, ${ maxes.at(0)!.length } down to ${ maxes.at(-1)!.length }`);
      return maxes.at(0)!;
    } else {
      return [];
    }
  }

  splashCandidates (): Cell[] {
    const here = this.cell()!;
    const sc = $.village.all(Cell, (c) => (here.isAdjacentTo(c) || here.isDiagonalTo(c)) && !c.has(Piece));
    // console.log(`found ${ sc.length } candidates: ${ sc }`, sc);
    return $.village.all(Cell, (c) => (here.isAdjacentTo(c) || here.isDiagonalTo(c)) && !c.has(Piece));
  }

  getWrecked (splashZone: Cell[] = []): Block | undefined {
    if (!this.size()) {
      this.putInto($.box);
      return undefined;
    } else {
      const here = this.cell()!;
      const smallkind = SankaiGame.goods[this.size() - 1];
      const wreckage = $.box.last(Block, {kind: smallkind})!;
      wreckage.putInto(here);
      this.putInto($.box);
      splashZone.forEach((c) => $.box.last(Block, {kind: smallkind})?.putInto(c));
      return wreckage;
    }
  }
}

export class Card extends Piece {
  cardName!: string;
  playWhen!: string;
  actionName!: string;
  actionArgs: Record<string, string> | undefined;
  flavorText: string;
  description?: string;
  addDice: number = 0;
  forceShuffle: boolean = false;
  dismissible: boolean = false;
  pawn: Token | undefined;

  static canPlayMap: Record<string, (player: SankaiPlayer) => boolean> = {};

  canPlay (player: SankaiPlayer): boolean {
    // if (typeof Card.canPlayMap[this.cardName] === 'function') {
      return Card.canPlayMap[this.cardName](player);
    // } else {
    //   return true;
    // }
  }
}

export class VillageCard extends Card {
  playWhen: 'now' | 'construction' | 'move' | 'endTurn';
}

export class KaijuCard extends Card {
  playWhen: 'rollDice' | 'takeDie' | 'eat' | 'wreck' | 'action';
}

export class KaijuMat extends Space {
  player: SankaiPlayer;
}



export default createGame(SankaiPlayer, SankaiGame, game => {

  const { action } = game;
  const { playerActions, loop, whileLoop, eachPlayer, ifElse } = game.flowCommands;

  /**
   * Register all custom pieces and spaces
   */
  game.registerClasses(Cell, Token, KaijuToken, Block, SankaiDie, Card, VillageCard, KaijuCard, KaijuMat);

  /**
   * Create your game board's layout and all included pieces.
   */
  game.create(Space, 'box');
  game.create(Space, 'village').onEnter(Block, (b) => {
    if (b.kind === 'fortress') {
      game.finish(game.villager()); // doesn't do the thing
    }});
  game.create(Space, 'tray').onEnter(SankaiDie, (d) => {d.showToAll(); d.roll()});

  for (const player of game.players) {
    const seat = game.create(Space, 'seat', {player});
    seat.create(Space, 'tableau', {player}).onEnter(Card, c => c.showToAll());
    seat.first(Space, 'tableau')!.onExit(Card, (c) => {
      c.pawn && c.putInto($.box);
    });
    seat.create(Space, 'deck', {player}).onEnter(Card, c => c.hideFromAll());
    seat.create(Space, 'discard', {player}).onEnter(Card, c => {
      c.all(Card).putInto(seat.player!.my('discard')!);
      c.all(Piece).putInto($.box);
      c.pawn?.putInto($.box);
      if (c.forceShuffle) {
        seat.player!.my('discard')!.all(Card).putInto(seat.player!.my('deck')!);
        seat.player!.my('deck')!.shuffle();
      } else {
        c.showToAll();
      }
    });

    const hand = seat.create(Space, 'hand', {player});
    hand.onEnter(Card, c => c.showOnlyTo(hand.player!));
    hand.onEnter(Card, c => {
      if (c.playWhen === 'now') {
        console.log(`time to ${ c.actionName }`)
        game.followUp({name: c.actionName, player: seat.player, args: {card: c}});
      }
    })
    // hand.onEnter(Block, b => console.log(`${hand.player} got a block of: ${ b.kind }`));
    hand.onEnter(SankaiDie, d => {
      // console.log(`converting die ${d.current} ${ d.face() }`);
      if (d.face() === 'card') {
        // console.log(`${ player } should be ${ hand.player }`);
        hand.player!.drawCard();
        d.putInto($.box);
      } else {
        $.box.last(Block, {kind: d.face() as BlockType})!.putInto(hand);
        d.putInto($.box);
      }
    });
  }

  for (const good of ['lumber', 'wall', 'room', 'tower', 'fortress', 'wild'] as BlockType[]) {
    $.box.createMany(20, Block, good, { kind: good });
  }

  $.box.createMany(7, SankaiDie, 'die');

  $.village.createGrid({
    rows: game.boardSize,
    columns: game.boardSize,
    style: 'square'
  }, Cell, 'cell');

  $.village.all(Cell).forEach((c) => c.onEnter(Block, (b) => {
    if (b.kind === 'fortress') {
      game.finish(game.villager());
    } else if (c.has(KaijuToken)) {
      c.first(KaijuToken)!.putInto(c); // keeps Harapeko on top of blocks
    }
  }));

  $.village.all(Cell).forEach((c) => c.onExit(Block, (b) => {
    if (!$.village.has(Block)) {
      game.finish(game.kaiju());
    }
  }));

  $.village.all(Cell).forEach((c) => c.onExit(KaijuToken, (t) => {
    if (c.has(Token, 'Trap')) {
      c.first(Token, 'Trap')!.putInto($.box);
      c.game.message(`Harapeko escapes the trap.`);
    }
  }));

  for (const card of villageCards) {
    $.box.create(VillageCard, card.cardName!, card);
    if (typeof card.canPlay === 'function') {
      Card.canPlayMap[card.cardName!] = card.canPlay;
    } else { 
      Card.canPlayMap[card.cardName!] = () => true;
    }
  }

  for (const card of kaijuCards) {
    $.box.create(KaijuCard, card.cardName!, card);
    if (typeof card.canPlay === 'function') {
      Card.canPlayMap[card.cardName!] = card.canPlay;
    } else { 
      Card.canPlayMap[card.cardName!] = () => true;
    }
  }

  for (const token of ['Bukibuki', 'Decoy', 'Trap'] as TokenType[]) {
    const it = $.box.create(Token, token, { kind: token });
    $.box.first(Card, token)!.pawn = it;
    it.card = $.box.first(Card, token)!;
  }

  $.box.create(KaijuToken, 'Harapeko');
  const km = game.create(KaijuMat, 'kaijumat');
  km.create(Space, 'appetiteTrack').onEnter(Block, (b) => {
    if (b.kind === 'tower') {
      game.finish(game.kaiju());
    }
  });

  /**
   * Define all possible game actions.
   */
  game.defineActions({

    // Setup and Utility actions
    initVillage: player => action({
      prompt: 'Found your village by placing one lumber, one wall, and one room.',
    }).chooseFrom('ok', ['OK'], {skipIf: 'never'},
    ).do(() => {
      game.followUp({name: 'takeBlock', player, args: {blocktype: 'lumber'}});
      game.followUp({name: 'construction', player, args: {where: 'corner'}});
      game.followUp({name: 'takeBlock', player, args: {blocktype: 'wall'}});
      game.followUp({name: 'construction', player, args: {where: 'corner'}});
      game.followUp({name: 'takeBlock', player, args: {blocktype: 'room'}});
      game.followUp({name: 'construction', player, args: {where: 'corner'}});
      player.my('deck')!.firstN(2, Card)!.showOnlyTo(player);
      game.followUp({name: 'scry', player});
    }).message(`It is a beautiful day in the village of Haraku.`),

    initKaiju: player => action({
      prompt: 'Place the Kaiju in an empty corner',
    }).chooseOnBoard(
      'loc', 
      () => $.village.all(Cell, (c) => c.isCorner() && !c.has(Piece)),
      {skipIf: 'never'},
    ).do(({loc}) => {
      // console.log(`${ player } doing init as kaiju (${ game.kaiju() }?)... has ${player.pawn}...`);
      game.kaiju().pawn!.putInto(loc);
      $.kaijumat.player = player;
      $.kaijumat.first(Space, 'appetiteTrack')!.player = player;
      player.my('deck')!.firstN(2, Card)!.showOnlyTo(player);
      game.followUp({name: 'scry', player});
    }).message(`Harapeko arrives in a distant corner of the village.`),

    scry: player => action({
      prompt: 'Choose a starting card',
    }).chooseFrom(
      'keep',
      () => player.my('deck')!.firstN(2, Card)!.map((c) => ({label: c.cardName, choice: c})),
    ).chooseNumber(
      'where',
      {
        prompt: 'Put the other back in your deck, under how many cards?',
        min: 0,
        max: player.my('deck')!.all(Card).length - 2,
      },
    ).do(({keep, where}) => {
      keep.putInto(player.my('hand')!);
      player.my('deck')!.first(Card)!.hideFromAll();
      player.my('deck')!.first(Card)!.putInto(player.my('deck')!, {position: where});
    }),

    done: player => action({
      prompt: "Done",
    }).chooseFrom('done', ['Done'], {
      // skipIf: 'never'
    }).do(() => {
      Do.break();
    }),

    doneNoBlock: player => action({
      prompt: "Done",
      condition: !player.my('hand')!.has(Block),
    }).chooseFrom('done', ['Done'], {
      // skipIf: 'never'
    }).do(() => {
      Do.break();
    }),

    takeBlock: player => action<{blocktype: BlockType}>({
      prompt: `Take a {{ blocktype }}`,
    }).do(({ blocktype }) => {
      $.box.last(Block, {kind: blocktype})!.putInto(player.my('hand')!);
    }).message(
      `{{player}} took a {{ blocktype }}.`
    ),

    messageTo: player => action<{msg: string, ack?: string}>({
      prompt: ``,
    }).chooseFrom(
      'ignored',
      ({ack}) => [ack ?? 'OK'],
      {prompt: ({msg}) => msg, skipIf: 'never'},
    ),

    playCard: player => action<{playWhen?: string}>({
      prompt: "Click on a card in hand to play it.",
      condition: ({playWhen}) => player.my('hand')!.has(Card, {playWhen}, (c) => c.canPlay(player)),
    }).chooseOnBoard(
      'card',
      ({playWhen}) => player.my('hand')!.all(Card, {playWhen}, (c) => c.canPlay(player)),
      { skipIf: 'never'},
    ).do(({card, playWhen}) => {
      game.followUp({player, name: card.actionName, args: {card}});
    }),

    discard: player => action<{discard: number}>({
      prompt: "Discard",
    }).chooseOnBoard(
      'toDiscard',
      () => player.my('hand')!.all(Card),
      { number: ({discard}) => Math.min(discard, player.my('hand')!.all(Card).length), 
        prompt: ({discard}) => `Select ${Math.min(discard, player.my('hand')!.all(Card).length)} cards to discard.`},
    ).do(({toDiscard}) => {
      toDiscard.forEach((c) => c.putInto(player.my('discard')!));
      // toDiscard.putInto(player.my('discard')!);
    }),

    dismissOngoing: player => action({
      prompt: 'Dismiss ongoing effects?',
      condition: player.my('tableau')!.has(Card, {dismissible: true})
                && (player === game.villager() 
                    || (player.my('tableau')!.all(Card).length > 1 
                        && game.villager().my('hand')!.all(Card).length > 0)),
    }).chooseOnBoard(
      'toDiscard',
      () => player.my('tableau')!.all(Card, {dismissible: true}),
      {prompt: 'You may select a card in your tableau to dismiss it and end its ongoing effect.'}
    ).do(({toDiscard}) => {
      toDiscard.putInto(player.my('discard')!);
    }).message(`{{player}} dismissed {{toDiscard}}`),

    endTurn: player => action({
      prompt: "End Turn",
    }).do(() => {
      console.log(`ending turn for ${ player }`);
      player.my('hand')!.all(Block).putInto($.box);
      const radio = player.my('tableau')!.first(Card, 'Radio');
      if (radio && !radio.has(Block)) {
        $.box.last(Block, {kind: 'wild'})!.putInto(radio);
      }

      player.my('tableau')!.all(Card).forEach((c) => {
        if (c.pawn && c.container() === player.my('tableau') && ! $.village.has(Token, c.pawn)) {
          c.putInto(player.my('discard')!);
        }
      });

      player.hasActed = false;
      player.usedBonus = false;
      Do.break();
    }),

    takeDie: player => action({
      prompt: 'Choose a die',
    }).chooseOnBoard(
      'die', 
      () => {
        if ($.tray.all(SankaiDie).map(d => d.current).filter(unique).length > 1) {
          return $.tray.all(SankaiDie);
        } else {
          return $.tray.firstN(1,SankaiDie);
        }
      },
    ).do(({die}) => {
      // console.log(`taking a die: ${ die.current } so ${ die.face() }`);
      die.putInto(player.my('hand')!);
    }).message(
      `{{player}} selected {{ face }}.`, 
      ({die}) => ({face: die.face()}),
    ),

    // Villager actions (construction & project completion)

    // passConstruction: player => action({
    //   prompt: "Pass",
    //   condition: !player.my('hand')!.has(Block),
    // }).chooseFrom('pass', ['Pass'], {
    //   // skipIf: 'never'
    // }).do(() => {
    //   Do.break();
    // }),

    construction: player => action<{where: string}>({
      prompt: `Construction!`,
      condition: player.my('hand')!.has(Block),
    }).chooseOnBoard(
      'block',
      () => { 
        if (player.my('hand')!.all(Block).map((b) => b.kind).filter(unique).length > 1) {
          return player.my('hand')!.all(Block);
        } else {
          return player.my('hand')!.firstN(1, Block);
        }
      },
      {prompt: `Choose a block from your hand to build with.`}
    ).chooseOnBoard(
      'loc',
      ({where}) => {
        if (where === 'corner') {
          return $.village.all(Cell, (c) => c.isCorner() && !c.has(Piece));
        } else if (where === 'edge') {
          return $.village.all(Cell, (c) => c.isEdge() && !c.has(Piece));
        } else {
          return $.village.all(Cell, (c) => !c.has(Piece));
        }},
      { prompt: ({block}) => `Salect a location on the map to place a ${ block.kind }`},
    ).do(({block, loc}: {block: Block, loc: Cell}) => {
      block.putInto(loc);
      game.followUp({name: 'completeProjectDispatch', args: {block, chain: false}, player});
    }),

    // STUB: experiment paused
    // see issues #11, #13.
    //
    // constructCard: player => action({
    //   prompt: "or draw a card instead",
    //   condition: player.my('hand')!.has(Block, 'wild') && player.assureDeck(),
    // }).chooseOnBoard(
    //   'draw',
    //   () => player.my('deck')!.lastN(1, Card),  // despite how we think of it, the "first" card in the deck is on the bottom. 
    // ).do(({draw}) => {
    //   player.my('hand')!.first(Block, 'wild')!.putInto($.box);
    //   draw.putInto(player.my('hand')!);
    // }),

    completeProjectDispatch: player => action<{ block: Block, chain: boolean }>({
      prompt: `Complete a project`,
    }).do(({block, chain}) => {

      if (block.kind === 'wild' && block.floodWildMax().length >= game.projectSize) {
        // console.log('dispatch to completeProjectWild');
        game.followUp({player, name: 'completeProjectWild', args: {block, chain}});
      } else if (block.kind !== 'wild' && block.floodMax().length >= game.projectSize) {
        // console.log('dispatch to completeProject');
        game.followUp({player, name: 'completeProject', args: {block, chain}});
      } else {
        // console.log(`no projects to complete with {{block}}.`);
      }
    }),

    completeProject: player => action<{block: Block, chain: boolean}>({
      prompt: `Complete a project`,
      condition: ({block}) => { return (block.kind !== 'wild'
        && SankaiGame.goods[block.size()! + 1]
        && block.floodMax().length >= game.projectSize) },
    }).chooseOnBoard(
      'consume', 
      ({block}) => block.floodMax().filter((b) => b.kind === 'wild'),
      {
        prompt: 'Select the wild blocks to consume with this project',
        min: 0,
        skipIf: 'always',
        validate: ({block, consume}) => {
          const flood = block.flood(consume);
          return flood.length >= game.projectSize && consume.every((b) => flood.includes(b));
        },
    }).message(
      `{{player}} turned some {{block}}s into a {{structure}}`,
      ({block}) => ({structure: SankaiGame.goods[block.size() + 1]}),
    ).do(({block, consume, chain}) => {
      const flood = block.flood(consume);
      const loc = block.cell()!;
      const next = SankaiGame.goods[block.size()! + 1];
      // console.log(`${flood.length} including ${consume.length} wild, starting @ ${block.kind} ${'' + loc.row + ', ' + loc.column}: ${next} `, $.box.last(Block, {kind: next}));
      if (block && loc && next) {
        const structure = $.box.last(Block, {kind: next})!;
        structure.putInto(loc);
        flood.forEach((b) => b.putInto($.box));
        // STUB per #11 trying draw reward
        if (!!chain || flood.length > game.projectSize) player.drawCard();
        game.followUp({player, name: 'completeProjectDispatch', args: {block: structure, chain: true}});
      }
    }),

    completeProjectWild: player => action<{block: Block, chain: boolean}>({
      prompt: 'Complete a project. Place this wild as: ',
      condition: ({block}) => block.floodWildMax().length >= game.projectSize,
    }).chooseFrom(
      'wildas',
      ({block}) => block.floodWildOpts().filter((t) => block.floodMax(t).length >= game.projectSize),
    ).chooseOnBoard(
      'consume',
      ({block, wildas}) => block.floodMax(wildas).filter((b) => b.kind === 'wild'),
      { min: 1,
        prompt: 'Select the wild blocks to consume with this project',
        validate: ({block, consume, wildas}) => {
          const flood = block.flood(consume, wildas);
          return consume.includes(block) && flood.length >= game.projectSize && consume.every((b) => flood.includes(b));
        },
        initial: ({block}) => [block],
      },
    ).do(({block, consume, wildas, chain}) => {
      const flood = block.flood(consume, wildas);
      const loc = block.cell()!;
      const next = SankaiGame.goods[SankaiGame.size(wildas)! + 1];
      // console.log("wild flood: ", block, wildas, consume, flood);
      if (block && loc && next) {
        const structure = $.box.last(Block, {kind: next})!;
        structure.putInto(loc);
        flood.forEach((b) => b.putInto($.box));
        if (!!chain || flood.length > game.projectSize) player.drawCard();
        game.followUp({player, name: 'completeProjectDispatch', args: {block: structure, chain: true}});
      }
    }),

    // Villager tableau-card-enabled actions

    warehouse: player => action({
      prompt: "Take what's in the warehouse",
      condition: player.my('tableau')!.has(Card, 'Warehouse') 
                && player.my('Warehouse')!.has(Block)
                && (!player.my('hand')!.has(Block) 
                    || player.my('hand')!.has(Block, (b) => b.kind !== player.my('Warehouse')!.first(Block)!.kind)),
    }).chooseOnBoard(
      'swap',
      () => player.my('Warehouse')!.all(Block),
      {skipIf: 'never'},
    ).do(({swap}) => {
      const wh = player.my('tableau')!.first(Card, 'Warehouse')!;
      player.my('hand')!.first(Block)?.putInto(wh);
      swap.putInto(player.my('hand')!);
    }).message(`{{player}} swaps for a {{swap}}`),

    restockWarehouse: player => action({
      prompt: "Restock your warehouse",
      condition: player.my('tableau')!.has(Card, 'Warehouse') 
                && !player.my('Warehouse')!.has(Block)
                && player.my('hand')!.has(Block),
    }).chooseOnBoard(
      'fill',
      () => player.my('tableau')!.all(Card, 'Warehouse'),
      {skipIf: 'never'},
    ).do(({fill}) => {
      player.my('hand')!.first(Block)?.putInto(fill);
    }).message(`{{player}} refills their warehouse`),

    radio: player => action({
      prompt: "Select the block from the Radio to claim it into your hand.",
      condition: player.my('tableau')!.has(Card, 'Radio')
                  && player.my('Radio')!.has(Block, 'wild') 
                  && player.game.kaiju()!.my('hand')!.has(Block, 'wild'),
    }).chooseOnBoard(
      'claim',
      () => player.my('Radio')!.all(Block, 'wild')!,
      {skipIf: 'never'},
    ).do(({claim}) => {
      player.my('hand')!.all(Block).putInto($.box);
      const radio = player.my('tableau')!.first(Card, 'Radio')!;
      radio.all(Block).putInto(player.my('hand')!);
      radio.putInto(player.my('discard')!);
    }),

    // is there a meaningful way to combine loadDecoy and feedBukibuki? they do similar things.
    // also cleanDecoy and attackBukibuki

    loadDecoy: player => action({
      prompt: 'What do you think it wants?',
      condition: () => player.my('tableau')!.has(Card, 'Decoy') 
                        && player.my('hand')!.has(Block, (hb) => 
         !player.my('Decoy')!.has(Block, (db) => db.kind === hb.kind )),
    }).chooseOnBoard(
      'decoy', 
      () => player.my('tableau')!.all(Card, 'Decoy'),
      { skipIf: 'never', 
        prompt: 'To put bait in the decoy, and lure Harapeko, select the Decoy card.'},
    ).chooseOnBoard(
      'bait', 
      () => player.my('hand')!.all(Block, (hb) => !player.my('Decoy')!.has(Block, (db) => db.kind === hb.kind )),
      {prompt: 'Select a block from your hand to use as bait.'},
    ).do(({bait}) => {
      bait.putInto(player.my('Decoy')!);
    }).message(`{{ player }} baits the decoy with {{bait}}`),

    feedBukibuki: player => action({
      prompt: 'Feed the beast',
      condition: () => !!game.bukibuki().card && player.my('hand')!.has(Block, (hb) => 
          (hb.kind === 'wild' || hb.size() >= game.bukibuki().size!)
          && !game.bukibuki().card!.has(Block, (bb) => bb.kind === hb.kind )),
    }).chooseOnBoard(
      'buki', 
      () => player.my('tableau')!.all(Card, 'Bukibuki'),
      { skipIf: 'never', 
        prompt: `To feed Bukibuki, and make it tougher, select its card.`},
    ).chooseOnBoard(
      'food',
      () => player.my('hand')!.all(Block, (hb) => 
                  (hb.kind === 'wild' || hb.size() >= game.bukibuki().size!)
                  && !game.bukibuki().card!.has(Block, (bb) => bb.kind === hb.kind )),
      {prompt: 'Select a block from your hand to feed Bukibuki.'}
    ).do(({buki, food}) => {
      food.putInto(buki);
    }).message(`Bukibuki eats a {{ food.kind }} and feels stronger.`),

    moveBukibuki: player => action({
      prompt: "Bukibuki chases Harapeko.",
      condition: game.bukibukiWalkable().length > 0,
    }).chooseOnBoard(
      'dest',
      () => game.bukibukiWalkable(),
    ).do(({dest}) => {
      game.bukibuki().pawn!.putInto(dest);
    }).message(`Bukibuki moves toward Harapeko`),

    // Kaiju turns, basic actions

    eat: player => action({
      prompt: "Select a nearby block to eat",
      condition: !player.hasActed && !player.isLured() && player.edibleBlocks().length > 0 
                && !(game.bukibuki().pawn!.cell()?.reaches(player.pawn!)),
    }).chooseOnBoard(
      'food',
      () => player.edibleBlocks(),
      {skipIf: 'never'},
    ).do(({food}) => {
      const appetiteBlock = $.box.last(Block, {kind: player.appetite()})!;
      if (food.match(appetiteBlock)) {
        // if (SankaiGame.goods.includes(food.kind)) {
        //   console.log(`found ${ food } to eat`);
        //   // food.putInto($.appetiteTrack);
        // } else if (food.kind === 'wild' as BlockType) {
        //   console.log(`eating wild as ${ appetiteBlock }`);
        // }
        appetiteBlock.putInto($.appetiteTrack);
        food.putInto($.box);
      } else if (player.my('hand')!.all(Block).some((b) => b.match(food))) {
        console.log(`had a craving for ${ food } but it was not filling`);
        food.putInto($.box);
      } else {
        console.log(`very confused about ${food} - hungry for ${ appetiteBlock } or ${ player.my('hand')!.all(Block).join(', ') }`);
      }

      player.hasActed = true;
    }),

    eatAgain: player => action<{card: Card}>({
      prompt: 'Nom nom nom',
    }).do(({card}) => {
      player.hasActed = false;
      game.followUp({player, name: 'eat'});
      card.putInto(player.my('discard')!);
    }),

    // STUB TODO: 
    // maybe as first step skipif always, second step?
    // done?  test
    move: player => action({
      prompt: 'Select a nearby space and move into it',
      condition: !player.hasActed
                && !!(player.pawn && player.pawn.cell() instanceof Cell)
                && !(player.pawn!.cell()!.has(Token, 'Trap')),
    }).chooseOnBoard(
      'loc',
      () => {
        const here = player.pawn!.cell()!;
        const walkables = here.walkableSteps(2);
        // removing this because (a) it seems too harsh and (b) there's a conflict w/ Decoy
        // if (player.pawn!.cell()!.reaches(game.bukibuki().pawn!)) {
        //   return walkables.filter((c) => c.reaches(game.bukibuki().pawn!));
        // } else 
        if (player.isLured()) {
          const there = $.village.first(Token, 'Decoy')!.cell()!;
          const range = Math.min(...walkables.map((c) => c.distanceTo(there)!));
          return walkables.filter((c) => c.distanceTo(there) === range);
        } else {
          return walkables;
        }
      }
    ).do(({loc}) => {
      player.pawn!.putInto(loc);
      player.hasActed = true;
    }).message(
      `{{ player }} moves to {{ locString }}`,
      ({loc}) => ({locString: `${loc.row}, ${loc.column}`})
    ),

    climb: player => action({
      prompt: 'Select a nearby block to climb',
      condition: !player.hasActed && !player.isLured() && player.climbableBlocks().length > 0,
    }).chooseOnBoard(
      'target',
      () => player.climbableBlocks(),
      {skipIf: 'never'},
    ).do(({target}) => {
      player.pawn!.putInto(target.cell()!);
      player.hasActed = true;
    }).message(
      `Harapeko climbs the {{target}}`,
    ),

    wreck: player => action<{targets: Block[]}>({
      prompt: "Things fall apart",
      condition: ({targets}) => [console.log('grr', targets), true].length > 0,
      // condition: targets ?? !player.hasActed && !player.isLured() && player.wreckableBlocks().length > 0,
    }).chooseOnBoard(
      'target',
      ({targets}) => targets.reverse(),
      { number: ({targets}) => Math.min(1, targets.length),
        prompt: 'Select a structure to wreck.',},
    ).chooseOnBoard(
      'splashZone',
      ({target}) => {
        if (target.length > 0 && !!target[0].size()) {
          console.log(`grah: ${ target[0] }: `, target[0].splashCandidates());
          return target[0].splashCandidates();
        } else {
          return [];
        }
      },
      { number: ({target}) => {
          if (target.length > 0 && !!target[0].size()) {
            const sc = target[0].splashCandidates();
            console.log(`grumpf: ${ target[0] } has ${ sc.length } so ${ Math.min(game.projectSize - 1, sc.length) }`);
            return Math.min(game.projectSize - 1, sc.length);
          } else {
            return 0;
          }
        }, 
        prompt: 'Select the nearby locations where debris lands.',
      },
      // }, skipIf: 'never'},
    ).do(({target, targets, splashZone}) => {
      console.log(`insane: ${ target[0] } and ${ splashZone.length }`);
      for (const t of target) {
        t.getWrecked(splashZone);
      }
    }),

    wreckAction: player => action({
      prompt: 'Harapeko wrecks a building.',
      condition: !player.hasActed && !player.isLured() && player.wreckableBlocks().length > 0,
    }).do(() => {
      game.followUp({name: 'wreck', player, args: {targets: player.wreckableBlocks()}});
      player.hasActed = true;
    }),

    rampageWreck: player => action({
      prompt: 'Harapeko smash!',
      condition: player.my('tableau')!.has('Rampage'),
                  // && player.wreckableBlocks(true).length > 0,
    }).do(() => {
      game.followUp({name: 'wreck', player, args: {targets: player.wreckableBlocks(true)}});
    }),

    bukibukiWreck: player => action({
      prompt: "Clumsy Bukibuki...",
      // condition: () => game.bukibuki().pawn.cell() && $.village.has(Block)
    }).do(() => {
      const targets = $.village.all(Block, (b) => 
          game.bukibuki().pawn!.cell()!.reaches(b) 
          && game.bukibuki().card!.has(SankaiDie, (d) => d.match(b)));
      game.followUp({name: 'wreck', player: game.kaiju(), args: {targets}});
    }),

    attackBukibuki: player => action({
      prompt: "Attack Bukibuki",
      condition: () => !player.hasActed && !player.isLured() && !!game.bukibuki().card && player.pawn!.cell()!.reaches(game.bukibuki().pawn!) &&
                  game.bukibuki().card!.has(Block, (bb) => player.my('hand')!.has(Block, (hb) => hb.match(bb))),
    }).chooseOnBoard(
      'target', 
      () => game.bukibuki().card!.all(Block, (bb) => player.my('hand')!.has(Block, (hb) => hb.match(bb))),
      {prompt: () => {
        if (game.bukibuki().card!.all(Block).length > 1) {
          return `Select a matching block to remove from Bukibuki.`;
        } else { 
          return `Select Bukibuki's last block to defeat Bukibuki.`;
        }
      }},
    ).do(({target}) => {
      target.putInto($.box);
      const bukicard = game.bukibuki().card!;
      if (!bukicard.has(Block)) {
        bukicard.putInto(game.villager()!.my('discard')!);
        game.bukibuki().pawn!.putInto($.box);
      }
      player.hasActed = true;
    }),

    cleanDecoy: player => action({
      prompt: "Select any block to remove from the Decoy.",
      condition: () => !player.hasActed && $.village.has(Token, 'Decoy')
                    && player.pawn!.cell()!.reaches($.village.first(Token, 'Decoy')!)
                    && game.villager().my('Decoy')!.has(Block),
    }).chooseOnBoard(
      'target', 
      () => game.villager().my('Decoy')!.all(Block),
    ).do(({target}) => {
      target.putInto($.box);
      player.hasActed = true;
    }),

    destroyDecoy: player => action({
      prompt: "Select the decoy to spend an action permanently disabling it.",
      condition: () => !player.hasActed && $.village.has(Token, 'Decoy')
                    && player.pawn!.cell()!.reaches($.village.first(Token, 'Decoy')!)
                    && player.my('hand')!.has(Block, 'wild'),
    }).chooseOnBoard(
      'target', 
      () => $.village.all(Token, 'Decoy'),
    ).do(({target}) => {
      target.putInto($.box);
      target.card!.all(Piece).putInto($.box);
      target.card!.putInto(game.villager().my('discard')!);
      player.hasActed = true;
    }),

    swapLaser: player => action({
      prompt: "Select the die from your Laser Vision to replace one of the dice in the tray.",
      condition: () => player.my('tableau')!.has(Card, 'Laser Vision') 
                       && player.my('Laser Vision')!.has(SankaiDie)
                       && $.tray.has(SankaiDie, (d) => d.current !== player.my('Laser Vision')!.first(SankaiDie)!.current),
    }).chooseOnBoard(
      'fromLaser',
      () => player.my('Laser Vision')!.all(SankaiDie),
      {skipIf: 'never'},
    ).chooseOnBoard(
      'toLaser',
      () => $.tray.all(SankaiDie),
      {skipIf: 'never', prompt: 'Select a die from the tray to replace.'},
    ).do(({ toLaser, fromLaser }) => {
      toLaser.putInto(player.my('Laser Vision')!);
      const hold = fromLaser.current;
      fromLaser.putInto($.tray);
      fromLaser.current = hold;
    }).message(
      `{{player}} swaps a {{ fromLaser }} for a {{ toLaser }}`,
    ),

    escapeTrap: player => action({
      prompt: 'Select a neighboring empty space to get out of the trap.',
      condition: !player.hasActed && player.my('hand')!.has(Block, {kind: 'wild'})
                && player.pawn!.cell()!.has(Token, 'Trap') 
                && player.pawn!.cell()!.adjacencies(Cell, {empty: true}).length > 0,
    }).chooseOnBoard(
      'dest',
      () => player.pawn!.cell()!.adjacencies(Cell, {empty: true}),
    ).do(({dest}) => {
      player.pawn!.putInto(dest);
      player.hasActed = true;
    }).message(`The monster is loose`),

    lightningStep: player => action({
      prompt: "Take a single step without using your action.",
      condition: !player.usedBonus
                && player.my('tableau')!.has(Card, 'Lightning Speed')
                && !!(player.pawn && $.village.has(KaijuToken))
                && !(player.pawn!.cell()!.has(Token, 'Trap')),
    }).chooseOnBoard(
      'loc',
      () => {
        const here = player.pawn!.cell()!;
        const walkables = here.walkableSteps(1);
        // if (player.pawn!.cell()!.reaches(game.bukibuki().pawn!)) {
        //   return walkables.filter((c) => c.reaches(game.bukibuki().pawn!));
        // } else {
          return walkables;
        // }
      },
    ).do(({loc}) => {
      player.pawn!.putInto(loc);
      player.usedBonus = true;
    }).message(
      `{{ player }} moves Harapeko to {{ locString }}`,
      ({loc}) => ({locString: `${loc.row}, ${loc.column}`})
    ),

    // THE CARDS THEMSELVES CONTEND IN VAIN

    dawn: player => action<{card: Card}>({
      prompt: "At least that night is behind us...",
      condition: game.kaiju().my('tableau')!.all(Card).length > 1
                  || game.kaiju().my('hand')!.all(Card).length > 4,
    }).do(({card}) => {
      const kaiju = game.kaiju();
      player.drawCard();
      kaiju.drawCard();
      card.putInto(player.my('discard')!);

      if (player.my('hand')!.all(Card, (c) => c.playWhen !== 'now').length > 3) {
        game.followUp({name: 'discard', player, args: {discard: player.my('hand')!.all(Card).length - 3}});
      }

      if (kaiju.my('hand')!.all(Card, (c) => c.playWhen !== 'now').length > 3) {
        game.followUp({name: 'discard', 'player': kaiju, args: {discard: kaiju.my('hand')!.all(Card).length - 3}});
      }

      // STUB make this a followUp so it happens in the right order?
      kaiju.my('tableau')!.all(Card, {dismissible: true}).putInto(kaiju.my('discard')!);
      player.my('tableau')!.all(Card, 'Bukibuki').putInto(player.my('discard')!);
    }) ,

    initWarehouse: player => action<{card: Card}>({
      prompt: "Open a warehouse. It starts with a wall in it.",
      condition: player.my('hand')!.has(Card, 'Warehouse'),
      // un-nerf the warehouse a bit here; always jsut comes with a free wall.
    // }).chooseFrom(
    //   'keep',
    //   () => {
    //     let opts;
    //     const active = player.my('hand')!.first(Block);
    //     if (active && active.kind !== 'wall') {
    //       opts = [{choice: 'wall', label: "Keep the wall", }, {choice: active.kind, label: `Keep your ${ active.kind }`}];
    //     } else {
    //       opts = [{choice: 'wall', label: "Keep the wall", }]
    //     }
    //     return opts;
    //   },
    // ).do(({keep, card}) => {
    //   card.putInto(player.my('tableau')!);
    //   const stock = $.box.last(Block, {kind: keep as BlockType})!;
    //   stock.putInto(card);
    //   player.my('hand')!.last(Block)?.putInto($.box);
    }).do(({card}) => {
      card.putInto(player.my('tableau')!);
      const stock = $.box.last(Block, {kind: 'wall'})!;
      stock.putInto(card);
    }).message(
      `{{ player }} opened a Warehouse`,
    ),

    initDecoy: player => action<{card: Card}>({
      prompt: 'A cunning plan',
    }).chooseOnBoard(
      'loc', 
      () => $.village.all(Cell, {empty: true}),
    ).do(({loc, card}) => {
      game.first(Token, 'Decoy')!.putInto(loc);
      card.putInto(player.my('tableau')!);
    }),

    initRadio: player => action<{card: Card}>({
      prompt: "Use your radio to call for an airdrop",
      condition: player.my('hand')!.has(Card, 'Radio') && player.game.kaiju()!.my('hand')!.has(Block, 'wild'),
    }).do(({card}) => {
      card.putInto(player.my('tableau')!);
    }),

    initResearch: player => action<{card: Card}>({
      prompt: "We just need some time in the lab",
    }).do(({card}) => {
      card.putInto(player.my('tableau')!);
      const tech= player.my('deck')!.firstN(1, Card);
      tech.putInto(card);
      tech.showTo(player);
      const msg = `Researchers are working on: ${ tech[0].cardName }`;
      game.followUp({name: 'messageTo', player, args: {msg}});
      tech.hideFromAll();
    }).message(`{{ player }}'s team is looking into it. They'll report back any progress.`),

    performResearch: player => action({
      prompt: "Here's our best two ideas. Which approach should we abandon?",
      condition: player.my('tableau')!.has(Card, 'Research') && player.my('Research')!.all(Card).length > 1,
    }).chooseFrom(
      'discard',
      () => player.my('Research')!.all(Card).map((c) => ({label: c.cardName, choice: c})),
    ).do(({discard}) => {
      discard.putInto(player.my('discard')!);
      console.log("have some research remaining: ", player.my('Research')!.all(Card));
      player.my('Research')?.all(Card).hideFromAll();
    }).message(`{{ player }} has directed the research team.`),

    collectResearch: player => action({
      prompt: "This is just what we need.",
      condition: player.my('tableau')!.has(Card, 'Research') && player.my('Research')!.has(Card),
    }).chooseOnBoard(
      'research',
      () => player.my('Research')!.all(Card),
      {skipIf: 'never'},
    ).do(({research}) => {
      research.putInto(player.my('hand')!);
      // make sure cards on it are also going into discard... somehow...
      player.my('tableau')!.all(Card, 'Research').putInto(player.my('discard')!);
    }).message(`The scientists have made their final report.`) ,

    militaryInvolvement: player => action<{strength?: number, card: Card}>({
      prompt: "We're from the government, and we're here to help.",
    }).do(({strength, card}) => {
      console.log (`Kaiju currently ${ game.kaiju().size() } (${ game.kaiju().appetite() }), received strength: ${ strength }`);

      if ($.tray.all(SankaiDie).length > 0 && ! (strength ?? 0)) {
        console.log("seting aside ", $.tray.all(SankaiDie));
        $.tray.all(SankaiDie).putInto(player.my('discard')!);
      }

      // STUB: making it one more die than the kaiju size (so, 1 for size: lumber)
      strength ??= game.kaiju().size() + 1;
      if ($.tray.all(SankaiDie).length === 0) {
        game.message(`The military has shown up to help. They attack Harapeko ${ strength } times.`);
      }

      while ($.tray.all(SankaiDie).length < strength) {
        const die = $.box.last(SankaiDie)!;
        die.putInto($.tray);
        game.addDelay();
        console.log(`die #${ $.tray.all(SankaiDie).length } ${ die.current } (${ die.face() })`)
        if (die.current === 5) {
          console.log("both draw");
          game.message('The attack is ineffective, but lessons are learned on all sides.');
          game.players.forEach((p) => p.drawCard());
        } else {
          console.log("shots fired");

          if (die.match(game.kaiju().appetite())) {
            console.log("hit kaiju...");
            game.message('Harapeko is hit!');
            $.appetiteTrack.last(Block)?.putInto($.box);
            console.log (`Kaiju now ${ game.kaiju().size() } (${ game.kaiju().appetite() })`);
          }

          // too much collateral damage? maybe chill on wild?
          if ($.village.has(Block, (b) => die.match(b) && game.kaiju().pawn!.reaches(b))) {
            console.log("catching strays");
            game.message('Stray shots wreak havoc on the streets of Haraku.');
            game.followUp({name: 'wreck', player: game.kaiju(), args: {
              targets: $.village.all(Block, (b) => die.match(b) && game.kaiju().pawn!.reaches(b))
            }});
            game.followUp({name: 'militaryInvolvement', player, args: {strength, card}});
            // break;
            return;
          }
        }
      }

      game.addDelay();
      if ($.tray.all(SankaiDie).length >= strength) {
        console.log('Our work here is done.');
        $.tray.all(SankaiDie).putInto($.box);
        if (player.my('discard')!.all(SankaiDie).length > 0) {
          const dice = player.my('discard')!.all(SankaiDie);
          const values = dice.map(d => d.current);
          console.log(dice, " should become ", values);
          dice.putInto($.tray);
          for (const d of dice) {
            d.current = values.pop()!;
          }
          console.log("and have become ", dice);
        }
        card.putInto(player.my('discard')!);
        game.message('Unsure what to do next, the military leave to regroup.')
      } else {
        console.log(`taking a break with ${ $.tray.all(SankaiDie).length } in tray.`);
      }
    }),

    initBukibuki: player => action<{card: Card}>({
      prompt: 'A challenger approaches!',
    }).chooseOnBoard(
      'loc', 
      () => {
        if ($.village.has(Cell, {empty: true}, (c) => c.isEdge())) {
          return $.village.all(Cell, {empty: true}, (c) => c.isEdge());
        } else {
          return $.village.all(Cell, {empty: true});
        }
      }
    ).do(({card, loc}) => {
      $.box.all(Token, 'Bukibuki').putInto(loc);
      card.putInto(player.my('tableau')!);
      $.box.last(Block, 'lumber')!.putInto(card);
      $.box.last(Block, 'wall')!.putInto(card);
      // $.box.last(Block, 'room')!.putInto(card);  // Buki was too strong. this might not be enough.
    }),

    supplies: player => action<{card: Card}>({
      prompt: `Fresh supplies!`, // Look, a ${ card.actionArgs!.kind }!`,
    }).chooseFrom(
      'choice', ({card}) => [{
          choice: 'replace', label: "Replace your active block."
        }, { 
          choice: 'extra', label: "Gain an extra block but let Kaiju draw a card.",
      }], {
        validate: ({choice}) => (choice === 'extra' || player.my('hand')!.has(Block)),
      }
    ).do(({choice, card}) => {
      const block = $.box.last(Block, { kind: card.actionArgs!.kind as BlockType })!;

      if (choice === 'extra') {
        player.game.kaiju()!.drawCard();
      } else {
        player.my('hand')!.first(Block)?.putInto($.box);
      }

      block.putInto(player.my('hand')!);
      card.putInto(player.my('discard')!);
    }),

    trap: player => action<{card: Card}>({
      prompt: 'Trap Harapeko',
      condition: game.kaiju().pawn!.isAlone(),
    }).do(({card}) => {
      const theCell = game.kaiju().pawn!.cell()!;
      game.first(Token, 'Trap')!.putInto(theCell);
      card.putInto(player.my('tableau')!);
    }).message(
      `It was a trap! Harapeko has fallen into a hole!`
    ),

    winch: player => action<{card: Card}>({
      prompt: 'That would look better over here',
      condition: ({card}) => player.my('hand')!.has(card),
    }).chooseOnBoard(
      'target',
      () => [... $.village.all(Block, (b) => b.isAlone()), 
              ... $.village.all(Token, (b) => b.isAlone() && b !== game.first(KaijuToken))],
    ).chooseOnBoard(
      'dest',
      ({target}) => target.cell()!.adjacencies(Cell, {empty: true}),
    ).do(({card, target, dest}) => {
      target.putInto(dest);
      card.putInto(player.my('discard')!);
    }).message(
      `{{player}} moves the {{target}} into a new home.`
    ) ,

    urge: player => action<{card: Card}>({
      prompt: `Choose a die to fix.`,
      condition: ({card}) => $.tray.has(SankaiDie, (d) => d.face() !== card.actionArgs!.kind),
    }).chooseOnBoard(
      'target',
      ({card}) => $.tray.all(SankaiDie, (d) => d.face() !== card.actionArgs!.kind),
    ).do(({card, target}) => {
      const kind = card.actionArgs!.kind as BlockType;
      target.current = SankaiGame.size(kind)! + 1;
      card.putInto(player.my('discard')!);
    }),

    entwinedFates: player => action<{card: Card}>({
      prompt: `Choose a die to copy.`,
      condition: $.tray.all(SankaiDie).map((d) => d.current).filter((v,i,a) => i === a.indexOf(v)).length > 1,
    }).chooseOnBoard(
      'target',
      () => $.tray.all(SankaiDie),
    ).do(({card, target}) => {
      $.tray.all(SankaiDie).forEach((d) => d.current = target.current);
      card.putInto(player.my('discard')!);
    }),

    earthquake: player => action<{card: Card}>({
      prompt: "It's an earthshaker!",
      condition: () => $.village.has(Block, (b) => b.size() > 0),
    }).chooseOnBoard(
      'target',
      () => $.village.all(Block, (b) => b.size() > 0),
    ).do(({card, target}) => {
      const loc = target.cell()!;
      game.followUp({player, name: 'wreck', args: {targets: [target]}});
      game.followUp({player, name: 'earthquakeII', args: {loc, card}});
    }),

    earthquakeII: player => action<{loc: Cell, card: Card}>({
      prompt: "Still shaking",
    }).chooseFrom(
      'fault',
      () => [
        'row', 'column'
        // STUB why don't these work?
        // {label: 'row',    choice: {row:    loc.row}},
        // {label: 'column', choice: {column: loc.column}},
      ],
    ).chooseFrom(
      'direction', ['North', 'South', 'East', 'West'],
      // [{
      //   label: 'North', 
      //   choice: {row: -1, column: 0},
      // }, {
      //   label: 'South', 
      //   choice: {row: +1, column: 0}
      // }, {
      //   label: 'East', 
      //   choice: {row: 0, column:  1}
      // }, {
      //   label: 'West', 
      //   choice: {row: 0, column: -1}
      // }],
    ).do( ({card, loc, fault, direction}) => {
      const faultZone = $.village.all(Cell, 'nonesuch');
      // console.log('got ', faultZone);

      if (fault === 'row') {
        // console.log('adding row');
        faultZone.push(... $.village.all(Cell, {row: loc.row!}));
      } else if (fault === 'column') {
        // console.log('adding column');
        faultZone.push(... $.village.all(Cell, {column: loc.column!}));
      } else {
        console.log("panic, bad faultline: ${ fault }")
      }

      faultZone.all(Token, 'Trap').putInto($.box);
      // faultZone.all(Cell);
      const affected = [...faultZone.all(Token), ...faultZone.all(Block)];

      affected.forEach((p) => {
        const here = p.cell()!;
        let theRow = here.row;
        let theColumn = here.column;
        if (direction === 'North') {
          theRow -= 1;
        } else if (direction === 'South') {
          theRow += 1;
        } else if (direction === 'East') {
          theColumn += 1;
        } else if (direction === 'West') {
          theColumn -= 1;
        } else {
          console.log(`panic!  bad direction: ${direction}`);
        }

        theRow    = Math.max(1, Math.min(game.boardSize, theRow));
        theColumn = Math.max(1, Math.min(game.boardSize, theColumn));

        const there = $.village.first(Cell, (
          {
            row:    theRow,
            column: theColumn,
          }))!;
        p.putInto(there);
      });

      $.village.all(Cell).forEach((c) => {
        const extra = c.all(Block).length - 1;
        if (extra > 0) {
          c.all(Block).sortBy((b) => b.size(), 'asc').firstN(extra, Block).putInto($.box);
        }
      });

      card.putInto(player.my('discard')!);
    }),

    evolve: player => action<{card: Card}>({
      prompt: "This isn't even my final form",
    }).do(() => {
      const oldHand = player.my('hand')!.all(Card);
      const count = oldHand.length;
      player.drawCard(count + 1);
      oldHand.putInto(player.my('discard')!);
      player.shuffleDiscards();
    }) ,

    initLaser: player => action<{card: Card}>({
      prompt: 'Incandescent with rage',
      condition: player.my('hand')!.has(Card, 'Laser Vision'),
    }).do(({card}) => {
      card.putInto(player.my('tableau')!);
      $.box.last(SankaiDie)!.putInto($.tray);
      player.game.addDelay();
      $.tray.last(SankaiDie)!.putInto(player.my('Laser Vision')!);
    }),

    initSpeed: player => action<{card: Card}>({
      prompt: 'get your hustle on',
      condition: player.my('hand')!.has(Card, 'Lightning Speed'),
    }).do(({card}) => {
      card.putInto(player.my('tableau')!);
    }),

    initRampage: player => action<{card: Card}>({
      prompt: 'destroy everything',
      condition: player.my('hand')!.has(Card, 'Rampage'),
    }).do(({card}) => {
      card.putInto(player.my('tableau')!);
    }),

    jumpStomp: player => action<{card: Card}>({
      prompt: "into the ground!",
    }).do(({card}) => {
      game.followUp({name: 'wreck', player, args: {
        targets: [...player.pawn!.cell()!.all(Block), ...player.climbableBlocks()],
      }});
      card.putInto(player.my('discard')!);
    }),

    storm: player => action<{card: Card}>({
      prompt: "The Storm is coming",
      condition: player.my('hand')!.has(Card, {cardName: 'Storm'}),
    }).do(({card}) => {
      game.players.sortBy('role', 'asc');
      card.putInto(player.my('discard')!);
    }),

    tunnel: player => action<{card: Card}>({
      prompt: "Nothing can stop me now",
      condition: player.my('hand')!.has(Card, {cardName: 'Tunnel'}),  // is this a waste of time?
    }).chooseOnBoard(
      'dest', 
      () => $.village.all(Cell, (c) => ! c.has(Piece)),
      { skipIf: 'never' },
    ).do(({dest, card}) => {
      player.pawn!.putInto(dest);
      card.putInto(player.my('discard')!);
    }),

  });

  /**
   * Define the game flow, starting with board setup and progressing through all
   * phases and turns.
   */

  const bukiBehavior = ifElse({
    if: () => !!game.bukibuki().card,
    do: [
      // () => console.log("got buki card"),

      () => $.tray.first(SankaiDie)?.putInto(game.bukibuki().card!),

      ifElse({
        if: () => game.bukibuki().card!.first(SankaiDie)?.face() === 'card',
        do: () => { 
          $.box.first(SankaiDie)!.putInto(game.bukibuki().card!);
          game.bukibuki().card!.all(SankaiDie).forEach(d => d.roll());
        },
      }),

      ifElse({
        if: () => game.bukibukiWalkable().length > 0,
        do: playerActions({ player: () => game.villager(), actions: ['moveBukibuki']}),
        // else: () => console.log(`can't walk: ${ game.bukibukiWalkable() }`),
      }),

      ifElse({
        if: () => $.village.all(Block, (b) =>
                    !! game.bukibuki().pawn!.cell()?.reaches(b) 
                    && game.bukibuki().card!.has(SankaiDie, (d) => d.match(b)),
                  ).length > 0,
        do: playerActions({ player: () => game.kaiju(), actions:['bukibukiWreck']}),
        // else: () => console.log(`can't wreck`),
      }),

      ifElse({
        if: () => !! game.bukibuki().pawn!.cell()?.reaches(game.kaiju()!.pawn!)
                  && game.bukibuki().card!.has(SankaiDie, (d) => d.match(game.kaiju().appetite())),
        do: [
          () => $.appetiteTrack.last(Block)?.putInto($.box),
          () => game.message(`Bukibuki hit Harapeko!`),
        ],
      }),

      () => game.bukibuki().card!.all(SankaiDie).putInto($.box),
    ],
  });

  game.defineFlow(
    () => game.assignRoles(),      // in the future, ?make an interface where people can pick?
    playerActions({ player: () => game.villager(), actions: ['initVillage'], }),
    playerActions({ player: () => game.kaiju(), actions: ['initKaiju'], }),

    loop(
      () => game.gameTurn += 1,
      () => game.message(`Turn #${game.gameTurn}`),

      // Dice
      () => game.rollDice(),
      eachPlayer({name: 'player', do: playerActions({actions: [{
                                                        name: 'playCard',
                                                        args: {playWhen: 'rollDice'},
                                                      }, 'swapLaser'], optional: 'pass'})}),

      ifElse({  if:   () => game.kaiju().pawn!.cell()!.has(Token, 'Trap'),
                do:   () => game.players.sortBy('role', 'desc'),
                else: () => game.players.sortBy('role', 'asc'),
      }),

      eachPlayer({name: 'player', do: playerActions({actions: ['takeDie']})}),

      () => game.players.sortBy('role', 'desc'),

      eachPlayer({name: 'player', do: playerActions({actions: [{
        name: 'playCard',
        args: {playWhen: 'takeDie'},
      }], optional: 'pass'})}),

      bukiBehavior,

      () => game.cleanUpDice(),

      // Actions
      eachPlayer({
        name: 'player',
        do: [
          // STUB magic!  the console.log makes the game work. 
          () => console.log("from list: ", game.players),
          () => console.log("currently: ", game.players.current()),
          ifElse ({
            if: () => game.players.current() === game.villager(),

            // Villager Turns
            do: [
              // () => console.log(`${ game.players.current() } should be ${ game.villager() }`),

              ifElse({ if: () => game.villager().my('tableau')!.has(Card, 'Research'),
                do: [
                  () => { 
                    const v = game.villager();
                    const research = v.my('Research')!;
                    const found = () => research.all(Card);
                    while (found().length < 2) {
                      v.my('deck')!.first(Card)!.putInto(research);
                    }
                    found().showTo(v);
                  },
                  playerActions({
                    player: () => game.villager(),
                    actions: ['performResearch'],
                    // optional: 'pass',
                  }),
                ],
              }),

              // ifElse({
              //   if: () => ! game.villager().my('hand')!.has(Block),
              //   do: [
              //     playerActions({
              //       player: () => game.villager(),
              //       actions: ['warehouse', 'restockWarehouse', 'radio',
              //         { name: 'playCard',
              //           args: {playWhen: 'construction'},
              //         }],
              //       optional: 'Pass',
              //     }),
              //   ],
              // }),

              // whileLoop({
              //   while: () => game.villager()!.my('hand')!.has(Block),
              //   do: playerActions({
              //     player: () => game.villager(),
              //     actions: ['construction', 'warehouse', 'restockWarehouse', 'radio', 'feedBukibuki', 'loadDecoy', 'collectResearch',
              //               { name: 'playCard',
              //                 args: {playWhen: 'construction'},
              //               }],
              //   }),
              // }),

              loop(playerActions({
                player: () => game.villager(),
                actions: ['construction', 'warehouse', 'restockWarehouse', 'radio', 'feedBukibuki', 'loadDecoy', 'collectResearch',
                          { name: 'playCard',
                            args: {playWhen: 'construction'},
                          },
                          'doneNoBlock',
                        ],
              }))

            ],
            else: [
              // Kaiju Turns
              ifElse({ if: () => game.kaiju().my('tableau')!.has(Card, 'Rampage') && game.kaiju().wreckableBlocks(true).length > 0,
                do: [ // () => console.log(`{{player}} option to wreck with Rampage`),
                  playerActions({
                    player: () => game.kaiju(),
                    actions: ['rampageWreck'],
                    // optional: 'Pass',        // try making this non-optional so harapeko might let it go
                  })],
              }),

              loop(
                playerActions({
                  player: () => game.kaiju(),
                  actions: [
                    { name: 'eat',
                      do: ifElse ({ if: () => game.kaiju().my('hand')!.has(Card, {playWhen: 'eat'}),
                                    do: playerActions({
                                          player: () => game.kaiju(),
                                          actions: [{
                                            name: 'playCard',
                                            args: {playWhen: 'eat'},
                                          }],
                                          optional: 'Pass',
                                        })}),
                    },
                    { name: 'move',
                      do: ifElse ({ if: () => game.villager().my('hand')!.has(Card, {playWhen: 'move'}),
                        do: playerActions ({
                          player: () => game.villager(),
                          actions: [{
                            name: 'playCard',
                            args: {playWhen: 'move'},
                          }],
                          optional: 'Pass',
                        }),
                      }),
                    },
                    'climb',
                    { name: 'wreckAction',
                      do: ifElse ({ if: () => game.kaiju().my('hand')!.has(Card, {playWhen: 'wreck'}),
                        do: playerActions({
                          player: () => game.kaiju(),
                          actions: [{
                            name: 'playCard',
                            args: {playWhen: 'wreck'},
                          }],
                          optional: 'Pass',
                        }),
                      }),
                    },
                    { name: 'playCard',
                      args: {playWhen: 'action'},
                    },
                    'escapeTrap',
                    'attackBukibuki',
                    'cleanDecoy', 
                    'destroyDecoy',
                    'lightningStep',
                    'done',
                  ],
                  // optional: 'Pass',
                }),
              ),
            ],
          }),
        ],
      }),

      // End Turn, Kaiju first
      () => game.players.sortBy('role', 'asc'),
      eachPlayer({
        name: 'player',
        do: loop(
          playerActions({
            actions: [
              'dismissOngoing',
              { name: 'playCard',
                args: {playWhen: 'endTurn'},
              }, 
              'endTurn', 
            ],
          }),
        ),
      }),
    ),
  );
});
