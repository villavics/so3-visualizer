import { Vec3, vec3Normalize, PI } from '../math/vec3';
import { generateLoop, getLoopPoint } from '../math/loops';
import { SceneManager } from '../scene/SceneManager';
import { SO3Ball } from '../scene/SO3Ball';
import { TrajectoryRenderer } from '../scene/TrajectoryRenderer';
import { AntipodalMarkers } from '../scene/AntipodalMarkers';

/**
 * Comparison mode: shows 2π and 4π loops side by side.
 * Each has its own Three.js scene and SO3Ball.
 */
export class ComparisonMode {
  private leftScene: SceneManager | null = null;
  private rightScene: SceneManager | null = null;
  private leftTrajectory: TrajectoryRenderer | null = null;
  private rightTrajectory: TrajectoryRenderer | null = null;
  private active = false;
  private axis: Vec3 = { x: 0, y: 0, z: 1 };

  constructor(
    private leftContainer: HTMLElement,
    private rightContainer: HTMLElement,
  ) {}

  activate(axis: Vec3): void {
    this.axis = vec3Normalize(axis);
    this.active = true;

    // Left scene: 2π loop
    this.leftScene = new SceneManager(this.leftContainer);
    const leftBall = new SO3Ball();
    this.leftScene.scene.add(leftBall.group);
    this.leftTrajectory = new TrajectoryRenderer();
    this.leftScene.scene.add(this.leftTrajectory.group);

    const leftLoop = generateLoop(this.axis, 2 * PI, 200);
    this.leftTrajectory.setPath('left', leftLoop.points, {
      color: 0xff6644,
      opacity: 0.8,
    });

    const leftMarkers = new AntipodalMarkers();
    leftMarkers.showIdentificationGrid();
    this.leftScene.scene.add(leftMarkers.group);

    // Right scene: 4π loop
    this.rightScene = new SceneManager(this.rightContainer);
    const rightBall = new SO3Ball();
    this.rightScene.scene.add(rightBall.group);
    this.rightTrajectory = new TrajectoryRenderer();
    this.rightScene.scene.add(this.rightTrajectory.group);

    const rightLoop = generateLoop(this.axis, 4 * PI, 400);
    this.rightTrajectory.setPath('right', rightLoop.points, {
      color: 0x44aaff,
      opacity: 0.8,
    });

    const rightMarkers = new AntipodalMarkers();
    rightMarkers.showIdentificationGrid();
    this.rightScene.scene.add(rightMarkers.group);

    this.leftScene.start();
    this.rightScene.start();
  }

  deactivate(): void {
    this.active = false;
    if (this.leftScene) {
      this.leftScene.dispose();  // fully release WebGL context
    }
    if (this.rightScene) {
      this.rightScene.dispose();  // fully release WebGL context
    }
    this.leftScene = null;
    this.rightScene = null;
    this.leftTrajectory = null;
    this.rightTrajectory = null;
  }

  update(t: number): void {
    if (!this.active) return;
    this.leftTrajectory?.setProgress('left', t);
    this.rightTrajectory?.setProgress('right', t);
  }

  isActive(): boolean {
    return this.active;
  }
}
