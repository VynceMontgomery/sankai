import {
  createGame,
  createGameClasses,
  Player,
  Game,
  Do,
} from '@boardzilla/core';

import { villageCards, kaijuCards } from './cards.js';

type BlockType = 'lumber' | 'wall' | 'room' | 'building' | 'tower' | 'fortress' | 'wild';

export class SankaiPlayer extends Player<SankaiPlayer, SankaiGame> {
  /**
   * Any properties of your players that are specific to your game go here
   */
  score: number = 0;
  role!: 'Villager' | 'Kaiju';
  pawn: KaijuToken | undefined;
  hasActed: boolean = false;
  usedBonus: boolean = false;

  assureDeck () {
    if (!this.my('deck')!.has(Card)) {
      this.shuffleDiscards();
    }

    if (!this.my('deck')!.has(Card)) {
      this.game.message(`{{ this }} is out of cards!`);
    }
  }

  shuffleDiscards () {
    this.my('discard')!.all(Card).putInto(this.my('deck')!);
    this.my('deck')!.shuffle();
  }

  drawCard () {
    this.assureDeck();
    this.my('deck')!.first(Card)?.putInto(this.my('hand')!);
  }

  // Kaiju-specific methods

  size (): number {
    return SankaiGame.size(this.appetite()!)!;
  }

  appetite (): BlockType {
    for (const food of SankaiGame.goods) {
      if (this.my('appetiteTrack')!.all(Block, (b) => b.kind === food).length < 4) {
        return food;
      }
    }
    return 'fortress' as BlockType;
  }

  edibleBlocks(): Block[] {
    if (this.role === 'Villager' 
      || !this.pawn 
      || !(this.pawn.cell() instanceof Cell)
      // || !this.my('hand')!.has(Block)
    ) return [];

    const appetiteBlock = $.box.first(Block, {kind: this.appetite()})!;
    const cravingBlocks = this.my('hand')!.all(Block).filter((b) => !(b.size() > appetiteBlock.size()));
    cravingBlocks.push(appetiteBlock);

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

    const available = this.my('hand')!.first(Block);
    const climbable = this.pawn.neighbors().filter((b) => ((b instanceof Block) && (available!.match(b))));

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

  static goods: BlockType[] = ['lumber', 'wall', 'room', 'building', 'tower', 'fortress'];
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
    // this.first(VillageCard, 'Radio')!.putInto(this.theVillager.my('hand')!);      // STUB: for testing only
    this.first('box')!.all(VillageCard).putInto(this.theVillager.my('deck')!);
    this.theVillager.my('deck')!.shuffle();
    this.theVillager.my('deck')!.sortBy('cardName');                                 // STUB: for testing only

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
    this.first('box')!.firstN(num, SankaiDie).putInto(this.first('tray')!);
  }

  cleanUpDice () {
    this.first('tray')!.all(SankaiDie).putInto(this.first('box')!);
  }

  villageBlocks (kind: BlockType): Block[] {
    return this.first('village')!.all(Block, kind ? {kind} : {});
  }

  bukibuki () {
    return {
      card: this.villager()!.my('tableau')!.first(Card, 'Bukibuki'),
      pawn: this.first(Token, 'Bukibuki'),
    };
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
    return ([1,6].includes(this.row) || [1,6].includes(this.column));
  }

  isCorner () {
    return ([1,6].includes(this.row) && [1,6].includes(this.column));
  }

  hasStructure() {
    return this.has(Block, (b) => !!SankaiGame.size(b.kind));
  }

  height(): number {
    return this.first(Block)?.size() || 0;
  }

