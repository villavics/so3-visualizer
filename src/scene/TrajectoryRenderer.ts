import * as THREE from 'three';
import { Vec3, vec3Norm } from '../math/vec3';

export interface TrajectoryStyle {
  color: number;
  opacity: number;
  lineWidth?: number; // note: WebGL limits this to 1 on most hardware
}

/** Thick arrow built from CylinderGeometry (shaft) + ConeGeometry (head). */
interface ThickArrow {
  group: THREE.Group;
  shaft: THREE.Mesh;
  head: THREE.Mesh;
}

interface ActiveTrajectory {
  line: THREE.Line;
  headSphere: THREE.Mesh;
  arrow: ThickArrow | null;
  points: Vec3[];
  progress: number;
}

// Reusable helpers to avoid per-frame allocations
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

/**
 * Renders animated trajectory paths inside the SO(3) ball.
 * Paths are drawn as colored lines with a moving "head" sphere
 * showing the current position.
 */
export class TrajectoryRenderer {
  group: THREE.Group;
  private trajectories = new Map<string, ActiveTrajectory>();
  private _showPositionVector = false;

  // For the antipodal jump visualization
  private jumpLine: THREE.Line | null = null;
  private jumpFlash: THREE.Mesh | null = null;
  private jumpFlashTimer = 0;

  // Thick arrow styling constants
  private static readonly SHAFT_RADIUS = 0.025;
  private static readonly HEAD_RADIUS = 0.065;
  private static readonly HEAD_LENGTH = 0.16;
  private static readonly MIN_ARROW_LENGTH = 0.08;

  constructor() {
    this.group = new THREE.Group();
  }

  /** Toggle position vector (arrow from origin to current point). */
  set showPositionVector(show: boolean) {
    this._showPositionVector = show;
    // Update visibility of all existing arrows
    for (const traj of this.trajectories.values()) {
      if (traj.arrow) {
        traj.arrow.group.visible = show;
      }
    }
  }

  get showPositionVector(): boolean {
    return this._showPositionVector;
  }

  /**
   * Create a thick arrow (cylinder shaft + cone head) oriented along +Y.
   * The group is rotated in setProgress() to point toward the current position.
   */
  private createThickArrow(color: number): ThickArrow {
    const group = new THREE.Group();

    // Shaft: unit-height cylinder along Y, bottom at origin
    const shaftGeo = new THREE.CylinderGeometry(
      TrajectoryRenderer.SHAFT_RADIUS,
      TrajectoryRenderer.SHAFT_RADIUS,
      1, 8,
    );
    shaftGeo.translate(0, 0.5, 0); // pivot at origin, extends to y=1
    const shaftMat = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    group.add(shaft);

    // Head: cone along Y, centered at origin (repositioned dynamically)
    const headGeo = new THREE.ConeGeometry(
      TrajectoryRenderer.HEAD_RADIUS,
      TrajectoryRenderer.HEAD_LENGTH,
      12,
    );
    headGeo.translate(0, TrajectoryRenderer.HEAD_LENGTH / 2, 0);
    const headMat = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    group.add(head);

    group.visible = false;
    return { group, shaft, head };
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

    // Position vector: thick arrow (origin -> current point)
    const arrow = this.createThickArrow(style.color);
    this.group.add(arrow.group);

    this.trajectories.set(id, { line, headSphere, arrow, points, progress: 0 });
  }

  /**
   * Update how much of the trajectory is visible and move the head.
   * t in [0, 1] -- fraction of path completed.
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

      // Update thick position vector arrow
      if (traj.arrow) {
        const len = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (len > TrajectoryRenderer.MIN_ARROW_LENGTH && this._showPositionVector) {
          _dir.set(p.x / len, p.y / len, p.z / len);

          const headLen = TrajectoryRenderer.HEAD_LENGTH;
          const shaftLen = Math.max(0.01, len - headLen);

          // Scale shaft to correct length
          traj.arrow.shaft.scale.y = shaftLen;

          // Position cone head at the top of the shaft
          traj.arrow.head.position.y = shaftLen;

          // Orient the whole group to point from origin toward p
          traj.arrow.group.quaternion.setFromUnitVectors(_up, _dir);
          traj.arrow.group.visible = true;
        } else {
          traj.arrow.group.visible = false;
        }
      }
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

    // Dispose thick arrow
    if (traj.arrow) {
      this.group.remove(traj.arrow.group);
      traj.arrow.shaft.geometry.dispose();
      (traj.arrow.shaft.material as THREE.Material).dispose();
      traj.arrow.head.geometry.dispose();
      (traj.arrow.head.material as THREE.Material).dispose();
    }

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
