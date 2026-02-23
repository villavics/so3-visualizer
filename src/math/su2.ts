/**
 * SU(2) / S³ utilities for the double cover visualization.
 *
 * SU(2) is the group of unit quaternions, topologically a 3-sphere S³.
 * The map SU(2) → SO(3) sends q ↦ (rotation by q), with kernel {±I}.
 * So SO(3) ≅ SU(2)/{±I} ≅ RP³.
 *
 * Key facts for visualization:
 *   - A 2π rotation loop in SO(3) lifts to a path from +I to -I in SU(2).
 *     This is NOT a closed loop in SU(2), so it's not contractible there.
 *     Since SU(2) is the universal cover, this means it's non-contractible in SO(3).
 *
 *   - A 4π rotation loop in SO(3) lifts to a great circle in SU(2)
 *     (from +I back to +I). This IS a closed loop, and since S³ is simply
 *     connected, it's contractible.
 *
 * We use stereographic projection S³ → R³ to display the SU(2) paths.
 */

import { Vec3, vec3, vec3Normalize, EPSILON, PI } from './vec3';
import { Quaternion } from './quaternion';
import { SO3Point } from './so3';

/**
 * Stereographic projection from S³ to R³.
 * Projects from the "south pole" (-1, 0, 0, 0) of S³.
 *
 * Given q = (w, x, y, z) ∈ S³:
 *   project to (x/(1+w), y/(1+w), z/(1+w))
 *
 * The north pole (1,0,0,0) maps to origin.
 * The south pole (-1,0,0,0) maps to infinity (handled as large vector).
 */
export function stereographicProject(q: Quaternion): Vec3 {
  const w = q.w;
  const denom = 1 + w;

  if (Math.abs(denom) < EPSILON) {
    // Near the south pole — project to a large but finite point
    // This represents "the point at infinity" in the Alexandroff compactification
    const bigR = 20; // clamp for visualization
    const n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);
    if (n < EPSILON) return vec3(0, 0, bigR);
    return vec3(
      (q.x / n) * bigR,
      (q.y / n) * bigR,
      (q.z / n) * bigR,
    );
  }

  return vec3(q.x / denom, q.y / denom, q.z / denom);
}

/**
 * The double cover map: SU(2) → SO(3).
 * Given q ∈ SU(2), return the corresponding point in B³(π).
 */
export function doubleCoverMap(q: Quaternion): SO3Point {
  return q.toSO3Point();
}

/**
 * Lift a path in SO(3) to a continuous path in SU(2).
 *
 * At each step, we have two choices for the quaternion (q and -q).
 * We pick the one closest to the previous quaternion to ensure continuity.
 * The starting quaternion is chosen with w ≥ 0 (in the "upper hemisphere").
 *
 * For a 2π loop: the lift will go from +I to -I (NOT a closed loop in SU(2)).
 * For a 4π loop: the lift will return to +I (closed loop in SU(2)).
 */
export function liftPath(so3Points: SO3Point[]): Quaternion[] {
  if (so3Points.length === 0) return [];

  const lifted: Quaternion[] = [];

  // First point: choose representative with w ≥ 0
  let q = Quaternion.fromSO3Point(so3Points[0]);
  if (q.w < 0) q = q.negate();
  lifted.push(q);

  for (let i = 1; i < so3Points.length; i++) {
    let qi = Quaternion.fromSO3Point(so3Points[i]);

    // Choose sign for continuity: pick the qi closest to previous
    const prev = lifted[i - 1];
    if (qi.dot(prev) < 0) {
      qi = qi.negate();
    }
    lifted.push(qi);
  }

  return lifted;
}

/**
 * Check if a lifted path is closed in SU(2) (first ≈ last quaternion).
 * For a 4π loop this should return true; for 2π, false.
 */
export function isLiftedPathClosed(path: Quaternion[], eps: number = 1e-4): boolean {
  if (path.length < 2) return true;
  return path[0].approxEqual(path[path.length - 1], eps);
}

/**
 * Check if a lifted path connects antipodal points in SU(2) (q to -q).
 * For a 2π loop this should return true.
 */
export function isLiftedPathAntipodal(path: Quaternion[], eps: number = 1e-4): boolean {
  if (path.length < 2) return false;
  return path[0].approxEqual(path[path.length - 1].negate(), eps);
}

/**
 * Generate the stereographic projection of a quaternion path.
 * Used for the SU(2) inset visualization.
 */
export function projectPath(quaternions: Quaternion[]): Vec3[] {
  return quaternions.map(stereographicProject);
}
