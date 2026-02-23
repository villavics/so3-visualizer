/**
 * Quaternion: unit quaternion representation for rotations.
 *
 * A unit quaternion q = (w, x, y, z) with w² + x² + y² + z² = 1
 * represents a rotation. The group SU(2) of unit quaternions is the
 * universal (double) cover of SO(3): both q and -q represent the
 * same rotation in SO(3).
 *
 * Convention: q = w + xi + yj + zk
 * Rotation by angle θ about unit axis n̂ = (nx, ny, nz):
 *   q = (cos(θ/2), sin(θ/2)·nx, sin(θ/2)·ny, sin(θ/2)·nz)
 *
 * Note the factor of 2: this is precisely the double cover.
 * A rotation by 2π gives q = (-1, 0, 0, 0) = -I, not +I.
 * A rotation by 4π gives q = (+1, 0, 0, 0) = +I.
 */

import { Vec3, vec3, vec3Norm, vec3Normalize, vec3Scale, EPSILON, PI } from './vec3';

export class Quaternion {
  constructor(
    public readonly w: number,
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
  ) {}

  static identity(): Quaternion {
    return new Quaternion(1, 0, 0, 0);
  }

  /**
   * Construct quaternion from axis-angle representation.
   * axis: unit vector (will be normalized)
   * angle: rotation angle in radians
   */
  static fromAxisAngle(axis: Vec3, angle: number): Quaternion {
    const n = vec3Normalize(axis);
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    return new Quaternion(
      Math.cos(halfAngle),
      s * n.x,
      s * n.y,
      s * n.z,
    );
  }

  /**
   * Construct quaternion from a point in the SO(3) ball B³(π).
   * The point v encodes: axis = v/||v||, angle = ||v||.
   * Returns identity if v is at the origin.
   */
  static fromSO3Point(v: Vec3): Quaternion {
    const theta = vec3Norm(v);
    if (theta < EPSILON) return Quaternion.identity();
    const axis = vec3Scale(v, 1 / theta);
    return Quaternion.fromAxisAngle(axis, theta);
  }

  /**
   * Convert this quaternion to a point in the SO(3) ball B³(π).
   * The returned vector has direction = rotation axis, magnitude = rotation angle ∈ [0, π].
   */
  toSO3Point(): Vec3 {
    const { axis, angle } = this.toAxisAngle();
    return vec3Scale(axis, angle);
  }

  /**
   * Extract axis-angle from this quaternion.
   * Returns angle ∈ [0, π] and a unit axis.
   * For identity (angle=0), returns arbitrary axis (0,0,1).
   */
  toAxisAngle(): { axis: Vec3; angle: number } {
    // Ensure w ∈ [-1, 1] for acos
    let q = this.normalize();
    // Choose the representative with w >= 0 so angle ∈ [0, π]
    if (q.w < 0) {
      q = q.negate();
    }
    const w = Math.max(-1, Math.min(1, q.w));
    const angle = 2 * Math.acos(w);
    const sinHalf = Math.sqrt(1 - w * w);

    if (sinHalf < EPSILON) {
      return { axis: vec3(0, 0, 1), angle: 0 };
    }

    return {
      axis: vec3(q.x / sinHalf, q.y / sinHalf, q.z / sinHalf),
      angle,
    };
  }

  // Quaternion multiplication: (a * b) represents rotation b then a
  multiply(other: Quaternion): Quaternion {
    const a = this;
    const b = other;
    return new Quaternion(
      a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
      a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    );
  }

  conjugate(): Quaternion {
    return new Quaternion(this.w, -this.x, -this.y, -this.z);
  }

  negate(): Quaternion {
    return new Quaternion(-this.w, -this.x, -this.y, -this.z);
  }

