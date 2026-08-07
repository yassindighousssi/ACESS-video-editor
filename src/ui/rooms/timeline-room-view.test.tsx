/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { createTestRoomContext } from "../../core/rooms/common/mocks";
import { ProjectRoomModel } from "../../core/rooms/project/project-room.model";
import { TimelineRoomModel } from "../../core/rooms/timeline/timeline-room.model";
import { TimelineRoom } from "../../core/rooms/timeline/timeline-room";
import { TimelineRoomView } from "./timeline-room-view";
import { TransactionEngine } from "../../core/model/transaction";
import { timeValueFromMs } from "../../core/model/types";
import { insertClip, importMedia, createTrack as transitionCreateTrack } from "../../core/model/transitions";

function build() {
  const h = createTestRoomContext();
  const store = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const txn = new TransactionEngine();
  const model = new TimelineRoomModel(store, h.eventBus, h.announcement, txn);
  const room = new TimelineRoom(model);
  return { ...h, store, txn, model, room };
}

function seed(h: ReturnType<typeof build>) {
  h.store.createProject("Timeline");
  const base = h.store.getCurrentProject()!;
  const step1 = h.txn.run(base, "import", "seed", s => importMedia(s, "/a.mp4", "video", 2000, "h1"));
  if (!step1.success) throw new Error("seed import failed");
  const step2 = h.txn.run(step1.value.newState, "track", "seed", s => transitionCreateTrack(s, "V1", "video"));
  if (!step2.success) throw new Error("seed track failed");
  const media = step2.value.newState.media[0]!.id;
  const track = step2.value.newState.tracks[0]!.id;
  const step3 = h.txn.run(step2.value.newState, "clip", "seed", s => insertClip(s, media, track, tv(0), tv(0), tv(2000)));
  if (!step3.success) throw new Error("seed clip failed");
  const update = h.store.updateProject(step3.value.newState);
  if (!update.success) throw new Error("update failed");
}

function tv(ms: number) {
  return { ticks: timeValueFromMs(ms).ticks };
}

describe("TimelineRoomView", () => {
  it("renders the room title", () => {
    const h = build();
    render(<TimelineRoomView room={h.room} context={h.context} />);
    expect(screen.getByRole("heading", { name: "غرفة المخطط الزمني" })).toBeInTheDocument();
  });

  it("renders playhead, selection and clipboard statuses", () => {
    const h = build();
    render(<TimelineRoomView room={h.room} context={h.context} />);
    expect(screen.getByText(/Playhead at 0\.0 seconds/)).toBeInTheDocument();
    expect(screen.getByText("Selection: 0 clips")).toBeInTheDocument();
    expect(screen.getByText("Clipboard: 0 clips")).toBeInTheDocument();
  });

  it("renders tracks and clips when a project is open", () => {
    const h = build();
    seed(h);
    render(<TimelineRoomView room={h.room} context={h.context} />);
    expect(screen.getByRole("button", { name: /Track V1/ })).toBeInTheDocument();
    expect(screen.getByText(/from 0\.0 to 2\.0 seconds/)).toBeInTheDocument();
  });

  it("reflects selection in the clip status", () => {
    const h = build();
    seed(h);
    h.model.setPlayheadMs(500);
    h.model.selectCurrentClip();
    render(<TimelineRoomView room={h.room} context={h.context} />);
    expect(screen.getByText(/selected/)).toBeInTheDocument();
    expect(screen.getByText("Selection: 1 clips")).toBeInTheDocument();
  });

  it("renders the current playhead announcement", () => {
    const h = build();
    seed(h);
    h.model.setPlayheadMs(500);
    render(<TimelineRoomView room={h.room} context={h.context} />);
    expect(screen.getAllByText(/Playhead at 0\.5 seconds/).length).toBeGreaterThanOrEqual(1);
  });
});
