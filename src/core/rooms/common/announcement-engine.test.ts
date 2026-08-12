import { AnnouncementEngine } from "./announcement-engine";

describe("AnnouncementEngine", () => {
  let engine: AnnouncementEngine;

  beforeEach(() => {
    engine = new AnnouncementEngine();
  });

  describe("speak", () => {
    it("should create a bilingual announcement", () => {
      const announcement = engine.speak("تم فتح المشروع", "Project opened", "important", "project");
      expect(announcement).toBeDefined();
      expect(announcement?.textAr).toBe("تم فتح المشروع");
      expect(announcement?.textEn).toBe("Project opened");
      expect(announcement?.level).toBe("important");
      expect(announcement?.source).toBe("project");
      expect(announcement?.id).toBeDefined();
    });

    it("should default to level all and source system", () => {
      const announcement = engine.speak("نص", "text");
      expect(announcement?.level).toBe("all");
      expect(announcement?.source).toBe("system");
    });
  });

  describe("listeners", () => {
    it("should notify listeners of delivered announcements", () => {
      const received: string[] = [];
      engine.onAnnounce(a => received.push(a.textEn));
      engine.speak("مرحبا", "Hello");
      expect(received).toEqual(["Hello"]);
    });

    it("should not notify listeners when filtered out by level", () => {
      const received: string[] = [];
      engine.onAnnounce(a => received.push(a.textEn));
      engine.setLevel("critical_only");
      engine.speak("مهم", "Important", "important");
      expect(received).toEqual([]);
    });

    it("should allow unsubscribing a listener", () => {
      const received: string[] = [];
      const off = engine.onAnnounce(a => received.push(a.textEn));
      off();
      engine.speak("نص", "Text");
      expect(received).toEqual([]);
    });
  });

  describe("level filtering", () => {
    it("should deliver all announcements when level is all", () => {
      const received: string[] = [];
      engine.onAnnounce(a => received.push(a.level));
      engine.speak("a", "a", "all");
      engine.speak("b", "b", "important");
      engine.speak("c", "c", "critical_only");
      expect(received).toEqual(["all", "important", "critical_only"]);
    });

    it("should filter routine announcements at important level", () => {
      const received: string[] = [];
      engine.onAnnounce(a => received.push(a.level));
      engine.setLevel("important");
      engine.speak("a", "a", "all");
      engine.speak("b", "b", "important");
      engine.speak("c", "c", "critical_only");
      expect(received).toEqual(["important", "critical_only"]);
    });

    it("should only deliver critical announcements at critical_only level", () => {
      const received: string[] = [];
      engine.onAnnounce(a => received.push(a.level));
      engine.setLevel("critical_only");
      engine.speak("a", "a", "all");
      engine.speak("b", "b", "important");
      engine.speak("c", "c", "critical_only");
      expect(received).toEqual(["critical_only"]);
    });

    it("should return undefined for filtered announcements", () => {
      engine.setLevel("critical_only");
      const result = engine.speak("مهم", "Important", "important");
      expect(result).toBeUndefined();
    });
  });

  describe("history", () => {
    it("should record all announcements regardless of filter", () => {
      engine.setLevel("critical_only");
      engine.speak("روتين", "Routine", "all");
      engine.speak("مهم", "Important", "important");
      engine.speak("حرج", "Critical", "critical_only");
      expect(engine.getHistory()).toHaveLength(3);
      expect(engine.getHistory("important")).toHaveLength(1);
      expect(engine.getHistory("critical_only")).toHaveLength(1);
    });

    it("should return the last announcement", () => {
      engine.speak("أول", "First");
      engine.speak("ثاني", "Second");
      expect(engine.getLast()?.textEn).toBe("Second");
    });

    it("should return undefined last when empty", () => {
      expect(engine.getLast()).toBeUndefined();
    });

    it("should cap history at the maximum size", () => {
      for (let i = 0; i < 550; i++) {
        engine.speak(`نص ${i}`, `Text ${i}`);
      }
      expect(engine.getHistory()).toHaveLength(500);
      expect(engine.getLast()?.textEn).toBe("Text 549");
    });
  });

  describe("clear", () => {
    it("should reset history, listeners and level", () => {
      const received: string[] = [];
      engine.onAnnounce(a => received.push(a.textEn));
      engine.setLevel("critical_only");
      engine.speak("نص", "Text", "critical_only");
      engine.clear();
      expect(engine.getHistory()).toHaveLength(0);
      expect(engine.getLast()).toBeUndefined();
      expect(engine.getLevel()).toBe("all");
      engine.speak("نص", "Text2", "all");
      expect(received).toEqual(["Text"]);
    });
  });
});
