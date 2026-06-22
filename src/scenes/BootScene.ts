import Phaser from 'phaser';
import { SCENES } from '../game/constants';
import { GameState } from '../game/GameState';

/** Initial setup: background, load save, then move on to Preload. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#070912');
    // Load (or initialize) the player's progress before any scene needs it.
    GameState.load();
    this.scene.start(SCENES.Preload);
  }
}
