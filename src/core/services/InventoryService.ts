import type { DataRegistry } from '../registry/DataRegistry.ts';
import { GameState } from '../state/GameState.ts';

/** Manages item counts. Items never go negative; missing id => count 0. */
export class InventoryService {
  constructor(
    private gs: GameState,
    private reg: DataRegistry,
  ) {}

  count(itemId: string): number {
    return this.gs.data.inventory[itemId] ?? 0;
  }

  has(itemId: string): boolean {
    return this.count(itemId) > 0;
  }

  add(itemId: string, n = 1): void {
    this.reg.item(itemId); // validates id exists
    this.gs.data.inventory[itemId] = this.count(itemId) + n;
  }

  /** Consumes one (or n) of an item; returns false if not enough in stock. */
  consume(itemId: string, n = 1): boolean {
    const current = this.count(itemId);
    if (current < n) return false;
    const next = current - n;
    if (next === 0) delete this.gs.data.inventory[itemId];
    else this.gs.data.inventory[itemId] = next;
    return true;
  }

  /** Buys an item if enough gold; returns false otherwise. */
  buy(itemId: string, n = 1): boolean {
    const def = this.reg.item(itemId);
    const cost = def.price * n;
    if (this.gs.data.gold < cost) return false;
    this.gs.data.gold -= cost;
    this.add(itemId, n);
    return true;
  }

  /** Returns [itemId, count] pairs for usable battle items currently in stock. */
  battleItems(): { itemId: string; count: number }[] {
    return Object.entries(this.gs.data.inventory)
      .filter(([id, c]) => c > 0 && this.reg.item(id).usableInBattle)
      .map(([itemId, count]) => ({ itemId, count }));
  }
}
