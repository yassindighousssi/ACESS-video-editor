import { CommandSystem } from "./command-system";
import type { CommandDefinition } from "./command-definition";
import { ErrorCode, Result } from "../infrastructure/common/types";

function ok(): Result<void, ErrorCode> {
  return { success: true, value: undefined };
}

function command(partial: Partial<CommandDefinition>): CommandDefinition {
  return {
    id: "cmd",
    labelAr: "أمر",
    labelEn: "Command",
    shortcut: null,
    scope: "global",
    category: "General",
    description: "A command",
    handler: ok,
    ...partial,
  };
}

describe("CommandSystem", () => {
  describe("register", () => {
    it("should register a command and expose it", () => {
      const system = new CommandSystem();
      const result = system.register(command({ id: "undo", shortcut: "Ctrl+Z" }));
      expect(result.success).toBe(true);
      expect(system.hasCommand("undo")).toBe(true);
      expect(system.getCommandCount()).toBe(1);
    });

    it("should reject an empty command id", () => {
      const system = new CommandSystem();
      const result = system.register(command({ id: "  " }));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should reject a duplicate command id", () => {
      const system = new CommandSystem();
      system.register(command({ id: "undo" }));
      const result = system.register(command({ id: "undo" }));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should reject an invalid shortcut", () => {
      const system = new CommandSystem();
      const result = system.register(command({ id: "redo", shortcut: "Ctrl+Shift" }));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should reject a duplicate shortcut regardless of casing", () => {
      const system = new CommandSystem();
      system.register(command({ id: "a", shortcut: "Ctrl+A" }));
      const result = system.register(command({ id: "b", shortcut: "ctrl+a" }));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should allow two commands without shortcuts", () => {
      const system = new CommandSystem();
      system.register(command({ id: "a" }));
      const result = system.register(command({ id: "b" }));
      expect(result.success).toBe(true);
    });
  });

  describe("unregister", () => {
    it("should remove a command and its shortcut", () => {
      const system = new CommandSystem();
      system.register(command({ id: "undo", shortcut: "Ctrl+Z" }));
      const result = system.unregister("undo");
      expect(result.success).toBe(true);
      expect(system.hasCommand("undo")).toBe(false);
      expect(system.getByShortcut("Ctrl+Z")).toBeUndefined();
    });

    it("should fail to remove an unknown command", () => {
      const system = new CommandSystem();
      const result = system.unregister("nope");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });
  });

  describe("lookups", () => {
    it("should look up by id and shortcut", () => {
      const system = new CommandSystem();
      system.register(command({ id: "undo", labelEn: "Undo", shortcut: "Ctrl+Z" }));
      expect(system.getById("undo")?.labelEn).toBe("Undo");
      expect(system.getByShortcut("ctrl+z")?.id).toBe("undo");
      expect(system.getByShortcut("Ctrl+P")).toBeUndefined();
      expect(system.getById("nope")).toBeUndefined();
    });
  });

  describe("dispatch", () => {
    it("should dispatch by id", () => {
      const system = new CommandSystem();
      let called = false;
      system.register(command({ id: "save", handler: () => { called = true; return ok(); } }));
      const result = system.dispatchById("save");
      expect(result.success).toBe(true);
      expect(called).toBe(true);
    });

    it("should fail to dispatch an unknown id", () => {
      const system = new CommandSystem();
      const result = system.dispatchById("nope");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should dispatch by shortcut", () => {
      const system = new CommandSystem();
      let called = false;
      system.register(command({ id: "save", shortcut: "Ctrl+S", handler: () => { called = true; return ok(); } }));
      const result = system.dispatchByShortcut("Ctrl+S");
      expect(result.success).toBe(true);
      expect(called).toBe(true);
    });

    it("should fail to dispatch an unknown shortcut", () => {
      const system = new CommandSystem();
      const result = system.dispatchByShortcut("Ctrl+S");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should propagate a handler error", () => {
      const system = new CommandSystem();
      system.register(command({ id: "boom", handler: () => ({ success: false as const, error: ErrorCode.OPERATION_FAILED }) }));
      const result = system.dispatchById("boom");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    });
  });

  describe("scoping", () => {
    it("should allow a global command regardless of the current room", () => {
      let current: "timeline" | null = "timeline";
      const system = new CommandSystem(() => current);
      let called = false;
      system.register(command({ id: "g", handler: () => { called = true; return ok(); } }));
      expect(system.dispatchById("g").success).toBe(true);
      expect(called).toBe(true);
    });

    it("should block a scoped command in a different room", () => {
      let current: "timeline" | "media" | null = "timeline";
      const system = new CommandSystem(() => current);
      let called = false;
      system.register(command({ id: "m", scope: "media", handler: () => { called = true; return ok(); } }));
      const result = system.dispatchById("m");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
      expect(called).toBe(false);
    });

    it("should allow a scoped command in its room", () => {
      let current: "timeline" | "media" | null = "media";
      const system = new CommandSystem(() => current);
      let called = false;
      system.register(command({ id: "m", scope: "media", handler: () => { called = true; return ok(); } }));
      expect(system.dispatchById("m").success).toBe(true);
      expect(called).toBe(true);
    });

    it("should allow a scoped command when no room is active", () => {
      const system = new CommandSystem(() => null);
      let called = false;
      system.register(command({ id: "m", scope: "media", handler: () => { called = true; return ok(); } }));
      expect(system.dispatchById("m").success).toBe(true);
      expect(called).toBe(true);
    });

    it("should allow any command when no provider is set", () => {
      const system = new CommandSystem();
      let called = false;
      system.register(command({ id: "m", scope: "media", handler: () => { called = true; return ok(); } }));
      expect(system.dispatchById("m").success).toBe(true);
      expect(called).toBe(true);
    });
  });

  describe("introspection", () => {
    it("should list commands sorted by category then label", () => {
      const system = new CommandSystem();
      system.register(command({ id: "b", labelEn: "Beta", category: "Edit" }));
      system.register(command({ id: "a", labelEn: "Alpha", category: "File" }));
      system.register(command({ id: "c", labelEn: "Gamma", category: "Edit" }));
      expect(system.list().map(c => c.id)).toEqual(["b", "c", "a"]);
    });

    it("should list shortcuts sorted", () => {
      const system = new CommandSystem();
      system.register(command({ id: "a", shortcut: "Ctrl+Y" }));
      system.register(command({ id: "b", shortcut: "Ctrl+A" }));
      expect(system.listShortcuts()).toEqual(["ctrl+a", "ctrl+y"]);
    });

    it("should return all commands for an empty query", () => {
      const system = new CommandSystem();
      system.register(command({ id: "a" }));
      system.register(command({ id: "b" }));
      expect(system.search("   ").length).toBe(2);
    });

    it("should rank id, label, and category matches", () => {
      const system = new CommandSystem();
      system.register(command({ id: "undo", labelEn: "Undo clip", category: "Edit" }));
      system.register(command({ id: "cut", labelEn: "Cut clip", category: "Edit" }));
      system.register(command({ id: "save", labelEn: "Save", category: "File" }));
      const results = system.search("undo");
      expect(results.map(c => c.id)).toEqual(["undo"]);
      const byCategory = system.search("edit");
      expect(byCategory.length).toBe(2);
    });

    it("should match the Arabic label", () => {
      const system = new CommandSystem();
      system.register(command({ id: "undo", labelAr: "تراجع" }));
      system.register(command({ id: "save", labelAr: "حفظ" }));
      const results = system.search("تراجع");
      expect(results.map(c => c.id)).toEqual(["undo"]);
    });

    it("should return no results for an unmatched query", () => {
      const system = new CommandSystem();
      system.register(command({ id: "undo" }));
      expect(system.search("zzz")).toEqual([]);
    });
  });
});
