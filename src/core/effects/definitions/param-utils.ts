import { ParameterValues } from "../core/types";

export function numberParam(params: ParameterValues, id: string, fallback: number): number {
  const value = params[id];
  return typeof value === "number" ? value : fallback;
}

export function booleanParam(params: ParameterValues, id: string, fallback: boolean): boolean {
  const value = params[id];
  return typeof value === "boolean" ? value : fallback;
}

export function stringParam(params: ParameterValues, id: string, fallback: string): string {
  const value = params[id];
  return typeof value === "string" ? value : fallback;
}
