import * as THREE from 'three';
import { Vec3, vec3Norm } from '../math/vec3';

export interface TrajectoryStyle {
  color: number;
  opacity: number;
  lineWidth?: number; // note: WebGL limits this to 1 on most hardware
}

interface ActiveTrajectory {
  line: THREE.Line;
  headSphere: THREE.Mesh;
  points: Vec3[];
  progress: number;
}

/**
 * Renders animated trajectory paths inside the SO(3) ball.
 * Paths are drawn as colored lines with a moving "head" sphere
 * showing the current position.
 */
export class TrajectoryRenderer {
  group: THREE.Group;
  private trajectories = new Map<string, ActiveTrajectory>();

  // For the antipodal jump visualization
  private jumpLine: THREE.Line | null = null;
  private jumpFlash: THREE.Mesh | null = null;
  private jumpFlashTimer = 0;

  constructor() {
    this.group = new THREE.Group();
  }

  /**
   * Set or update a trajectory path.
   */
  setPath(id: string, points: Vec3[], style: TrajectoryStyle): void {
    this.removePath(id);

    if (points.length < 2) return;

    const threePoints = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(threePoints);
    const material = new THREE.LineBasicMaterial({
      color: style.color,
      transparent: true,
      opacity: style.opacity,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    this.group.add(line);

    // Head sphere
    const headGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const headMat = new THREE.MeshBasicMaterial({ color: style.color });
    const headSphere = new THREE.Mesh(headGeo, headMat);
    headSphere.visible = false;
    this.group.add(headSphere);

    this.trajectories.set(id, { line, headSphere, points, progress: 0 });
  }

  /**
   * Update how much of the trajectory is visible and move the head.
   * t ∈ [0, 1] — fraction of path completed.
   */
  setProgress(id: string, t: number): void {
    const traj = this.trajectories.get(id);
    if (!traj) return;

    traj.progress = t;
    const idx = Math.min(
      Math.floor(t * (traj.points.length - 1)),
      traj.points.length - 1,
    );

    // Update visible portion: use drawRange
    const geom = traj.line.geometry;
    geom.setDrawRange(0, idx + 1);

    // Move head sphere
    if (idx < traj.points.length) {
      const p = traj.points[idx];
      traj.headSphere.position.set(p.x, p.y, p.z);
      traj.headSphere.visible = true;
    }
  }

  /**
   * Show an antipodal jump connector between two boundary points.
   * This is a dashed line + flash effect.
   */
  showAntipodalJump(from: Vec3, to: Vec3): void {
    this.hideAntipodalJump();

    const points = [
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xffaa00,
      dashSize: 0.2,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    this.jumpLine = new THREE.Line(geo, mat);
    this.jumpLine.computeLineDistances();
    this.group.add(this.jumpLine);

    // Flash spheres at both endpoints
    const flashGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 1.0,
    });
    const flashFrom = new THREE.Mesh(flashGeo, flashMat);
    flashFrom.position.set(from.x, from.y, from.z);
    this.group.add(flashFrom);

    const flashTo = new THREE.Mesh(flashGeo.clone(), flashMat.clone());
    flashTo.position.set(to.x, to.y, to.z);
    this.group.add(flashTo);

    this.jumpFlash = flashFrom;
    this.jumpFlashTimer = 1.0;
  }

  hideAntipodalJump(): void {
    if (this.jumpLine) {
      this.group.remove(this.jumpLine);
      this.jumpLine.geometry.dispose();
      this.jumpLine = null;
    }
    // Remove all flash meshes
    const toRemove: THREE.Object3D[] = [];
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
        const mat = child.material as THREE.MeshBasicMaterial;
        if (mat.color && mat.color.getHex() === 0xffaa00) {
          toRemove.push(child);
        }
      }
    });
    for (const obj of toRemove) {
      this.group.remove(obj);
    }
    this.jumpFlash = null;
  }

  removePath(id: string): void {
    const traj = this.trajectories.get(id);
    if (!traj) return;

    this.group.remove(traj.line);
    this.group.remove(traj.headSphere);
    traj.line.geometry.dispose();
    (traj.line.material as THREE.Material).dispose();
    traj.headSphere.geometry.dispose();
    (traj.headSphere.material as THREE.Material).dispose();
    this.trajectories.delete(id);
  }

  clear(): void {
    for (const id of this.trajectories.keys()) {
      this.removePath(id);
    }
    this.hideAntipodalJump();
  }

  update(dt: number): void {
    // Fade jump flash
    if (this.jumpFlashTimer > 0) {
      this.jumpFlashTimer -= dt * 2;
      if (this.jumpFlashTimer <= 0) {
        this.hideAntipodalJump();
      }
    }
  }
}
