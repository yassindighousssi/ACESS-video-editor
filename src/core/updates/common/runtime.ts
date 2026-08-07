import { FetchLike, FetchResponseLike } from "./types";

type NodeFetchLike = (
  input: string,
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export function nodeFetch(): FetchLike {
  const g = globalThis as { fetch?: NodeFetchLike };
  if (typeof g.fetch !== "function") {
    return async (): Promise<FetchResponseLike> => ({
      ok: false,
      status: 0,
      json: async () => null,
      arrayBuffer: async () => new ArrayBuffer(0),
    });
  }
  return async (url: string): Promise<FetchResponseLike> => {
    const response = await g.fetch!(url);
    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json(),
      arrayBuffer: () => response.arrayBuffer(),
    };
  };
}
