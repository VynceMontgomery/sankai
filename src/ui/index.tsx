import React from 'react';
import { render, numberSetting } from '@boardzilla/core';
import { default as setup, Space, Cell, Token, KaijuToken, Card, VillageCard, KaijuCard, Block, SankaiDie, Piece} from '../game/index.js';

import './style.scss';
import '@boardzilla/core/index.css';

render(setup, {
  settings: {

  },
  layout: game => {
    game.appearance({
      render: () => null
    });

    game.layoutControls({
      element: game,
      top: 0,
      left: 0,
      width: 30,
    });

    // General Rules
    game.layout(Space, {
      gap: 1,
      margin: 1
    });

    // game.all(Space).layout(Token, {
    //   gap: 1,
    //   margin: 1
    // });

    game.all(SankaiDie).appearance({
      className: 'Die'
    });

    game.all(KaijuToken).appearance({
      className: 'Token'
    });

    // Box

    game.layout($.box, {
      area: { left: 30, top: 0, width: 40, height: 15},
    });

    game.layout($.village, {
      area: { left: 25, top: 15, width: 50, height: 50},
    });

    game.layout($.tray, {
      area: {left: 0, top: 25, width: 20, height: 30},
    });

    game.layout($.kaijumat, {
      area: {left: 80, top: 25, width: 20, height: 30},
    });

    game.layout((game.villager() || game.players[0]).my('seat')!, {
      area: { left: 0, top: 70, width: 47.5, height: 30},
    });

    game.layout((game.kaiju() || game.players[1]).my('seat')!, {
      area: { left: 52.5, top: 70, width: 47.5, height: 30},
    });

    game.all(Space, 'box').appearance({
      render: () => 
        <div>
          <h1 className="banner">Sankai</h1>
          <span>Hunger for Haraku</span>
        </div>
      ,
      info: () =>
      <div>
        <div> 
          Sankai is a game about a happy young village and a hungry young monster. 
          One player plays the inhabitants of Haraku, a small island community building itself. 
          The other plays Harapeko, a hungry kaiju.
        </div><div> 
          The villagers, threatened by the presence of Harapeko, will use resources to build bigger and bigger things 
          until they can make a fortress. Lumber is used to make walls, walls to make rooms, rooms to make buildings, 
          buildings to make towers, and towers, if possible, to make the fortress.
        </div><div>
          Harapeko, meanwhile, will eat lumber to get big enough to eat walls, walls until he can eat rooms, and so on. 
          One day, he would like to be big enough to eat a tower.
        </div><div>
          Along the way, many things could happen. Weather, the arrival of the army, even other Kaiju could 
          shift the balance at any time.
        </div>
      </div>
      ,
    });

    game.all(Space, 'box').layout(Card, {
      area: {left: 75, top: 5, width: 50, height: 70},
      rows: 1,
      haphazardly: 5,
      offsetColumn: {x: 10, y: 14},
    });

    game.all(Space, 'box').layout(SankaiDie, {
      area: {left: 125, top: 5, width: 75, height: 40},
      rows: 1,
      haphazardly: 5,
    });

    game.all(Space, 'box').layout(Token, {
      area: {left: 125, top: 50, width: 75, height: 40},
      rows: 1,
    });

    game.all(Space, 'box').layout($.box.all(Block, {kind: 'lumber'}), {
      area: {left: -100, top: 5, width: 20, height: 40},
      haphazardly: 5,
    });

    game.all(Space, 'box').layout($.box.all(Block, {kind: 'wall'}), {
      area: {left: -75, top: 5, width: 20, height: 40},
      haphazardly: 5,
    });

    game.all(Space, 'box').layout($.box.all(Block, {kind: 'room'}), {
      area: {left: -50, top: 5, width: 20, height: 40},
      haphazardly: 5,
    });

    game.all(Space, 'box').layout($.box.all(Block, {kind: 'building'}), {
      area: {left: -100, top: 55, width: 20, height: 40},
      haphazardly: 5,
    });

    game.all(Space, 'box').layout($.box.all(Block, {kind: 'tower'}), {
      area: {left: -75, top: 55, width: 20, height: 40},
      haphazardly: 5,
    });

    game.all(Space, 'box').layout($.box.all(Block, {kind: 'wild'}), {
      area: {left: -50, top: 55, width: 20, height: 40},
      haphazardly: 5,
    });

    game.all(Space, 'box').layout($.box.all(Block, {kind: 'fortress'}), {
      area: {left: -25, top: 5, width: 10, height: 90},
      limit: 1,
    });

    game.all(Token).appearance({
      aspectRatio: 1,
      render: (t) => (
        <div className="flipper">
          <div className="front">{t.kind.at(0)}</div>
          <div className="back"></div>
        </div>
      )
    });

    game.all(Token, 'Harapeko').appearance({
      aspectRatio: 1,
      render: (t) => (
        <div className="flipper">
          <div className="front">腹<br/>ぺこ</div>
          <div className="back">腹 ぺこ</div>
        </div>
      )
    });

    game.all(Token, 'Bukibuki').appearance({
      aspectRatio: 1,
      render: () => (
        <div className="flipper">
          <div className="front">不器</div>
          <div className="back">武器</div>
        </div>
      )
    });

    game.all('seat').layout('deck', {
      area: {left: 0, top: 0, width: 20, height: 25},
    });
    game.all('seat').layout('discard', {
      area: {left: 0, top: 25, width: 20, height: 25},
    });
    game.all('seat').layout('tableau', {
      area: {left: 25, top: 0, width: 75, height: 50},
    });
    game.all('seat').layout('hand', {
      area: {left: 0, top: 50, width: 100, height: 50},
    });

    $.kaijumat.appearance({
      render: () => null
    });

    game.all('appetiteTrack').layout(Block, {
      rows: 4, 
      columns: game.kaijuAppetiteSize,
      gap: 1, 
      margin: 1,
    });

    game.all('tray').layout(SankaiDie, {
      gap: 2, 
      margin: 2,
      haphazardly: 10,
      sticky: true,
      alignment: 'center',
    });

    game.all('deck').layout(Card, {
      rows: {max: 1},
      offsetColumn: {x: 6, y: 2},
      margin: .25,
    });

    game.all('discard').layout(Card, {
      rows: {max: 1},
      offsetColumn: {x: 9, y: 3},
      haphazardly: 5,
      margin: .25,
    });

    game.all('hand').layout(Piece, {
      // area: {left: 0, top: 0, width: 100, height: 100},
      direction: 'ltr',
      margin: .5,
      gap: .25,
    });

    // game.all('hand').layout(Block, {
    //   area: {left: 80, width: 20, top: 0, height: 100},
    //   gap: .5,
    // });

    game.all('tableau').layout(Piece, {
      direction: 'ltr',
      gap: .25,
      margin: .5,
    });


    game.all('village').layout(Cell, {
      aspectRatio: 1,
      margin: 1,
      gap: 1,
    });

    game.all(Cell).layout(Piece, {
      gap: .5,
      margin: 1,
      direction: 'btt',
    });

    game.all(Card).layout(Piece, {
      area: {left: 25, top: 25, width: 70, height: 70},
      rows: {max: 3},
      direction: 'btt-rtl',
      alignment: 'bottom right',
      gap: .25,
    });

    game.all(Card, 'Research').layout(Card, {
      area: {left: 20, top: 20, width: 80, height: 80},
      rows: {max: 1},
      offsetColumn: {x:2, y:20},
    });


    game.all(Card).appearance({
      aspectRatio: 5/7,
    });

    game.all(Card).appearance({
      render: (c) => {
        const illus = c.actionArgs?.kind ? 
            <div className="printed Block" data-kind={ c.actionArgs!.kind }>
              { c.actionArgs!.kind!.at(0)!.toUpperCase() }
            </div>
            : '';
        if (c.isVisible()) { return (
          <div className="front">
            <span className="title">{ c.cardName }</span>
{/*            <div className="cardText">
              {c.flavorText}
            </div>
*/}            { illus }
          </div>
        )} else { return (
          <div className="back">
            <span> { c instanceof KaijuCard ? '👹' : '⛩️' } </span>
          </div>
        )}
      }, 
      info: (c) => 
        <div>
          <span> { c.flavorText } </span>
          { c.description }
        </div>
    })

    // game.all(VillageCard).appearance({
    //   render: (c) => {
    //     if (c.isVisible()) { return (
    //       <div className="front">
    //         <span className="title">{ c.cardName }</span>
    //       </div>
    //     )} else { return (
    //       <div className="back">
    //         <span> ⛩️ </span>
    //       </div>
    //     )}
    //   }
    // })

    game.all(Block).appearance({
      aspectRatio: 1,
      render: (block) => 
        <div>
        { block.kind!.at(0)!.toUpperCase() }
        </div>
    });

    // game.all(Space, 'box').all(SankaiDie).appearance({
    //   render: false
    // });

    // game.all(Space, 'box').all(Token).appearance({
    //   render: false
    // });

    // game.all(Space, 'box').all(Block).appearance({
    //   render: false
    // });

  }
});
