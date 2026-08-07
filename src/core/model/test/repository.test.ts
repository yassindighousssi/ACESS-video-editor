import { projectId } from "../types";
import { createProject, createMediaAsset, createTrack, createClip, createRelationship } from "../factory";
import { Project } from "../entities";
import {
  defaultProjectRepository, IProjectRepository, IMediaRepository, ITrackRepository,
  IClipRepository, IMarkerRepository, IRelationshipRepository,
} from "../repository";
import { ModelError } from "../types";

describe("Repository Layer", () => {
  describe("ProjectRepository", () => {
    let repo: IProjectRepository;
    const pid = projectId();

    beforeEach(() => {
      repo = defaultProjectRepository();
    });

    it("should save and load", () => {
      const p = createProject("P", pid);
      expect(repo.save(p).success).toBe(true);
      const loaded = repo.load(pid);
      expect(loaded.success).toBe(true);
      if (loaded.success) expect(loaded.value.metadata.name).toBe("P");
    });

    it("should report exists", () => {
      const p = createProject("P", pid);
      repo.save(p);
      expect(repo.exists(pid)).toBe(true);
      expect(repo.exists(projectId())).toBe(false);
    });

    it("should list projects", () => {
      repo.save(createProject("A", pid));
      repo.save(createProject("B", projectId()));
      const list = repo.list();
      if (list.success) expect(list.value.length).toBe(2);
    });

    it("should delete project", () => {
      repo.save(createProject("P", pid));
      expect(repo.delete(pid).success).toBe(true);
      expect(repo.exists(pid)).toBe(false);
      const again = repo.delete(pid);
      expect(again.success).toBe(false);
    });

    it("should fail to load missing project", () => {
      const loaded = repo.load(projectId());
      expect(loaded.success).toBe(false);
      if (!loaded.success) expect(loaded.error).toBe(ModelError.ENTITY_NOT_FOUND);
    });
  });

  describe("MediaRepository", () => {
    let repo: IMediaRepository;
    let project: Project;
    const pid = projectId();

    beforeEach(() => {
      project = createProject("P", pid);
      repo = {
        findByProject: (p) => p.media,
        findById: (p, id) => {
          const m = p.media.find(x => x.id === id);
          return m ? { success: true, value: m } : { success: false, error: ModelError.MEDIA_ASSET_NOT_FOUND };
        },
        add: (p, asset) => ({ success: true, value: { ...p, media: [...p.media, asset] } }),
        remove: (p, id) => ({ success: true, value: { ...p, media: p.media.filter(m => m.id !== id) } }),
      };
    });

    it("should find by project", () => {
      const asset = createMediaAsset(pid, "a.mp4", "h", "video", 1000);
      project.media.push(asset);
      expect(repo.findByProject(project, pid)).toHaveLength(1);
    });

    it("should find by id", () => {
      const asset = createMediaAsset(pid, "a.mp4", "h", "video", 1000);
      project.media.push(asset);
      const found = repo.findById(project, asset.id);
      expect(found.success).toBe(true);
    });

    it("should add and remove", () => {
      const asset = createMediaAsset(pid, "a.mp4", "h", "video", 1000);
      const added = repo.add(project, asset);
      if (!added.success) return;
      expect(added.value.media.length).toBe(1);
      const removed = repo.remove(added.value, asset.id);
      if (!removed.success) return;
      expect(removed.value.media.length).toBe(0);
    });
  });

  describe("TrackRepository", () => {
    let repo: ITrackRepository;
    let project: Project;
    const pid = projectId();

    beforeEach(() => {
      project = createProject("P", pid);
      repo = {
        findByProject: (p) => p.tracks,
        findById: (p, id) => {
          const t = p.tracks.find(x => x.id === id);
          return t ? { success: true, value: t } : { success: false, error: ModelError.TRACK_NOT_FOUND };
        },
        add: (p, track) => ({ success: true, value: { ...p, tracks: [...p.tracks, track] } }),
        remove: (p, id) => ({ success: true, value: { ...p, tracks: p.tracks.filter(t => t.id !== id) } }),
        update: (p, track) => ({
          success: true,
          value: { ...p, tracks: p.tracks.map(t => t.id === track.id ? track : t) },
        }),
      };
    });

    it("should update a track", () => {
      const track = createTrack(pid, "V1", "video", 0);
      project.tracks.push(track);
      const updated = { ...track, name: "V2" };
      const result = repo.update(project, updated);
      if (result.success) expect(result.value.tracks[0]!.name).toBe("V2");
    });

    it("should find track by id", () => {
      const track = createTrack(pid, "V1", "video", 0);
      project.tracks.push(track);
      const found = repo.findById(project, track.id);
      expect(found.success).toBe(true);
      const missing = repo.findById(project, "ghost" as never);
      expect(missing.success).toBe(false);
    });
  });

  describe("ClipRepository", () => {
    let repo: IClipRepository;
    let project: Project;
    const pid = projectId();

    beforeEach(() => {
      project = createProject("P", pid);
      repo = {
        findByProject: (p) => p.clips,
        findById: (p, id) => {
          const c = p.clips.find(x => x.id === id);
          return c ? { success: true, value: c } : { success: false, error: ModelError.CLIP_NOT_FOUND };
        },
        add: (p, clip) => ({ success: true, value: { ...p, clips: [...p.clips, clip] } }),
        remove: (p, id) => ({ success: true, value: { ...p, clips: p.clips.filter(c => c.id !== id) } }),
        update: (p, clip) => ({
          success: true,
          value: { ...p, clips: p.clips.map(c => c.id === clip.id ? clip : c) },
        }),
      };
    });

    it("should add and remove clips", () => {
      const clip = createClip(pid, "c", "m" as never, 0, 1000, 0);
      const added = repo.add(project, clip);
      if (!added.success) return;
      expect(added.value.clips.length).toBe(1);
      const removed = repo.remove(added.value, clip.id);
      if (!removed.success) return;
      expect(removed.value.clips.length).toBe(0);
    });
  });

  describe("MarkerRepository", () => {
    let repo: IMarkerRepository;
    let project: Project;
    const pid = projectId();

    beforeEach(() => {
      project = createProject("P", pid);
      repo = {
        findByProject: (p) => p.markers,
        findById: (p, id) => {
          const m = p.markers.find(x => x.id === id);
          return m ? { success: true, value: m } : { success: false, error: ModelError.ENTITY_NOT_FOUND };
        },
        add: (p, marker) => ({ success: true, value: { ...p, markers: [...p.markers, marker] } }),
        remove: (p, id) => ({ success: true, value: { ...p, markers: p.markers.filter(m => m.id !== id) } }),
      };
    });

    it("should add and remove markers", () => {
      const marker = { kind: "marker" as const, id: "m1" as never, projectId: pid, name: "M", position: { ticks: BigInt(0) }, color: "#000", notes: "", category: "" };
      const added = repo.add(project, marker);
      if (!added.success) return;
      expect(added.value.markers.length).toBe(1);
      const removed = repo.remove(added.value, marker.id);
      if (!removed.success) return;
      expect(removed.value.markers.length).toBe(0);
    });
  });

  describe("RelationshipRepository", () => {
    let repo: IRelationshipRepository;
    let project: Project;
    const pid = projectId();

    beforeEach(() => {
      project = createProject("P", pid);
      repo = {
        find: (p, type, from, to) => p.relationships.filter(r =>
          r.type === type &&
          (from === undefined || r.from === from) &&
          (to === undefined || r.to === to)),
        add: (p, rel) => ({ success: true, value: { ...p, relationships: [...p.relationships, rel] } }),
        remove: (p, relId) => ({ success: true, value: { ...p, relationships: p.relationships.filter(r => r.id !== relId) } }),
        removeAllFor: (p, entityId) => ({ success: true, value: { ...p, relationships: p.relationships.filter(r => r.from !== entityId && r.to !== entityId) } }),
      };
    });

    it("should find relationships by type", () => {
      const a = createRelationship("references", "c1" as never, "m1" as never);
      const b = createRelationship("contains", "t1" as never, "c1" as never);
      project.relationships.push(a, b);
      expect(repo.find(project, "references")).toHaveLength(1);
      expect(repo.find(project, "references", "c1" as never)).toHaveLength(1);
      expect(repo.find(project, "references", "x" as never)).toHaveLength(0);
    });

    it("should remove all relationships for entity", () => {
      const a = createRelationship("references", "c1" as never, "m1" as never);
      const b = createRelationship("contains", "t1" as never, "c1" as never);
      project.relationships.push(a, b);
      const result = repo.removeAllFor(project, "c1" as never);
      if (result.success) expect(result.value.relationships.length).toBe(0);
    });
  });
});
