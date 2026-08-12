export type RoomId =
  | "project"
  | "media"
  | "timeline"
  | "effects"
  | "text"
  | "export"
  | "settings"
  | "help";

export const RoomIds: readonly RoomId[] = [
  "project",
  "media",
  "timeline",
  "effects",
  "text",
  "export",
  "settings",
  "help",
];

export type RoomState = "idle" | "active" | "suspended";

export interface RoomTransition {
  readonly from: RoomId | null;
  readonly to: RoomId;
  readonly timestamp: number;
}

export type RoomEventType = "enter" | "exit" | "action" | "navigate";

export interface RoomEvent {
  readonly type: RoomEventType;
  readonly roomId: RoomId;
  readonly description: string;
  readonly timestamp: number;
}

export const ROOM_NAMES_AR: Record<RoomId, string> = {
  project: "غرفة المشروع",
  media: "غرفة الوسائط",
  timeline: "غرفة المخطط الزمني",
  effects: "غرفة التأثيرات",
  text: "غرفة النصوص",
  export: "غرفة التصدير",
  settings: "غرفة الإعدادات",
  help: "غرفة المساعدة",
};

export const ROOM_NAMES_EN: Record<RoomId, string> = {
  project: "Project Room",
  media: "Media Room",
  timeline: "Timeline Room",
  effects: "Effects Room",
  text: "Text Room",
  export: "Export Room",
  settings: "Settings Room",
  help: "Help Room",
};
