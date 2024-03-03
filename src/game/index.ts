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

  // Kaiju-secific methods

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
    console.log(`hungry for #${ appetiteBlock.size() } ${ appetiteBlock } (or #${ cravingBlocks[0].size() } ${ cravingBlocks[0] }); found ${ edibles.length } edibles from ${ this.pawn.cell() }`);
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

    const available = this.my('hand')!.first(Block)!;
    const wreckable = this.pawn!.cell()!.all(Block, (b) => available.match(b));

    if (reach) {
      const reachable = this.pawn!.neighbors().filter((b) => (b instanceof Block) && available.match(b)) as Block[];
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
    this.first('box')!.firstN(num, SankaiDie).putInto(this.first('tray')!);
  }

  cleanUpDice () {
    this.first('tray')!.all(SankaiDie).putInto(this.first('box')!);
  }

  villageBlocks (kind: BlockType): Block[] {
    return this.first('village')!.all(Block, kind ? {kind} : {});
  }
}

const { Space, Piece, Die } = createGameClasses<SankaiPlayer, SankaiGame>();

export { Space };

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

  walkableSteps(): Cell[] {
    return this.adjacencies(Cell).filter((c) => c.height() <= this.height());
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

  match (target: Block): boolean {
    return (this.kind === target.kind || this.kind === 'wild'); // no, i don't think so: || target.kind === 'wild');
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

    // const flood: Block[] = [];
    // let adds: Block[] = [this];

    // while (adds.length) {
    //   flood.push(...adds);
    //   adds = flood.flatMap((b) => b.availableNeighborBlocks()).filter(
    //     (b) => (b.kind === this.kind && !flood.includes(b))
    //   );
    // }

    const flood = this.floodMax('wild');

    const types = flood.flatMap((b) => this.availableNeighborBlocks()).filter(
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
      console.log(`${ maxes.length } options, ${ maxes.at(0)!.length } down to ${ maxes.at(-1)!.length }`);
      return maxes.at(0)!;
    } else {
      return [];
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
  const { playerActions, loop, whileLoop, eachPlayer } = game.flowCommands;

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
      game.finish(game.villager());
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
    hand.onEnter(Block, b => console.log(`${hand.player} got a block of: ${ b.kind }`));
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
    initVillage: player => action({
      prompt: 'Found your village by placing one lumber, one wall, and one room.',
    }).chooseFrom('ok', ['OK'], {skipIf: 'never'},
    ).do(() => {
      // console.log(`${ player } doing init as villager (${ game.villager() }?)`);
      $.box.first(Block, {kind: 'lumber'})!.putInto(player.my('hand')!);
      game.followUp({name: 'construction', args: {where: 'corner'}});
      $.box.first(Block, {kind: 'wall'})!.putInto(player.my('hand')!);
      game.followUp({name: 'construction', args: {where: 'corner'}});
      $.box.first(Block, {kind: 'room'})!.putInto(player.my('hand')!);
      game.followUp({name: 'construction', args: {where: 'corner'}});
    }),

    initVillageWall: player => action({
      prompt: '... now the wall ...',
    }).do(() => {
      $.box.first(Block, {kind: 'wall'})!.putInto(player.my('hand')!);
      game.followUp({name: 'construction', args: {where: 'corner'}});
    }),

    initVillageRoom: player => action({
      prompt: '... and the room.',
    }).do(() => {
      $.box.first(Block, {kind: 'room'})!.putInto(player.my('hand')!);
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
      // $.kaijumat.putInto(player.my('seat'));
      $.kaijumat.first(Space, 'appetiteTrack')!.player = player;
    }).message(`Harapeko arrives in a distant corner of the village.`),

    takeBlock: player => action<{blocktype: BlockType}>({
      prompt: `Take a {{ blocktype }}`,
    }).do(({ blocktype }) => {
      $.box.first(Block, {kind: blocktype})!.putInto(player.my('hand')!);
    }).message(
      `{{player}} took a {{ blocktype }}.`
    ),

    rollDiceCard: player => action({
      prompt: `play a card before rolling the dice?`,
      condition: player.my('hand')!.has(Card, {playWhen: 'rollDice'}),
    }).chooseOnBoard(
      'card',
      () => player.my('hand')!.all(Card, {playWhen: 'rollDice'}),
    ).do(({card}) => {
      game.followUp({name: card.actionName, args: {card}});
    }),

    takeDieCard: player => action({
      prompt: `Play a card before taking a die?`,
      condition: player.my('hand')!.has(Card, {playWhen: 'takeDie'}),
    }).chooseOnBoard(
      'card', 
      () => player.my('hand')!.all(Card, {playWhen: 'takeDie'}),
    ).do(({card}) => {
      game.followUp({name: card.actionName, args: {card}});
    }),

    actionCard: player => action({
      prompt: `Play a card for your turn?`,
      condition: player.my('hand')!.has(Card, {playWhen: 'construction'}),
    }).chooseOnBoard(
      'card', 
      () => player.my('hand')!.all(Card, {playWhen: 'construction'}),
    ).do(({card}) => {
      game.followUp({name: card.actionName, args: {card}});
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

    passConstruction: player => action({
      prompt: "Pass",
      condition: !player.my('hand')!.has(Block),
    }).chooseFrom('pass', ['Pass'], {
      // skipIf: 'never'
    }).do(() => {
      Do.break();
    }),

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

      console.log(`in completeProjectDispatch with ${ block }`);

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

        // if (structure.floodMax().length >= 3) {
        //   console.log("should but won't be following up...");
        //   // game.followUp({name:'completeProject', args: {block: structure}});
        // }
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
        // if (structure.floodMax().length >= 3) {
        //   console.log("should but won't be following up...");
        //   // game.followUp({name:'completeProject', args: {block: structure}});
        // }
      }
    }).message(
      `{{player}} turned some {{block}}s into a {{structure}}`,
      ({block}) => ({structure: SankaiGame.goods[block.size() + 1]}),
    ),

    completeProjectWild: player => action<{block: Block}>({
      prompt: 'Complete a project',
      condition: ({block}) => block.floodWildMax().length >= 3,
    }).chooseFrom(
      'wildas',
      ({block}) => block.floodWildOpts(),
    ).chooseOnBoard(
      'consume',
      ({block, wildas}) => block.floodMax(wildas).filter((b) => b.kind === 'wild'),
      { min: 1,
        prompt: 'Which wild blocks do you wish to consume for this project?',
        validate: ({consume, block}) => consume.includes(block),
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

    // Kaiju turns

    eat: player => action({
      prompt: "Eat",
      condition: player.edibleBlocks().length > 0,
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


    }),

    move: player => action({
      prompt: 'Move',
      condition: !!(player.pawn && player.pawn.cell()?.row),
    }).chooseOnBoard(
      'loc',
      () => {
        const here = player.pawn!.cell()!;
        const onestep: Cell[] = here.walkableSteps();
        const twostep: Cell[] = onestep.flatMap((c) => c.walkableSteps());
        return [...onestep, ...twostep];
      }
    ).do(({loc}) => {
      player.pawn!.putInto(loc);
    }).message(
      `{{ player }} moves to {{ locString }}`,
      ({loc}) => ({locString: `${loc.row}, ${loc.column}`})
    ),

    climb: player => action({
      prompt: 'Climb',
      condition: player.climbableBlocks().length > 0,
    }).chooseOnBoard(
      'target',
      () => player.climbableBlocks(),
      {skipIf: 'never'},
    ).do(({target}) => {
      player.pawn!.putInto(target.cell()!);
    }).message(
      `Harapeko climbs the {{target}}`,
    ),

    wreck: player => action({
      prompt: 'Wreck',
      condition: player.wreckableBlocks().length > 0,
    }).chooseOnBoard(
      'target', 
      () => player.wreckableBlocks(),
      {skipIf: 'never'},
    ).do(({target}) => {
      const here = target.cell()!;
      const splash = $.village.all(Cell, (c) => (here.isAdjacentTo(c) || here.isDiagonalTo(c)) && !c.has(Piece))

      if (target.size() && splash.length > 2) {
        game.followUp({name: 'wreckSplash', args: {target, splashCandidates: splash}});
      } else if (target.size()) {
        const smaller = SankaiGame.goods[target.size() - 1];
        target.putInto($.box);
        $.box.first(Block, {kind: smaller})?.putInto(here);
        splash.forEach((c) => {
          $.box.first(Block, {kind: smaller})?.putInto(c);
        });
      } else {
        target.putInto($.box);
      }
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

    // pass: player => action({
    //   prompt: "Pass",
    // }).chooseFrom('pass', ['Pass'], {
    //   skipIf: 'never'
    // }).do(() => {
    // }),

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

    endTurn: player => action({
      prompt: "End Turn",
    }).do(() => {
      player.my('hand')!.all(Block).putInto($.box);
      Do.break();
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

    // STUB: allow filling empty warehouse? or discard warehouse if it's empty? ... yuck 9:
    warehouse: player => action({
      prompt: "Swap with warehouse",
      condition: player.my('tableau')!.has(Card, 'Warehouse') && player.my('tableau')!.first(Card, 'Warehouse')!.has(Block),
    }).chooseOnBoard(
      'swap',
      () => player.my('tableau')!.first(Card, 'Warehouse')!.all(Block),
      {skipIf: 'never'},
    ).do(({swap}) => {
      const wh = player.my('tableau')!.first(Card, 'Warehouse')!;
      player.my('hand')!.first(Block)?.putInto(wh);
      swap.putInto(player.my('hand')!);
    }).message(`{{player}} swaps for a {{swap}}`),

    restockWarehouse: player => action({
      prompt: "Restock your warehouse",
      condition: player.my('tableau')!.has(Card, 'Warehouse') && !player.my('tableau')!.first(Card, 'Warehouse')!.has(Block),
    }).chooseOnBoard(
      'fill',
      () => player.my('tableau')!.all(Card, 'Warehouse'),
      {skipIf: 'never'},
    ).do(({fill}) => {
      player.my('hand')!.first(Block)?.putInto(fill);
    }).message(`{{player}} refills their warehouse`),

    initRadio: player => action<{card: Card}>({
      prompt: "Use your radio to call for an airdrop",
      condition: player.my('hand')!.has(Card, 'Radio') && player.game.kaiju()!.my('hand')!.has(Block, 'wild'),
    }).do(({card}) => {
      // STUB: figure out how to make this not available the turn you play it
      card.putInto(player.my('tableau')!);
      $.box.first(Block, 'wild')!.putInto(card);
    }),

    radio: player => action({
      prompt: "Ready for your airdrop?",
      condition: player.my('tableau')!.has(Card, 'Radio')
                  && player.my('tableau')!.first(Card, 'Radio')!.has(Block, 'wild') 
                  && player.game.kaiju()!.my('hand')!.has(Block, 'wild'),
    }).chooseOnBoard(
      'claim',
      () => player.my('tableau')!.first(Card, 'Radio')!.all(Block, 'wild')!,
      {skipIf: 'never'},
    ).do(({claim}) => {
      player.my('hand')!.all(Block).putInto($.box);
      const radio = player.my('tableau')!.first(Card, 'Radio')!;
      radio.all(Block).putInto(player.my('hand')!);
      radio.putInto(player.my('discard')!);
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
        console.log(`supplies: executing extra`)
        player.game.kaiju()!.drawCard();
      } else {
        console.log(`supplies: executing replace with "${ choice }"`)
        player.my('hand')!.first(Block)?.putInto($.box);
      }

      block.putInto(player.my('hand')!);
      card.putInto(player.my('discard')!);
    }),

  });

  /**
   * Define the game flow, starting with board setup and progressing through all
   * phases and turns.
   */
  game.defineFlow(
    () => game.assignRoles(),      // in the future, ?make an interface where people can pick?

    playerActions({ player: () => game.villager(), actions: ['initVillage'], }),
    // playerActions({ player: () => game.villager(), actions: ['initVillageWall'], }),
    // playerActions({ player: () => game.villager(), actions: ['initVillageRoom'], }),

    // maybe not needed? Kaiju just goes in the remaining corner, "currently".
    playerActions({ player: () => game.kaiju(), actions: ['initKaiju'], }),


    () => game.players.sortBy('role', 'asc'),

    loop(
      // Dice
      () => game.rollDice(),
      eachPlayer({name: 'player', do: playerActions({actions: ['rollDiceCard'], optional: 'pass'})}),
      eachPlayer({name: 'player', do: playerActions({actions: ['takeDie']})}),
      eachPlayer({name: 'player', do: playerActions({actions: ['takeDieCard'], optional: 'pass'})}),
      () => game.cleanUpDice(),

      // Villager
      loop(playerActions({
        player: () => game.villager(),
        actions: ['construction', 'warehouse', 'restockWarehouse', 'radio', 'actionCard', 'passConstruction'],
      })),

      // Kaiju
      playerActions({
        player: () => game.kaiju(),
        actions: ['eat', 'move', 'climb', 'wreck'], // 'playCard', 'wreck'],
        optional: 'Pass',
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
