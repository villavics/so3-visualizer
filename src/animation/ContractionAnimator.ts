import { Vec3, vec3Normalize, PI } from '../math/vec3';
import { contractedLoopPoints, contractionStages } from '../math/loops';
import { TrajectoryRenderer } from '../scene/TrajectoryRenderer';

/**
 * Animates the homotopy contraction of the 4π loop.
 *
 * Shows the loop progressively shrinking to a point as the
 * contraction parameter s increases from 0 to 1.
 *
 * Also supports "ghost trail" mode where multiple intermediate
 * stages are shown simultaneously as fading curves.
 */
export class ContractionAnimator {
  private axis: Vec3 = { x: 1, y: 0, z: 0 };
  private showGhosts = true;
  private ghostsRendered = false;

  constructor(private trajectoryRenderer: TrajectoryRenderer) {}

  setAxis(axis: Vec3): void {
    this.axis = vec3Normalize(axis);
    this.ghostsRendered = false;
  }

  /**
   * Update the contraction visualization.
   * @param s Contraction parameter ∈ [0, 1]
   * @param t Progress along the current loop ∈ [0, 1]
   */
  update(s: number, t: number): void {
    // Generate the contracted path at the current s
    const points = contractedLoopPoints(this.axis, s, 200);

    // Render the current contracted loop
    this.trajectoryRenderer.setPath('contraction', points, {
      color: 0x44aaff,
      opacity: 0.9,
    });
    this.trajectoryRenderer.setProgress('contraction', t);

    // Show ghost stages (intermediate contraction levels)
    if (this.showGhosts && !this.ghostsRendered) {
      this.renderGhosts();
      this.ghostsRendered = true;
    }
  }

  /**
   * Render multiple intermediate stages as fading ghost curves.
   * This gives a "waterfall" effect showing the contraction progress.
   */
  private renderGhosts(): void {
    const stages = contractionStages(this.axis, 6, 100);
    for (let i = 0; i < stages.length; i++) {
      const opacity = 0.15 * (1 - i / stages.length);
      this.trajectoryRenderer.setPath(`ghost-${i}`, stages[i], {
        color: 0x8888cc,
        opacity,
      });
      // Show full path for ghosts
      this.trajectoryRenderer.setProgress(`ghost-${i}`, 1);
    }
  }

  /**
   * Clear ghost trails and contraction path.
   */
  reset(): void {
    this.trajectoryRenderer.removePath('contraction');
    for (let i = 0; i < 10; i++) {
      this.trajectoryRenderer.removePath(`ghost-${i}`);
    }
    this.ghostsRendered = false;
  }

  setShowGhosts(show: boolean): void {
    this.showGhosts = show;
    if (!show) {
      for (let i = 0; i < 10; i++) {
        this.trajectoryRenderer.removePath(`ghost-${i}`);
      }
      this.ghostsRendered = false;
    }
  }
}
