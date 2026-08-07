import { formatDuration, formatSeconds } from "./format";

describe("formatDuration", () => {
  it("formats sub-minute durations without hours", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(45_000)).toBe("0:45");
    expect(formatDuration(125_000)).toBe("2:05");
  });

  it("formats durations of an hour or more with hours", () => {
    expect(formatDuration(3_600_000)).toBe("1:00:00");
    expect(formatDuration(5_400_000)).toBe("1:30:00");
    expect(formatDuration(4_500_000)).toBe("1:15:00");
  });

  it("clamps negative input to zero", () => {
    expect(formatDuration(-1000)).toBe("0:00");
  });
});

describe("formatSeconds", () => {
  it("formats milliseconds as seconds with one decimal", () => {
    expect(formatSeconds(1500)).toBe("1.5");
    expect(formatSeconds(0)).toBe("0.0");
  });

  it("clamps negative input to zero", () => {
    expect(formatSeconds(-500)).toBe("0.0");
  });
});
