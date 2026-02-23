import { Vec3, vec3Normalize, vec3Norm, vec3Negate, vec3Scale, PI } from '../math/vec3';
import { generateLoop, getLoopPoint, LoopPath } from '../math/loops';
import { TrajectoryRenderer } from '../scene/TrajectoryRenderer';
import { AntipodalMarkers } from '../scene/AntipodalMarkers';

/**
 * Drives a point along a 2π or 4π loop in the SO(3) ball.
 * Updates the trajectory rendering and triggers antipodal jump effects.
 */
export class LoopAnimator {
  private loop: LoopPath | null = null;
  private axis: Vec3 = { x: 1, y: 0, z: 0 };
  private totalAngle: number = 2 * PI;
  private lastJumpIndex = -1;

  constructor(
    private trajectoryRenderer: TrajectoryRenderer,
    private antipodalMarkers: AntipodalMarkers,
  ) {}

  setLoop(axis: Vec3, totalAngle: number): void {
    this.axis = vec3Normalize(axis);
    this.totalAngle = totalAngle;
    this.loop = generateLoop(this.axis, totalAngle, 300);
    this.lastJumpIndex = -1;

    // Set up the trajectory rendering
    this.trajectoryRenderer.setPath('main', this.loop.points, {
      color: totalAngle <= 2 * PI + 0.1 ? 0xff6644 : 0x44aaff,
      opacity: 0.8,
    });
  }

  /**
   * Update visualization for progress t ∈ [0, 1].
   */
  update(t: number): void {
    if (!this.loop) return;

    this.trajectoryRenderer.setProgress('main', t);

    // Check for antipodal jumps
    const idx = Math.floor(t * this.loop.numSamples);
    for (const jumpIdx of this.loop.jumpIndices) {
      if (idx >= jumpIdx - 1 && idx <= jumpIdx + 1 && this.lastJumpIndex !== jumpIdx) {
        this.lastJumpIndex = jumpIdx;
        // Show the jump
        const fromPoint = this.loop.points[jumpIdx - 1];
        const toPoint = this.loop.points[jumpIdx];
        this.trajectoryRenderer.showAntipodalJump(fromPoint, toPoint);
        this.antipodalMarkers.highlightPoint(fromPoint);
      }
    }
  }

  getCurrentPoint(t: number): Vec3 {
    return getLoopPoint(this.axis, this.totalAngle, t);
  }

  reset(): void {
    this.lastJumpIndex = -1;
    this.trajectoryRenderer.clear();
    this.antipodalMarkers.removeHighlight();
  }
}
