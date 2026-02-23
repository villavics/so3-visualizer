import { describe, it, expect } from 'vitest';
import {
  axisAngleToPoint, pointToAxisAngle, isOnBoundary, isIdentity,
  antipodalPartner, canonicalize, compose, sameRotation,
} from '../src/math/so3';
import { vec3, vec3Norm, PI, EPSILON } from '../src/math/vec3';

const EPS = 1e-4;

describe('SO(3) Ball Parameterization', () => {
  describe('axisAngleToPoint', () => {
    it('angle=0 gives origin (identity)', () => {
      const p = axisAngleToPoint(vec3(1, 0, 0), 0);
      expect(vec3Norm(p)).toBeCloseTo(0, 6);
    });

    it('angle=π/2 around X gives point on X axis at distance π/2', () => {
      const p = axisAngleToPoint(vec3(1, 0, 0), PI / 2);
      expect(p.x).toBeCloseTo(PI / 2, 4);
      expect(p.y).toBeCloseTo(0, 6);
      expect(p.z).toBeCloseTo(0, 6);
    });

    it('angle=π gives boundary point', () => {
      const p = axisAngleToPoint(vec3(0, 0, 1), PI);
      expect(vec3Norm(p)).toBeCloseTo(PI, 4);
    });

    it('angle > π wraps correctly (e.g., 3π/2 around X = π/2 around -X)', () => {
      const p = axisAngleToPoint(vec3(1, 0, 0), 3 * PI / 2);
      // 3π/2 mod 2π = 3π/2, which is > π
      // Equivalent: rotation by π/2 about -X
      expect(p.x).toBeCloseTo(-PI / 2, 4);
      expect(p.y).toBeCloseTo(0, 6);
      expect(p.z).toBeCloseTo(0, 6);
    });

    it('angle=2π gives identity (origin)', () => {
      const p = axisAngleToPoint(vec3(1, 0, 0), 2 * PI);
      expect(vec3Norm(p)).toBeLessThan(0.01);
    });
  });

  describe('pointToAxisAngle', () => {
    it('round-trips with axisAngleToPoint', () => {
      const axis = vec3(0.6, 0.8, 0);
      const angle = 1.5;
      const p = axisAngleToPoint(axis, angle);
      const { axis: a2, angle: ang2 } = pointToAxisAngle(p);
      expect(ang2).toBeCloseTo(angle, 4);
    });

    it('origin gives angle 0', () => {
      const { angle } = pointToAxisAngle(vec3(0, 0, 0));
      expect(angle).toBeCloseTo(0, 6);
    });
  });

  describe('boundary detection', () => {
    it('point at radius π is on boundary', () => {
      const p = axisAngleToPoint(vec3(0, 1, 0), PI);
      expect(isOnBoundary(p)).toBe(true);
    });

    it('point at radius π/2 is not on boundary', () => {
      const p = axisAngleToPoint(vec3(0, 1, 0), PI / 2);
      expect(isOnBoundary(p)).toBe(false);
    });

    it('origin is identity', () => {
      expect(isIdentity(vec3(0, 0, 0))).toBe(true);
    });
  });

  describe('antipodal identification', () => {
    it('antipodalPartner returns -p', () => {
      const p = vec3(PI, 0, 0);
      const ap = antipodalPartner(p);
      expect(ap.x).toBeCloseTo(-PI, 6);
      expect(ap.y).toBeCloseTo(0, 6);
      expect(ap.z).toBeCloseTo(0, 6);
    });

    it('p and -p on boundary represent the same rotation', () => {
      const p = axisAngleToPoint(vec3(1, 0, 0), PI);
      const ap = antipodalPartner(p);
      expect(sameRotation(p, ap)).toBe(true);
    });

    it('p and -p on boundary (arbitrary axis) represent the same rotation', () => {
      const p = axisAngleToPoint(vec3(1, 1, 1), PI);
      const ap = antipodalPartner(p);
      expect(sameRotation(p, ap)).toBe(true);
    });

    it('canonicalize(p) = canonicalize(-p) for boundary points', () => {
      const p = axisAngleToPoint(vec3(0.5, -0.3, 0.7), PI);
      const cp = canonicalize(p);
      const cap = canonicalize(antipodalPartner(p));
      expect(cp.x).toBeCloseTo(cap.x, 4);
      expect(cp.y).toBeCloseTo(cap.y, 4);
      expect(cp.z).toBeCloseTo(cap.z, 4);
    });
  });

  describe('composition', () => {
    it('identity composed with any rotation gives that rotation', () => {
      const p = axisAngleToPoint(vec3(1, 0, 0), 1.0);
      const result = compose(vec3(0, 0, 0), p);
      expect(sameRotation(result, p)).toBe(true);
    });

    it('rotation composed with its inverse gives identity', () => {
      const axis = vec3(1, 2, 3);
      const p = axisAngleToPoint(axis, 1.5);
      const pInv = axisAngleToPoint(axis, -1.5);
      const result = compose(p, pInv);
      expect(isIdentity(result)).toBe(true);
    });
  });
});
