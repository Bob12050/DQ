import Phaser from 'phaser';
import { COLORS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../app/config.ts';
import { app } from '../app/GameApp.ts';
import { BootScene } from './scenes/BootScene.ts';
import { TitleScene } from './scenes/TitleScene.ts';
import { TownScene } from './scenes/TownScene.ts';
import { FieldScene } from './scenes/FieldScene.ts';
import { BattleScene } from './scenes/BattleScene.ts';
import { ResultScene } from './scenes/ResultScene.ts';
import { PartyScene } from './scenes/PartyScene.ts';
import { StorageScene } from './scenes/StorageScene.ts';
import { MonsterDetailScene } from './scenes/MonsterDetailScene.ts';
import { FusionScene } from './scenes/FusionScene.ts';
import { ShopScene } from './scenes/ShopScene.ts';
import { SaveLoadScene } from './scenes/SaveLoadScene.ts';
import { SettingsScene } from './scenes/SettingsScene.ts';
import { ClearScene } from './scenes/ClearScene.ts';

export function createGame(): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: COLORS.bg,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
    },
    fps: {
      target: app.settings.targetFps,
      min: 20,
    },
    input: {
      activePointers: 2,
      touch: true,
      keyboard: true,
      gamepad: true,
    },
    disableContextMenu: true,
    scene: [
      BootScene,
      TitleScene,
      TownScene,
      FieldScene,
      BattleScene,
      ResultScene,
      PartyScene,
      StorageScene,
      MonsterDetailScene,
      FusionScene,
      ShopScene,
      SaveLoadScene,
      SettingsScene,
      ClearScene,
    ],
  });
  return game;
}
