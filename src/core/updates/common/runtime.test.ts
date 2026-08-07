import { nodeFetch } from "./runtime";

const originalFetch = (globalThis as { fetch?: unknown }).fetch;

afterAll(() => {
  (globalThis as { fetch?: unknown }).fetch = originalFetch;
});

describe("nodeFetch", () => {
  it("should delegate to the global fetch when available", async () => {
    const calls: string[] = [];
    (globalThis as { fetch?: unknown }).fetch = async (url: string) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        arrayBuffer: async () => new ArrayBuffer(4),
      };
    };
    const fetchLike = nodeFetch();
    const response = await fetchLike("https://example.com/api");
    expect(calls).toEqual(["https://example.com/api"]);
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("should return a stub when the global fetch is unavailable", async () => {
    (globalThis as { fetch?: unknown }).fetch = undefined;
    const fetchLike = nodeFetch();
    const response = await fetchLike("https://example.com/api");
    expect(response.ok).toBe(false);
    expect(response.status).toBe(0);
    await expect(response.json()).resolves.toBeNull();
    await expect(response.arrayBuffer()).resolves.toBeInstanceOf(ArrayBuffer);
  });
});
