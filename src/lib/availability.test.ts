import { describe, expect, it } from "vitest";
import { dateTimeFromParts, parseWorkingHours } from "@/lib/availability";

describe("working hour helpers", () => {
  it("parses saved weekly hours", () => {
    expect(parseWorkingHours('{"1":["09:00","17:00"]}')).toEqual({ "1": ["09:00", "17:00"] });
  });

  it("fails closed when working-hour data is corrupt", () => {
    expect(parseWorkingHours("not-json")).toEqual({});
  });

  it("builds a valid local appointment time", () => {
    const value = dateTimeFromParts("2026-08-24", "10:30");
    expect(value.getFullYear()).toBe(2026);
    expect(value.getHours()).toBe(10);
    expect(value.getMinutes()).toBe(30);
  });
});
