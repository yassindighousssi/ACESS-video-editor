import type { Announcement } from "../../core/rooms/common/announcement-engine";
import type { RoomElement } from "../../core/rooms/common/room-interface";

export interface RoomPanelProps {
  readonly titleAr: string;
  readonly titleEn: string;
  readonly elements: readonly RoomElement[];
  readonly announcement: Announcement | null | undefined;
}

export function RoomPanel(props: RoomPanelProps) {
  return (
    <section aria-label={props.titleEn}>
      <h2>{props.titleAr}</h2>
      <div role="group" aria-label={props.titleEn}>
        {props.elements.map(element =>
          element.type === "button" ? (
            <button key={element.id} aria-label={element.labelEn} disabled={!element.focusable}>
              <span>{element.labelEn}</span>
              {element.action === undefined ? null : <kbd>{element.action}</kbd>}
            </button>
          ) : (
            <div key={element.id} role="status" aria-label={element.labelEn}>
              {element.labelEn}
            </div>
          ),
        )}
      </div>
      <div aria-live="polite" role="log" className="announcements">
        {props.announcement === null || props.announcement === undefined ? null : <p>{props.announcement.textEn}</p>}
      </div>
    </section>
  );
}
