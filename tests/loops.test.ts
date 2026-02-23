import { describe, it, expect } from 'vitest';
import { generateLoop, getLoopPoint, contractedLoopPoints } from '../src/math/loops';
import { vec3, vec3Norm, PI, EPSILON } from '../src/math/vec3';
import { isOnBoundary } from '../src/math/so3';

const EPS = 1e-3;

describe('Loop Generation', () => {
  describe('2π loop', () => {
    it('starts at identity (origin)', () => {
      const loop = generateLoop(vec3(1, 0, 0), 2 * PI, 100);
      const start = loop.points[0];
      expect(vec3Norm(start)).toBeLessThan(EPS);
    });

    it('ends at identity (origin)', () => {
      const loop = generateLoop(vec3(1, 0, 0), 2 * PI, 100);
      const end = loop.points[loop.points.length - 1];
      expect(vec3Norm(end)).toBeLessThan(EPS);
    });

    it('all points stay within the ball (||v|| ≤ π)', () => {
      const loop = generateLoop(vec3(0, 1, 0), 2 * PI, 200);
      for (const p of loop.points) {
        expect(vec3Norm(p)).toBeLessThanOrEqual(PI + EPS);
      }
    });

    it('has exactly one antipodal jump', () => {
      const loop = generateLoop(vec3(0, 0, 1), 2 * PI, 200);
      expect(loop.jumpIndices.length).toBe(1);
    });

    it('reaches the boundary (θ = π)', () => {
      const loop = generateLoop(vec3(1, 0, 0), 2 * PI, 200);
      const hasNearBoundary = loop.points.some(p => Math.abs(vec3Norm(p) - PI) < 0.2);
      expect(hasNearBoundary).toBe(true);
    });

    it('midpoint is near the boundary', () => {
      const point = getLoopPoint(vec3(1, 0, 0), 2 * PI, 0.5);
      // At t=0.5, angle = π, so ||point|| should be near π
      // But right at π there's the wrap, so check the point just before
      const pointBefore = getLoopPoint(vec3(1, 0, 0), 2 * PI, 0.499);
      expect(vec3Norm(pointBefore)).toBeGreaterThan(PI - 0.1);
    });
  });

  describe('4π loop', () => {
    it('starts at identity', () => {
      const loop = generateLoop(vec3(1, 0, 0), 4 * PI, 200);
      expect(vec3Norm(loop.points[0])).toBeLessThan(EPS);
    });

    it('ends at identity', () => {
      const loop = generateLoop(vec3(1, 0, 0), 4 * PI, 200);
      expect(vec3Norm(loop.points[loop.points.length - 1])).toBeLessThan(EPS);
    });

    it('has exactly two antipodal jumps', () => {
      const loop = generateLoop(vec3(0, 0, 1), 4 * PI, 400);
      expect(loop.jumpIndices.length).toBe(2);
    });

    it('all points stay within the ball', () => {
      const loop = generateLoop(vec3(1, 1, 1), 4 * PI, 200);
      for (const p of loop.points) {
        expect(vec3Norm(p)).toBeLessThanOrEqual(PI + EPS);
      }
    });
  });

  describe('arbitrary axis', () => {
    it('works for diagonal axis (1,1,1)', () => {
      const loop = generateLoop(vec3(1, 1, 1), 2 * PI, 100);
      expect(vec3Norm(loop.points[0])).toBeLessThan(EPS);
      expect(vec3Norm(loop.points[loop.points.length - 1])).toBeLessThan(EPS);
    });
  });
});

describe('Loop Contraction (4π)', () => {
  const axis = vec3(1, 0, 0);

  it('at s=0 (no contraction), path reaches the boundary', () => {
    const points = contractedLoopPoints(axis, 0, 100);
    const maxRadius = Math.max(...points.map(vec3Norm));
    expect(maxRadius).toBeGreaterThan(PI - 0.5);
  });

  it('at s=1 (fully contracted), all points near identity', () => {
    const points = contractedLoopPoints(axis, 1, 100);
    for (const p of points) {
      expect(vec3Norm(p)).toBeLessThan(0.01);
    }
  });

  it('starts at identity for all contraction values', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      const points = contractedLoopPoints(axis, s, 100);
      expect(vec3Norm(points[0])).toBeLessThan(EPS);
    }
  });

  it('ends at identity for all contraction values', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      const points = contractedLoopPoints(axis, s, 100);
      expect(vec3Norm(points[points.length - 1])).toBeLessThan(EPS);
    }
  });

  it('maximum radius decreases as contraction increases', () => {
    const radii: number[] = [];
    for (let s = 0; s <= 1; s += 0.2) {
      const points = contractedLoopPoints(axis, s, 100);
      const maxR = Math.max(...points.map(vec3Norm));
      radii.push(maxR);
    }
    // Should be roughly monotonically decreasing
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeLessThanOrEqual(radii[i - 1] + EPS);
    }
  });

  it('all points stay within ball during contraction', () => {
    for (const s of [0, 0.3, 0.5, 0.7, 1]) {
      const points = contractedLoopPoints(axis, s, 100);
      for (const p of points) {
        expect(vec3Norm(p)).toBeLessThanOrEqual(PI + EPS);
      }
    }
  });
});
