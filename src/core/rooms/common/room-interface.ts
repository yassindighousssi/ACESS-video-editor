import type { RoomId } from "./room-types";
import type { RoomContext } from "./room-context";

export type RoomElementType =
  | "button"
  | "list"
  | "listitem"
  | "tree"
  | "treeitem"
  | "slider"
  | "textbox"
  | "combobox"
  | "region"
  | "status"
  | "menu";

export interface RoomElement {
  readonly id: string;
  readonly type: RoomElementType;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly focusable: boolean;
  readonly action?: string;
  readonly children?: readonly RoomElement[];
}

export interface IRoom {
  readonly id: RoomId;
  readonly nameAr: string;
  readonly nameEn: string;
  onEnter(context: RoomContext): void;
  onExit(context: RoomContext): void;
  getElements(): readonly RoomElement[];
}
