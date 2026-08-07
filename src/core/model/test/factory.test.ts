import { projectId, timeValueFromMs, timeValueToMs } from "../types";
import {
  createProject, createMediaAsset, createTrack, createClip, createTransition, createTitle,
  createEffect, createMarker, createCuePoint, createRelationship, createDefaultSettings,
  cloneProjectState, createEmptyJournal,
} from "../factory";

describe("Factory defaults", () => {
  const pid = projectId();

  describe("createProject", () => {
    it("should create project with defaults", () => {
      const p = createProject("My Project", pid);
      expect(p.id).toBe(pid);
      expect(p.version).toBe(1);
      expect(p.metadata.name).toBe("My Project");
      expect(p.metadata.settings.frameRate).toBe(30);
      expect(p.metadata.settings.resolution).toEqual({ width: 1920, height: 1080 });
      expect(p.media).toEqual([]);
      expect(p.tracks).toEqual([]);
      expect(p.clips).toEqual([]);
      expect(p.journal.entries).toEqual([]);
    });
  });

  describe("createMediaAsset", () => {
    it("should create with defaults", () => {
      const m = createMediaAsset(pid, "clip.mp4", "abc123", "video", 10000);
      expect(m.kind).toBe("media_asset");
      expect(m.mediaType).toBe("video");
      expect(m.duration.ticks).toBe(timeValueFromMs(10000).ticks);
      expect(m.metadata.codec).toBe("unknown");
      expect(m.analysis).toBeNull();
    });
  });

  describe("createTrack", () => {
    it("should create with defaults", () => {
      const t = createTrack(pid, "V1", "video", 0);
      expect(t.kind).toBe("track");
      expect(t.muted).toBe(false);
      expect(t.locked).toBe(false);
      expect(t.volume).toBe(1);
      expect(t.opacity).toBe(1);
      expect(t.clips).toEqual([]);
    });
  });

  describe("createClip", () => {
    it("should compute duration from in/out points", () => {
      const c = createClip(pid, "clip1", "media1" as never, 1000, 4000, 500);
      expect(c.kind).toBe("clip");
      expect(timeValueToMs(c.duration)).toBe(3000);
      expect(timeValueToMs(c.timelineIn)).toBe(500);
      expect(c.speed).toBe(1);
      expect(c.volume).toBe(1);
      expect(c.effects).toEqual([]);
    });
  });

  describe("createTransition", () => {
    it("should create transition", () => {
      const tr = createTransition(pid, "fade", "clipA" as never, "clipB" as never, 500);
      expect(tr.kind).toBe("transition");
      expect(tr.transitionType).toBe("fade");
      expect(timeValueToMs(tr.duration)).toBe(500);
    });
  });

  describe("createTitle", () => {
    it("should create title with default style", () => {
      const t = createTitle(pid, "Hello", 0, 2000, "track1" as never);
      expect(t.kind).toBe("title");
      expect(t.text).toBe("Hello");
      expect(t.style.fontFamily).toBe("Arial");
      expect(t.style.fontSize).toBe(48);
    });
  });

  describe("createEffect", () => {
    it("should create enabled effect", () => {
      const e = createEffect(pid, "blur", "clip1" as never);
      expect(e.kind).toBe("effect");
      expect(e.effectType).toBe("blur");
      expect(e.enabled).toBe(true);
    });
  });

  describe("createMarker", () => {
    it("should create marker", () => {
      const m = createMarker(pid, "Chapter 1", 5000);
      expect(m.kind).toBe("marker");
      expect(m.color).toBe("#FF0000");
      expect(timeValueToMs(m.position)).toBe(5000);
    });
  });

  describe("createCuePoint", () => {
    it("should create cue point", () => {
      const c = createCuePoint(pid, "cue", 1000, "bookmark");
      expect(c.kind).toBe("cue_point");
      expect(c.cueType).toBe("bookmark");
    });
  });

  describe("createRelationship", () => {
    it("should create relationship", () => {
      const r = createRelationship("references", "clip1" as never, "media1" as never);
      expect(r.type).toBe("references");
      expect(r.from).toBe("clip1");
      expect(r.to).toBe("media1");
      expect(r.metadata).toEqual({});
    });
  });

  describe("createDefaultSettings", () => {
    it("should apply overrides", () => {
      const s = createDefaultSettings({ frameRate: 60, audioChannels: 6 });
      expect(s.frameRate).toBe(60);
      expect(s.audioChannels).toBe(6);
      expect(s.resolution).toEqual({ width: 1920, height: 1080 });
    });

    it("should use defaults when called without overrides", () => {
      const s = createDefaultSettings();
      expect(s.frameRate).toBe(30);
      expect(s.announcementLevel).toBe("all");
      expect(s.autoAnalysis).toBe(false);
    });
  });

  describe("createEmptyJournal", () => {
    it("should create empty journal", () => {
      const j = createEmptyJournal();
      expect(j.entries).toEqual([]);
      expect(j.undoStack).toEqual([]);
      expect(j.redoStack).toEqual([]);
    });
  });

  describe("cloneProjectState", () => {
    it("should deep copy arrays", () => {
      const p = createProject("P", pid);
      const m = createMediaAsset(pid, "a.mp4", "h", "video", 1000);
      p.media.push(m);
      const clone = cloneProjectState(p);
      clone.media[0]!.sourcePath = "changed.mp4";
      expect(p.media[0]!.sourcePath).toBe("a.mp4");
    });

    it("should not share clip arrays between track and clip list", () => {
      const p = createProject("P", pid);
      const track = createTrack(pid, "V1", "video", 0);
      const clip = createClip(pid, "c", "m" as never, 0, 1000, 0);
      p.tracks.push(track);
      p.clips.push(clip);
      p.tracks[0]!.clips.push(clip.id);
      const clone = cloneProjectState(p);
      clone.tracks[0]!.clips.pop();
      expect(p.tracks[0]!.clips.length).toBe(1);
    });
  });
});
