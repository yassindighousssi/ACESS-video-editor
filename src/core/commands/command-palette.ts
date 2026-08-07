import { Result, ErrorCode } from "../infrastructure/common/types";
import type { CommandDefinition } from "./command-definition";
import type { CommandSystem } from "./command-system";

export class CommandPalette {
  private query = "";
  private currentIndex = 0;

  constructor(private readonly system: CommandSystem) {}

  setQuery(query: string): void {
    this.query = query;
    this.currentIndex = 0;
  }

  getQuery(): string {
    return this.query;
  }

  getResults(): readonly CommandDefinition[] {
    return this.system.search(this.query);
  }

  getResultCount(): number {
    return this.getResults().length;
  }

  getCurrentIndex(): number {
    return this.getResultCount() === 0 ? -1 : this.currentIndex;
  }

  getCurrentItem(): CommandDefinition | null {
    const results = this.getResults();
    if (results.length === 0) return null;
    const index = Math.min(this.currentIndex, results.length - 1);
    this.currentIndex = index;
    return results[index] ?? null;
  }

  moveUp(): void {
    const count = this.getResultCount();
    if (count === 0) return;
    this.currentIndex = (this.currentIndex - 1 + count) % count;
  }

  moveDown(): void {
    const count = this.getResultCount();
    if (count === 0) return;
    this.currentIndex = (this.currentIndex + 1) % count;
  }

  selectCurrent(): Result<void, ErrorCode> {
    const item = this.getCurrentItem();
    if (item === null) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    return this.system.dispatchById(item.id);
  }
}
