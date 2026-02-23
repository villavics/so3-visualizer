import { describe, it, expect } from 'vitest';
import {
  stereographicProject, doubleCoverMap, liftPath,
  isLiftedPathClosed, isLiftedPathAntipodal,
} from '../src/math/su2';
import { Quaternion } from '../src/math/quaternion';
import { generateLoop, getLoopPoint } from '../src/math/loops';
import { vec3, vec3Norm, PI } from '../src/math/vec3';

const EPS = 1e-3;

describe('SU(2) Double Cover', () => {
  describe('doubleCoverMap', () => {
    it('q and -q map to the same SO(3) point', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 0, 0), 1.0);
      const p1 = doubleCoverMap(q);
      const p2 = doubleCoverMap(q.negate());
      // Same rotation, so same canonical point
      expect(p1.x).toBeCloseTo(p2.x, 4);
      expect(p1.y).toBeCloseTo(p2.y, 4);
      expect(p1.z).toBeCloseTo(p2.z, 4);
    });

    it('identity quaternion maps to origin', () => {
      const p = doubleCoverMap(Quaternion.identity());
      expect(vec3Norm(p)).toBeLessThan(EPS);
    });
  });

  describe('stereographic projection', () => {
    it('north pole (1,0,0,0) projects to origin', () => {
      const p = stereographicProject(Quaternion.identity());
      expect(p.x).toBeCloseTo(0, 4);
      expect(p.y).toBeCloseTo(0, 4);
      expect(p.z).toBeCloseTo(0, 4);
    });

    it('equatorial points project to unit sphere', () => {
      // (0, 1, 0, 0) ∈ S³ → (1/(1+0), 0, 0) = (1, 0, 0)
      const q = new Quaternion(0, 1, 0, 0);
      const p = stereographicProject(q);
      expect(p.x).toBeCloseTo(1, 4);
      expect(p.y).toBeCloseTo(0, 4);
      expect(p.z).toBeCloseTo(0, 4);
    });

    it('south pole (-1,0,0,0) projects to large radius (infinity)', () => {
      const q = new Quaternion(-1, 0, 0, 0);
      const p = stereographicProject(q);
      // Should be at large distance (our clamp value)
      expect(vec3Norm(p)).toBeGreaterThan(10);
    });
  });

  describe('path lifting', () => {
    it('2π loop lifts to a path that is NOT closed (antipodal endpoints)', () => {
      const loop = generateLoop(vec3(1, 0, 0), 2 * PI, 100);
      const lifted = liftPath(loop.points);

      expect(isLiftedPathClosed(lifted)).toBe(false);
      expect(isLiftedPathAntipodal(lifted)).toBe(true);
    });

    it('4π loop lifts to a CLOSED path', () => {
      const loop = generateLoop(vec3(1, 0, 0), 4 * PI, 200);
      const lifted = liftPath(loop.points);

      expect(isLiftedPathClosed(lifted)).toBe(true);
    });

    it('lifted path is continuous (each quaternion close to previous)', () => {
      const loop = generateLoop(vec3(0, 0, 1), 2 * PI, 200);
      const lifted = liftPath(loop.points);

      for (let i = 1; i < lifted.length; i++) {
        const dot = Math.abs(lifted[i].dot(lifted[i - 1]));
        // Dot product should be close to 1 for nearby quaternions
        expect(dot).toBeGreaterThan(0.95);
      }
    });

    it('2π around Y: endpoints are antipodal in SU(2)', () => {
      const loop = generateLoop(vec3(0, 1, 0), 2 * PI, 100);
      const lifted = liftPath(loop.points);

      const start = lifted[0];
      const end = lifted[lifted.length - 1];

      // They should satisfy start ≈ -end
      expect(start.dot(end)).toBeLessThan(-0.9);
    });

    it('4π around Z: endpoints are the same in SU(2)', () => {
      const loop = generateLoop(vec3(0, 0, 1), 4 * PI, 200);
      const lifted = liftPath(loop.points);

      const start = lifted[0];
      const end = lifted[lifted.length - 1];

      expect(start.dot(end)).toBeGreaterThan(0.99);
    });
  });
});
