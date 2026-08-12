import { Result, ErrorCode } from "../../infrastructure/common/types";
import { AppEvent } from "./event-bus";
import { RoomId, RoomTransition } from "./room-types";
import type { IRoom } from "./room-interface";
import type { RoomContext } from "./room-context";
import { ROOM_NAMES_AR, ROOM_NAMES_EN } from "./room-types";

export class RoomNavigation {
  private rooms: Map<RoomId, IRoom> = new Map();
  private current: RoomId | null = null;
  private transitions: RoomTransition[] = [];

  constructor(private readonly context: RoomContext) {}

  registerRoom(room: IRoom): Result<void, ErrorCode> {
    if (this.rooms.has(room.id)) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    this.rooms.set(room.id, room);
    return { success: true, value: undefined };
  }

  navigateTo(roomId: RoomId): Result<void, ErrorCode> {
    const target = this.rooms.get(roomId);
    if (target === undefined) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const from = this.current;
    if (from === roomId) {
      this.context.announcement.speak(
        `أنت بالفعل في ${ROOM_NAMES_AR[roomId]}`,
        `You are already in the ${ROOM_NAMES_EN[roomId]}`,
        "important",
        "navigation",
      );
      return { success: true, value: undefined };
    }
    if (from !== null) {
      const leaving = this.rooms.get(from);
      leaving?.onExit(this.context);
      this.context.eventBus.emit(AppEvent.ROOM_EXIT, { roomId: from, to: roomId });
    }
    this.current = roomId;
    target.onEnter(this.context);
    this.context.eventBus.emit(AppEvent.ROOM_ENTER, { roomId, from });
    this.transitions.push({ from, to: roomId, timestamp: Date.now() });
    return { success: true, value: undefined };
  }

  getCurrentRoomId(): RoomId | null {
    return this.current;
  }

  getCurrentRoom(): IRoom | null {
    return this.current === null ? null : (this.rooms.get(this.current) ?? null);
  }

  getRoom(roomId: RoomId): IRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRegisteredRoomIds(): readonly RoomId[] {
    return Array.from(this.rooms.keys());
  }

  getHistory(): readonly RoomTransition[] {
    return [...this.transitions];
  }
}
