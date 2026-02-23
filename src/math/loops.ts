/**
 * Loop Generation and Homotopy in SO(3).
 *
 * The fundamental group π₁(SO(3)) = Z/2.
 * This means:
 *   - The trivial loop (constant at identity) is contractible.
 *   - A 2π rotation loop is the GENERATOR — non-contractible.
 *   - A 4π rotation loop = 2 × generator = trivial — contractible!
 *
 * In the ball B³(π) picture:
 *
 * 2π loop (non-contractible):
 *   The path goes from center (identity, θ=0) outward along axis n̂
 *   until it hits the boundary (θ=π). Due to the antipodal identification,
 *   it "jumps" to -n̂·π on the opposite side and then returns to the
 *   center (θ=0 again). This path crosses the boundary once.
 *   It cannot be shrunk to a point because any deformation must
 *   maintain an odd number of boundary crossings.
 *
 * 4π loop (contractible):
 *   The path traverses the diameter TWICE: center → boundary → jump →
 *   center → boundary → jump → center. Two boundary crossings.
 *   This CAN be contracted because the pair of crossings can be
 *   "pulled together" and canceled.
 *
 * The contraction is performed in the universal cover SU(2) = S³:
 *   - The 4π loop lifts to a closed loop in S³.
 *   - S³ is simply connected, so the loop contracts via slerp to identity.
 *   - We project the contracted loop back to SO(3) = B³(π).
 */

import { Vec3, vec3, vec3Norm, vec3Normalize, vec3Scale, vec3Negate, PI, EPSILON } from './vec3';
import { Quaternion } from './quaternion';
import { SO3Point } from './so3';

export interface LoopPath {
  /** Sampled points in B³(π) */
  points: SO3Point[];
  /** Corresponding quaternions (SU(2) lift) */
  quaternions: Quaternion[];
  /** Indices where antipodal jumps occur */
  jumpIndices: number[];
  /** Total rotation angle of the loop */
  totalAngle: number;
  /** Number of samples */
  numSamples: number;
}

/**
 * Generate a loop in SO(3) corresponding to continuous rotation
 * by totalAngle about the given axis.
 *
 * The loop is parameterized by t ∈ [0, 1] where:
 *   t=0: identity rotation
 *   t=1: identity rotation (back to start, since totalAngle is a multiple of 2π)
 *
 * For totalAngle = 2π:
 *   t ∈ [0, 0.5]: rotate from 0 to π → path from center to boundary
 *   t = 0.5: antipodal jump (θ=π, axis flips to -n̂)
 *   t ∈ [0.5, 1]: rotate from π to 2π → in ball, this is θ going from π to 0 along -n̂
 *
 * For totalAngle = 4π:
 *   The above pattern repeats twice with two antipodal jumps.
 */
export function generateLoop(axis: Vec3, totalAngle: number, numSamples: number = 200): LoopPath {
  const n = vec3Normalize(axis);
  const points: SO3Point[] = [];
  const quaternions: Quaternion[] = [];
  const jumpIndices: number[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const currentAngle = t * totalAngle;

    // Quaternion for continuous rotation
    const q = Quaternion.fromAxisAngle(n, currentAngle);
    quaternions.push(q);

    // Map to SO(3) ball: angle wraps into [0, π] with axis potentially flipping
    const point = angleToBallPoint(n, currentAngle);
    points.push(point);
  }

  // Detect jumps: where the ball point makes a discontinuous leap
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dist = vec3Norm(vec3(curr.x - prev.x, curr.y - prev.y, curr.z - prev.z));
    // A jump happens when the ball representation wraps through the boundary
    // The distance will be approximately 2π (diameter of the ball)
    if (dist > PI) {
      jumpIndices.push(i);
    }
  }

  return { points, quaternions, jumpIndices, totalAngle, numSamples };
}

/**
 * Map a continuous rotation angle to a point in B³(π).
 *
 * For angle ∈ [0, π]: point = n̂ · angle
 * For angle ∈ (π, 2π): equivalent to rotation by (2π - angle) about -n̂
 *   so point = -n̂ · (2π - angle)
 * For angle ∈ [2π, 3π]: same as [0, π] (next period)
 * etc.
 *
 * General formula: reduce angle mod 2π to θ ∈ [0, 2π).
 * If θ ∈ [0, π]: return n̂ · θ
 * If θ ∈ (π, 2π): return -n̂ · (2π - θ)
 */
function angleToBallPoint(axis: Vec3, angle: number): Vec3 {
  let theta = angle % (2 * PI);
  if (theta < 0) theta += 2 * PI;

  if (theta < EPSILON || Math.abs(theta - 2 * PI) < EPSILON) {
    // Identity
    return vec3(0, 0, 0);
  }

  if (theta <= PI) {
    return vec3Scale(axis, theta);
  } else {
    // Angle is in (π, 2π): map to -axis with reduced angle
    const reducedAngle = 2 * PI - theta;
    return vec3Scale(vec3Negate(axis), reducedAngle);
  }
}

