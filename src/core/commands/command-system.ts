import { Result, ErrorCode } from "../infrastructure/common/types";
import type { RoomId } from "../rooms/common/room-types";
import { ShortcutEngine } from "./shortcut-engine";
import type { CommandDefinition } from "./command-definition";

export class CommandSystem {
  private byId: Map<string, CommandDefinition> = new Map();
  private byShortcut: Map<string, string> = new Map();

  constructor(private readonly getCurrentRoomId?: () => RoomId | null) {}

  register(command: CommandDefinition): Result<void, ErrorCode> {
    if (command.id.trim().length === 0) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    if (this.byId.has(command.id)) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    if (command.shortcut !== null) {
      const normalized = ShortcutEngine.normalize(command.shortcut);
      if (normalized.length === 0) {
        return { success: false, error: ErrorCode.INVALID_INPUT };
      }
      if (this.byShortcut.has(normalized)) {
        return { success: false, error: ErrorCode.INVALID_INPUT };
      }
      this.byShortcut.set(normalized, command.id);
    }
    this.byId.set(command.id, command);
    return { success: true, value: undefined };
  }

  unregister(id: string): Result<void, ErrorCode> {
    const command = this.byId.get(id);
    if (command === undefined) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    this.byId.delete(id);
    if (command.shortcut !== null) {
      this.byShortcut.delete(ShortcutEngine.normalize(command.shortcut));
    }
    return { success: true, value: undefined };
  }

  hasCommand(id: string): boolean {
    return this.byId.has(id);
  }

  getById(id: string): CommandDefinition | undefined {
    return this.byId.get(id);
  }

  getByShortcut(shortcut: string): CommandDefinition | undefined {
    const id = this.byShortcut.get(ShortcutEngine.normalize(shortcut));
    return id === undefined ? undefined : this.byId.get(id);
  }

  dispatchById(id: string): Result<void, ErrorCode> {
    const command = this.byId.get(id);
    if (command === undefined) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    return this.execute(command);
  }

  dispatchByShortcut(shortcut: string): Result<void, ErrorCode> {
    const command = this.getByShortcut(shortcut);
    if (command === undefined) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    return this.execute(command);
  }

  list(): readonly CommandDefinition[] {
    return Array.from(this.byId.values()).sort(
      (a, b) => a.category.localeCompare(b.category) || a.labelEn.localeCompare(b.labelEn),
    );
  }

  getCommandCount(): number {
    return this.byId.size;
  }

  listShortcuts(): readonly string[] {
    return Array.from(this.byShortcut.keys()).sort();
  }

  search(query: string): readonly CommandDefinition[] {
    const term = query.trim().toLowerCase();
    if (term.length === 0) return this.list();
    const scored = Array.from(this.byId.values()).map(command => {
      let score = 0;
      if (command.id.toLowerCase().startsWith(term)) score += 3;
      if (command.labelEn.toLowerCase().startsWith(term)) score += 2;
      if (command.labelAr.toLowerCase().startsWith(term)) score += 2;
      if (command.category.toLowerCase().includes(term)) score += 1;
      if (command.labelEn.toLowerCase().includes(term)) score += 1;
      if (score > 0) return { command, score };
      return null;
    });
    return scored
      .filter((entry): entry is { command: CommandDefinition; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score || a.command.labelEn.localeCompare(b.command.labelEn))
      .map(entry => entry.command);
  }

  private execute(command: CommandDefinition): Result<void, ErrorCode> {
    if (command.scope !== "global" && this.getCurrentRoomId !== undefined) {
      const current = this.getCurrentRoomId();
      if (current !== null && current !== command.scope) {
        return { success: false, error: ErrorCode.INVALID_INPUT };
      }
    }
    return command.handler();
  }
}
