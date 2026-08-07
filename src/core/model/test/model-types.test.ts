import {
  timeValueFromMs, timeValueFromSeconds, timeValueToMs, timeValueAdd, timeValueSub, timeValueCmp,
  timeValueMin, isZeroOrPositive, createTimestamp, projectId, entityId, relationshipId, transactionId,
  frameToTimeValue, timeValueToFrame, TimeValue,
} from "../types";

const ticksStr = (tv: TimeValue) => tv.ticks.toString();

describe("TimeValue operations", () => {
  it("should create from milliseconds", () => {
    const tv = timeValueFromMs(1000);
    expect(ticksStr(tv)).toBe("1000000000");
  });

  it("should create from seconds", () => {
    const tv = timeValueFromSeconds(1.5);
    expect(ticksStr(tv)).toBe("1500000000");
  });

  it("should convert to milliseconds", () => {
    expect(timeValueToMs(timeValueFromMs(250))).toBe(250);
  });

  it("should add time values", () => {
    const a = timeValueFromMs(100);
    const b = timeValueFromMs(200);
    expect(ticksStr(timeValueAdd(a, b))).toBe("300000000");
  });

  it("should subtract time values", () => {
    const a = timeValueFromMs(500);
    const b = timeValueFromMs(300);
    expect(ticksStr(timeValueSub(a, b))).toBe("200000000");
  });

  it("should compare time values", () => {
    const a = timeValueFromMs(100);
    const b = timeValueFromMs(200);
    expect(timeValueCmp(a, b)).toBe(-1);
    expect(timeValueCmp(b, a)).toBe(1);
    expect(timeValueCmp(a, a)).toBe(0);
  });

  it("should find minimum", () => {
    const a = timeValueFromMs(100);
    const b = timeValueFromMs(50);
    const c = timeValueFromMs(75);
    expect(ticksStr(timeValueMin(a, b, c))).toBe("50000000");
  });

  it("should detect zero or positive", () => {
    expect(isZeroOrPositive(timeValueFromMs(0))).toBe(true);
    expect(isZeroOrPositive(timeValueFromMs(10))).toBe(true);
    expect(isZeroOrPositive({ ticks: BigInt(-5) })).toBe(false);
  });

  it("should convert frame to time value", () => {
    const tv = frameToTimeValue({ index: 30, frameRate: 30 });
    expect(ticksStr(tv)).toBe("1000000000");
  });

  it("should convert time value to frame", () => {
    const frame = timeValueToFrame(timeValueFromMs(1000), 30);
    expect(frame.index).toBe(30);
    expect(frame.frameRate).toBe(30);
  });
});

describe("Timestamps and IDs", () => {
  it("should create valid timestamp", () => {
    const ts = createTimestamp();
    expect(ts.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(ts.unix > BigInt(0)).toBe(true);
  });

  it("should generate branded IDs", () => {
    const p = projectId();
    const e = entityId();
    const r = relationshipId();
    const t = transactionId();
    expect(typeof p).toBe("string");
    expect(p).not.toBe(e);
    expect(r).not.toBe(t);
    expect(e.length).toBe(36);
  });
});

describe("TimeValue immutability", () => {
  it("should not mutate inputs on add", () => {
    const a: TimeValue = timeValueFromMs(100);
    const b: TimeValue = timeValueFromMs(50);
    timeValueAdd(a, b);
    expect(ticksStr(a)).toBe("100000000");
    expect(ticksStr(b)).toBe("50000000");
  });
});
