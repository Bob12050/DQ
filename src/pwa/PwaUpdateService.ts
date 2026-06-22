import { registerSW } from 'virtual:pwa-register';

/**
 * Wraps the service-worker lifecycle. Never auto-reloads (so we don't interrupt
 * a battle or a save) — instead it surfaces an "update available" flag that the
 * Title screen can act on at a safe time.
 */
export class PwaUpdateService {
  private updateSW?: (reload?: boolean) => Promise<void>;
  needRefresh = false;
  offlineReady = false;
  private listeners = new Set<() => void>();

  init(): void {
    try {
      this.updateSW = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          this.needRefresh = true;
          this.emit();
        },
        onOfflineReady: () => {
          this.offlineReady = true;
          this.emit();
        },
      });
    } catch {
      /* SW unsupported (e.g. some private modes) — app still runs online */
    }
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  /** Applies the waiting update and reloads. Call only at a safe moment. */
  async applyUpdate(): Promise<void> {
    if (this.updateSW) await this.updateSW(true);
  }

  get isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  get isOnline(): boolean {
    return navigator.onLine;
  }
}