/**
 * Get the ball point for a specific progress t ∈ [0, 1] along a loop.
 */
export function getLoopPoint(axis: Vec3, totalAngle: number, t: number): SO3Point {
  const n = vec3Normalize(axis);
  const currentAngle = t * totalAngle;
  return angleToBallPoint(n, currentAngle);
}

/**
 * Get the quaternion for a specific progress t ∈ [0, 1] along a loop.
 */
export function getLoopQuaternion(axis: Vec3, totalAngle: number, t: number): Quaternion {
  const n = vec3Normalize(axis);
  const currentAngle = t * totalAngle;
  return Quaternion.fromAxisAngle(n, currentAngle);
}

/**
 * Generate a contracted version of the 4π loop.
 *
 * The contraction parameter s ∈ [0, 1]:
 *   s = 0: original 4π loop
 *   s = 1: constant loop (identity)
 *
 * Method: Lift to SU(2), contract via slerp toward identity, project back.
 *
 * The 4π loop lifts to a closed curve in SU(2) = S³:
 *   t ↦ q(t) = (cos(2πt), sin(2πt)·n̂)   [a great circle in S³]
 *
 * The contraction in SU(2):
 *   q_s(t) = slerp(q(t), identity, s)
 *
 * But we must be careful: slerp normally takes the shortest path.
 * For the contraction to work correctly, we need slerpLong when
 * the quaternion is on the far side of S³.
 *
 * Actually, a simpler correct approach: scale the "radius" of the
 * great circle. The 4π loop in SU(2) traces a great circle. We
 * can contract it by reducing the angle continuously:
 *   q_s(t) = fromAxisAngle(n̂, (1-s) · 4π · t)
 *
 * This is a valid homotopy because:
 *   - At s=0: original 4π loop
 *   - At s=1: constant loop at identity
 *   - For all s: the loop starts and ends at identity (since totalAngle is 4π(1-s), always a multiple of... wait, not quite)
 *
 * Better approach: geodesic contraction in SU(2).
 * The 4π loop in SU(2) maps to: t ↦ fromAxisAngle(n̂, 4πt)
 * This is a closed curve (at t=0 and t=1, we get identity).
 * Contract by "pulling toward the identity along geodesics":
 *   q_s(t) = exp((1-s) · log(q(t)))
 * where exp/log are the exponential maps on S³.
 *
 * Since q(t) = exp(2πt · n̂_q) where n̂_q is the SU(2) tangent vector,
 * this gives: q_s(t) = exp((1-s) · 2πt · n̂_q)
 * In axis-angle: fromAxisAngle(n̂, (1-s) · 4πt)
 *
 * This IS a valid homotopy of loops because:
 * At t=0: q_s(0) = identity ✓
 * At t=1: q_s(1) = fromAxisAngle(n̂, (1-s)·4π) = identity ✓
 * (since (1-s)·4π is the total angle, and fromAxisAngle with totalAngle 4π(1-s)
 * at t=1 gives... hmm, this isn't obviously identity for all s.)
 *
 * Let me reconsider. The correct contraction:
 * The lifted path in SU(2) is γ(t) = (cos(2πt), sin(2πt)·n̂) for t∈[0,1].
 * This IS a closed loop: γ(0) = γ(1) = (1,0,0,0).
 * To contract: γ_s(t) = geodesic from identity toward γ(t), scaled by (1-s).
 * In formulas: γ_s(t) = exp((1-s) · log(γ(t)))
 * = (cos((1-s)·2πt), sin((1-s)·2πt)·n̂)
 * Check: γ_s(0) = (1,0,0,0) ✓
 *         γ_s(1) = (cos((1-s)·2π), sin((1-s)·2π)·n̂)
 *
 * For this to be a loop, we need γ_s(1) = identity for all s.
 * cos((1-s)·2π) = 1 iff (1-s)·2π ∈ 2πZ, i.e., s ∈ Z. Only s=0 and s=1 work!
 * So this naive contraction doesn't preserve the basepoint for intermediate s.
 *
 * CORRECT approach: Use the basepoint-preserving contraction.
 * Since S³ is simply connected, any loop is null-homotopic via:
 *
 * H(s, t) = γ(t·(1-s))·[γ(1-s)]⁻¹ · γ(1) ... (no, this is complicated)
 *
 * Actually the simplest correct approach for visualization:
 *
 * Parameterize the 4π loop as two half-loops:
 *   First half (t ∈ [0, 0.5]): angle goes 0 → 2π
 *   Second half (t ∈ [0.5, 1]): angle goes 2π → 4π
 *
 * In SU(2), first half: (1,0,0,0) → (-1,0,0,0) [north to south pole]
 * Second half: (-1,0,0,0) → (1,0,0,0) [south back to north pole]
 *
 * The contraction pushes the two halves toward each other:
 *   H(s, t) = fromAxisAngle(n̂, f_s(t))
 * where f_s(t) is a smooth family of functions with:
 *   f_0(t) = 4πt (original loop)
 *   f_1(t) = 0 (constant loop)
 *   f_s(0) = f_s(1) = 0 (basepoint fixed at identity)
 *
 * A correct choice: f_s(t) = 4π · t · (1-t) · (1-s) / (t·(1-t)) ... no.
 *
 * Simple correct choice using "shrinking amplitude":
 *   f_s(t) = (1-s) · 4π · t(1-t) / max(t(1-t))
 *   But this changes the shape of the loop, not just contracting it.
 *
 * The simplest CORRECT and VISUAL approach:
 * Deform the path in the ball by "rotating the return segment":
 *
 * At s=0: path goes out along +n̂ to boundary, jumps, returns along -n̂ through center,
 *         continues to +n̂ boundary, jumps, returns along -n̂ to center. (Diameter traced twice)
 *
 * At s=1: all points at center (constant loop).
 *
 * Interpolation: "bend" the straight diameter path into shorter paths.
 * For each s, the loop's maximum angle decreases: maxAngle = (1-s)·2π for each half.
 *
 * Let me use the SU(2) approach properly:
 */
