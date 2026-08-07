import { projectId, timeValueToMs, timeValueFromMs } from "./types";
import { createProject, createMediaAsset, createTrack, createClip } from "./factory";
import {
  serializeProject, deserializeProject, serializeProjectToBytes, deserializeProjectFromBytes, projectRoundTrip,
} from "./project-file";
import { ErrorCode } from "../infrastructure/common/types";

function sampleProject() {
  const pid = projectId();
  const project = createProject("Demo", pid);
  const media = createMediaAsset(pid, "/media/beach.mp4", "hash1", "video", 30000);
  const track = createTrack(pid, "V1", "video", 0);
  const clip = createClip(pid, "Beach", media.id, 0, 5000, 0);
  project.media.push(media);
  project.tracks.push(track);
  project.clips.push(clip);
  return { project, media, track, clip };
}

describe("project-file serializer", () => {
  it("should serialize a project to a JSON envelope", () => {
    const { project } = sampleProject();
    const result = serializeProject(project);
    expect(result.success).toBe(true);
    if (result.success) {
      const envelope = JSON.parse(result.value);
      expect(envelope.format).toBe("tempo-project");
      expect(envelope.version).toBe(1);
      expect(envelope.project.metadata.name).toBe("Demo");
    }
  });

  it("should round-trip a project including bigint time values", () => {
    const { project, clip } = sampleProject();
    const result = projectRoundTrip(project);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.id).toBe(project.id);
      expect(result.value.metadata.name).toBe("Demo");
      expect(result.value.media).toHaveLength(1);
      expect(result.value.tracks).toHaveLength(1);
      expect(result.value.clips).toHaveLength(1);
      expect(timeValueToMs(result.value.clips[0]!.duration)).toBe(timeValueToMs(clip.duration));
      expect(timeValueToMs(result.value.media[0]!.duration)).toBe(timeValueToMs(project.media[0]!.duration));
      expect(result.value.clips[0]!.timelineIn.ticks).toBe(clip.timelineIn.ticks);
    }
  });

  it("should reject invalid JSON", () => {
    const result = deserializeProject("{ not json");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
  });

  it("should reject a primitive envelope value", () => {
    const result = deserializeProject("42");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
  });

  it("should reject an envelope whose project is not an object", () => {
    const result = deserializeProject(JSON.stringify({ format: "tempo-project", version: 1, project: 42 }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
  });

  it("should reject a missing envelope", () => {
    const result = deserializeProject(JSON.stringify({ name: "x" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
  });

  it("should reject a wrong format or version", () => {
    const { project } = sampleProject();
    const serialized = serializeProject(project);
    if (!serialized.success) throw new Error("serialize failed");
    const envelope = JSON.parse(serialized.value);
    const wrongFormat = deserializeProject(JSON.stringify({ ...envelope, format: "other" }));
    expect(wrongFormat.success).toBe(false);
    const wrongVersion = deserializeProject(JSON.stringify({ ...envelope, version: 99 }));
    expect(wrongVersion.success).toBe(false);
  });

  it("should reject a project missing required arrays", () => {
    const { project } = sampleProject();
    const serialized = serializeProject(project);
    if (!serialized.success) throw new Error("serialize failed");
    const envelope = JSON.parse(serialized.value);
    const { media, ...noMedia } = envelope.project;
    void media;
    const result = deserializeProject(JSON.stringify({ ...envelope, project: noMedia }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
  });

  it("should round-trip via bytes", () => {
    const { project } = sampleProject();
    const bytes = serializeProjectToBytes(project);
    expect(bytes.success).toBe(true);
    if (!bytes.success) return;
    const parsed = deserializeProjectFromBytes(bytes.value);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.value.id).toBe(project.id);
      expect(timeValueFromMs(0).ticks).toBe(BigInt(0));
    }
  });
});
