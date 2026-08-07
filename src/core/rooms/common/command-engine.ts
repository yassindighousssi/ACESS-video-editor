import { Result, ErrorCode } from "../../infrastructure/common/types";
import type { RoomId } from "./room-types";

export interface Command {
  readonly shortcut: string;
  readonly roomId: RoomId;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly handler: () => void;
}

export class CommandEngine {
  private commands: Map<string, Command> = new Map();

  constructor(private readonly getCurrentRoomId?: () => RoomId | null) {}

  static normalizeShortcut(shortcut: string): string {
    return shortcut.trim().toLowerCase().replace(/\s+/g, "");
  }

  registerCommand(shortcut: string, roomId: RoomId, nameAr: string, nameEn: string, handler: () => void): Result<void, ErrorCode> {
    const normalized = CommandEngine.normalizeShortcut(shortcut);
    if (normalized.length === 0) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    if (this.commands.has(normalized)) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    this.commands.set(normalized, { shortcut: normalized, roomId, nameAr, nameEn, handler });
    return { success: true, value: undefined };
  }

  executeCommand(shortcut: string): Result<void, ErrorCode> {
    const normalized = CommandEngine.normalizeShortcut(shortcut);
    const command = this.commands.get(normalized);
    if (command === undefined) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    if (this.getCurrentRoomId !== undefined && this.getCurrentRoomId() !== null && this.getCurrentRoomId() !== command.roomId) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    command.handler();
    return { success: true, value: undefined };
  }

  unregisterCommand(shortcut: string): Result<void, ErrorCode> {
    const normalized = CommandEngine.normalizeShortcut(shortcut);
    if (!this.commands.has(normalized)) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    this.commands.delete(normalized);
    return { success: true, value: undefined };
  }

  hasCommand(shortcut: string): boolean {
    return this.commands.has(CommandEngine.normalizeShortcut(shortcut));
  }

  getCommand(shortcut: string): Command | undefined {
    return this.commands.get(CommandEngine.normalizeShortcut(shortcut));
  }

  listCommands(): readonly Command[] {
    return Array.from(this.commands.values()).sort((a, b) => a.shortcut.localeCompare(b.shortcut));
  }

  getCommandCount(): number {
    return this.commands.size;
  }
}
