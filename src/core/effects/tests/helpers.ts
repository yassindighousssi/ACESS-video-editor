import { EntityId, ProjectId, projectId, entityId } from "../../model/types";
import { Clip } from "../../model/entities";
import { createMediaAsset, createClip } from "../../model/factory";
import { RenderContext } from "../core/types";
import { TimeEngine } from "../../infrastructure/engines/time/time-engine";
import { MemoryEngine } from "../../infrastructure/engines/memory/memory-engine";
import { ErrorEngine } from "../../infrastructure/engines/error/error-engine";
import { fileEngineForMock } from "../../infrastructure/engines/file/file-engine.interface";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";

export function makeClip(name = "Test Clip", inMs = 0, outMs = 5000): Clip {
  const pid = projectId();
  const media = createMediaAsset(pid, "test.mp4", "hash-1", "video", 10000);
  return createClip(pid, name, media.id, inMs, outMs, 0);
}

export function makeProjectId(): ProjectId {
  return projectId();
}

export function makeEntityId(): EntityId {
  return entityId();
}

export function makeContext(): RenderContext {
  return {
    time: new TimeEngine(0),
    file: fileEngineForMock(new MockFileSystem()),
    memory: new MemoryEngine(),
    errors: new ErrorEngine(),
  };
}
