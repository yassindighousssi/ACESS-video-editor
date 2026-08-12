/**
 * @jest-environment jsdom
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { createTestRoomContext } from "../core/rooms/common/mocks";
import { RoomNavigation } from "../core/rooms/common/room-navigation";
import { ProjectRoomModel } from "../core/rooms/project/project-room.model";
import { ProjectRoom } from "../core/rooms/project/project-room";
import { TimelineRoomModel } from "../core/rooms/timeline/timeline-room.model";
import { TimelineRoom } from "../core/rooms/timeline/timeline-room";
import { TransactionEngine } from "../core/model/transaction";
import { App } from "./app";

function build() {
  const h = createTestRoomContext();
  const navigation = new RoomNavigation(h.context);
  const store = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const txn = new TransactionEngine();
  const projectRoom = new ProjectRoom(store);
  const timelineRoom = new TimelineRoom(new TimelineRoomModel(store, h.eventBus, h.announcement, txn));
  const registerProject = navigation.registerRoom(projectRoom);
  const registerTimeline = navigation.registerRoom(timelineRoom);
  if (!registerProject.success || !registerTimeline.success) throw new Error("registration failed");
  return { ...h, navigation, store, projectRoom, timelineRoom };
}

describe("App", () => {
  it("renders the project room after navigating to it", () => {
    const h = build();
    h.navigation.navigateTo("project");
    render(<App navigation={h.navigation} context={h.context} projectRoom={h.projectRoom} timelineRoom={h.timelineRoom} />);
    expect(screen.getByRole("heading", { name: "غرفة المشروع" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
  });

  it("shows the entrance announcement in the live region", () => {
    const h = build();
    h.navigation.navigateTo("project");
    render(<App navigation={h.navigation} context={h.context} projectRoom={h.projectRoom} timelineRoom={h.timelineRoom} />);
    expect(screen.getByText(/Entered Project Room/)).toBeInTheDocument();
  });

  it("switches to the timeline room when navigation changes", async () => {
    const h = build();
    h.navigation.navigateTo("project");
    render(<App navigation={h.navigation} context={h.context} projectRoom={h.projectRoom} timelineRoom={h.timelineRoom} />);
    act(() => {
      h.navigation.navigateTo("timeline");
    });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "غرفة المخطط الزمني" })).toBeInTheDocument();
    });
    expect(screen.getByText(/Playhead at 0\.0 seconds/)).toBeInTheDocument();
  });

  it("shows the no-room state before any navigation", () => {
    const h = build();
    render(<App navigation={h.navigation} context={h.context} projectRoom={h.projectRoom} timelineRoom={h.timelineRoom} />);
    expect(screen.getByRole("status")).toHaveTextContent("No room active");
  });
});
