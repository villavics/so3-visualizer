import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;

  private animationId: number | null = null;
  private updateCallbacks: Array<(dt: number) => void> = [];
  private lastTime = 0;
  private resizeHandler: (() => void) | null = null;

  constructor(private container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(3, 2.5, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Directional light
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 5, 5);
    this.scene.add(dir);

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  onUpdate(callback: (dt: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  start(): void {
    this.lastTime = performance.now();
    this.renderLoop(this.lastTime);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Fully dispose of the renderer, scene, and controls to free the WebGL context.
   * Must be called when the SceneManager is no longer needed (e.g. comparison mode teardown).
   */
  dispose(): void {
    this.stop();

    // Remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Dispose OrbitControls
    this.controls.dispose();

    // Traverse scene and dispose all geometries/materials/textures
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of materials) {
            // Dispose textures on the material
            for (const key of Object.keys(mat)) {
              const value = (mat as any)[key];
              if (value && value instanceof THREE.Texture) {
                value.dispose();
              }
            }
            mat.dispose();
          }
        }
      }
      if (obj instanceof THREE.Line) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of materials) mat.dispose();
        }
      }
    });

    // Remove the canvas from DOM, then dispose the renderer & force context loss
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.updateCallbacks.length = 0;
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private renderLoop = (timestamp: number): void => {
    this.animationId = requestAnimationFrame(this.renderLoop);

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    for (const cb of this.updateCallbacks) {
      cb(dt);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
