/**
 * SO(3) Ball Parameterization.
 *
 * SO(3) is topologically RP³ (real projective 3-space).
 * We represent it as the closed ball B³(π) in R³ with antipodal
 * identification on the boundary sphere S²(π).
 *
 * A point v ∈ B³(π):
 *   - direction(v) = rotation axis (unit vector)
 *   - ||v|| = rotation angle θ ∈ [0, π]
 *   - v = 0 is the identity rotation
 *   - ||v|| = π means θ = π; here v and -v are identified
 *     because R(n̂, π) = R(-n̂, π) for any unit vector n̂.
 */

import { Vec3, vec3, vec3Norm, vec3Normalize, vec3Scale, vec3Negate, EPSILON, PI } from './vec3';
import { Quaternion } from './quaternion';

export type SO3Point = Vec3;

export function axisAngleToPoint(axis: Vec3, angle: number): SO3Point {
  if (Math.abs(angle) < EPSILON) return vec3(0, 0, 0);
  const n = vec3Normalize(axis);
  // Wrap angle to [0, π] with correct axis handling
  let theta = angle % (2 * PI);
  if (theta < 0) theta += 2 * PI;

  if (theta <= PI) {
    return vec3Scale(n, theta);
  } else {
    // angle ∈ (π, 2π): equivalent to rotation by (2π - angle) about -axis
    return vec3Scale(vec3Negate(n), 2 * PI - theta);
  }
}

export function pointToAxisAngle(p: SO3Point): { axis: Vec3; angle: number } {
  const theta = vec3Norm(p);
  if (theta < EPSILON) {
    return { axis: vec3(0, 0, 1), angle: 0 };
  }
  return {
    axis: vec3Scale(p, 1 / theta),
    angle: theta,
  };
}

export function pointRadius(p: SO3Point): number {
  return vec3Norm(p);
}

export function isOnBoundary(p: SO3Point, epsilon: number = 1e-4): boolean {
  return Math.abs(vec3Norm(p) - PI) < epsilon;
}

export function isIdentity(p: SO3Point, epsilon: number = 1e-4): boolean {
  return vec3Norm(p) < epsilon;
}

/**
 * Return the antipodal partner on the boundary.
 * Only meaningful when ||p|| ≈ π.
 * The antipodal point -p represents the same rotation.
 */
export function antipodalPartner(p: SO3Point): SO3Point {
  return vec3Negate(p);
}

/**
 * Canonical representative for a boundary point:
 * choose the one with the first non-zero coordinate positive.
 * This gives a consistent representative for the equivalence class {p, -p}.
 */
export function canonicalize(p: SO3Point): SO3Point {
  if (!isOnBoundary(p)) return p;
  // Pick representative with first nonzero coord > 0
  if (Math.abs(p.x) > EPSILON) {
    return p.x > 0 ? p : vec3Negate(p);
  }
  if (Math.abs(p.y) > EPSILON) {
    return p.y > 0 ? p : vec3Negate(p);
  }
  if (Math.abs(p.z) > EPSILON) {
    return p.z > 0 ? p : vec3Negate(p);
  }
  return p;
}

/**
 * Compose two rotations (via quaternion multiplication),
 * return the result as an SO(3) point.
 */
export function compose(a: SO3Point, b: SO3Point): SO3Point {
  const qa = Quaternion.fromSO3Point(a);
  const qb = Quaternion.fromSO3Point(b);
  return qa.multiply(qb).toSO3Point();
}

/**
 * Geodesic distance between two SO(3) elements.
 * This is the angle of the rotation a⁻¹b.
 */
export function geodesicDistance(a: SO3Point, b: SO3Point): number {
  const qa = Quaternion.fromSO3Point(a);
  const qb = Quaternion.fromSO3Point(b);
  const qDiff = qa.inverse().multiply(qb);
  const { angle } = qDiff.toAxisAngle();
  return angle;
}

/**
 * Check if two SO3Points represent the same rotation.
 * They are equal if they're close, OR if both are on the boundary
 * and one is close to the antipodal of the other.
 */
export function sameRotation(a: SO3Point, b: SO3Point, eps: number = 1e-4): boolean {
  const qa = Quaternion.fromSO3Point(a);
  const qb = Quaternion.fromSO3Point(b);
  return qa.sameRotation(qb, eps);
}