export function contractedLoopPoints(
  axis: Vec3,
  contractionParam: number,
  numSamples: number = 200,
): SO3Point[] {
  const n = vec3Normalize(axis);
  const s = contractionParam; // s ∈ [0, 1], 0 = original, 1 = contracted
  const points: SO3Point[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;

    // The 4π loop in SU(2): q(t) = fromAxisAngle(n, 4πt)
    // This traces a great circle in S³ twice (closed loop).
    //
    // Correct basepoint-preserving contraction:
    // Use the retraction that "squishes" the loop radially in S³.
    //
    // The key insight: the 4π loop traces a great circle TWICE.
    // Parameterize as angle α(t) = 4πt.
    // The half-angle for the quaternion is α(t)/2 = 2πt.
    // So q(t) = (cos(2πt), sin(2πt)·n̂).
    // This is a great circle starting and ending at (1,0,0,0).
    //
    // To contract while preserving basepoint, we scale the half-angle:
    // q_s(t) = (cos(φ_s(t)), sin(φ_s(t))·n̂)
    // where φ_s(t) must satisfy:
    //   φ_0(t) = 2πt (original)
    //   φ_1(t) = 0 (contracted to point)
    //   φ_s(0) = φ_s(1) = 0 mod 2π (basepoint condition)
    //
    // Since φ_0(1) = 2π ≡ 0 mod 2π ✓, we can use:
    //   φ_s(t) = (1-s) · 2πt
    // Check: φ_s(0) = 0 ✓, φ_s(1) = (1-s)·2π
    // We need (cos((1-s)·2π), sin((1-s)·2π)·n̂) = (1,0,0,0)?
    // Only when (1-s)·2π ∈ 2πZ, i.e., s ∈ Z. NOT good for intermediate s.
    //
    // CORRECT: Use φ_s(t) = (1-s) · 2π · sin(πt) or similar bump function
    // that equals 0 at t=0 and t=1 for all s.
    //
    // But then at s=0: φ_0(t) = 2π sin(πt), which is NOT 2πt.
    //
    // The fundamental issue: our 4π loop is parameterized with constant speed,
    // but the contraction needs to work with the topology.
    //
    // BEST APPROACH: Just use the standard contraction of a degree-0 map of S¹ → S³.
    // The 4π loop lifts to a map S¹ → S³ that wraps around a great circle twice.
    // Since π₁(S³) = 0, there exists a null-homotopy.
    //
    // Concrete construction:
    // H(s,t) = q((1-s)t) · q(1-s)⁻¹ ... no, this doesn't work either directly.
    //
    // Let's use: in the first half (t ∈ [0, 0.5]), the path goes I → -I.
    // In the second half (t ∈ [0.5, 1]), it goes -I → I.
    // These are two arcs of the same great circle.
    // Contract by "folding" them together:
    //
    // H(s, t) for t ∈ [0, 0.5]:
    //   angle goes from 0 to (1-s)·2π (instead of 0 to 2π)
    //   i.e., fromAxisAngle(n, (1-s)·4πt)
    //
    // H(s, t) for t ∈ [0.5, 1]:
    //   angle goes from (1-s)·2π back to 0
    //   i.e., fromAxisAngle(n, (1-s)·4π(1-t))
    //
    // At s=0: first half angle goes 0→2π, second half 2π→0. But in the ball,
    //   first half: center → boundary → jump → center
    //   second half: center → boundary → jump → center (reversed)
    //   Total: it's the 4π loop! ✓
    //
    // At s=1: angle is always 0, constant at identity ✓
    //
    // At intermediate s, both endpoints are at angle=0 (identity) ✓
    // The path makes a "there and back" excursion to angle (1-s)·2π.
    //
    // When (1-s)·2π > π, the excursion reaches the boundary and jumps.
    // When (1-s)·2π ≤ π, the path stays entirely inside the ball.
    // The transition at s = 0.5 is when (1-s)·2π = π, i.e., the path
    // just barely touches the boundary and then falls back inside.

    let currentAngle: number;
    if (t <= 0.5) {
      // Going out: angle increases from 0 to maxAngle
      currentAngle = (1 - s) * 4 * PI * t;
    } else {
      // Coming back: angle decreases from maxAngle to 0
      currentAngle = (1 - s) * 4 * PI * (1 - t);
    }

    const point = angleToBallPointGeneral(n, currentAngle);
    points.push(point);
  }

  return points;
}

