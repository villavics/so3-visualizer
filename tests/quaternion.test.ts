import { describe, it, expect } from 'vitest';
import { Quaternion } from '../src/math/quaternion';
import { vec3, PI } from '../src/math/vec3';

const EPS = 1e-6;

function expectQuatClose(a: Quaternion, b: Quaternion, eps = EPS) {
  expect(Math.abs(a.w - b.w)).toBeLessThan(eps);
  expect(Math.abs(a.x - b.x)).toBeLessThan(eps);
  expect(Math.abs(a.y - b.y)).toBeLessThan(eps);
  expect(Math.abs(a.z - b.z)).toBeLessThan(eps);
}

describe('Quaternion', () => {
  describe('identity', () => {
    it('should be (1, 0, 0, 0)', () => {
      const id = Quaternion.identity();
      expect(id.w).toBe(1);
      expect(id.x).toBe(0);
      expect(id.y).toBe(0);
      expect(id.z).toBe(0);
    });

    it('should have unit norm', () => {
      expect(Quaternion.identity().norm()).toBeCloseTo(1);
    });
  });

  describe('fromAxisAngle', () => {
    it('angle=0 gives identity', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 0, 0), 0);
      expectQuatClose(q, Quaternion.identity());
    });

    it('90° around X axis', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 0, 0), PI / 2);
      const c = Math.cos(PI / 4);
      const s = Math.sin(PI / 4);
      expect(q.w).toBeCloseTo(c, 6);
      expect(q.x).toBeCloseTo(s, 6);
      expect(q.y).toBeCloseTo(0, 6);
      expect(q.z).toBeCloseTo(0, 6);
    });

    it('180° around Z axis', () => {
      const q = Quaternion.fromAxisAngle(vec3(0, 0, 1), PI);
      expect(q.w).toBeCloseTo(0, 6);
      expect(q.x).toBeCloseTo(0, 6);
      expect(q.y).toBeCloseTo(0, 6);
      expect(q.z).toBeCloseTo(1, 6);
    });

    it('360° (2π) around any axis gives -identity in SU(2)', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 0, 0), 2 * PI);
      // cos(π) = -1, sin(π) = 0
      expect(q.w).toBeCloseTo(-1, 6);
      expect(q.x).toBeCloseTo(0, 5);
      expect(q.y).toBeCloseTo(0, 6);
      expect(q.z).toBeCloseTo(0, 6);
    });

    it('720° (4π) around any axis gives +identity in SU(2)', () => {
      const q = Quaternion.fromAxisAngle(vec3(0, 1, 0), 4 * PI);
      // cos(2π) = 1, sin(2π) = 0
      expect(q.w).toBeCloseTo(1, 5);
      expect(q.x).toBeCloseTo(0, 5);
      expect(q.y).toBeCloseTo(0, 5);
      expect(q.z).toBeCloseTo(0, 5);
    });

    it('normalizes the axis automatically', () => {
      const q1 = Quaternion.fromAxisAngle(vec3(2, 0, 0), PI / 3);
      const q2 = Quaternion.fromAxisAngle(vec3(1, 0, 0), PI / 3);
      expectQuatClose(q1, q2);
    });
  });

  describe('multiplication', () => {
    it('identity * q = q', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 1, 0), PI / 3);
      expectQuatClose(Quaternion.identity().multiply(q), q);
    });

    it('q * identity = q', () => {
      const q = Quaternion.fromAxisAngle(vec3(0, 1, 1), PI / 4);
      expectQuatClose(q.multiply(Quaternion.identity()), q);
    });

    it('q * q^-1 = identity', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 2, 3), 1.5);
      const result = q.multiply(q.inverse());
      expectQuatClose(result, Quaternion.identity());
    });

    it('associativity: (a*b)*c = a*(b*c)', () => {
      const a = Quaternion.fromAxisAngle(vec3(1, 0, 0), 0.7);
      const b = Quaternion.fromAxisAngle(vec3(0, 1, 0), 1.2);
      const c = Quaternion.fromAxisAngle(vec3(0, 0, 1), 0.3);
      const lhs = a.multiply(b).multiply(c);
      const rhs = a.multiply(b.multiply(c));
      expectQuatClose(lhs, rhs);
    });
  });

  describe('conjugate and inverse', () => {
    it('conjugate of unit quaternion equals inverse', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 1, 1), 1.0).normalize();
      const conj = q.conjugate();
      const inv = q.inverse();
      expectQuatClose(conj, inv);
    });
  });

  describe('slerp', () => {
    it('slerp(a, b, 0) = a', () => {
      const a = Quaternion.fromAxisAngle(vec3(1, 0, 0), 0.5);
      const b = Quaternion.fromAxisAngle(vec3(0, 1, 0), 1.0);
      expectQuatClose(Quaternion.slerp(a, b, 0), a);
    });

    it('slerp(a, b, 1) = b (or -b via shortest path)', () => {
      const a = Quaternion.fromAxisAngle(vec3(1, 0, 0), 0.5);
      const b = Quaternion.fromAxisAngle(vec3(0, 1, 0), 1.0);
      const result = Quaternion.slerp(a, b, 1);
      expect(result.sameRotation(b)).toBe(true);
    });

    it('slerp(q, q, t) = q for all t', () => {
      const q = Quaternion.fromAxisAngle(vec3(0, 0, 1), 0.8);
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const result = Quaternion.slerp(q, q, t);
        expect(result.sameRotation(q)).toBe(true);
      }
    });
  });

  describe('axis-angle round-trip', () => {
    it('fromAxisAngle → toAxisAngle round-trips', () => {
      const axis = vec3(0.5, 0.7, 0.3);
      const angle = 1.5;
      const q = Quaternion.fromAxisAngle(axis, angle);
      const { axis: axOut, angle: angOut } = q.toAxisAngle();

      expect(angOut).toBeCloseTo(angle, 5);
      // Axes should be parallel (same direction since angle ∈ (0, π))
      const dot = axOut.x * axis.x / Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2)
                + axOut.y * axis.y / Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2)
                + axOut.z * axis.z / Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2);
      expect(Math.abs(dot)).toBeCloseTo(1, 5);
    });

    it('handles θ = π correctly', () => {
      const axis = vec3(0, 1, 0);
      const q = Quaternion.fromAxisAngle(axis, PI);
      const { angle } = q.toAxisAngle();
      expect(angle).toBeCloseTo(PI, 5);
    });
  });

  describe('SO(3) point conversion', () => {
    it('identity maps to origin', () => {
      const p = Quaternion.identity().toSO3Point();
      expect(p.x).toBeCloseTo(0, 6);
      expect(p.y).toBeCloseTo(0, 6);
      expect(p.z).toBeCloseTo(0, 6);
    });

    it('fromSO3Point(toSO3Point(q)) gives same rotation', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 1, 0), 2.0);
      const p = q.toSO3Point();
      const q2 = Quaternion.fromSO3Point(p);
      expect(q.sameRotation(q2)).toBe(true);
    });

    it('boundary point (θ=π) round-trips correctly', () => {
      const q = Quaternion.fromAxisAngle(vec3(0, 0, 1), PI);
      const p = q.toSO3Point();
      const norm = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      expect(norm).toBeCloseTo(PI, 4);
    });
  });

  describe('double cover property', () => {
    it('q and -q give the same rotation (SO(3) element)', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 2, 3), 1.0);
      expect(q.sameRotation(q.negate())).toBe(true);
    });

    it('q and -q give different SU(2) elements', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 0, 0), 1.0);
      expect(q.approxEqual(q.negate())).toBe(false);
    });
  });

  describe('exp and log', () => {
    it('exp(log(q)) ≈ q for unit quaternion', () => {
      const q = Quaternion.fromAxisAngle(vec3(1, 1, 1), 1.5).normalize();
      const v = q.log();
      const q2 = Quaternion.exp(v);
      // exp(log(q)) should give same rotation
      expect(q.sameRotation(q2)).toBe(true);
    });

    it('log(identity) = (0,0,0)', () => {
      const v = Quaternion.identity().log();
      expect(v.x).toBeCloseTo(0, 6);
      expect(v.y).toBeCloseTo(0, 6);
      expect(v.z).toBeCloseTo(0, 6);
    });

    it('exp(0,0,0) = identity', () => {
      const q = Quaternion.exp(vec3(0, 0, 0));
      expectQuatClose(q, Quaternion.identity());
    });
  });
});
