import { Result, ErrorCode } from "../infrastructure/common/types";
import type { RoomId } from "../rooms/common/room-types";

export type CommandScope = RoomId | "global";

export interface CommandDefinition {
  readonly id: string;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly shortcut: string | null;
  readonly scope: CommandScope;
  readonly category: string;
  readonly description: string;
  readonly handler: () => Result<void, ErrorCode>;
}
