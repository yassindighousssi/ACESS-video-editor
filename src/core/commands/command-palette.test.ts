import { CommandPalette } from "./command-palette";
import { CommandSystem } from "./command-system";
import type { CommandDefinition } from "./command-definition";
import { ErrorCode, Result } from "../infrastructure/common/types";

function ok(): Result<void, ErrorCode> {
  return { success: true, value: undefined };
}

function command(id: string, labelEn: string): CommandDefinition {
  return {
    id,
    labelAr: "أمر",
    labelEn,
    shortcut: null,
    scope: "global",
    category: "General",
    description: "A command",
    handler: ok,
  };
}

function makeSystem(): CommandSystem {
  const system = new CommandSystem();
  system.register(command("undo", "Undo"));
  system.register(command("redo", "Redo"));
  system.register(command("save", "Save"));
  return system;
}

describe("CommandPalette", () => {
  it("should default to an empty query with all results", () => {
    const palette = new CommandPalette(makeSystem());
    expect(palette.getQuery()).toBe("");
    expect(palette.getResultCount()).toBe(3);
    expect(palette.getCurrentIndex()).toBe(0);
    expect(palette.getCurrentItem()?.id).toBe("redo");
  });

  it("should set a query and reset the selection", () => {
    const palette = new CommandPalette(makeSystem());
    palette.moveDown();
    palette.moveDown();
    expect(palette.getCurrentIndex()).toBe(2);
    palette.setQuery("save");
    expect(palette.getQuery()).toBe("save");
    expect(palette.getCurrentIndex()).toBe(0);
    expect(palette.getCurrentItem()?.id).toBe("save");
  });

  it("should filter results by the query", () => {
    const palette = new CommandPalette(makeSystem());
    palette.setQuery("sa");
    expect(palette.getResults().map(c => c.id)).toEqual(["save"]);
  });

  it("should return -1 index and null item when there are no results", () => {
    const palette = new CommandPalette(makeSystem());
    palette.setQuery("zzz");
    expect(palette.getResultCount()).toBe(0);
    expect(palette.getCurrentIndex()).toBe(-1);
    expect(palette.getCurrentItem()).toBeNull();
  });

  it("should wrap around when moving up", () => {
    const palette = new CommandPalette(makeSystem());
    palette.setQuery("undo"); // 1 result
    palette.moveUp();
    expect(palette.getCurrentIndex()).toBe(0);
  });

  it("should wrap around when moving down", () => {
    const palette = new CommandPalette(makeSystem());
    palette.moveDown();
    expect(palette.getCurrentIndex()).toBe(1);
    palette.moveDown();
    expect(palette.getCurrentIndex()).toBe(2);
    palette.moveDown();
    expect(palette.getCurrentIndex()).toBe(0);
  });

  it("should not move when there are no results", () => {
    const palette = new CommandPalette(makeSystem());
    palette.setQuery("zzz");
    palette.moveUp();
    palette.moveDown();
    expect(palette.getCurrentIndex()).toBe(-1);
  });

  it("should clamp the current item into range after a query shrink", () => {
    const palette = new CommandPalette(makeSystem());
    palette.moveDown();
    expect(palette.getCurrentIndex()).toBe(1);
    palette.setQuery("save");
    palette.moveDown();
    palette.moveDown();
    expect(palette.getCurrentIndex()).toBe(0);
  });

  it("should dispatch the selected command", () => {
    const system = new CommandSystem();
    let called = false;
    system.register(command("save", "Save"));
    const palette = new CommandPalette(system);
    palette.setQuery("save");
    const result = palette.selectCurrent();
    expect(result.success).toBe(true);
    expect(called).toBe(false);
  });

  it("should dispatch the selected command handler", () => {
    const system = new CommandSystem();
    let called = false;
    system.register({
      ...command("save", "Save"),
      handler: () => { called = true; return ok(); },
    });
    const palette = new CommandPalette(system);
    palette.setQuery("save");
    const result = palette.selectCurrent();
    expect(result.success).toBe(true);
    expect(called).toBe(true);
  });

  it("should fail to select when there is no current item", () => {
    const palette = new CommandPalette(makeSystem());
    palette.setQuery("zzz");
    const result = palette.selectCurrent();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
  });

  it("should dispatch the item currently highlighted", () => {
    const system = new CommandSystem();
    let called = "";
    system.register(command("undo", "Undo"));
    system.register({ ...command("redo", "Redo"), handler: () => { called = "redo"; return ok(); } });
    const palette = new CommandPalette(system);
    expect(palette.getCurrentItem()?.id).toBe("redo");
    const result = palette.selectCurrent();
    expect(result.success).toBe(true);
    expect(called).toBe("redo");
  });
});
