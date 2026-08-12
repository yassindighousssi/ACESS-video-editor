import { CommandEngine } from "./command-engine";
import { ErrorCode } from "../../infrastructure/common/types";

describe("CommandEngine", () => {
  let engine: CommandEngine;

  beforeEach(() => {
    engine = new CommandEngine();
  });

  describe("normalizeShortcut", () => {
    it("should lowercase and strip whitespace", () => {
      expect(CommandEngine.normalizeShortcut("  Ctrl + A  ")).toBe("ctrl+a");
      expect(CommandEngine.normalizeShortcut("Ctrl+Shift+S")).toBe("ctrl+shift+s");
    });
  });

  describe("registerCommand", () => {
    it("should register a command", () => {
      const result = engine.registerCommand("Ctrl+A", "timeline", "تحديد الكل", "Select all", () => {});
      expect(result.success).toBe(true);
      expect(engine.hasCommand("ctrl+a")).toBe(true);
      expect(engine.getCommandCount()).toBe(1);
    });

    it("should reject duplicate shortcuts regardless of casing", () => {
      engine.registerCommand("Ctrl+A", "timeline", "أ", "a", () => {});
      const result = engine.registerCommand("ctrl+a", "media", "ب", "b", () => {});
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should reject empty shortcuts", () => {
      const result = engine.registerCommand("   ", "timeline", "أ", "a", () => {});
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });
  });

  describe("executeCommand", () => {
    it("should run the handler of a registered shortcut", () => {
      let called = false;
      engine.registerCommand("Ctrl+X", "timeline", "قص", "Cut", () => { called = true; });
      const result = engine.executeCommand("ctrl+x");
      expect(result.success).toBe(true);
      expect(called).toBe(true);
    });

    it("should return an error for unknown shortcuts", () => {
      const result = engine.executeCommand("Ctrl+Z");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should block commands from a different room when a current-room provider is set", () => {
      let called = false;
      let current: string | null = "timeline";
      const scoped = new CommandEngine(() => current as never);
      scoped.registerCommand("Ctrl+X", "media", "قص", "Cut", () => { called = true; });
      const blocked = scoped.executeCommand("Ctrl+X");
      expect(blocked.success).toBe(false);
      expect(called).toBe(false);
      current = "media";
      const allowed = scoped.executeCommand("Ctrl+X");
      expect(allowed.success).toBe(true);
      expect(called).toBe(true);
    });

    it("should allow all commands when no provider is set", () => {
      let called = false;
      engine.registerCommand("Ctrl+X", "timeline", "قص", "Cut", () => { called = true; });
      const result = engine.executeCommand("Ctrl+X");
      expect(result.success).toBe(true);
      expect(called).toBe(true);
    });
  });

  describe("unregisterCommand", () => {
    it("should remove a registered command", () => {
      engine.registerCommand("Ctrl+X", "timeline", "قص", "Cut", () => {});
      const result = engine.unregisterCommand("ctrl+x");
      expect(result.success).toBe(true);
      expect(engine.hasCommand("Ctrl+X")).toBe(false);
      expect(engine.getCommandCount()).toBe(0);
    });

    it("should fail to remove an unknown command", () => {
      const result = engine.unregisterCommand("Ctrl+X");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });
  });

  describe("introspection", () => {
    it("should list commands sorted by shortcut", () => {
      engine.registerCommand("Ctrl+Y", "timeline", "إعادة", "Redo", () => {});
      engine.registerCommand("Ctrl+A", "timeline", "تحديد", "Select", () => {});
      const commands = engine.listCommands();
      expect(commands.map(c => c.shortcut)).toEqual(["ctrl+a", "ctrl+y"]);
    });

    it("should get a command by shortcut", () => {
      engine.registerCommand("Ctrl+Z", "timeline", "تراجع", "Undo", () => {});
      const command = engine.getCommand("ctrl+z");
      expect(command?.nameEn).toBe("Undo");
      expect(command?.roomId).toBe("timeline");
    });
  });
});
