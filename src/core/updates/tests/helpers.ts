import { FetchLike, FetchResponseLike, TimerLike, ProcessLike, Version } from "../common/types";

export function mockPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tag_name: "v1.2.3",
    published_at: "2026-07-01T00:00:00Z",
    body: "Improvements",
    browser_download_url: "https://github.com/acme/app/releases/download/v1.2.3/app.bin",
    size: 1024,
    checksum: "",
    breaking_changes: false,
    ...overrides,
  };
}

export function jsonResponse(payload: unknown, ok: boolean = true, status: number = 200): FetchResponseLike {
  return {
    ok,
    status,
    json: async () => payload,
    arrayBuffer: async () => {
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return buffer;
    },
  };
}

export function binaryResponse(bytes: Uint8Array, ok: boolean = true, status: number = 200): FetchResponseLike {
  return {
    ok,
    status,
    json: async () => null,
    arrayBuffer: async () => {
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return buffer;
    },
  };
}

interface MockFetchItem {
  readonly response: FetchResponseLike;
  readonly error?: Error;
}

export class MockFetch {
  private queue: MockFetchItem[] = [];
  calls: string[] = [];

  enqueue(payload: unknown, ok: boolean = true, status: number = 200): void {
    this.queue.push({ response: jsonResponse(payload, ok, status) });
  }

  enqueueResponse(response: FetchResponseLike): void {
    this.queue.push({ response });
  }

  enqueueError(error: Error): void {
    this.queue.push({ response: jsonResponse(null, false, 0), error });
  }

  handler: FetchLike = async (url: string): Promise<FetchResponseLike> => {
    this.calls.push(url);
    const next = this.queue.shift();
    if (next === undefined) return jsonResponse(null, false, 404);
    if (next.error !== undefined) throw next.error;
    return next.response;
  };
}

export class MockTimer implements TimerLike {
  private counter = 0;
  private callbacks: Map<number, () => void> = new Map();
  intervals: number[] = [];

  setInterval(callback: () => void, intervalMs: number): unknown {
    const handle = this.counter++;
    this.callbacks.set(handle, callback);
    this.intervals.push(intervalMs);
    return handle;
  }

  clearInterval(handle: unknown): void {
    this.callbacks.delete(Number(handle));
  }

  fire(): void {
    const callbacks = Array.from(this.callbacks.values());
    for (const callback of callbacks) {
      callback();
    }
  }

  fireAll(): void {
    this.fire();
  }

  getPendingCount(): number {
    return this.callbacks.size;
  }
}

export class MockProcess implements ProcessLike {
  restartCount = 0;
  restart(): void {
    this.restartCount++;
  }
}

export function version(major: number, minor: number, patch: number): Version {
  return new Version(major, minor, patch);
}
