import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { TitleScene } from '../scenes/TitleScene';
import { HomeScene } from '../scenes/HomeScene';
import { StageSelectScene } from '../scenes/StageSelectScene';
import { TeamEditScene } from '../scenes/TeamEditScene';
import { MonsterDexScene } from '../scenes/MonsterDexScene';
import { BattleScene } from '../scenes/BattleScene';
import { ResultScene } from '../scenes/ResultScene';

/**
 * Phaser game configuration. Portrait 9:16 logical resolution scaled to fit any
 * phone screen while keeping the aspect ratio.
 */
export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#070912',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    render: {
      antialias: true,
    },
    input: {
      activePointers: 2,
      touch: true,
    },
    disableContextMenu: true,
    scene: [
      BootScene,
      PreloadScene,
      TitleScene,
      HomeScene,
      StageSelectScene,
      TeamEditScene,
      MonsterDexScene,
      BattleScene,
      ResultScene,
    ],
  };
}
