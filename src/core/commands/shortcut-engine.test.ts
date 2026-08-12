import { ShortcutEngine } from "./shortcut-engine";

describe("ShortcutEngine", () => {
  describe("normalize", () => {
    it("should lowercase and canonicalize modifier order", () => {
      expect(ShortcutEngine.normalize("  Ctrl + Shift + N  ")).toBe("ctrl+shift+n");
    });

    it("should canonicalize modifier aliases", () => {
      expect(ShortcutEngine.normalize("Control+Option+Meta+P")).toBe("ctrl+alt+meta+p");
      expect(ShortcutEngine.normalize("Cmd+Shift+S")).toBe("shift+meta+s");
    });

    it("should keep plain keys without modifiers", () => {
      expect(ShortcutEngine.normalize("F1")).toBe("f1");
      expect(ShortcutEngine.normalize("Space")).toBe("space");
    });

    it("should return empty for a shortcut with no key", () => {
      expect(ShortcutEngine.normalize("Ctrl+Shift")).toBe("");
      expect(ShortcutEngine.normalize("   ")).toBe("");
    });
  });

  describe("parse", () => {
    it("should split modifiers from the key", () => {
      const parsed = ShortcutEngine.parse("Ctrl+Alt+Delete");
      expect(parsed.key).toBe("delete");
      expect(parsed.modifiers).toEqual(["ctrl", "alt"]);
    });

    it("should return an empty key and no modifiers for invalid input", () => {
      const parsed = ShortcutEngine.parse("Ctrl+Shift");
      expect(parsed.key).toBe("");
      expect(parsed.modifiers).toEqual([]);
    });
  });

  describe("format", () => {
    it("should produce a human readable shortcut", () => {
      expect(ShortcutEngine.format("ctrl+shift+n")).toBe("Ctrl+Shift+N");
    });

    it("should return empty for invalid input", () => {
      expect(ShortcutEngine.format("Ctrl+Shift")).toBe("");
    });
  });

  describe("isValid", () => {
    it("should accept a real shortcut", () => {
      expect(ShortcutEngine.isValid("Ctrl+Z")).toBe(true);
    });

    it("should reject a modifier-only shortcut", () => {
      expect(ShortcutEngine.isValid("Ctrl+Alt")).toBe(false);
    });
  });

  describe("matches", () => {
    it("should match an exact key combination", () => {
      const event = { ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, key: "N" };
      expect(ShortcutEngine.matches(event, "Ctrl+Shift+N")).toBe(true);
      expect(ShortcutEngine.matches(event, "Ctrl+Shift+S")).toBe(false);
    });

    it("should not match when modifier counts differ", () => {
      const event = { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, key: "N" };
      expect(ShortcutEngine.matches(event, "Ctrl+Shift+N")).toBe(false);
    });

    it("should not match when the same modifier count differs in content", () => {
      const event = { ctrlKey: true, shiftKey: false, altKey: true, metaKey: false, key: "P" };
      expect(ShortcutEngine.matches(event, "Ctrl+Shift+P")).toBe(false);
    });

    it("should not match a different key", () => {
      const event = { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, key: "A" };
      expect(ShortcutEngine.matches(event, "Ctrl+B")).toBe(false);
    });

    it("should match the meta modifier", () => {
      const event = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: true, key: "k" };
      expect(ShortcutEngine.matches(event, "Cmd+K")).toBe(true);
    });

    it("should not match a plain key event against a shortcut without modifiers", () => {
      const event = { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, key: "F1" };
      expect(ShortcutEngine.matches(event, "F1")).toBe(false);
    });

    it("should reject an invalid shortcut", () => {
      const event = { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, key: "X" };
      expect(ShortcutEngine.matches(event, "Ctrl+Shift")).toBe(false);
    });
  });
});
