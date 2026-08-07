/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { RoomPanel } from "./room-panel";
import type { Announcement } from "../../core/rooms/common/announcement-engine";
import type { RoomElement } from "../../core/rooms/common/room-interface";

const sampleElements: readonly RoomElement[] = [
  { id: "b1", type: "button", labelAr: "زر", labelEn: "Button one", focusable: true, action: "Ctrl+A" },
  { id: "b2", type: "button", labelAr: "زر", labelEn: "Disabled button", focusable: false, action: "Ctrl+B" },
  { id: "s1", type: "status", labelAr: "حالة", labelEn: "Status one", focusable: false },
];

const announcement: Announcement = {
  id: "a1",
  textAr: "مرحبا",
  textEn: "Hello",
  level: "important",
  source: "project",
  timestamp: 0,
};

describe("RoomPanel", () => {
  it("renders buttons and statuses from room elements", () => {
    render(<RoomPanel titleAr="غرفة" titleEn="Room" elements={sampleElements} announcement={null} />);
    expect(screen.getByRole("button", { name: "Button one" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disabled button" })).toBeDisabled();
    expect(screen.getByText("Status one")).toBeInTheDocument();
  });

  it("shows keyboard shortcut labels on buttons", () => {
    render(<RoomPanel titleAr="غرفة" titleEn="Room" elements={sampleElements} announcement={null} />);
    expect(screen.getByText("Ctrl+A")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+B")).toBeInTheDocument();
  });

  it("renders the room title in Arabic", () => {
    render(<RoomPanel titleAr="غرفة المشروع" titleEn="Project Room" elements={sampleElements} announcement={null} />);
    expect(screen.getByRole("heading", { name: "غرفة المشروع" })).toBeInTheDocument();
  });

  it("announces the latest message in a polite live region", () => {
    render(<RoomPanel titleAr="غرفة" titleEn="Room" elements={sampleElements} announcement={announcement} />);
    const region = screen.getByRole("log");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders an empty live region when there is no announcement", () => {
    render(<RoomPanel titleAr="غرفة" titleEn="Room" elements={sampleElements} announcement={null} />);
    const region = screen.getByRole("log");
    expect(region.textContent).toBe("");
  });
});