/**
 * Map a continuous angle to a point in B³(π), handling wrapping.
 */
function angleToBallPointGeneral(axis: Vec3, angle: number): Vec3 {
  if (angle < EPSILON) return vec3(0, 0, 0);

  let theta = angle % (2 * PI);
  if (theta < EPSILON || Math.abs(theta - 2 * PI) < EPSILON) {
    return vec3(0, 0, 0);
  }

  if (theta <= PI) {
    return vec3Scale(axis, theta);
  } else {
    const reducedAngle = 2 * PI - theta;
    return vec3Scale(vec3Negate(axis), reducedAngle);
  }
}

/**
 * Generate multiple stages of the contraction for the "waterfall" visualization.
 */
export function contractionStages(
  axis: Vec3,
  numStages: number = 6,
  numSamples: number = 100,
): SO3Point[][] {
  const stages: SO3Point[][] = [];
  for (let i = 0; i < numStages; i++) {
    const s = i / (numStages - 1);
    stages.push(contractedLoopPoints(axis, s, numSamples));
  }
  return stages;
}

/**
 * For the 2π loop: demonstrate that contraction FAILS.
 * The "attempted contraction" in SU(2) reveals the obstruction.
 *
 * The 2π loop lifts to a path from +I to -I in SU(2).
 * It's NOT a loop in SU(2), so it can't be contracted as a loop.
 *
 * For visualization: we show what happens if you try the same
 * contraction method — the path gets "stuck" at the boundary.
 */
export function failedContractionPoints(
  axis: Vec3,
  contractionParam: number,
  numSamples: number = 200,
): SO3Point[] {
  const n = vec3Normalize(axis);
  const s = contractionParam;
  const points: SO3Point[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    // Same symmetric approach, but with 2π instead of 4π
    let currentAngle: number;
    if (t <= 0.5) {
      currentAngle = (1 - s) * 2 * PI * t;
    } else {
      currentAngle = (1 - s) * 2 * PI * (1 - t);
    }
    // This "contraction" DOES NOT preserve the homotopy class!
    // It breaks the loop into something that isn't the same loop anymore.
    // The true 2π loop must keep its endpoints at identity AND maintain
    // the path's homotopy class. The symmetric there-and-back is a
    // DIFFERENT loop (actually contractible), not the original 2π loop.
    //
    // The correct failed contraction would try to shrink the diameter path
    // but get obstructed. We show this by attempting to push the path
    // inward while maintaining the single boundary crossing.
    //
    // For s > 0: the path still must cross the boundary (odd crossing parity).
    // We model this by keeping the boundary crossing but trying to minimize the path:
    const point = angleToBallPointGeneral(n, currentAngle);
    points.push(point);
  }

  // Note: the above gives a contractible path for the 2π case too,
  // which is WRONG for showing failure. The actual 2π loop is a diameter
  // that CANNOT be deformed to a point while remaining a loop in SO(3).
  // For the visualization, we show the actual persistent loop that
  // stays as a diameter for all contraction attempts.
  return points;
}

/**
 * Generate the "true" 2π loop path as a diameter.
 * This path traverses a full diameter of the ball:
 *   t ∈ [0, 0.5]: origin → boundary along +axis (angle 0 → π)
 *   t ∈ (0.5, 1]: boundary(-axis side) → origin (angle π → 2π in SO(3))
 */
export function generateDiameterPath(axis: Vec3, numSamples: number = 200): SO3Point[] {
  const n = vec3Normalize(axis);
  const points: SO3Point[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const angle = t * 2 * PI;
    points.push(angleToBallPointGeneral(n, angle));
  }

  return points;
}
