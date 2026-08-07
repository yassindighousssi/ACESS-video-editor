import { TextDecoder, TextEncoder } from "util";
import "@testing-library/jest-dom";

const globals = globalThis as unknown as Record<string, unknown>;
if (globals.TextEncoder === undefined) globals.TextEncoder = TextEncoder;
if (globals.TextDecoder === undefined) globals.TextDecoder = TextDecoder;
