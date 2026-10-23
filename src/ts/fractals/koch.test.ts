import { describe, it, expect } from "vitest";
import { kochPoint, kochSegments, type Point } from "./koch";

describe("kochPoint", () => {
  it("subdivides a segment into three parts with a triangular bump", () => {
    const p1: Point = { x: 0, y: 0 };
    const p2: Point = { x: 3, y: 0 };

    const { a, b, c } = kochPoint(p1, p2);

    // a and c must lie on the original segment at 1/3 and 2/3
    expect(a.x).toBeCloseTo(1);
    expect(a.y).toBeCloseTo(0);
    expect(c.x).toBeCloseTo(2);
    expect(c.y).toBeCloseTo(0);

    // b must not lie on the original segment (has non-zero y)
    expect(b.y).not.toBe(0);
  });
});

describe("kochSegments", () => {
  it("returns the original polyline when depth is 0", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 0 }
    ];

    const result = kochSegments(pts, 0);
    expect(result).toEqual(pts);
  });

  it("increases the number of points according to 4^depth", () => {
    // segment from 0 to 3, closed polyline
    const base: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 0 }
    ];

    const depth1 = kochSegments(base, 1);
    const depth2 = kochSegments(base, 2);

    // each iteration multiplies number of segments by 4;
    // points = segments + 1
    expect(depth1.length).toBe((base.length - 1) * 4 + 1);
    expect(depth2.length).toBe((base.length - 1) * 4 * 4 + 1);

    // no NaNs
    for (const p of depth2) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

