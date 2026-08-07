import { ErrorCode } from "../infrastructure/common/types";
import { MockMediaEngine, encodeMockMedia } from "./mock-media-engine";

const engine = new MockMediaEngine();

describe("MockMediaEngine", () => {
  describe("probeBytes", () => {
    it("should probe a video file", () => {
      const result = engine.probeBytes(encodeMockMedia({ kind: "video", durationMs: 5000, width: 1920, height: 1080, frameRate: 30, codec: "h264", container: "mp4", bitrate: 8_000_000 }));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.mediaType).toBe("video");
      expect(result.value.durationMs).toBe(5000);
      expect(result.value.width).toBe(1920);
      expect(result.value.height).toBe(1080);
      expect(result.value.frameRate).toBe(30);
      expect(result.value.codec).toBe("h264");
      expect(result.value.container).toBe("mp4");
    });

    it("should probe an audio file with only sample-rate metadata", () => {
      const result = engine.probeBytes(encodeMockMedia({ kind: "audio", durationMs: 15000, sampleRate: 44100, channels: 2 }));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.mediaType).toBe("audio");
      expect(result.value.sampleRate).toBe(44100);
      expect(result.value.channels).toBe(2);
      expect(result.value.width).toBeNull();
    });

    it("should probe an image file", () => {
      const result = engine.probeBytes(encodeMockMedia({ kind: "image", durationMs: 0, width: 800, height: 600 }));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.mediaType).toBe("image");
      expect(result.value.width).toBe(800);
      expect(result.value.height).toBe(600);
      expect(result.value.frameRate).toBeNull();
    });

    it("should default missing optional fields", () => {
      const result = engine.probeBytes(new TextEncoder().encode("TEMPOMEDIA:{\"kind\":\"audio\"}"));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.durationMs).toBe(0);
      expect(result.value.bitrate).toBe(0);
      expect(result.value.container).toBe("unknown");
      expect(result.value.codec).toBe("unknown");
    });

    it("should report UNSUPPORTED_FORMAT for arbitrary bytes", () => {
      const result = engine.probeBytes(new TextEncoder().encode("not a media file"));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.UNSUPPORTED_FORMAT);
    });

    it("should report CORRUPT_FILE when the payload is not valid JSON", () => {
      const result = engine.probeBytes(new TextEncoder().encode("TEMPOMEDIA:{not json"));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
    });

    it("should report CORRUPT_FILE when the payload has an unknown kind", () => {
      const result = engine.probeBytes(new TextEncoder().encode('TEMPOMEDIA:{"kind":"gif","durationMs":1}'));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
    });
  });

  describe("analyzeBytes", () => {
    it("should build an analysis summary with media type, duration and dimensions", () => {
      const result = engine.analyzeBytes(encodeMockMedia({ kind: "video", durationMs: 5000, width: 1920, height: 1080, codec: "h264" }));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.summary).toContain("video");
      expect(result.value.summary).toContain("5000ms");
      expect(result.value.summary).toContain("1920x1080");
      expect(result.value.summary).toContain("h264");
      expect(result.value.data["mediaType"]).toBe("video");
      expect(result.value.analyzedAt.iso).toBeDefined();
    });

    it("should build a summary without dimensions for audio", () => {
      const result = engine.analyzeBytes(encodeMockMedia({ kind: "audio", durationMs: 3000, codec: "aac" }));
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.summary).toContain("audio");
      expect(result.value.summary).not.toContain("x");
    });

    it("should report MEDIA_ANALYSIS_FAILED when the bytes cannot be probed", () => {
      const result = engine.analyzeBytes(new TextEncoder().encode("not a media file"));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.MEDIA_ANALYSIS_FAILED);
    });
  });
});
