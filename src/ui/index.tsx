import React from 'react';
import { render, numberSetting } from '@boardzilla/core';
import { default as setup, Space, Cell, Token, KaijuToken, Card, VillageCard, KaijuCard, Block, SankaiDie} from '../game/index.js';

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

    game.all(Token).appearance({
      aspectRatio: 1,
      render: () => (
        <div className="flipper">
          <div className="front"></div>
          <div className="back"></div>
        </div>
      )
    });

    game.all('seat').layout(Space, {
      // rows: 2,
      // columns: 3,
      slots: [
        {
          left: 0, top: 50,
          width: 100, height: 50, 
        },
        {
          left: 15, top: 0,
          width: 15, height: 50, 
        },
        {
          left: 0, top: 0,
          width: 15, height: 50, 
        },
        {
          left: 30, top: 0,
          width: 70, height: 50,
        }
      ],
    });

    game.all('appetiteTrack').layout(Block, {
      rows: 4, 
      columns: 4,
      gap: 2, 
      margin: 2,
    });

    game.all('deck').layout(Card, {
      rows: {max: 1},
      offsetColumn: {x: 5, y: 5},      
    });

    game.all('discard').layout(Card, {
      rows: {max: 1},
      offsetColumn: {x: 20, y: 5},
      haphazardly: 0.25,
    });

    game.all('hand').layout(Card, {
      area: {left: 0, top: 0, width: 75, height: 100},
      gap: .5,
    });

    game.all('hand').layout(Block, {
      area: {left: 75, width: 25, top: 0, height: 100},
      gap: .5,
    });

    game.all('village').layout(Cell, {
      aspectRatio: 1,
      margin: 1,
      gap: 1,
    });

    game.all(Cell).layout(Block, {
      gap: .5,
      margin: .5,
    });

    game.all(Card).appearance({
      aspectRatio: 5/7,
    });

    game.all(Block).appearance({
      aspectRatio: 1,
      render: (block) => 
        <div>
        { block.kind!.at(0)!.toUpperCase() }
        </div>
    });

    game.layout(Space, {
      gap: 1,
      margin: 1
    });

    game.all(Space).layout(Token, {
      gap: 1,
      margin: 1
    });

    game.all(SankaiDie).appearance({
      className: 'Die'
    });

    game.all(KaijuToken).appearance({
      className: 'Token'
    });

  }
});
