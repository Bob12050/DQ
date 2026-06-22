import { app } from './app/GameApp.ts';
import { createGame } from './game/PhaserGame.ts';

/** Surface fatal startup problems on-screen (iOS has no visible console). */
function showFatal(message: string): void {
  const el = document.getElementById('boot-message');
  if (el) {
    el.textContent = message;
    el.style.color = '#ff9a9a';
    el.style.whiteSpace = 'pre-wrap';
    el.style.padding = '20px';
    el.style.fontSize = '13px';
    el.style.lineHeight = '1.5';
    el.style.textAlign = 'left';
    el.style.overflow = 'auto';
  }
}

window.addEventListener('error', (e) => {
  showFatal('起動エラー:\n' + (e.message || String(e.error)) + '\n' + ((e.error && e.error.stack) || ''));
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  showFatal('起動エラー(Promise):\n' + (r?.message || String(r)) + '\n' + (r?.stack || ''));
});

try {
  // Service worker is non-essential to launch; never let it block the game.
  try {
    app.pwa.init();
  } catch {
    /* ignore SW registration issues */
  }

  const game = createGame();

  // Safety net: if Phaser hasn't taken over within a few seconds, report it.
  setTimeout(() => {
    if (document.getElementById('boot-message')?.isConnected) {
      const renderer = game.renderer ? game.renderer.constructor.name : 'none';
      showFatal(
        '画面の初期化に時間がかかっています。\n' +
          `renderer=${renderer}\n` +
          'ページを再読み込みしてみてください。',
      );
    }
  }, 5000);

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

  // Prevent iOS double-tap-to-zoom / pinch from interfering with the canvas.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
} catch (err) {
  showFatal('起動失敗:\n' + (err as Error).message + '\n' + ((err as Error).stack ?? ''));
}