  norm(): number {
    return Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normSq(): number {
    return this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Quaternion {
    const n = this.norm();
    if (n < EPSILON) return Quaternion.identity();
    return new Quaternion(this.w / n, this.x / n, this.y / n, this.z / n);
  }

  inverse(): Quaternion {
    const ns = this.normSq();
    if (ns < EPSILON) return Quaternion.identity();
    return new Quaternion(this.w / ns, -this.x / ns, -this.y / ns, -this.z / ns);
  }

  dot(other: Quaternion): number {
    return this.w * other.w + this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Spherical linear interpolation between two quaternions.
   * Follows the shortest path on S³.
   */
  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let dot = a.dot(b);

    // If dot < 0, negate b to take the shorter path
    let bAdj = b;
    if (dot < 0) {
      bAdj = b.negate();
      dot = -dot;
    }

    // If very close, use linear interpolation to avoid division by zero
    if (dot > 1 - EPSILON) {
      return new Quaternion(
        a.w + (bAdj.w - a.w) * t,
        a.x + (bAdj.x - a.x) * t,
        a.y + (bAdj.y - a.y) * t,
        a.z + (bAdj.z - a.z) * t,
      ).normalize();
    }

    const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
    const sinOmega = Math.sin(omega);
    const sa = Math.sin((1 - t) * omega) / sinOmega;
    const sb = Math.sin(t * omega) / sinOmega;

    return new Quaternion(
      sa * a.w + sb * bAdj.w,
      sa * a.x + sb * bAdj.x,
      sa * a.y + sb * bAdj.y,
      sa * a.z + sb * bAdj.z,
    ).normalize();
  }

  /**
   * Slerp WITHOUT shortest-path adjustment.
   * Needed for SU(2) lifting where we must respect the specific
   * hemisphere (q vs -q matters in SU(2), even though they're
   * the same rotation in SO(3)).
   */
  static slerpLong(a: Quaternion, b: Quaternion, t: number): Quaternion {
    const dot = a.dot(b);

    if (Math.abs(dot) > 1 - EPSILON) {
      return new Quaternion(
        a.w + (b.w - a.w) * t,
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t,
      ).normalize();
    }

    const omega = Math.acos(Math.max(-1, Math.min(1, Math.abs(dot))));
    const sinOmega = Math.sin(omega);

    if (dot < 0) {
      // Take the long way around
      const sa = Math.sin((1 - t) * (PI - omega)) / Math.sin(PI - omega);
      const sb = Math.sin(t * (PI - omega)) / Math.sin(PI - omega);
      return new Quaternion(
        sa * a.w - sb * b.w,
        sa * a.x - sb * b.x,
        sa * a.y - sb * b.y,
        sa * a.z - sb * b.z,
      ).normalize();
    }

    const sa = Math.sin((1 - t) * omega) / sinOmega;
    const sb = Math.sin(t * omega) / sinOmega;
    return new Quaternion(
      sa * a.w + sb * b.w,
      sa * a.x + sb * b.x,
      sa * a.y + sb * b.y,
      sa * a.z + sb * b.z,
    ).normalize();
  }

  /**
   * Exponential map: so(3) → SU(2).
   * Given a pure imaginary quaternion v = (0, vx, vy, vz),
   * exp(v) = cos(||v||) + sin(||v||) * v/||v||
   */
  static exp(v: Vec3): Quaternion {
    const theta = vec3Norm(v);
    if (theta < EPSILON) return Quaternion.identity();
    const s = Math.sin(theta) / theta;
    return new Quaternion(Math.cos(theta), s * v.x, s * v.y, s * v.z);
  }

  /**
   * Logarithmic map: SU(2) → so(3).
   * Returns the pure imaginary quaternion v such that exp(v) = this.
   */
  log(): Vec3 {
    const q = this.normalize();
    const w = Math.max(-1, Math.min(1, q.w));
    const theta = Math.acos(Math.abs(w));

    if (theta < EPSILON) {
      return vec3(0, 0, 0);
    }

    const s = theta / Math.sin(theta);
    const sign = w < 0 ? -1 : 1;
    return vec3(sign * s * q.x, sign * s * q.y, sign * s * q.z);
  }

  /**
   * Get the 4D coordinates for SU(2) ≅ S³ visualization.
   */
  toS3(): [number, number, number, number] {
    return [this.w, this.x, this.y, this.z];
  }

  /**
   * Check if this quaternion approximately equals another.
   * In SU(2) sense (not SO(3) — does NOT identify q with -q).
   */
  approxEqual(other: Quaternion, eps: number = 1e-6): boolean {
    return (
      Math.abs(this.w - other.w) < eps &&
      Math.abs(this.x - other.x) < eps &&
      Math.abs(this.y - other.y) < eps &&
      Math.abs(this.z - other.z) < eps
    );
  }

  /**
   * Check if this represents the same rotation as another (SO(3) equality).
   * In SO(3), q and -q are equivalent.
   */
  sameRotation(other: Quaternion, eps: number = 1e-6): boolean {
    return this.approxEqual(other, eps) || this.approxEqual(other.negate(), eps);
  }

  toString(): string {
    return `Q(${this.w.toFixed(4)}, ${this.x.toFixed(4)}, ${this.y.toFixed(4)}, ${this.z.toFixed(4)})`;
  }
}