  walkableSteps(distance: number = 1): Cell[] {
    const departures: Cell[] = [this];
    const arrivals: Cell[] = [];
    for (let n=0; n<distance; n++) {
      const freshSteps = departures.flatMap((c) => 
        c.adjacencies(Cell).filter((a) => 
          a.height() <= c.height() 
          && !departures.includes(a)
        )).filter((v,i,a) => a.indexOf(v) === i);
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
  static faces = ['lumber', 'wall', 'room', 'building', 'card', 'wild'];
  face () {
    return SankaiDie.faces[-1 + this.current];
  }

  // better to make a static match on class Block and implement this and Block.match in terms of it?
  match (target: Block | BlockType): boolean {
    if (this.current === 5) return false;
    const proxy = $.box.first(Block, {kind: this.face() as BlockType})!;
    return proxy.match(target);
  }
}

type TokenType = 'Harapeko'|'Bukibuki'|'Decoy'|'Trap';

export class Token extends Piece {
  player: SankaiPlayer;
  kind: TokenType;

  cell (): Cell | undefined { return this.container(Cell) }

  neighbors (): Array<Token|Block> {
    return this.cell()?.adjacencies(Cell).flatMap((c) => [...c.all(Token), ...c.all(Block)]) || [];
  }
}

export class KaijuToken extends Token {
  readonly kind = 'Harapeko';
}

export class Block extends Piece {
  kind: BlockType;

  toString (): string {
    if (this.cell() instanceof Cell) {
      return `${ this.kind } at (${ this.cell()!.row }, ${this.cell()!.column} )`;
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

  // this is not right for wild-triggered floods
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

    return flood;
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

  getWrecked (splash: boolean = true): Block | undefined {
    if (!this.size()) {
      this.putInto($.box);
      return undefined;
    } else {
      const here = this.cell()!;
      const splashZone = $.village.all(Cell, (c) => (here.isAdjacentTo(c) || here.isDiagonalTo(c)) && !c.has(Piece));

      if (!splash) {
        const smallkind = SankaiGame.goods[this.size() - 1];
        const wreckage = $.box.first(Block, {kind: smallkind})!;
        wreckage.putInto(here);
        this.putInto($.box);
      } else if (splashZone.length <= 2) {
        const smallkind = SankaiGame.goods[this.size() - 1];
        const wreckage = $.box.first(Block, {kind: smallkind})!;
        wreckage.putInto(here);
        this.putInto($.box);
        splashZone.forEach((c) => $.box.first(Block, {kind: smallkind})?.putInto(c));

        // return {wreckage, splashZone: []};
      } else {
        this.game.followUp({
          name: 'wreckSplash', 
          player: this.game.kaiju(), 
          args: {target: this, splashCandidates: splashZone},
        });
        // return {target: this, splashZone};
      }
      return here.first(Block);
    }
  }
}

export class Card extends Piece {
  cardName: string;
  playWhen: string;
  actionName: string;
  actionArgs: Record<string, string> | undefined;
  description: string;
  addDice: number = 0;
  forceShuffle: boolean = false;
  pawn: Token | undefined;
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
    seat.create(Space, 'deck', {player}).onEnter(Card, c => c.hideFromAll());
    seat.create(Space, 'discard', {player}).onEnter(Card, c => {
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
        game.followUp({name: c.actionName, player: seat.player});
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
        $.box.first(Block, {kind: d.face() as BlockType})!.putInto(hand);
        d.putInto($.box);
      }
    });
  }

  for (const good of ['lumber', 'wall', 'room', 'building', 'tower', 'fortress', 'wild'] as BlockType[]) {
    $.box.createMany(20, Block, good, { kind: good });
  }

  $.box.createMany(7, SankaiDie, 'die');

  $.village.createGrid({
    rows: 6,
    columns: 6,
    style: 'square'
  }, Cell, 'cell');

  $.village.all(Cell).forEach((c) => c.onEnter(Block, (b) => {
    if (b.kind === 'fortress') {
      game.finish(game.villager());
    } else if (c.has(KaijuToken)) {
      c.first(KaijuToken)!.putInto(c); // keeps Harapeko on top of blocks
    }
  }));

  for (const card of villageCards) {
    $.box.create(VillageCard, card.cardName!, card);
  }

  for (const card of kaijuCards) {
    $.box.create(KaijuCard, card.cardName!, card);
  }

  for (const token of ['Bukibuki', 'Decoy', 'Trap'] as TokenType[]) {
    const it = $.box.create(Token, token, { kind: token });
    $.box.first(Card, token)!.pawn = it;
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
      // console.log(`${ player } doing init as villager (${ game.villager() }?)`);
      game.followUp({name: 'takeBlock', args: {blocktype: 'lumber'}});
      game.followUp({name: 'construction', args: {where: 'corner'}});
      game.followUp({name: 'takeBlock', args: {blocktype: 'wall'}});
      game.followUp({name: 'construction', args: {where: 'corner'}});
      game.followUp({name: 'takeBlock', args: {blocktype: 'room'}});
      game.followUp({name: 'construction', args: {where: 'corner'}});
    }),

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
    }).message(`Harapeko arrives in a distant corner of the village.`),

    takeBlock: player => action<{blocktype: BlockType}>({
      prompt: `Take a {{ blocktype }}`,
    }).do(({ blocktype }) => {
      $.box.first(Block, {kind: blocktype})!.putInto(player.my('hand')!);
    }).message(
      `{{player}} took a {{ blocktype }}.`
    ),

    discard: player => action<{discard: number}>({
      prompt: "Draw and discard",
    }).chooseOnBoard(
      'toDiscard',
      () => player.my('hand')!.all(Card),
      {number: ({discard}) => Math.min(discard, player.my('hand')!.all(Card).length)},
    ).do(({toDiscard}) => {
      toDiscard.forEach((c) => c.putInto(player.my('discard')!));
      // toDiscard.putInto(player.my('discard')!);
    }),

    endTurn: player => action({
      prompt: "End Turn",
    }).do(() => {
      // add optinal discard of tableau cards?
      player.my('hand')!.all(Block).putInto($.box);
      const radio = player.my('tableau')!.first(Card, 'Radio');
      if (radio && !radio.has(Block)) {
        $.box.first(Block, {kind: 'wild'})!.putInto(radio);
      }

      player.hasActed = false;
      player.usedBonus = false;
      Do.break();
    }),

    takeDie: player => action({
      prompt: 'Choose a die',
    }).chooseOnBoard(
      'die', $.tray.all(SankaiDie),
    ).do(({die}) => {
      // console.log(`taking a die: ${ die.current } so ${ die.face() }`);
      die.putInto(player.my('hand')!);
    }).message(
      `{{player}} selected {{ face }}.`, 
      ({die}) => ({face: die.face()}),
    ),


    // phase-queued card play actions. Maybe find a way to roll these into one.

    rollDiceCard: player => action({
      prompt: `play a card before taking a die?`,
      condition: player.my('hand')!.has(Card, {playWhen: 'rollDice'}),
    }).chooseOnBoard(
      'card',
      () => player.my('hand')!.all(Card, {playWhen: 'rollDice'}),
    ).do(({card}) => {
      game.followUp({name: card.actionName, args: {card}});
    }),

    takeDieCard: player => action({
      prompt: `Play a card before moving on?`,
      condition: player.my('hand')!.has(Card, {playWhen: 'takeDie'}),
    }).chooseOnBoard(
      'card', 
      () => player.my('hand')!.all(Card, {playWhen: 'takeDie'}),
    ).do(({card}) => {
      game.followUp({name: card.actionName, args: {card}});
    }),

    constructionCard: player => action({
      prompt: `Play a card for your turn?`,
      condition: player.my('hand')!.has(Card, {playWhen: 'construction'}),
    }).chooseOnBoard(
      'card', 
      () => player.my('hand')!.all(Card, {playWhen: 'construction'}).filter((c) => {
        if (c.cardName === 'Radio') {
          if (player.game.kaiju()!.my('hand')!.has(Block, 'wild')) {
            return true;
          } else { 
            return false;
          }
        } else {
          return true;
        }
      }),
    ).do(({card}) => {
      game.followUp({name: card.actionName, args: {card}});
    }),

    actionCard: player => action({
      prompt: `Play a card for your turn?`,
      condition: player.my('hand')!.has(Card, {playWhen: 'action'}),
    }).chooseOnBoard(
      'card',
      () => player.my('hand')!.all(Card, {playWhen: 'action'}),
    ).do(({card}) => {
      game.followUp({name: card.actionName, args: {card}});
    }),


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
      () => player.my('hand')!.all(Block),
    ).chooseOnBoard(
      'loc',
      ({where}) => {
        if (where === 'corner') {
          return $.village.all(Cell, (c) => c.isCorner() && !c.has(Piece));
        } else if (where === 'edge') {
          return $.village.all(Cell, (c) => c.isEdge() && !c.has(Piece));
        } else {
          return $.village.all(Cell, (c) => !c.has(Piece));
        }}
    ).do(({block, loc}: {block: Block, loc: Cell}) => {
      block.putInto(loc);
      game.followUp({name: 'completeProjectDispatch', args: {block}, player});  // STUB: shoouldn't need explicit player?
    }),

    completeProjectDispatch: player => action<{ block: Block }>({
      prompt: `Complete a project`,
      // condition: ({block}) => (block.floodMax().length >= 3 || block.floodWildMax().length >= 3),
    }).do(({block}) => {
      // console.log(`in completeProjectDispatch with ${ block }`);

      if (block.kind === 'wild' && block.floodWildMax().length >= 3) {
        console.log('dispatch to completeProjectWild');
        game.followUp({name: 'completeProjectWild', args: {block}});
      } else if (block.kind !== 'wild' && block.flood([]).length >= 3 && block.flood([]).length === block.floodMax().length) {
        console.log('dispatch to completeProjectSimple');
        game.followUp({name: 'completeProjectSimple', args: {block}});
      } else if (block.kind !== 'wild' && block.floodMax().length >= 3) {
        console.log('dispatch to completeProject');
        game.followUp({name: 'completeProject', args: {block}});
      } else {
        // console.log(`no projects to complete with {{block}}.`);
      }
    }),

    completeProject: player => action<{block: Block}>({
      prompt: `Complete a project`,
      condition: ({block}) => { return (block.kind !== 'wild' && block.floodMax().length >= 3) },
    }).chooseOnBoard(
      'consume', 
      ({block}) => block.floodMax().filter((b) => b.kind === 'wild'),
      {
        prompt: 'Which wild blocks do you wish to consume for this project?',
        min: 0,
        skipIf: 'always',
        validate: ({block, consume}) => {
          const flood = block.flood(consume);
          return flood.length >= 3 && consume.every((b) => flood.includes(b));
        },
    }).do(({block, consume}) => {
      const flood = block.flood(consume);
      const loc = block.cell()!;
      const next = SankaiGame.goods[block.size()! + 1];
      console.log(`${flood.length} including ${consume.length} wild, starting @ ${block.kind} ${'' + loc.row + ', ' + loc.column}: ${next} `, $.box.first(Block, {kind: next}));
      if (block && loc && next) {
        const structure = $.box.first(Block, {kind: next})!;
        structure.putInto(loc);
        flood.forEach((b) => b.putInto($.box));
        console.log(`made ${structure}`)
        game.followUp({name: 'completeProjectDispatch', args: {block: structure}});
      }
    }).message(
      `{{player}} turned some {{block}}s into a {{structure}}`,
      ({block}) => ({structure: SankaiGame.goods[block.size() + 1]}),
    ),

    completeProjectSimple: player => action<{block: Block}>({
      prompt: `Complete a project`,
      condition: ({block}) => { return (block.kind !== 'wild' && block.flood([]).length >= 3) },
    }).do(({block}) => {
      const flood = block.flood([]);
      const loc = block.cell()!;
      const next = SankaiGame.goods[block.size()! + 1];
      console.log(`${flood.length} simple, starting with ${ block }: ${next} `, $.box.first(Block, {kind: next}));
      if (block && loc && next) {
        const structure = $.box.first(Block, {kind: next})!;
        structure.putInto(loc);
        flood.forEach((b) => b.putInto($.box));
        console.log(`made ${structure}`)
        game.followUp({name: 'completeProjectDispatch', args: {block: structure}});
      }
    }).message(
      `{{player}} turned some {{block}}s into a {{structure}}`,
      ({block}) => ({structure: SankaiGame.goods[block.size() + 1]}),
    ),

    completeProjectWild: player => action<{block: Block}>({
      prompt: 'Complete a project, place this wild as: ',
      condition: ({block}) => block.floodWildMax().length >= 3,
    }).chooseFrom(
      'wildas',
      ({block}) => block.floodWildOpts().filter((t) => block.floodMax(t).length >= 3),
    ).chooseOnBoard(
      'consume',
      ({block, wildas}) => block.floodMax(wildas).filter((b) => b.kind === 'wild'),
      { min: 1,
        prompt: 'Which wild blocks do you wish to consume for this project?',
        validate: ({block, consume, wildas}) => {
          const flood = block.flood(consume, wildas);
          return consume.includes(block) && flood.length >= 3 && consume.every((b) => flood.includes(b));
        },
        initial: ({block}) => [block],
      },
    ).do(({block, consume, wildas}) => {
      const flood = block.flood(consume, wildas);
      const loc = block.cell()!;
      const next = SankaiGame.goods[SankaiGame.size(wildas)! + 1];
      console.log("wild flood: ", block, wildas, consume, flood);
      if (block && loc && next) {
        const structure = $.box.first(Block, {kind: next})!;
        structure.putInto(loc);
        flood.forEach((b) => b.putInto($.box));
        console.log(`wild made ${ structure }`);
        game.followUp({name: 'completeProjectDispatch', args: {block: structure}});
      }
    }),

    // Villager tableau-card-enabled actions

    warehouse: player => action({
      prompt: "Swap with warehouse",
      condition: player.my('tableau')!.has(Card, 'Warehouse') && player.my('Warehouse')!.has(Block),
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
      prompt: "Ready for your airdrop?",
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

    feedBukibuki: player => action({
      prompt: 'Feed the beast',
      condition: () => !!game.bukibuki().card && player.my('hand')!.has(Block, (hb) => 
         !game.bukibuki().card!.has(Block, (bb) => bb.kind === hb.kind )),
    }).chooseOnBoard(
      'food', 
      () => player.my('hand')!.all(Block, (hb) => !game.bukibuki().card!.has(Block, (bb) => bb.kind === hb.kind )),      
    ).do(({food}) => {
      food.putInto(game.bukibuki().card!);
    }).message(`Bukibuki eats a {{ food.kind }} and feels stronger.`),

    moveBukibuki: player => action({
      prompt: "Chase Harapeko",
      condition: game.bukibukiWalkable().length > 0,
    }).chooseOnBoard(
      'dest',
      () => game.bukibukiWalkable(),
    ).do(({dest}) => {
      game.bukibuki().pawn!.putInto(dest);
    }).message(`Bukibuki moves toward Harapeko`),


    // Kaiju turns, basic actions

    eat: player => action({
      prompt: "Eat",
      condition: !player.hasActed && player.edibleBlocks().length > 0 
                && !(game.bukibuki().pawn!.cell()?.reaches(player.pawn!)),
    }).chooseOnBoard(
      'food',
      () => player.edibleBlocks(),
      {skipIf: 'never'},
    ).do(({food}) => {
      const appetiteBlock = $.box.first(Block, {kind: player.appetite()})!;
      if (food.match(appetiteBlock)) {
        if (SankaiGame.goods.includes(food.kind)) {
          console.log(`found ${ food } to eat`);
          // food.putInto($.appetiteTrack);
        } else if (food.kind === 'wild' as BlockType) {
          console.log(`eating wild as ${ appetiteBlock }`);
        }
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

    eatCard: player => action({
      prompt: "play eat card?",
      condition: player.my('hand')!.has(Card, {playWhen: 'eat'}),
    }).chooseOnBoard(
      'card',
      () => player.my('hand')!.all(Card, {playWhen: 'eat'}),
      { skipIf: 'never'},
    ).do(({card}) => {
      player.hasActed = false;
      game.followUp({player, name: card.actionName});
      player.my('hand')!.first(Card, card)?.putInto(player.my('discard')!);
    }),

    move: player => action({
      prompt: 'Move',
      condition: !player.hasActed
                && !!(player.pawn && player.pawn.cell()?.row)
                && !(player.pawn!.cell()!.has(Token, 'Trap')),
    }).chooseOnBoard(
      'loc',
      () => {
        const here = player.pawn!.cell()!;
        const walkables = here.walkableSteps(2);
        // const onestep: Cell[] = here.walkableSteps().filter((c) => c !== here);
        // const twostep: Cell[] = onestep.flatMap((c) => c.walkableSteps()).filter((c) => c !== here);
        if (player.pawn!.cell()!.reaches(game.bukibuki().pawn!)) {
          // return [...onestep, ...twostep].filter((c) => c.reaches(game.bukibuki().pawn!));
          return walkables.filter((c) => c.reaches(game.bukibuki().pawn!));
        } else {
          // return [...onestep, ...twostep];
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
      prompt: 'Climb',
      condition: !player.hasActed && player.climbableBlocks().length > 0,
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

    wreck: player => action({
      prompt: 'Wreck',
      condition: !player.hasActed && player.wreckableBlocks().length > 0,
    }).chooseOnBoard(
      'target', 
      () => player.wreckableBlocks(),
      {skipIf: 'never'},
    ).do(({target}) => {
      const wreckage = target.getWrecked();
      player.hasActed = true;
    }).message(`Harapeko wrecked a {{target}}.`),

    wreckSplash: player => action<{target: Block, splashCandidates: Cell[]}>({
      prompt: 'Wreck',
    }).chooseOnBoard(
      'splash', 
      ({splashCandidates}) => splashCandidates,
      {number: 2},
    ).do(({target, splash}) => {
      const here = target.cell()!;

      const smaller = SankaiGame.goods[target.size() - 1];
      target.putInto($.box);
      $.box.first(Block, {kind: smaller})?.putInto(here);

      splash.forEach((c) => {
        $.box.first(Block, {kind: smaller})?.putInto(c);
      });
    }).message(`It was messy!`),

    wreckCard: player => action({
      prompt: "play wreck card?",
      condition: player.my('hand')!.has(Card, {playWhen: 'wreck'}),
    }).chooseOnBoard(
      'card',
      () => player.my('hand')!.all(Card, {playWhen: 'wreck'}),
      { skipIf: 'never'},
    ).do(({card}) => {
      console.log(`{{player}} playing {{ card }}`);
      player.hasActed = false;
      game.followUp({player, name: card.actionName});
      player.my('hand')!.first(Card, card)?.putInto(player.my('discard')!);
    }),

    rampageWreck: player => action({
      prompt: 'Harapeko smash!',
      condition: player.my('tableau')!.has('Rampage')
                  && player.wreckableBlocks(true).length > 0,
    }).chooseOnBoard(
      'target',
      player.wreckableBlocks(true),
      {skipIf: 'never'},
    ).do(({target}) => {
      target.getWrecked();
    }),

    bukibukiWreck: player => action({
      prompt: "Clumsy Bukibuki...",
      // condition: () => game.bukibuki().pawn.cell() && $.village.has(Block)
    }).chooseOnBoard(
      'target',
      () => $.village.all(Block, (b) => 
          game.bukibuki().pawn!.cell()!.reaches(b) 
          && game.bukibuki().card!.has(SankaiDie, (d) => d.match(b)),
        ),
    ).do(({target}) => {
      const wreckage = target.getWrecked();
    }),

    attackBukibuki: player => action({
      prompt: "We're not so different, you and I...",
      condition: () => !player.hasActed && !!game.bukibuki().card && player.pawn!.cell()!.reaches(game.bukibuki().pawn!) &&
                  game.bukibuki().card!.has(Block, (bb) => player.my('hand')!.has(Block, (hb) => hb.match(bb))),
    }).chooseOnBoard(
      'target', 
      () => game.bukibuki().card!.all(Block, (bb) => player.my('hand')!.has(Block, (hb) => hb.match(bb))),
    ).do(({target}) => {
      target.putInto($.box);
      const bukicard = game.bukibuki().card!;
      if (!bukicard.has(Block)) {
        bukicard.putInto(game.villager()!.my('discard')!);
        game.bukibuki().pawn!.putInto($.box);
      }
      player.hasActed = true;
    }),

    swapLaser: player => action({
      prompt: "Is this the future Harapeko saw?",
      condition: () => player.my('tableau')!.has(Card, 'Laser Vision') 
                       && player.my('Laser Vision')!.has(SankaiDie)
                       && $.tray.has(SankaiDie),
    }).chooseOnBoard(
      'fromLaser',
      () => player.my('Laser Vision')!.all(SankaiDie),
      {skipIf: 'never'},
    ).chooseOnBoard(
      'toLaser',
      () => $.tray.all(SankaiDie),
      {skipIf: 'never'},
    ).do(({ toLaser, fromLaser }) => {
      toLaser.putInto(player.my('Laser Vision')!);
      const hold = fromLaser.current;
      fromLaser.putInto($.tray);
      fromLaser.current = hold;
    }).message(
      `{{player}} swaps a {{ fromLaser }} for a {{ toLaser }}`,
    ),

    lightningStep: player => action({
      prompt: "an extra spring in your step",
      condition: !player.usedBonus
                && !!(player.pawn && $.village.has(KaijuToken))
                && !(player.pawn!.cell()!.has(Token, 'Trap')),
    }).chooseOnBoard(
      'loc',
      () => {
        const here = player.pawn!.cell()!;
        const walkables = here.walkableSteps(1);
        if (player.pawn!.cell()!.reaches(game.bukibuki().pawn!)) {
          return walkables.filter((c) => c.reaches(game.bukibuki().pawn!));
        } else {
          return walkables;
        }
      },
    ).do(({loc}) => {
      player.pawn!.putInto(loc);
      player.usedBonus = true;
    }).message(
      `{{ player }} moves Harapeko to {{ locString }}`,
      ({loc}) => ({locString: `${loc.row}, ${loc.column}`})
    ),

    done: player => action({
      prompt: "Done",
    }).chooseFrom('done', ['Done'], {
      // skipIf: 'never'
    }).do(() => {
      Do.break();
    }),

    // end of turn commonalities.

    endTurnCard: player => action({
      prompt: "Do you want to play a card?",
      condition: player.my('hand')!.has(Card,{playWhen: 'endTurn'}),
    }).chooseOnBoard(
      'card',
      () => player.my('hand')!.all(Card,{playWhen: 'endTurn'}),
    ).do(({card}) => {
      if (card.actionArgs) {
        game.followUp({name: card.actionName, args: card.actionArgs});
        // game.followUp({name: card.actionName, args: {...card.actionArgs}});
      } else {
        game.followUp({name: card.actionName});
      }
    }),

    // THE CARDS THEMSELVES CONTEND IN VAIN

    initWarehouse: player => action<{card: Card}>({
      prompt: "Open a warehouse. It starts with a wall in it.",
      condition: player.my('hand')!.has(Card, 'Warehouse'),
    }).chooseFrom(
      'keep',
      () => {
        // Does the warehouse even need this nerf? maybe try it simple.
        let opts;
        const active = player.my('hand')!.first(Block);
        if (active && active.kind !== 'wall') {
          opts = [{choice: 'wall', label: "Keep the wall", }, {choice: active.kind, label: `Keep your ${ active.kind }`}];
        } else {
          opts = [{choice: 'wall', label: "Keep the wall", }]
        }
        return opts;
      },
    ).do(({keep, card}) => {
      card.putInto(player.my('tableau')!);
      const stock = $.box.first(Block, {kind: keep as BlockType})!;
      stock.putInto(card);
      player.my('hand')!.first(Block)?.putInto($.box);
    }).message(
      `{{ player }} opened a Warehouse`,
    ),

    initRadio: player => action<{card: Card}>({
      prompt: "Use your radio to call for an airdrop",
      condition: player.my('hand')!.has(Card, 'Radio') && player.game.kaiju()!.my('hand')!.has(Block, 'wild'),
    }).do(({card}) => {
      // STUB: figure out how to make this not available the turn you play it
      card.putInto(player.my('tableau')!);
      // $.box.first(Block, 'wild')!.putInto(card);
    }),

    militaryInvolvement: player => action<{strength?: number}>({
      prompt: "We're from the government, and we're here to help.",
    }).do(({strength}) => {
      console.log (`Kaiju currently ${ game.kaiju().size() } (${ game.kaiju().appetite() }), received strength: ${ strength }`);
      strength ??= game.kaiju().size();
      game.message(`The military has shown up to help. They attack Harapeko ${ strength } times.`);

      while ($.tray.all(SankaiDie).length < strength) {
        const die = $.box.first(SankaiDie)!;
        die.putInto($.tray);
        game.addDelay();
        console.log(`die #${ $.tray.all(SankaiDie).length } ${ die.current } (${ die.face() })`)
        if (die.current === 6) {
          console.log("draw & queue discard");
          game.kaiju().drawCard();
          game.kaiju().drawCard();
          game.followUp({name: 'discard', player: game.kaiju(), args: {discard: 1}});
          game.followUp({name: 'militaryInvolvement', args: {strength}});
          break;
        } else if (die.current === 5) {
          console.log("both draw");
          game.players.forEach((p) => p.drawCard());
        } else {
          console.log("shots fired");
          if (die.current > game.kaiju().size()) {
            console.log("hit kaiju...");
            $.appetiteTrack.last(Block)?.putInto($.box);
            console.log (`Kaiju now ${ game.kaiju().size() } (${ game.kaiju().appetite() })`);
          }

          if (die.face() !== game.kaiju().appetite()) {
            console.log("collateral damage?");
            if ($.village.has(Block, (b) => 
                  b.kind === die.face() 
                  && game.kaiju()!.pawn!.cell()!.reaches(b))) {
              console.log("catching strays");
              game.followUp({name: 'militaryWreck', player, args: {kind: die.face()}});
              game.followUp({name: 'militaryInvolvement', args: {strength}});
              break;
            }
          }
        }
      }

      game.addDelay();
      if ($.tray.all(SankaiDie).length >= strength) {
        console.log('Our work here is done.');
        $.tray.all(SankaiDie).putInto($.box);
        player.my('hand')!.first(Card, 'Military Involvement')?.putInto(player.my('discard')!);
      } else {
        console.log(`taking a break with ${ $.tray.all(SankaiDie).length } in tray.`);
      }
    }),

    militaryWreck: player => action<{kind: BlockType}>({
      prompt: "Unfortunately, some things went wrong",
      condition: ({kind}) => $.village.has(Block, (b) => b.kind === kind && game.kaiju()!.pawn!.cell()!.reaches(b)),
    }).chooseOnBoard(
      'target',
      ({kind}) => $.village.all(Block, (b) => b.kind === kind && game.kaiju()!.pawn!.cell()!.reaches(b)),
    ).do(({kind, target}) => {
      const wreckage = target.getWrecked();
    }),

    initBukibuki: player => action({
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
    ).do(({loc}) => {
      $.box.all(Token, 'Bukibuki').putInto(loc);
      const bukicard = player.my('hand')!.first(Card, 'Bukibuki')!;
      bukicard.putInto(player.my('tableau')!);
      $.box.first(Block, 'lumber')!.putInto(bukicard);
      $.box.first(Block, 'wall')!.putInto(bukicard);
      $.box.first(Block, 'room')!.putInto(bukicard);
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
      const block = $.box.first(Block, { kind: card.actionArgs!.kind as BlockType })!;

      if (choice === 'extra') {
        // console.log(`supplies: executing extra`)
        player.game.kaiju()!.drawCard();
      } else {
        // console.log(`supplies: executing replace with "${ choice }"`)
        player.my('hand')!.first(Block)?.putInto($.box);
      }

      block.putInto(player.my('hand')!);
      card.putInto(player.my('discard')!);
    }),


    urge: player => action<{card: Card}>({
      prompt: `Choose a die to fix.`,
      // condition: $.tray.has(SankaiDie, (d) => d.face() !== card.actionArgs!.kind),
    }).chooseOnBoard(
      'target',
      ({card}) => $.tray.all(SankaiDie, (d) => d.face() !== card.actionArgs!.kind),
    ).do(({target, card}) => {
      const kind = card.actionArgs!.kind as BlockType;
      target.current = SankaiGame.size(kind)! + 1;
      card.putInto(player.my('discard')!);
    }),

    entwinedFates: player => action<{card: Card}>({
      prompt: `Choose a die to copy.`,
    }).chooseOnBoard(
      'target',
      () => $.tray.all(SankaiDie),
    ).do(({target, card}) => {
      $.tray.all(SankaiDie).forEach((d) => d.current = target.current);
      card.putInto(player.my('discard')!);
    }),

    earthquake: player => action({
      prompt: "It's an earthshaker!",
      condition: () => $.village.has(Block, (b) => b.size() > 0),
    }).chooseOnBoard(
      'target',
      () => $.village.all(Block, (b) => b.size() > 0),
    ).do(({target}) => {
      const loc = target.cell()!;
      const wreckage = target.getWrecked();
      game.followUp({name: 'earthquakeII', args: {loc}});
    }),

    earthquakeII: player => action<{loc: Cell}>({
      prompt: "Still shaking",
    }).chooseFrom(
      'fault',
      () => [
        'row', 'column'
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
    ).do( ({loc, fault, direction}) => {
      const faultZone = $.village.all(Cell, 'nonesuch');
      console.log('got ', faultZone);

      if (fault === 'row') {
        // console.log('adding row');
        faultZone.push(... $.village.all(Cell, {row: loc.row!}));
      } else if (fault === 'column') {
        // console.log('adding column');
        faultZone.push(... $.village.all(Cell, {column: loc.column!}));
      } else {
        console.log("panic, bad faultline: ${ fault }")
      }

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

        theRow    = Math.max(1, Math.min(6, theRow));
        theColumn = Math.max(1, Math.min(6, theColumn));

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

      player.my('hand')!.first(Card, 'Earthquake')?.putInto(player.my('discard')!);
    }),

    initLaser: player => action({
      prompt: 'Incandescent with rage',
      condition: player.my('hand')!.has(Card, 'Laser Vision'),
    }).do(({}) => {
      player.my(Card, 'Laser Vision')!.putInto(player.my('tableau')!);
      $.box.last(SankaiDie)!.putInto($.tray);
      $.tray.last(SankaiDie)!.putInto(player.my('Laser Vision')!);
    }),

    initSpeed: player => action({
      prompt: 'get your hustle on',
      condition: player.my('hand')!.has(Card, 'Lightning Speed'),
    }).do(({}) => {
      player.my(Card, 'Lightning Speed')!.putInto(player.my('tableau')!);
    }),

    initRampage: player => action({
      prompt: 'destroy everything',
      condition: player.my('hand')!.has(Card, 'Rampage'),
    }).do(({}) => {
      player.my(Card, 'Rampage')!.putInto(player.my('tableau')!);
    }),

    jumpStomp: player => action({
      prompt: "into the ground!",
    }).chooseOnBoard(
      'target',
      () => [...player.pawn!.cell()!.all(Block), ...player.climbableBlocks()],
      {skipIf: 'never'},
    ).do(({target}) => {
      player.pawn!.putInto(target.cell()!);
      target.getWrecked();
      player.hasActed = true;
    }),

    storm: player => action({
      prompt: "The Storm is coming",
      condition: player.my('hand')!.has(Card, {cardName: 'Storm'}),
    }).do(() => {
      game.players.sortBy('role', 'asc');
      player.my('hand')!.first(Card, {cardName: 'Storm'})!.putInto(player.my('discard')!);
    }),

    tunnel: player => action({
      prompt: "Nothing can stop me now",
    }).chooseOnBoard(
      'dest', 
      () => $.village.all(Cell, (c) => ! c.has(Piece)),
      { skipIf: 'never' },
    ).do(({dest}) => {
      player.pawn!.putInto(dest);
      player.my('hand')!.first(Card, 'Tunnel')?.putInto(player.my('discard')!);
    }),

  });

  /**
   * Define the game flow, starting with board setup and progressing through all
   * phases and turns.
   */

  const bukiBehavior = ifElse({
    if: () => !!game.bukibuki().card,
    do: [
      () => console.log("got buki card"),

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
        else: () => console.log(`can't walk: ${ game.bukibukiWalkable() }`),
      }),

      ifElse({
        if: () => $.village.all(Block, (b) =>
                    !! game.bukibuki().pawn!.cell()?.reaches(b) 
                    && game.bukibuki().card!.has(SankaiDie, (d) => d.match(b)),
                  ).length > 0,
        do: playerActions({ player: () => game.kaiju(), actions:['bukibukiWreck']}),
        else: () => console.log(`can't wreck`),
      }),

      ifElse({
        if: () => !! game.bukibuki().pawn!.cell()?.reaches(game.kaiju()!.pawn!)
                  && game.bukibuki().card!.has(SankaiDie, (d) => d.match(game.kaiju().appetite())),
        do: () => $.appetiteTrack.last(Block)?.putInto($.box),
      }),

      () => game.bukibuki().card!.all(SankaiDie).putInto($.box),
    ],
    else: () => console.log(`no bukibuki card: ${ game.bukibuki().card }`, game.bukibuki().card),
  });

  game.defineFlow(
    () => game.assignRoles(),      // in the future, ?make an interface where people can pick?

    playerActions({ player: () => game.villager(), actions: ['initVillage'], }),

    // maybe not needed? Kaiju just goes in the remaining corner, currently.
    playerActions({ player: () => game.kaiju(), actions: ['initKaiju'], }),

    loop(
      () => game.players.sortBy('role', 'asc'),

      // Dice
      () => game.rollDice(),
      eachPlayer({name: 'player', do: playerActions({actions: ['rollDiceCard', 'swapLaser'], optional: 'pass'})}),
      eachPlayer({name: 'player', do: playerActions({actions: ['takeDie']})}),
      () => game.players.sortBy('role', 'desc'),
      eachPlayer({name: 'player', do: playerActions({actions: ['takeDieCard'], optional: 'pass'})}),
      bukiBehavior,
      () => game.cleanUpDice(),

      // Actions

      eachPlayer({
        name: 'player',
        do: [
          () => console.log("from list: ", game.players),
          () => console.log("currently: ", game.players.current()),
          ifElse ({
            if: () => game.players.current() === game.villager(),

            // Villager Turns
            do: [
              () => console.log(`${ game.players.current() } should be ${ game.villager() }`),

              ifElse({
                if: () => ! game.villager().my('hand')!.has(Block),
                do: [
                  playerActions({
                    player: () => game.villager(),
                    actions: ['warehouse', 'restockWarehouse', 'radio', 'constructionCard'],
                    optional: 'Pass',
                  }),
                ],
              }),

              whileLoop({
                while: () => game.villager()!.my('hand')!.has(Block),
                do: playerActions({
                  player: () => game.villager(),
                  actions: ['construction', 'warehouse', 'restockWarehouse', 'radio', 'constructionCard', 'feedBukibuki'],
                }),
              }),
            ],
            else: [
              // Kaiju Turns
              ifElse({ if: () => game.kaiju().my('tableau')!.has(Card, 'Rampage'),
                do: [ () => console.log(`{{player}} option to wreck with Rampage`),
                  playerActions({
                    player: () => game.kaiju(),
                    actions: ['rampageWreck'],
                    optional: 'Pass',
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
                                          actions: ['eatCard'],
                                          optional: 'Pass',
                                        })}),
                    },
                    'move',
                    'climb',
                    { name: 'wreck',
                      do: [ () => console.log('getting here?'),
                            ifElse ({ if: () => game.kaiju().my('hand')!.has(Card, {playWhen: 'wreck'}),
                                    do: [ () => console.log(`{{player}} option to play wreck card`),
                                      playerActions({
                                        player: () => game.kaiju(),
                                        actions: ['wreckCard'],
                                        optional: 'Pass',
                                      })],
                                    else: () => console.log("no wreckerd in ", game.kaiju().my('hand')),
                                  }),
                            ],
                    },
                    'actionCard',
                    'attackBukibuki',
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
      // End Turn
      eachPlayer({
        name: 'player',
        do: loop(
          playerActions({
            actions: ['endTurn', 'endTurnCard'],
          }),
        ),
      }),
    ),
  );
});
