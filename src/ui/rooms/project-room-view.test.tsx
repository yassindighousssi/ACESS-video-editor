/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { createTestRoomContext } from "../../core/rooms/common/mocks";
import { ProjectRoomModel } from "../../core/rooms/project/project-room.model";
import { ProjectRoom } from "../../core/rooms/project/project-room";
import { ProjectRoomView } from "./project-room-view";

function build() {
  const h = createTestRoomContext();
  const model = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const room = new ProjectRoom(model);
  return { ...h, model, room };
}

describe("ProjectRoomView", () => {
  it("renders the room title and action buttons", () => {
    const h = build();
    render(<ProjectRoomView room={h.room} context={h.context} />);
    expect(screen.getByRole("heading", { name: "غرفة المشروع" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("shows project stats when a project is open", () => {
    const h = build();
    h.model.createProject("My Film");
    render(<ProjectRoomView room={h.room} context={h.context} />);
    expect(screen.getByText(/Clips: 0, tracks: 0, media: 0/)).toBeInTheDocument();
  });

  it("does not show stats when no project is open", () => {
    const h = build();
    render(<ProjectRoomView room={h.room} context={h.context} />);
    expect(screen.queryByText(/Clips:/)).not.toBeInTheDocument();
  });

  it("renders the latest announcement", () => {
    const h = build();
    h.model.createProject("My Film");
    render(<ProjectRoomView room={h.room} context={h.context} />);
    expect(screen.getByText(/Created new project/)).toBeInTheDocument();
  });
});
