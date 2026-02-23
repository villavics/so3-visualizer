import * as THREE from 'three';
import { Vec3, vec3Negate, PI } from '../math/vec3';

interface MarkerPair {
  sphere1: THREE.Mesh;
  sphere2: THREE.Mesh;
  arc: THREE.Line;
}

/**
 * Visual markers for antipodal identification on the boundary.
 *
 * On the boundary sphere (radius = π), diametrically opposite points
 * represent the SAME rotation. We visualize this by placing matched
 * pairs of colored dots connected by faint arcs through the interior.
 */
export class AntipodalMarkers {
  group: THREE.Group;
  private pairs: MarkerPair[] = [];
  private pulseTime = 0;
  private pulsing = false;

  constructor() {
    this.group = new THREE.Group();
  }

  /**
   * Show a grid of antipodal pairs on the boundary to illustrate
   * the full identification structure.
   */
  showIdentificationGrid(): void {
    this.clear();

    // Place pairs at several points on the boundary sphere
    const pairDefs = [
      { point: [PI, 0, 0], color: 0xff6644 },
      { point: [0, PI, 0], color: 0x44ff66 },
      { point: [0, 0, PI], color: 0x6644ff },
      { point: [PI * 0.707, PI * 0.707, 0], color: 0xff44ff },
      { point: [0, PI * 0.707, PI * 0.707], color: 0xffff44 },
      { point: [PI * 0.707, 0, PI * 0.707], color: 0x44ffff },
    ];

    for (const { point, color } of pairDefs) {
      const p: Vec3 = { x: point[0], y: point[1], z: point[2] };
      this.addPair(p, color);
    }
  }

  /**
   * Add a single antipodal pair.
   */
  addPair(point: Vec3, color: number): void {
    const antipodal = vec3Negate(point);

    // Create two matching spheres
    const geo = new THREE.SphereGeometry(0.1, 10, 10);

    const mat1 = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
    const sphere1 = new THREE.Mesh(geo, mat1);
    sphere1.position.set(point.x, point.y, point.z);

    const mat2 = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
    const sphere2 = new THREE.Mesh(geo.clone(), mat2);
    sphere2.position.set(antipodal.x, antipodal.y, antipodal.z);

    // Create an arc connecting them through the interior (straight line for simplicity)
    const arcPoints = [
      new THREE.Vector3(point.x, point.y, point.z),
      new THREE.Vector3(0, 0, 0), // through center
      new THREE.Vector3(antipodal.x, antipodal.y, antipodal.z),
    ];
    const curve = new THREE.CatmullRomCurve3(arcPoints);
    const curvePoints = curve.getPoints(20);
    const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const arcMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
    });
    const arc = new THREE.Line(arcGeo, arcMat);

    this.group.add(sphere1);
    this.group.add(sphere2);
    this.group.add(arc);

    this.pairs.push({ sphere1, sphere2, arc });
  }

  /**
   * Highlight a specific boundary point and its antipodal partner.
   */
  highlightPoint(point: Vec3): void {
    // Remove previous highlight
    this.removeHighlight();

    const antipodal = vec3Negate(point);

    // Bright markers
    const geo = new THREE.SphereGeometry(0.15, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const s1 = new THREE.Mesh(geo, mat);
    s1.position.set(point.x, point.y, point.z);
    s1.name = 'highlight';
    this.group.add(s1);

    const s2 = new THREE.Mesh(geo.clone(), mat.clone());
    s2.position.set(antipodal.x, antipodal.y, antipodal.z);
    s2.name = 'highlight';
    this.group.add(s2);
  }

  removeHighlight(): void {
    const toRemove: THREE.Object3D[] = [];
    this.group.traverse((child) => {
      if (child.name === 'highlight') toRemove.push(child);
    });
    for (const obj of toRemove) {
      this.group.remove(obj);
    }
  }

  startPulse(): void {
    this.pulsing = true;
    this.pulseTime = 0;
  }

  stopPulse(): void {
    this.pulsing = false;
    for (const pair of this.pairs) {
      (pair.sphere1.material as THREE.MeshBasicMaterial).opacity = 0.8;
      (pair.sphere2.material as THREE.MeshBasicMaterial).opacity = 0.8;
    }
  }

  clear(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.pairs = [];
  }

  update(dt: number): void {
    if (!this.pulsing) return;
    this.pulseTime += dt * 3;
    const scale = 0.5 + 0.5 * Math.sin(this.pulseTime);
    for (const pair of this.pairs) {
      (pair.sphere1.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * scale;
      (pair.sphere2.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * scale;
    }
  }
}
