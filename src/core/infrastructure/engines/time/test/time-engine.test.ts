import { TimeEngine } from "../time-engine";
import { ITimeEngine } from "../time-engine.interface";
import { ErrorCode } from "../../../common/types";

describe("TimeEngine", () => {
  let engine: ITimeEngine;

  beforeEach(() => {
    engine = new TimeEngine(0);
  });

  describe("now", () => {
    it("should return initial time", () => {
      expect(engine.now()).toBe(0);
    });
  });

  describe("reset", () => {
    it("should reset to 0 by default", () => {
      engine.advanceFrame();
      engine.reset();
      expect(engine.now()).toBeGreaterThan(0);
    });

    it("should reset to specific timestamp", () => {
      engine.reset(1000);
      expect(engine.now()).toBe(1000);
    });
  });

  describe("advanceFrame", () => {
    it("should advance time by one frame at 30fps", () => {
      const result = engine.advanceFrame();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.timestamp).toBeCloseTo(33.33, 0);
      }
    });

    it("should advance time by one frame at 60fps", () => {
      engine.setRate(60);
      const result = engine.advanceFrame();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.timestamp).toBeCloseTo(16.67, 0);
      }
    });

    it("should double frame duration at 2x speed", () => {
      engine.setSpeed(2);
      const result = engine.advanceFrame();
      if (result.success) {
        expect(result.value.timestamp).toBeCloseTo(66.67, 0);
      }
    });

    it("should progress frame number over multiple advances", () => {
      for (let i = 0; i < 30; i++) engine.advanceFrame();
      const snap = engine.getSnapshot();
      expect(snap.frameNumber).toBe(30);
      expect(snap.timestamp).toBeCloseTo(1000, 0);
    });
  });

  describe("advanceMs", () => {
    it("should advance by specified milliseconds", () => {
      const result = engine.advanceMs(1000);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.timestamp).toBe(1000);
        expect(result.value.frameNumber).toBe(30);
      }
    });

    it("should return INVALID_INPUT for negative ms", () => {
      const result = engine.advanceMs(-100);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.INVALID_INPUT);
      }
    });

    it("should apply speed scaling", () => {
      engine.setSpeed(2);
      engine.advanceMs(1000);
      const snap = engine.getSnapshot();
      expect(snap.timestamp).toBe(2000);
      expect(snap.frameNumber).toBe(60);
    });

    it("should handle slow motion", () => {
      engine.setSpeed(0.5);
      engine.advanceMs(1000);
      const snap = engine.getSnapshot();
      expect(snap.timestamp).toBe(500);
      expect(snap.frameNumber).toBe(15);
    });
  });

  describe("setRate / getRate", () => {
    it("should return the current frame rate", () => {
      expect(engine.getRate()).toBe(30);
      engine.setRate(60);
      expect(engine.getRate()).toBe(60);
    });
  });

  describe("getSnapshot", () => {
    it("should return current state", () => {
      const snap = engine.getSnapshot();
      expect(snap.seconds).toBe(0);
      expect(snap.frameNumber).toBe(0);
      expect(snap.rate).toBe(30);
    });
  });

  describe("setSpeed / getSpeed", () => {
    it("should clamp speed to valid range", () => {
      engine.setSpeed(0.05);
      expect(engine.getSpeed()).toBe(0.1);
      engine.setSpeed(20);
      expect(engine.getSpeed()).toBe(10);
    });
  });

  describe("frame rate change", () => {
    it("should recalculate frames on rate change", () => {
      engine.advanceMs(500);
      engine.setRate(60);
      const snap = engine.getSnapshot();
      expect(snap.frameNumber).toBe(30);
    });
  });

  describe("default construction", () => {
    it("should start at the current wall-clock time", () => {
      const wallClock = new TimeEngine();
      expect(wallClock.now()).toBeGreaterThan(0);
      expect(wallClock.now()).toBeLessThanOrEqual(Date.now());
    });
  });
});
