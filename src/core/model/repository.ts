import { Result } from "../infrastructure/common/types";
import { ModelError } from "./types";
import { EntityId, ProjectId } from "./types";
import { Project, MediaAsset, Track, Clip, Marker, Relationship, RelationshipType } from "./entities";

export interface IProjectRepository {
  save(project: Project): Result<void, ModelError>;
  load(projectId: ProjectId): Result<Project, ModelError>;
  delete(projectId: ProjectId): Result<void, ModelError>;
  list(): Result<ProjectId[], ModelError>;
  exists(projectId: ProjectId): boolean;
}

export interface IMediaRepository {
  findByProject(project: Project, projectId: ProjectId): MediaAsset[];
  findById(project: Project, mediaId: EntityId): Result<MediaAsset, ModelError>;
  add(project: Project, asset: MediaAsset): Result<Project, ModelError>;
  remove(project: Project, mediaId: EntityId): Result<Project, ModelError>;
}

export interface ITrackRepository {
  findByProject(project: Project, projectId: ProjectId): Track[];
  findById(project: Project, trackId: EntityId): Result<Track, ModelError>;
  add(project: Project, track: Track): Result<Project, ModelError>;
  remove(project: Project, trackId: EntityId): Result<Project, ModelError>;
  update(project: Project, track: Track): Result<Project, ModelError>;
}

export interface IClipRepository {
  findByProject(project: Project, projectId: ProjectId): Clip[];
  findById(project: Project, clipId: EntityId): Result<Clip, ModelError>;
  add(project: Project, clip: Clip): Result<Project, ModelError>;
  remove(project: Project, clipId: EntityId): Result<Project, ModelError>;
  update(project: Project, clip: Clip): Result<Project, ModelError>;
}

export interface IMarkerRepository {
  findByProject(project: Project, projectId: ProjectId): Marker[];
  findById(project: Project, markerId: EntityId): Result<Marker, ModelError>;
  add(project: Project, marker: Marker): Result<Project, ModelError>;
  remove(project: Project, markerId: EntityId): Result<Project, ModelError>;
}

export interface IRelationshipRepository {
  find(project: Project, type: RelationshipType, from?: EntityId, to?: EntityId): Relationship[];
  add(project: Project, relationship: Relationship): Result<Project, ModelError>;
  remove(project: Project, relationshipId: Relationship["id"]): Result<Project, ModelError>;
  removeAllFor(project: Project, entityId: EntityId): Result<Project, ModelError>;
}

export function defaultProjectRepository(): IProjectRepository {
  const store = new Map<ProjectId, Project>();
  return {
    save(project: Project): Result<void, ModelError> {
      store.set(project.id, project);
      return { success: true, value: undefined };
    },
    load(projectId: ProjectId): Result<Project, ModelError> {
      const project = store.get(projectId);
      if (!project) return { success: false, error: ModelError.ENTITY_NOT_FOUND };
      return { success: true, value: project };
    },
    delete(projectId: ProjectId): Result<void, ModelError> {
      if (!store.has(projectId)) return { success: false, error: ModelError.ENTITY_NOT_FOUND };
      store.delete(projectId);
      return { success: true, value: undefined };
    },
    list(): Result<ProjectId[], ModelError> {
      return { success: true, value: Array.from(store.keys()) };
    },
    exists(projectId: ProjectId): boolean {
      return store.has(projectId);
    },
  };
}
