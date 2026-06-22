import { app } from './app/GameApp.ts';
import { createGame } from './game/PhaserGame.ts';

// Register the service worker (update prompt only — never auto-reload).
app.pwa.init();

const game = createGame();

/**
 * Backgrounding: best-effort autosave and pause audio/rendering. iOS Safari may
 * not fire `beforeunload`, so we rely on `visibilitychange`.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    void app.autosave('background');
    app.audio.suspend();
    game.loop.sleep();
  } else {
    app.audio.resume();
    game.loop.wake();
  }
});

// Reflect connectivity changes (used by Title/status displays).
window.addEventListener('online', () => app.pwa.onChange);
window.addEventListener('offline', () => app.pwa.onChange);

// Prevent iOS double-tap-to-zoom / pinch from interfering with the canvas.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
