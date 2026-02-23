import * as THREE from 'three';
import { PI } from '../math/vec3';

/**
 * The translucent ball of radius π representing SO(3).
 *
 * Every point inside this ball represents a rotation:
 * - Center (origin) = identity rotation
 * - Direction from center = rotation axis
 * - Distance from center = rotation angle (0 to π)
 * - Boundary (radius = π) has antipodal identification
 */
export class SO3Ball {
  group: THREE.Group;

  private ballMesh!: THREE.Mesh;
  private shellMeshes: THREE.LineSegments[] = [];
  private axisLines!: THREE.Group;
  private centerMarker!: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();
    this.createBall();
    this.createShells();
    this.createAxes();
    this.createCenterMarker();
    this.createAxisLabels();
  }

  private createBall(): void {
    const geometry = new THREE.SphereGeometry(PI, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3366aa,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.ballMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.ballMesh);

    // Outer wireframe for the boundary
    const wireGeo = new THREE.SphereGeometry(PI, 24, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4488cc,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.group.add(wireMesh);
  }

  /**
   * Wireframe shells at constant rotation angle.
   * These help visualize "layers" of the ball — all points at the same
   * distance from center represent rotations by the same angle.
   */
  private createShells(): void {
    const shellAngles = [PI / 4, PI / 2, (3 * PI) / 4];
    const colors = [0x224466, 0x335577, 0x446688];

    for (let i = 0; i < shellAngles.length; i++) {
      const geo = new THREE.SphereGeometry(shellAngles[i], 16, 16);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.12,
      });
      const shell = new THREE.LineSegments(edges, mat);
      this.shellMeshes.push(shell);
      this.group.add(shell);
    }
  }

  /**
   * RGB axis lines through the ball.
   * Red = X axis (rotations about X)
   * Green = Y axis (rotations about Y)
   * Blue = Z axis (rotations about Z)
   */
  private createAxes(): void {
    this.axisLines = new THREE.Group();

    const axes = [
      { dir: [1, 0, 0], color: 0xff4444 }, // X = red
      { dir: [0, 1, 0], color: 0x44ff44 }, // Y = green
      { dir: [0, 0, 1], color: 0x4488ff }, // Z = blue
    ];

    for (const { dir, color } of axes) {
      const points = [
        new THREE.Vector3(-dir[0] * PI, -dir[1] * PI, -dir[2] * PI),
        new THREE.Vector3(dir[0] * PI, dir[1] * PI, dir[2] * PI),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
      });
      this.axisLines.add(new THREE.Line(geo, mat));
    }

    this.group.add(this.axisLines);
  }

  /**
   * Small glowing sphere at the origin = identity rotation.
   */
  private createCenterMarker(): void {
    const geo = new THREE.SphereGeometry(0.08, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    this.centerMarker = new THREE.Mesh(geo, mat);
    this.group.add(this.centerMarker);
  }

  /**
   * Text labels for axes at the boundary.
   */
  private createAxisLabels(): void {
    const labels = [
      { text: '+X', pos: [PI + 0.3, 0, 0], color: '#ff4444' },
      { text: '-X', pos: [-PI - 0.3, 0, 0], color: '#ff4444' },
      { text: '+Y', pos: [0, PI + 0.3, 0], color: '#44ff44' },
      { text: '-Y', pos: [0, -PI - 0.3, 0], color: '#44ff44' },
      { text: '+Z', pos: [0, 0, PI + 0.3], color: '#4488ff' },
      { text: '-Z', pos: [0, 0, -PI - 0.3], color: '#4488ff' },
    ];

    for (const { text, pos, color } of labels) {
      const sprite = this.createTextSprite(text, color);
      sprite.position.set(pos[0], pos[1], pos[2]);
      sprite.scale.set(0.5, 0.25, 1);
      this.group.add(sprite);
    }

    // Identity label
    const idLabel = this.createTextSprite('I', '#ffffff');
    idLabel.position.set(0.2, 0.2, 0);
    idLabel.scale.set(0.3, 0.15, 1);
    this.group.add(idLabel);
  }

  private createTextSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = color;
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    return new THREE.Sprite(material);
  }

  setShellsVisible(visible: boolean): void {
    for (const shell of this.shellMeshes) {
      shell.visible = visible;
    }
  }
}
