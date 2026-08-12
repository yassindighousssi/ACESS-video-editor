import { createHash } from "crypto";
import { Result } from "../infrastructure/common/types";
import { ModelError } from "./types";
import { EntityId, TransactionId, transactionId, createTimestamp, FrameRate } from "./types";
import { Project, JournalEntry, InverseEvent } from "./entities";
import { TransitionResult, applyEvent } from "./transitions";

export type TransitionFn = (state: Project) => TransitionResult;

export interface TransactionOutcome {
  readonly entry: JournalEntry;
  readonly newState: Project;
  readonly description: string;
}

function hashState(state: Project): string {
  const canonical = {
    id: state.id,
    media: state.media.map(m => ({ id: m.id, hash: m.sourceHash })),
    tracks: state.tracks.map(t => ({ id: t.id, clips: t.clips })),
    clips: state.clips.map(c => ({
      id: c.id,
      timelineIn: c.timelineIn.ticks.toString(),
      duration: c.duration.ticks.toString(),
      inPoint: c.inPoint.ticks.toString(),
      outPoint: c.outPoint.ticks.toString(),
    })),
    relationships: state.relationships.map(r => ({ id: r.id, type: r.type, from: r.from, to: r.to })),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export class TransactionEngine {
  private writeLock: boolean = false;

  run(state: Project, operation: string, engine: string, fn: TransitionFn): Result<TransactionOutcome, ModelError> {
    if (this.writeLock) {
      return { success: false, error: ModelError.OPERATION_FAILED };
    }
    this.writeLock = true;
    const started = Date.now();
    try {
      const before = hashState(state);
      const result = fn(state);
      if (!result.success) return result;

      const duration = Date.now() - started;
      const after = hashState(result.value.newState);

      const entry: JournalEntry = {
        id: transactionId(),
        timestamp: createTimestamp(),
        engine,
        operation,
        payload: {},
        inverseEvent: result.value.inverse,
        forwardEvent: result.value.forward,
        stateHashBefore: before,
        stateHashAfter: after,
        duration,
        success: true,
      };

      const newState: Project = {
        ...result.value.newState,
        journal: {
          entries: [...state.journal.entries, entry],
          undoStack: [...state.journal.undoStack, entry],
          redoStack: [],
        },
        modified: createTimestamp(),
      };

      return {
        success: true,
        value: {
          entry,
          newState,
          description: `${operation} completed`,
        },
      };
    } finally {
      this.writeLock = false;
    }
  }

  undo(state: Project): Result<{ newState: Project; description: string }, ModelError> {
    const lastEntry = state.journal.undoStack[state.journal.undoStack.length - 1];
    if (!lastEntry) return { success: false, error: ModelError.OPERATION_FAILED };

    const inverseResult = applyEvent(state, lastEntry.inverseEvent);
    if (!inverseResult.success) return inverseResult;

    const undoEntry: JournalEntry = {
      id: transactionId(),
      timestamp: createTimestamp(),
      engine: lastEntry.engine,
      operation: `undo_of_${lastEntry.operation}`,
      payload: { originalEntryId: lastEntry.id },
      inverseEvent: { type: `redo_of_${lastEntry.operation}`, payload: {} },
      forwardEvent: { type: `undo_of_${lastEntry.operation}`, payload: {} },
      stateHashBefore: hashState(state),
      stateHashAfter: hashState(inverseResult.value.newState),
      duration: 0,
      success: true,
    };

    const newState: Project = {
      ...inverseResult.value.newState,
      journal: {
        entries: [...state.journal.entries, undoEntry],
        undoStack: state.journal.undoStack.slice(0, -1),
        redoStack: [...state.journal.redoStack, lastEntry],
      },
      modified: createTimestamp(),
    };

    return {
      success: true,
      value: { newState, description: `Undid ${lastEntry.operation}` },
    };
  }

  redo(state: Project): Result<{ newState: Project; description: string }, ModelError> {
    const lastUndo = state.journal.redoStack[state.journal.redoStack.length - 1];
    if (!lastUndo) return { success: false, error: ModelError.OPERATION_FAILED };

    const original = lastUndo.forwardEvent;
    const reapplyResult = applyEvent(state, original);
    if (!reapplyResult.success) return reapplyResult;

    const redoEntry: JournalEntry = {
      id: transactionId(),
      timestamp: createTimestamp(),
      engine: lastUndo.engine,
      operation: `redo_of_${lastUndo.operation}`,
      payload: { originalEntryId: lastUndo.id },
      inverseEvent: { type: `undo_of_${lastUndo.operation}`, payload: {} },
      forwardEvent: { type: `redo_of_${lastUndo.operation}`, payload: {} },
      stateHashBefore: hashState(state),
      stateHashAfter: hashState(reapplyResult.value.newState),
      duration: 0,
      success: true,
    };

    const newState: Project = {
      ...reapplyResult.value.newState,
      journal: {
        entries: [...state.journal.entries, redoEntry],
        undoStack: [...state.journal.undoStack, lastUndo],
        redoStack: state.journal.redoStack.slice(0, -1),
      },
      modified: createTimestamp(),
    };

    return {
      success: true,
      value: { newState, description: `Redid ${lastUndo.operation}` },
    };
  }

  getUndoCount(state: Project): number {
    return state.journal.undoStack.length;
  }

  getRedoCount(state: Project): number {
    return state.journal.redoStack.length;
  }
}

export type { FrameRate };
export type { Project, EntityId };
