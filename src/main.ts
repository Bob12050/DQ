import Phaser from 'phaser';
import { createGameConfig } from './game/GameConfig';

/** Entry point: boot the Phaser game. */
new Phaser.Game(createGameConfig());
