import { Vec3, vec3Normalize, PI } from '../math/vec3';

/**
 * 2D Cross-Section View — inspired by Figure 15.6, Lancaster & Blundell.
 *
 * Shows the SO(3) ball as a 2D disk of radius π with antipodal identification.
 *
 * KEY VISUALIZATION:
 *
 * 4π contraction (contractible):
 *   The 4π loop traverses the diameter TWICE. We "peel apart" the two traversals:
 *   one goes through the upper half-disk, the other through the lower.
 *   As s increases, the two arcs separate vertically, then shrink toward center.
 *   When the arcs no longer reach the boundary, they form a closed internal loop
 *   that smoothly contracts to a point.
 *
 * 2π loop (non-contractible):
 *   The single diameter traversal ALWAYS crosses the boundary.
 *   No matter how you bend the path, the single boundary crossing persists.
 *   The path is topologically "stuck."
 *
 * INTERACTIVE MODE:
 *   - The loop is represented as quadratic Bézier curves with draggable control points.
 *   - For 4π: the junction (boundary crossing point) can be dragged INSIDE the disk,
 *     removing the boundary crossing and allowing the loop to contract to a point.
 *   - For 2π: the junction is constrained to the boundary — the crossing persists.
 *   - Boundary crossings are computed via true curve–circle intersection (sign changes
 *     of f(t) = |p(t)| − R) with ε-tolerance for stability.
 *   - When crossings = 0, a smooth shrink homotopy contracts the loop to I.
 */

/** A 2D point in ball coordinates (range [-π, π]) */
interface Pt { x: number; y: number }

/** Quadratic Bézier segment: P0 → P1 (control) → P2 */
interface BezierArc {
  p0: Pt;
  p1: Pt;  // control point
  p2: Pt;
}

/** State for one interactive disk in comparison mode */
interface InteractiveDiskState {
  upperBeziers: BezierArc[];
  lowerBeziers: BezierArc[];
  is4Pi: boolean;
  junctionOnBoundary: boolean;
  dragging: boolean;
  dragArcIdx: number;
  dragPtKey: 'p0' | 'p1' | 'p2';
  highlightedAntipodal: Pt | null;
  contractAnimating: boolean;
  contractScale: number;
  contractAnimId: number;
  savedBeziers: BezierArc[];
  contractDone: boolean;
  diskCx: number;
  diskCy: number;
  diskR: number;
  clickRegions: { x: number; y: number; w: number; h: number; action: string }[];
}

// ─── Helpers ───

/** Safe roundRect that falls back to regular rect on older browsers */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

// ─── Tolerance constants ───
/** Thick-ring half-width for stable boundary crossing detection */
const CROSS_EPS = 0.12;
/** Radius threshold for junction snapping: above this, junction is "on boundary" */
const JUNCTION_SNAP_THRESHOLD = PI * 0.88;

export class CrossSectionView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  private axis: Vec3 = { x: 1, y: 0, z: 0 };
  private totalAngle = 2 * PI;
  private progress = 0;
  private contractionParam = 0;
  private mode: 'loop' | 'contraction' | 'stages' | 'interactive' | 'interactive-comparison' = 'loop';

  // ── Interactive Bézier state ──
  private upperBeziers: BezierArc[] = [];
  private lowerBeziers: BezierArc[] = [];
  private interactiveIs4Pi = false;
  /** Whether the junction point is currently on the boundary (antipodal jump) or inside (continuous) */
  private junctionOnBoundary = true;

  // Drag state
  private dragging = false;
  private dragArcIdx = -1;
  private dragPtKey: 'p0' | 'p1' | 'p2' = 'p1';
  private highlightedAntipodal: Pt | null = null;

  // Contraction animation state
  private contractAnimating = false;
  private contractScale = 1;   // 1 = full size, 0 = contracted to I
  private contractAnimId = 0;
  private savedBeziers: BezierArc[] = [];
  private contractDone = false; // true after animation finishes (show "✓")

  // Clickable regions in canvas (for "Contraer" / "Reset" buttons)
  private clickRegions: { x: number; y: number; w: number; h: number; action: string }[] = [];

  // Cached disk geometry for interactive mode
  private iDiskCx = 0;
  private iDiskCy = 0;
  private iDiskR = 0;

  // Interactive-comparison mode state
  private leftDisk: InteractiveDiskState | null = null;
  private rightDisk: InteractiveDiskState | null = null;
  private activeHalf: 'left' | 'right' | null = null;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'default';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    const obs = new ResizeObserver(() => this.resize());
    obs.observe(container);
    setTimeout(() => this.resize(), 50);

    // Wire mouse events for interactive mode
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
  }

  private resize(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  setAxis(a: Vec3): void { this.axis = vec3Normalize(a); this.draw(); }
  setTotalAngle(a: number): void {
    this.totalAngle = a;
    if (this.mode === 'interactive') {
      this.cancelContraction();
      this.initInteractiveBeziers();
    }
    this.draw();
  }
  setProgress(t: number): void { this.progress = t; this.draw(); }
  setContractionParam(s: number): void { this.contractionParam = s; this.draw(); }
  setMode(m: 'loop' | 'contraction' | 'stages' | 'interactive' | 'interactive-comparison'): void {
    this.mode = m;
    if (m === 'interactive') {
      this.cancelContraction();
      this.initInteractiveBeziers();
      this.canvas.style.cursor = 'crosshair';
    } else if (m === 'interactive-comparison') {
      this.cancelContraction();
      this.initInteractiveComparison();
      this.canvas.style.cursor = 'crosshair';
    } else {
      this.cancelContraction();
      this.canvas.style.cursor = 'default';
    }
    this.draw();
  }
  showContractionStages(): void { this.mode = 'stages'; this.draw(); }

  // ──────────────────────── INTERACTIVE BÉZIER SETUP ────────────────────────

  /**
   * Initialize Bézier control points based on current totalAngle.
   *
   * Structure for both 2π and 4π:
   *   Upper arcs: arc0 (center → junction) + arc1 (junction_pair → center)
   *   Lower arcs: antipodal mirror of upper.
   *
   * For 4π: upper + lower form the two traversals of the loop.
   *         Junction can be freely moved inside disk (removing boundary crossing).
   *
   * For 2π: upper arcs form the single traversal.
   *         Junction is constrained to boundary (crossing always persists).
   *         Lower arcs are drawn for visualization (mirror image) but don't add crossings.
   */
  private initInteractiveBeziers(): void {
    const is4pi = this.totalAngle > 3 * PI;
    this.interactiveIs4Pi = is4pi;
    this.junctionOnBoundary = true;

    if (is4pi) {
      this.upperBeziers = [
        {
          p0: { x: 0, y: 0 },
          p1: { x: PI * 0.3, y: PI * 0.55 },
          p2: { x: PI, y: 0 },           // junction — on boundary initially
        },
        {
          p0: { x: -PI, y: 0 },          // antipodal of junction
          p1: { x: -PI * 0.3, y: PI * 0.35 },
          p2: { x: 0, y: 0 },
        },
      ];
    } else {
      this.upperBeziers = [
        {
          p0: { x: 0, y: 0 },
          p1: { x: PI * 0.5, y: PI * 0.4 },
          p2: { x: PI, y: 0 },           // junction — CONSTRAINED to boundary
        },
        {
          p0: { x: -PI, y: 0 },          // antipodal of junction
          p1: { x: -PI * 0.5, y: PI * 0.4 },
          p2: { x: 0, y: 0 },
        },
      ];
    }

    this.syncLowerBeziers();
  }

  /**
   * Mirror upper Bézier arcs to lower via antipodal identification: (x,y) → (-x,-y).
   */
  private syncLowerBeziers(): void {
    this.lowerBeziers = this.upperBeziers.map(arc => ({
      p0: { x: -arc.p0.x, y: -arc.p0.y },
      p1: { x: -arc.p1.x, y: -arc.p1.y },
      p2: { x: -arc.p2.x, y: -arc.p2.y },
    }));
  }

  /**
   * Update the junction relationship between arc0.p2 and arc1.p0.
   *
   * If the junction point is on the boundary (|p| >= threshold):
   *   → snap to r = π exactly
   *   → set arc1.p0 = antipodal of arc0.p2  (boundary crossing / antipodal jump)
   *
   * If the junction point is INSIDE the disk (|p| < threshold):
   *   → leave as-is
   *   → set arc1.p0 = arc0.p2  (continuous connection, no crossing)
   */
  private updateJunction(): void {
    if (this.upperBeziers.length < 2) return;

    const junc = this.upperBeziers[0].p2;
    const r = Math.sqrt(junc.x * junc.x + junc.y * junc.y);

    // For 2π: ALWAYS snap to boundary (the crossing can never be removed)
    if (!this.interactiveIs4Pi) {
      if (r > 0.01) {
        const s = PI / r;
        this.upperBeziers[0].p2 = { x: junc.x * s, y: junc.y * s };
      } else {
        this.upperBeziers[0].p2 = { x: PI, y: 0 };
      }
      const bnd = this.upperBeziers[0].p2;
      this.upperBeziers[1].p0 = { x: -bnd.x, y: -bnd.y };
      this.junctionOnBoundary = true;
      return;
    }

    // For 4π: free movement
    if (r >= JUNCTION_SNAP_THRESHOLD) {
      // On or near boundary → snap to boundary, antipodal jump
      const s = PI / Math.max(r, 0.01);
      this.upperBeziers[0].p2 = { x: junc.x * s, y: junc.y * s };
      const bnd = this.upperBeziers[0].p2;
      this.upperBeziers[1].p0 = { x: -bnd.x, y: -bnd.y };
      this.junctionOnBoundary = true;
    } else {
      // Inside disk → continuous connection, no jump
      this.upperBeziers[1].p0 = { x: junc.x, y: junc.y };
      this.junctionOnBoundary = false;
    }
  }

  // ──────────────────────── MOUSE INTERACTION ────────────────────────

  private canvasToScreen(e: MouseEvent): Pt {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private ballToScreen(p: Pt): Pt {
    const scale = this.iDiskR / PI;
    return { x: this.iDiskCx + p.x * scale, y: this.iDiskCy - p.y * scale };
  }

  private screenToBall(s: Pt): Pt {
    const scale = this.iDiskR / PI;
    return { x: (s.x - this.iDiskCx) / scale, y: -(s.y - this.iDiskCy) / scale };
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.mode === 'interactive-comparison') {
      this.onMouseDownComparison(e);
      return;
    }
    if (this.mode !== 'interactive') return;
    if (this.contractAnimating) return; // don't interact during animation

    const pos = this.canvasToScreen(e);

    // ─── Check clickable regions (Contraer / Reset buttons) ───
    for (const region of this.clickRegions) {
      if (pos.x >= region.x && pos.x <= region.x + region.w &&
          pos.y >= region.y && pos.y <= region.y + region.h) {
        if (region.action === 'contract') {
          this.startContraction();
        } else if (region.action === 'reset') {
          this.cancelContraction();
          this.initInteractiveBeziers();
          this.draw();
        }
        return;
      }
    }

    const hitRadius = 14; // pixels

    // ─── Check upper Bézier control points for drag ───
    for (let i = 0; i < this.upperBeziers.length; i++) {
      const arc = this.upperBeziers[i];
      for (const key of ['p0', 'p1', 'p2'] as const) {
        // Fixed points: p0 of first arc (center) and p2 of last arc (center)
        const isFixedStart = (i === 0 && key === 'p0');
        const isFixedEnd = (i === this.upperBeziers.length - 1 && key === 'p2');
        if (isFixedStart || isFixedEnd) continue;

        // For arc1.p0 (junction pair): redirect to dragging arc0.p2 (the canonical junction)
        if (i === 1 && key === 'p0') {
          const sp = this.ballToScreen(arc.p0);
          const d = Math.sqrt((pos.x - sp.x) ** 2 + (pos.y - sp.y) ** 2);
          if (d < hitRadius) {
            this.dragging = true;
            this.dragArcIdx = 0;
            this.dragPtKey = 'p2'; // redirect to junction
            this.canvas.style.cursor = 'grabbing';
            this.contractDone = false;
            return;
          }
          continue;
        }

        const sp = this.ballToScreen(arc[key]);
        const d = Math.sqrt((pos.x - sp.x) ** 2 + (pos.y - sp.y) ** 2);
        if (d < hitRadius) {
          this.dragging = true;
          this.dragArcIdx = i;
          this.dragPtKey = key;
          this.canvas.style.cursor = 'grabbing';
          this.contractDone = false;
          return;
        }
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.mode === 'interactive-comparison') {
      this.onMouseMoveComparison(e);
      return;
    }
    if (this.mode !== 'interactive') return;
    if (this.contractAnimating) return;

    const pos = this.canvasToScreen(e);

    if (this.dragging) {
      const ballPt = this.screenToBall(pos);

      // Constrain control points to within the disk
      const r = Math.sqrt(ballPt.x * ballPt.x + ballPt.y * ballPt.y);
      const isJunction = (this.dragArcIdx === 0 && this.dragPtKey === 'p2');

      if (isJunction) {
        // Junction point: for 4π, allow anywhere inside disk;
        // for 2π, will be snapped to boundary by updateJunction()
        if (r > PI * 0.99) {
          const s = PI * 0.99 / r;
          ballPt.x *= s;
          ballPt.y *= s;
        }
        this.upperBeziers[0].p2 = ballPt;
        this.updateJunction();
      } else {
        // Regular control point: constrain to inside disk
        if (r > PI * 0.95) {
          const s = PI * 0.95 / r;
          ballPt.x *= s;
          ballPt.y *= s;
        }
        this.upperBeziers[this.dragArcIdx][this.dragPtKey] = ballPt;
      }

      // Mirror to lower
      this.syncLowerBeziers();

      // Highlight antipodal of dragged point
      const dp = this.upperBeziers[this.dragArcIdx][this.dragPtKey];
      this.highlightedAntipodal = { x: -dp.x, y: -dp.y };

      this.draw();
      return;
    }

    // ─── Hover: check if near a control point ───
    let nearCP = false;
    for (let i = 0; i < this.upperBeziers.length; i++) {
      const arc = this.upperBeziers[i];
      for (const key of ['p0', 'p1', 'p2'] as const) {
        const isFixedStart = (i === 0 && key === 'p0');
        const isFixedEnd = (i === this.upperBeziers.length - 1 && key === 'p2');
        if (isFixedStart || isFixedEnd) continue;

        const pt = (i === 1 && key === 'p0') ? arc.p0 : arc[key];
        const sp = this.ballToScreen(pt);
        const d = Math.sqrt((pos.x - sp.x) ** 2 + (pos.y - sp.y) ** 2);
        if (d < 14) { nearCP = true; break; }
      }
      if (nearCP) break;
    }

    // Check clickable regions
    let nearBtn = false;
    for (const region of this.clickRegions) {
      if (pos.x >= region.x && pos.x <= region.x + region.w &&
          pos.y >= region.y && pos.y <= region.y + region.h) {
        nearBtn = true;
        break;
      }
    }

    this.canvas.style.cursor = nearCP ? 'grab' : nearBtn ? 'pointer' : 'crosshair';
    this.highlightedAntipodal = null;
  }

  private onMouseUp(): void {
    if (this.mode === 'interactive-comparison') {
      const disk = this.activeHalf === 'left' ? this.leftDisk : this.rightDisk;
      if (disk && disk.dragging) {
        disk.dragging = false;
        disk.highlightedAntipodal = null;
        this.canvas.style.cursor = 'crosshair';
        this.draw();
      }
      return;
    }
    if (this.dragging) {
      this.dragging = false;
      this.highlightedAntipodal = null;
      this.canvas.style.cursor = 'crosshair';
      this.draw();
    }
  }

  // ──────────────────────── CONTRACTION ANIMATION ────────────────────────

  private startContraction(): void {
    if (this.contractAnimating || this.contractDone) return;

    // Save current state
    this.savedBeziers = this.upperBeziers.map(a => ({
      p0: { ...a.p0 }, p1: { ...a.p1 }, p2: { ...a.p2 },
    }));
    this.contractAnimating = true;
    this.contractScale = 1;
    this.contractDone = false;
    this.contractAnimFrame();
  }

  private contractAnimFrame(): void {
    this.contractScale -= 0.012; // ~83 frames → ~1.4 seconds at 60fps

    if (this.contractScale <= 0) {
      this.contractScale = 0;
      this.contractAnimating = false;
      this.contractDone = true;
      // Set all points to origin
      for (const arc of this.upperBeziers) {
        arc.p0 = { x: 0, y: 0 };
        arc.p1 = { x: 0, y: 0 };
        arc.p2 = { x: 0, y: 0 };
      }
      this.syncLowerBeziers();
      this.junctionOnBoundary = false;
      this.draw();
      return;
    }

    // Scale all CPs toward origin (preserves antipodal mapping since s*(-x,-y) = -(s*x, s*y))
    const s = this.contractScale;
    for (let i = 0; i < this.upperBeziers.length; i++) {
      const saved = this.savedBeziers[i];
      this.upperBeziers[i] = {
        p0: { x: saved.p0.x * s, y: saved.p0.y * s },
        p1: { x: saved.p1.x * s, y: saved.p1.y * s },
        p2: { x: saved.p2.x * s, y: saved.p2.y * s },
      };
    }
    this.junctionOnBoundary = false;
    this.syncLowerBeziers();
    this.draw();

    this.contractAnimId = requestAnimationFrame(() => this.contractAnimFrame());
  }

  private cancelContraction(): void {
    if (this.contractAnimId) {
      cancelAnimationFrame(this.contractAnimId);
      this.contractAnimId = 0;
    }
    this.contractAnimating = false;
    this.contractDone = false;
    this.contractScale = 1;
  }

  // ──────────────────────── INTERACTIVE-COMPARISON SETUP ────────────────────────

  /**
   * Create an InteractiveDiskState with initial Bézier arcs.
   * @param is4Pi true for 4π (contractible), false for 2π (non-contractible)
   */
  private createDiskState(is4Pi: boolean): InteractiveDiskState {
    let upperBeziers: BezierArc[];

    if (is4Pi) {
      upperBeziers = [
        {
          p0: { x: 0, y: 0 },
          p1: { x: PI * 0.3, y: PI * 0.55 },
          p2: { x: PI, y: 0 },           // junction — on boundary initially
        },
        {
          p0: { x: -PI, y: 0 },          // antipodal of junction
          p1: { x: -PI * 0.3, y: PI * 0.35 },
          p2: { x: 0, y: 0 },
        },
      ];
    } else {
      upperBeziers = [
        {
          p0: { x: 0, y: 0 },
          p1: { x: PI * 0.5, y: PI * 0.4 },
          p2: { x: PI, y: 0 },           // junction — CONSTRAINED to boundary
        },
        {
          p0: { x: -PI, y: 0 },          // antipodal of junction
          p1: { x: -PI * 0.5, y: PI * 0.4 },
          p2: { x: 0, y: 0 },
        },
      ];
    }

    // Sync lower as antipodal mirror
    const lowerBeziers = upperBeziers.map(arc => ({
      p0: { x: -arc.p0.x, y: -arc.p0.y },
      p1: { x: -arc.p1.x, y: -arc.p1.y },
      p2: { x: -arc.p2.x, y: -arc.p2.y },
    }));

    return {
      upperBeziers,
      lowerBeziers,
      is4Pi,
      junctionOnBoundary: true,
      dragging: false,
      dragArcIdx: -1,
      dragPtKey: 'p1',
      highlightedAntipodal: null,
      contractAnimating: false,
      contractScale: 1,
      contractAnimId: 0,
      savedBeziers: [],
      contractDone: false,
      diskCx: 0,
      diskCy: 0,
      diskR: 0,
      clickRegions: [],
    };
  }

  /**
   * Initialize both disks for interactive-comparison mode.
   */
  private initInteractiveComparison(): void {
    this.leftDisk = this.createDiskState(false);   // 2π
    this.rightDisk = this.createDiskState(true);    // 4π
    this.activeHalf = null;
  }

  // ── Parameterized helpers for comparison mode ──

  /**
   * Update the junction relationship for a disk state.
   * For 2π (state.is4Pi=false), ALWAYS snap junction to boundary.
   */
  private updateJunctionFor(state: InteractiveDiskState): void {
    if (state.upperBeziers.length < 2) return;

    const junc = state.upperBeziers[0].p2;
    const r = Math.sqrt(junc.x * junc.x + junc.y * junc.y);

    // For 2π: ALWAYS snap to boundary
    if (!state.is4Pi) {
      if (r > 0.01) {
        const s = PI / r;
        state.upperBeziers[0].p2 = { x: junc.x * s, y: junc.y * s };
      } else {
        state.upperBeziers[0].p2 = { x: PI, y: 0 };
      }
      const bnd = state.upperBeziers[0].p2;
      state.upperBeziers[1].p0 = { x: -bnd.x, y: -bnd.y };
      state.junctionOnBoundary = true;
      return;
    }

    // For 4π: free movement
    if (r >= JUNCTION_SNAP_THRESHOLD) {
      const s = PI / Math.max(r, 0.01);
      state.upperBeziers[0].p2 = { x: junc.x * s, y: junc.y * s };
      const bnd = state.upperBeziers[0].p2;
      state.upperBeziers[1].p0 = { x: -bnd.x, y: -bnd.y };
      state.junctionOnBoundary = true;
    } else {
      state.upperBeziers[1].p0 = { x: junc.x, y: junc.y };
      state.junctionOnBoundary = false;
    }
  }

  /**
   * Mirror upper Bézier arcs to lower via antipodal identification for a disk state.
   */
  private syncLowerBeziersFor(state: InteractiveDiskState): void {
    state.lowerBeziers = state.upperBeziers.map(arc => ({
      p0: { x: -arc.p0.x, y: -arc.p0.y },
      p1: { x: -arc.p1.x, y: -arc.p1.y },
      p2: { x: -arc.p2.x, y: -arc.p2.y },
    }));
  }

  /**
   * Count total boundary crossings for a disk state.
   */
  private countCrossingsFor(state: InteractiveDiskState): { count: number; points: Pt[] } {
    let count = 0;
    const points: Pt[] = [];

    // 1. Junction crossings
    if (state.junctionOnBoundary) {
      const junc = state.upperBeziers[0].p2;
      const juncPair = state.upperBeziers[1].p0;
      points.push({ ...junc });
      points.push({ ...juncPair });
      count += 1;

      if (state.is4Pi) {
        points.push({ x: -junc.x, y: -junc.y });
        points.push({ x: -juncPair.x, y: -juncPair.y });
        count += 1;
      }
    }

    // 2. Interior crossings
    for (const arc of state.upperBeziers) {
      const crossings = this.findBoundaryCrossings(arc);
      count += Math.floor(crossings.length / 2);
      for (const c of crossings) points.push(c.pt);
    }

    if (state.is4Pi) {
      for (const arc of state.lowerBeziers) {
        const crossings = this.findBoundaryCrossings(arc);
        count += Math.floor(crossings.length / 2);
        for (const c of crossings) points.push(c.pt);
      }
    }

    return { count, points };
  }

  /**
   * Convert ball coordinates to screen coordinates for a given disk state.
   */
  private ballToScreenFor(state: InteractiveDiskState, p: Pt): Pt {
    const scale = state.diskR / PI;
    return { x: state.diskCx + p.x * scale, y: state.diskCy - p.y * scale };
  }

  /**
   * Convert screen coordinates to ball coordinates for a given disk state.
   */
  private screenToBallFor(state: InteractiveDiskState, s: Pt): Pt {
    const scale = state.diskR / PI;
    return { x: (s.x - state.diskCx) / scale, y: -(s.y - state.diskCy) / scale };
  }

  // ── Contraction for comparison mode ──

  private startContractionFor(state: InteractiveDiskState): void {
    if (state.contractAnimating || state.contractDone) return;

    state.savedBeziers = state.upperBeziers.map(a => ({
      p0: { ...a.p0 }, p1: { ...a.p1 }, p2: { ...a.p2 },
    }));
    state.contractAnimating = true;
    state.contractScale = 1;
    state.contractDone = false;
    this.contractAnimFrameFor(state);
  }

  private contractAnimFrameFor(state: InteractiveDiskState): void {
    state.contractScale -= 0.012;

    if (state.contractScale <= 0) {
      state.contractScale = 0;
      state.contractAnimating = false;
      state.contractDone = true;
      for (const arc of state.upperBeziers) {
        arc.p0 = { x: 0, y: 0 };
        arc.p1 = { x: 0, y: 0 };
        arc.p2 = { x: 0, y: 0 };
      }
      this.syncLowerBeziersFor(state);
      state.junctionOnBoundary = false;
      this.draw();
      return;
    }

    const s = state.contractScale;
    for (let i = 0; i < state.upperBeziers.length; i++) {
      const saved = state.savedBeziers[i];
      state.upperBeziers[i] = {
        p0: { x: saved.p0.x * s, y: saved.p0.y * s },
        p1: { x: saved.p1.x * s, y: saved.p1.y * s },
        p2: { x: saved.p2.x * s, y: saved.p2.y * s },
      };
    }
    state.junctionOnBoundary = false;
    this.syncLowerBeziersFor(state);
    this.draw();

    state.contractAnimId = requestAnimationFrame(() => this.contractAnimFrameFor(state));
  }

  // ──────────────────────── BÉZIER MATH ────────────────────────

  /**
   * Evaluate a quadratic Bézier at parameter t ∈ [0,1].
   * B(t) = (1−t)²·P0 + 2(1−t)t·P1 + t²·P2
   */
  private evalBezier(arc: BezierArc, t: number): Pt {
    const u = 1 - t;
    return {
      x: u * u * arc.p0.x + 2 * u * t * arc.p1.x + t * t * arc.p2.x,
      y: u * u * arc.p0.y + 2 * u * t * arc.p1.y + t * t * arc.p2.y,
    };
  }

  /** Sample a Bézier arc into n+1 points. */
  private sampleBezier(arc: BezierArc, n: number): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      pts.push(this.evalBezier(arc, i / n));
    }
    return pts;
  }

  /**
   * Detect boundary crossings for a Bézier arc using thick-ring approach.
   *
   * A crossing occurs where f(t) = |p(t)| − π changes sign, with a dead-zone
   * of width 2ε around f=0 to prevent flickering when the curve grazes the boundary.
   *
   * Only counts transitions where the curve clearly moves from inside (r < π−ε)
   * to outside (r > π+ε) or vice versa.
   *
   * Skips transitions at arc endpoints (t < margin or t > 1−margin) to avoid
   * double-counting junction crossings.
   */
  private findBoundaryCrossings(arc: BezierArc, samples = 300): { t: number; pt: Pt }[] {
    const crossings: { t: number; pt: Pt }[] = [];
    const R = PI;
    const EPS = CROSS_EPS;
    const margin = 0.015; // skip transitions at very start/end of arc (junction handled separately)

    // Track "definite" state: inside or outside (ignore boundary zone)
    let prevState: 'inside' | 'outside' | null = null;
    const r0 = Math.sqrt(arc.p0.x ** 2 + arc.p0.y ** 2);
    if (r0 < R - EPS) prevState = 'inside';
    else if (r0 > R + EPS) prevState = 'outside';

    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const p = this.evalBezier(arc, t);
      const r = Math.sqrt(p.x ** 2 + p.y ** 2);

      let state: 'inside' | 'outside' | null = null;
      if (r < R - EPS) state = 'inside';
      else if (r > R + EPS) state = 'outside';

      // Only count a crossing when transitioning between definite states
      if (state !== null && prevState !== null && state !== prevState) {
        // Skip transitions at the very endpoints of the arc
        if (t > margin && t < 1 - margin) {
          // Interpolate for precise crossing location
          const tPrev = (i - 1) / samples;
          const pPrev = this.evalBezier(arc, tPrev);
          const rPrev = Math.sqrt(pPrev.x ** 2 + pPrev.y ** 2);
          const alpha = Math.abs(rPrev - R) < 0.001 ? 0.5 : (R - rPrev) / (r - rPrev);
          const tc = tPrev + Math.max(0, Math.min(1, alpha)) * (t - tPrev);
          const pc = this.evalBezier(arc, tc);
          crossings.push({ t: tc, pt: pc });
        }
      }

      if (state !== null) prevState = state;
    }
    return crossings;
  }

  /**
   * Count the total boundary crossings of the loop.
   *
   * Crossings come from two sources:
   * 1. Junction crossings: if the junction is on the boundary, each traversal has 1 crossing.
   * 2. Interior crossings: if a control point pushes the curve outside the disk.
   *
   * For 4π: the loop = upper traversal + lower traversal.
   *         Junction crossings: 2 if junction on boundary, 0 if inside.
   *         Interior crossings: counted on both upper and lower arcs.
   *
   * For 2π: the loop = upper traversal only.
   *         Junction crossings: 1 (always on boundary).
   *         Interior crossings: counted on upper arcs only.
   *         Lower arcs are drawn but don't contribute to the loop's crossing count.
   */
  private countAllCrossings(): { count: number; points: Pt[] } {
    let count = 0;
    const points: Pt[] = [];

    // 1. Junction crossings
    if (this.junctionOnBoundary) {
      const junc = this.upperBeziers[0].p2;
      const juncPair = this.upperBeziers[1].p0;
      // Upper traversal: 1 junction crossing
      points.push({ ...junc });
      points.push({ ...juncPair });
      count += 1;

      if (this.interactiveIs4Pi) {
        // Lower traversal: 1 junction crossing (mirror)
        points.push({ x: -junc.x, y: -junc.y });
        points.push({ x: -juncPair.x, y: -juncPair.y });
        count += 1;
      }
    }

    // 2. Interior crossings (curve bulges outside disk)
    for (const arc of this.upperBeziers) {
      const crossings = this.findBoundaryCrossings(arc);
      // Each pair of outward+inward = 1 effective crossing
      count += Math.floor(crossings.length / 2);
      for (const c of crossings) points.push(c.pt);
    }

    if (this.interactiveIs4Pi) {
      for (const arc of this.lowerBeziers) {
        const crossings = this.findBoundaryCrossings(arc);
        count += Math.floor(crossings.length / 2);
        for (const c of crossings) points.push(c.pt);
      }
    }

    return { count, points };
  }

  // ──────────────────────── 2D PATH GENERATION ────────────────────────

  private gen2PiArc(s: number, sign: number, n: number): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const tau = i / n;
      const angle = 2 * PI * tau;
      let xOrig: number;
      if (angle <= PI) { xOrig = angle; }
      else { xOrig = -(2 * PI - angle); }
      const x = (1 - s) * xOrig;
      const y = sign * s * (1 - s) * PI * 0.95 * Math.sin(PI * tau);
      pts.push({ x, y });
    }
    return pts;
  }

  private gen2PiStuck(s: number, n: number): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const tau = i / n;
      const angle = 2 * PI * tau;
      let xOrig: number;
      if (angle <= PI) { xOrig = angle; }
      else { xOrig = -(2 * PI - angle); }
      const x = xOrig;
      const y = s * 0.6 * PI * Math.sin(PI * tau);
      const r = Math.sqrt(x * x + y * y);
      if (r > PI) {
        const sc = PI / r;
        pts.push({ x: x * sc, y: y * sc });
      } else {
        pts.push({ x, y });
      }
    }
    return pts;
  }

  // ──────────────────────── DRAWING ────────────────────────

  private draw(): void {
    const { ctx, width, height } = this;
    if (width === 0 || height === 0) return;
    ctx.clearRect(0, 0, width, height);

    if (this.mode === 'interactive-comparison') {
      this.drawInteractiveComparison();
      return;
    }

    if (this.mode === 'stages') {
      this.drawComparisonStages();
    } else if (this.mode === 'contraction') {
      this.drawSingleDiskContraction();
    } else if (this.mode === 'interactive') {
      this.drawInteractiveMode();
    } else {
      this.drawSingleDiskLoop();
    }
  }

  // ─── SINGLE DISK: loop mode ───

  private drawSingleDiskLoop(): void {
    const { width, height } = this;
    const size = Math.min(width, height) - 40;
    const r = size / 2;
    const cx = width / 2;
    const cy = height / 2;
    this.drawDisk(cx, cy, r);

    const n = 300;
    const maxIdx = Math.floor(this.progress * n);
    const is4pi = this.totalAngle > 3 * PI;

    if (is4pi) {
      const arc1 = this.gen2PiArc(0, 0, n);
      const firstHalf = arc1.slice(0, Math.min(maxIdx, Math.floor(n / 2)) + 1);
      const secondStart = Math.floor(n / 2);
      const secondEnd = Math.min(maxIdx, n);
      const secondHalf = secondEnd > secondStart ? arc1.slice(secondStart, secondEnd + 1) : [];
      this.drawPath2D(cx, cy, r, firstHalf, '#ff6644', 2.5, true);
      if (secondHalf.length > 1) this.drawPath2D(cx, cy, r, secondHalf, '#44aaff', 2.5, true);
      if (maxIdx <= n / 2 && firstHalf.length > 0) {
        const h = firstHalf[firstHalf.length - 1];
        this.drawHead(cx + h.x * r / PI, cy - h.y * r / PI, '#ff6644');
      } else if (secondHalf.length > 0) {
        const h = secondHalf[secondHalf.length - 1];
        this.drawHead(cx + h.x * r / PI, cy - h.y * r / PI, '#44aaff');
      }
    } else {
      const arc = this.gen2PiArc(0, 0, n);
      const partial = arc.slice(0, maxIdx + 1);
      this.drawPath2D(cx, cy, r, partial, '#ff6644', 2.5, true);
      if (partial.length > 0) {
        const h = partial[partial.length - 1];
        this.drawHead(cx + h.x * r / PI, cy - h.y * r / PI, '#ff6644');
      }
    }
    this.drawDiskLabels(cx, cy, r);
  }

  // ─── SINGLE DISK: contraction mode ───

  private drawSingleDiskContraction(): void {
    const { width, height } = this;
    const size = Math.min(width, height) - 40;
    const r = size / 2; const cx = width / 2; const cy = height / 2;
    this.drawDisk(cx, cy, r);

    const s = this.contractionParam;
    const n = 200;
    for (let gs = 0; gs < s; gs += 0.15) {
      const upper = this.gen2PiArc(gs, +1, n);
      const lower = this.gen2PiArc(gs, -1, n);
      this.drawPath2D(cx, cy, r, upper, `rgba(100,140,200,0.1)`, 1, false);
      this.drawPath2D(cx, cy, r, lower, `rgba(100,140,200,0.1)`, 1, false);
    }
    const upper = this.gen2PiArc(s, +1, n);
    const lower = this.gen2PiArc(s, -1, n);
    this.drawPath2D(cx, cy, r, upper, '#ff6644', 2.5, true);
    this.drawPath2D(cx, cy, r, lower, '#44aaff', 2.5, true);

    const idx = Math.floor(this.progress * n);
    if (idx < upper.length) {
      this.drawHead(cx + upper[idx].x * r / PI, cy - upper[idx].y * r / PI, '#ff6644');
      this.drawHead(cx + lower[idx].x * r / PI, cy - lower[idx].y * r / PI, '#44aaff');
    }
    this.ctx.fillStyle = '#88bbff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`s = ${s.toFixed(2)}`, 8, 16);
    this.drawDiskLabels(cx, cy, r);
  }

  // ─── INTERACTIVE BÉZIER MODE ───

  private drawInteractiveMode(): void {
    const { ctx, width, height } = this;

    // Clear click regions from previous frame
    this.clickRegions = [];

    // Layout: disk on left, info panel on right
    const infoWidth = Math.min(260, width * 0.35);
    const diskAreaW = width - infoWidth;
    const size = Math.min(diskAreaW, height) - 50;
    const r = size / 2;
    const cx = diskAreaW / 2;
    const cy = height / 2;

    this.iDiskCx = cx;
    this.iDiskCy = cy;
    this.iDiskR = r;

    // Draw disk
    this.drawDisk(cx, cy, r);

    const scale = r / PI;
    const samples = 120;

    // ─── Compute crossings ───
    const { count: totalCrossings, points: crossingPts } = this.countAllCrossings();

    // ─── Draw upper arcs (orange) ───
    for (let i = 0; i < this.upperBeziers.length; i++) {
      const arc = this.upperBeziers[i];
      const pts = this.sampleBezier(arc, samples);
      this.drawBezierCurve(cx, cy, r, pts, '#ff6644', 2.5);
      this.drawControlScaffold(cx, cy, scale, arc, 'rgba(255,102,68,0.3)');

      // Draw draggable control point (p1)
      this.drawControlPoint(cx, cy, scale, arc.p1, '#ff6644', true);

      // Draw junction point (p2 of arc0, p0 of arc1) if not at center
      if (i === 0) {
        const jr = Math.sqrt(arc.p2.x ** 2 + arc.p2.y ** 2);
        if (jr > 0.1) {
          // Junction is draggable for 4π; constrained indicator for 2π
          const isDraggable4pi = this.interactiveIs4Pi;
          this.drawControlPoint(cx, cy, scale, arc.p2,
            isDraggable4pi ? '#ffaa44' : '#ff9966', isDraggable4pi);
        }
      }
      if (i === 1) {
        const pr = Math.sqrt(arc.p0.x ** 2 + arc.p0.y ** 2);
        if (pr > 0.1) {
          this.drawControlPoint(cx, cy, scale, arc.p0, '#ff9966', false);
        }
      }
    }

    // ─── Draw lower arcs (blue) — only for 4π (second traversal) ───
    if (this.interactiveIs4Pi) {
      for (let i = 0; i < this.lowerBeziers.length; i++) {
        const arc = this.lowerBeziers[i];
        const pts = this.sampleBezier(arc, samples);
        this.drawBezierCurve(cx, cy, r, pts, '#44aaff', 2.5);
        this.drawControlScaffold(cx, cy, scale, arc, 'rgba(68,170,255,0.3)');
        this.drawControlPoint(cx, cy, scale, arc.p1, '#44aaff', false);

        if (i === 0) {
          const jr = Math.sqrt(arc.p2.x ** 2 + arc.p2.y ** 2);
          if (jr > 0.1) this.drawControlPoint(cx, cy, scale, arc.p2, '#6699cc', false);
        }
        if (i === 1) {
          const pr = Math.sqrt(arc.p0.x ** 2 + arc.p0.y ** 2);
          if (pr > 0.1) this.drawControlPoint(cx, cy, scale, arc.p0, '#6699cc', false);
        }
      }
    }

    // ─── Antipodal jump dashed lines (only when junction is on boundary) ───
    if (this.junctionOnBoundary) {
      // Upper jump
      const u0end = this.upperBeziers[0].p2;
      const u1start = this.upperBeziers[1].p0;
      this.drawAntipodalJumpLine(cx, cy, scale, u0end, u1start);

      // Lower jump (mirror) — only for 4π
      if (this.interactiveIs4Pi) {
        const l0end = this.lowerBeziers[0].p2;
        const l1start = this.lowerBeziers[1].p0;
        this.drawAntipodalJumpLine(cx, cy, scale, l0end, l1start);
      }
    }

    // ─── Draw boundary crossing markers ───
    // Only show when crossings actually exist (they vanish when curve is pulled inside)
    if (totalCrossings > 0) {
      // De-duplicate crossing points that are very close
      const uniquePts = this.deduplicatePoints(crossingPts, 0.3);
      for (const cp of uniquePts) {
        const sx = cx + cp.x * scale;
        const sy = cy - cp.y * scale;

        // Glow
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
        ctx.fill();

        // Marker
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // "×"
        ctx.fillStyle = '#000';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', sx, sy + 0.5);
        ctx.textBaseline = 'alphabetic';
      }
    }

    // ─── Highlighted antipodal during drag ───
    if (this.highlightedAntipodal) {
      const ap = this.highlightedAntipodal;
      const sx = cx + ap.x * scale;
      const sy = cy - ap.y * scale;

      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('antipodal', sx, sy - 16);
    }

    // ─── "No crossings" visual: interior loop glow ───
    if (totalCrossings === 0 && !this.contractDone && !this.contractAnimating) {
      // Subtle green glow around the disk center to indicate contractibility
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.15, 0, 2 * Math.PI);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.15);
      grd.addColorStop(0, 'rgba(68, 255, 136, 0.25)');
      grd.addColorStop(1, 'rgba(68, 255, 136, 0)');
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // ─── Contraction done: show checkmark at center ───
    if (this.contractDone) {
      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', cx, cy);
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('Contraído a I', cx, cy + 18);
    }

    // ─── Disk labels ───
    this.drawDiskLabels(cx, cy, r);

    // ─── Info panel ───
    this.drawInteractiveInfoPanel(diskAreaW, infoWidth, totalCrossings);
  }

  /**
   * Draw a dashed line between two antipodal points (the "jump" visualization).
   */
  private drawAntipodalJumpLine(
    cx: number, cy: number, scale: number,
    from: Pt, to: Pt,
  ): void {
    const { ctx } = this;
    const fx = cx + from.x * scale, fy = cy - from.y * scale;
    const tx = cx + to.x * scale, ty = cy - to.y * scale;

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  /** Remove duplicate points that are within distance `d` of each other. */
  private deduplicatePoints(pts: Pt[], d: number): Pt[] {
    const result: Pt[] = [];
    for (const p of pts) {
      let isDup = false;
      for (const q of result) {
        if (Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2) < d) {
          isDup = true;
          break;
        }
      }
      if (!isDup) result.push(p);
    }
    return result;
  }

  /**
   * Draw the info/explanation panel for interactive mode.
   */
  private drawInteractiveInfoPanel(panelX: number, panelW: number, crossings: number): void {
    const { ctx, height } = this;
    const px = panelX + 12;
    let py = 20;
    const lineH = 15;

    // Panel background
    ctx.fillStyle = 'rgba(10, 18, 35, 0.9)';
    ctx.fillRect(panelX, 0, panelW, height);
    ctx.strokeStyle = '#1a3050';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX, 0);
    ctx.lineTo(panelX, height);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#88bbff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Edición interactiva', px, py);
    py += lineH + 4;

    // Mode indicator
    const is4pi = this.interactiveIs4Pi;
    ctx.fillStyle = is4pi ? '#44aaff' : '#ff6644';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(is4pi ? 'Lazo 4π (doble recorrido)' : 'Lazo 2π (recorrido simple)', px, py);
    py += lineH + 2;

    // Crossing count
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Cruces de frontera: ${crossings}`, px, py);
    py += lineH;

    // Mod 2 indicator
    const mod2 = crossings % 2;
    if (mod2 === 0) {
      ctx.fillStyle = '#44ff88';
      ctx.fillText(`mod 2 = 0 → contráctil ✓`, px, py);
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.fillText(`mod 2 = 1 → NO contráctil ✗`, px, py);
    }
    py += lineH + 8;

    // ─── ACTION BUTTONS (drawn on canvas, tracked as click regions) ───

    if (is4pi && crossings === 0 && !this.contractDone && !this.contractAnimating) {
      // "Contraer a I" button
      const btnW = panelW - 24;
      const btnH = 28;
      const btnX = px - 4;
      const btnY = py;

      ctx.fillStyle = '#0d3020';
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 1.5;
      roundRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶ Contraer a I', btnX + btnW / 2, btnY + 18);
      ctx.textAlign = 'left';

      this.clickRegions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'contract' });
      py += btnH + 8;
    } else if (this.contractAnimating) {
      // Show progress
      ctx.fillStyle = '#44ff88';
      ctx.font = '10px sans-serif';
      const pct = Math.round((1 - this.contractScale) * 100);
      ctx.fillText(`Contrayendo... ${pct}%`, px, py);
      py += lineH + 4;
    } else if (this.contractDone) {
      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✓ ¡Lazo contraído a I!', px, py);
      py += lineH + 4;
    }

    // "Reset" button (always available)
    {
      const btnW = panelW - 24;
      const btnH = 24;
      const btnX = px - 4;
      const btnY = py;

      ctx.fillStyle = '#15202e';
      ctx.strokeStyle = '#3a5570';
      ctx.lineWidth = 1;
      roundRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#88aacc';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↺ Reiniciar', btnX + btnW / 2, btnY + 15);
      ctx.textAlign = 'left';

      this.clickRegions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'reset' });
      py += btnH + 10;
    }

    // ─── Explanation box ───
    const boxH = is4pi ? 100 : 90;
    ctx.fillStyle = 'rgba(20, 35, 60, 0.8)';
    ctx.fillRect(px - 4, py - 4, panelW - 20, boxH);
    ctx.strokeStyle = '#253550';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 4, py - 4, panelW - 20, boxH);

    ctx.fillStyle = '#aabbcc';
    ctx.font = '10px sans-serif';

    if (is4pi) {
      const lines = [
        'Arrastra los puntos naranjas',
        'para mover el lazo.',
        '',
        'Arrastra el punto del borde',
        'DENTRO del disco para',
        'eliminar el cruce de frontera.',
        '',
        'Sin cruces → ¡contráctil!',
        'Haz clic en "Contraer a I".',
      ];
      for (const line of lines) { ctx.fillText(line, px, py); py += 11; }
    } else {
      const lines = [
        'Arrastra los puntos naranjas',
        'para mover el lazo.',
        '',
        'El punto de la frontera NO',
        'puede salir del borde:',
        'el cruce persiste siempre.',
        '',
        '→ 2π NO es contráctil.',
      ];
      for (const line of lines) { ctx.fillText(line, px, py); py += 11; }
    }
    py += 6;

    // ─── Antipodal explanation ───
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px sans-serif';
    const antipLines = [
      'Identificación antipodal:',
      '(x,y) ↔ (−x,−y) en ∂B.',
      '',
      'Mover cerca del norte',
      'desplaza cerca del sur',
      'en sentido opuesto.',
    ];
    for (const line of antipLines) { ctx.fillText(line, px, py); py += 11; }
    py += 8;

    // ─── Legend ───
    ctx.font = '9px sans-serif';

    ctx.beginPath();
    ctx.arc(px + 5, py - 3, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff6644';
    ctx.fill();
    ctx.fillStyle = '#99aabb';
    ctx.fillText(is4pi ? 'Arco superior (arrastrable)' : 'Lazo único (arrastrable)', px + 14, py);
    py += 13;

    if (is4pi) {
      ctx.beginPath();
      ctx.arc(px + 5, py - 3, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#44aaff';
      ctx.fill();
      ctx.fillStyle = '#99aabb';
      ctx.fillText('Arco inferior (2ª travesía)', px + 14, py);
      py += 13;

      ctx.beginPath();
      ctx.arc(px + 5, py - 3, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffaa44';
      ctx.fill();
      ctx.fillStyle = '#99aabb';
      ctx.fillText('Punto de cruce (arrastrable)', px + 14, py);
      py += 13;
    }

    ctx.beginPath();
    ctx.arc(px + 5, py - 3, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();
    ctx.fillStyle = '#99aabb';
    ctx.fillText('Cruce de frontera', px + 14, py);
  }

  // ─── INTERACTIVE-COMPARISON: drawing ───

  /**
   * Draw the interactive-comparison mode: two side-by-side disks (2π left, 4π right).
   */
  private drawInteractiveComparison(): void {
    const { ctx, width, height } = this;

    const halfW = width / 2;

    // Draw divider line
    ctx.strokeStyle = '#2a4060';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, height);
    ctx.stroke();

    // Left half: 2π disk
    if (this.leftDisk) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, halfW, height);
      ctx.clip();
      this.drawComparisonHalf(this.leftDisk, 0, halfW, height, 'Lazo 2π (no contráctil)', '#ff6644');
      ctx.restore();
    }

    // Right half: 4π disk
    if (this.rightDisk) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(halfW, 0, halfW, height);
      ctx.clip();
      this.drawComparisonHalf(this.rightDisk, halfW, halfW, height, 'Lazo 4π (contráctil)', '#44aaff');
      ctx.restore();
    }
  }

  /**
   * Draw a single interactive disk in a clipped area for comparison mode.
   */
  private drawComparisonHalf(
    state: InteractiveDiskState,
    offsetX: number, areaW: number, areaH: number,
    label: string, labelColor: string,
  ): void {
    const { ctx } = this;

    // Clear click regions for this state
    state.clickRegions = [];

    // Calculate disk geometry
    const topMargin = 30;
    const bottomMargin = 80;
    const availH = areaH - topMargin - bottomMargin;
    const diskSize = Math.min(areaW - 30, availH) ;
    const r = diskSize / 2;
    const cx = offsetX + areaW / 2;
    const cy = topMargin + availH / 2;

    // Store geometry on state for mouse interaction
    state.diskCx = cx;
    state.diskCy = cy;
    state.diskR = r;

    const scale = r / PI;
    const samples = 120;

    // Draw label at top
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, 16);

    // Sub-label: traversal count
    ctx.fillStyle = 'rgba(180,200,220,0.7)';
    ctx.font = '9px sans-serif';
    ctx.fillText(
      state.is4Pi ? '2 travesías del diámetro' : '1 travesía del diámetro',
      cx, 28,
    );

    // Draw disk
    this.drawDisk(cx, cy, r);

    // Compute crossings
    const { count: totalCrossings, points: crossingPts } = this.countCrossingsFor(state);

    // ─── Draw upper arcs (orange) ───
    for (let i = 0; i < state.upperBeziers.length; i++) {
      const arc = state.upperBeziers[i];
      const pts = this.sampleBezier(arc, samples);
      this.drawBezierCurve(cx, cy, r, pts, '#ff6644', 2.5);
      this.drawControlScaffold(cx, cy, scale, arc, 'rgba(255,102,68,0.3)');

      // Draw draggable control point (p1)
      this.drawControlPoint(cx, cy, scale, arc.p1, '#ff6644', true);

      // Draw junction point
      if (i === 0) {
        const jr = Math.sqrt(arc.p2.x ** 2 + arc.p2.y ** 2);
        if (jr > 0.1) {
          const isDraggable = state.is4Pi;
          this.drawControlPoint(cx, cy, scale, arc.p2,
            isDraggable ? '#ffaa44' : '#ff9966', isDraggable);
        }
      }
      if (i === 1) {
        const pr = Math.sqrt(arc.p0.x ** 2 + arc.p0.y ** 2);
        if (pr > 0.1) {
          this.drawControlPoint(cx, cy, scale, arc.p0, '#ff9966', false);
        }
      }
    }

    // ─── Draw lower arcs (blue) — only for 4π (second traversal) ───
    if (state.is4Pi) {
      for (let i = 0; i < state.lowerBeziers.length; i++) {
        const arc = state.lowerBeziers[i];
        const pts = this.sampleBezier(arc, samples);
        this.drawBezierCurve(cx, cy, r, pts, '#44aaff', 2.5);
        this.drawControlScaffold(cx, cy, scale, arc, 'rgba(68,170,255,0.3)');
        this.drawControlPoint(cx, cy, scale, arc.p1, '#44aaff', false);

        if (i === 0) {
          const jr = Math.sqrt(arc.p2.x ** 2 + arc.p2.y ** 2);
          if (jr > 0.1) this.drawControlPoint(cx, cy, scale, arc.p2, '#6699cc', false);
        }
        if (i === 1) {
          const pr = Math.sqrt(arc.p0.x ** 2 + arc.p0.y ** 2);
          if (pr > 0.1) this.drawControlPoint(cx, cy, scale, arc.p0, '#6699cc', false);
        }
      }
    }

    // ─── Antipodal jump dashed lines ───
    if (state.junctionOnBoundary) {
      const u0end = state.upperBeziers[0].p2;
      const u1start = state.upperBeziers[1].p0;
      this.drawAntipodalJumpLine(cx, cy, scale, u0end, u1start);

      // Lower jump only for 4π (second traversal)
      if (state.is4Pi) {
        const l0end = state.lowerBeziers[0].p2;
        const l1start = state.lowerBeziers[1].p0;
        this.drawAntipodalJumpLine(cx, cy, scale, l0end, l1start);
      }
    }

    // ─── Draw boundary crossing markers ───
    if (totalCrossings > 0) {
      const uniquePts = this.deduplicatePoints(crossingPts, 0.3);
      for (const cp of uniquePts) {
        const sx = cx + cp.x * scale;
        const sy = cy - cp.y * scale;

        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', sx, sy + 0.5);
        ctx.textBaseline = 'alphabetic';
      }
    }

    // ─── Highlighted antipodal during drag ───
    if (state.highlightedAntipodal) {
      const ap = state.highlightedAntipodal;
      const sx = cx + ap.x * scale;
      const sy = cy - ap.y * scale;

      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('antipodal', sx, sy - 16);
    }

    // ─── Contraction done: checkmark at center ───
    if (state.contractDone) {
      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', cx, cy);
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('Contraído a I', cx, cy + 18);
    }

    // ─── No crossings glow ───
    if (totalCrossings === 0 && !state.contractDone && !state.contractAnimating) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.15, 0, 2 * Math.PI);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.15);
      grd.addColorStop(0, 'rgba(68, 255, 136, 0.25)');
      grd.addColorStop(1, 'rgba(68, 255, 136, 0)');
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // ─── Info below disk ───
    const infoY = cy + r + 16;

    // Crossing count
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Cruces: ${totalCrossings}`, cx, infoY);

    // Mod 2 result
    const mod2 = totalCrossings % 2;
    if (mod2 === 0) {
      ctx.fillStyle = '#44ff88';
      ctx.fillText('mod 2 = 0 → contráctil ✓', cx, infoY + 15);
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.fillText('mod 2 = 1 → NO contráctil ✗', cx, infoY + 15);
    }

    // ─── For 2π: if dragging, show red tint + message ───
    if (!state.is4Pi && state.dragging) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('El cruce NO se puede eliminar', cx, infoY + 32);
    }

    // ─── For 4π: show "Contraer a I" button when crossings=0 ───
    if (state.is4Pi && totalCrossings === 0 && !state.contractDone && !state.contractAnimating) {
      const btnW = Math.min(140, areaW * 0.6);
      const btnH = 26;
      const btnX = cx - btnW / 2;
      const btnY = infoY + 28;

      ctx.fillStyle = '#0d3020';
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 1.5;
      roundRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶ Contraer a I', cx, btnY + 17);

      state.clickRegions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'contract' });
    } else if (state.contractAnimating) {
      ctx.fillStyle = '#44ff88';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const pct = Math.round((1 - state.contractScale) * 100);
      ctx.fillText(`Contrayendo... ${pct}%`, cx, infoY + 40);
    } else if (state.is4Pi && state.contractDone) {
      ctx.fillStyle = '#44ff88';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Contraído a I', cx, infoY + 32);
    }

    // "Reset" button
    {
      const btnW = Math.min(100, areaW * 0.4);
      const btnH = 22;
      const btnX = cx - btnW / 2;
      const btnY = infoY + 55;

      ctx.fillStyle = '#15202e';
      ctx.strokeStyle = '#3a5570';
      ctx.lineWidth = 1;
      roundRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#88aacc';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↺ Reiniciar', cx, btnY + 14);

      state.clickRegions.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'reset' });
    }

    // Disk labels
    this.drawDiskLabels(cx, cy, r);
  }

  // ─── INTERACTIVE-COMPARISON: mouse handling ───

  private onMouseDownComparison(e: MouseEvent): void {
    if (!this.leftDisk || !this.rightDisk) return;

    const pos = this.canvasToScreen(e);
    const halfW = this.width / 2;

    // Determine which half
    this.activeHalf = pos.x < halfW ? 'left' : 'right';
    const state = this.activeHalf === 'left' ? this.leftDisk : this.rightDisk;

    if (state.contractAnimating) return;

    // Check clickable regions
    for (const region of state.clickRegions) {
      if (pos.x >= region.x && pos.x <= region.x + region.w &&
          pos.y >= region.y && pos.y <= region.y + region.h) {
        if (region.action === 'contract') {
          this.startContractionFor(state);
        } else if (region.action === 'reset') {
          if (state.contractAnimId) {
            cancelAnimationFrame(state.contractAnimId);
            state.contractAnimId = 0;
          }
          // Re-create state
          const newState = this.createDiskState(state.is4Pi);
          if (this.activeHalf === 'left') {
            this.leftDisk = newState;
          } else {
            this.rightDisk = newState;
          }
          this.draw();
        }
        return;
      }
    }

    // Hit-test control points on upper Bézier arcs
    const hitRadius = 14;

    for (let i = 0; i < state.upperBeziers.length; i++) {
      const arc = state.upperBeziers[i];
      for (const key of ['p0', 'p1', 'p2'] as const) {
        const isFixedStart = (i === 0 && key === 'p0');
        const isFixedEnd = (i === state.upperBeziers.length - 1 && key === 'p2');
        if (isFixedStart || isFixedEnd) continue;

        // For arc1.p0 (junction pair): redirect to dragging arc0.p2
        if (i === 1 && key === 'p0') {
          const sp = this.ballToScreenFor(state, arc.p0);
          const d = Math.sqrt((pos.x - sp.x) ** 2 + (pos.y - sp.y) ** 2);
          if (d < hitRadius) {
            state.dragging = true;
            state.dragArcIdx = 0;
            state.dragPtKey = 'p2';
            this.canvas.style.cursor = 'grabbing';
            state.contractDone = false;
            return;
          }
          continue;
        }

        const sp = this.ballToScreenFor(state, arc[key]);
        const d = Math.sqrt((pos.x - sp.x) ** 2 + (pos.y - sp.y) ** 2);
        if (d < hitRadius) {
          state.dragging = true;
          state.dragArcIdx = i;
          state.dragPtKey = key;
          this.canvas.style.cursor = 'grabbing';
          state.contractDone = false;
          return;
        }
      }
    }
  }

  private onMouseMoveComparison(e: MouseEvent): void {
    if (!this.leftDisk || !this.rightDisk) return;

    const pos = this.canvasToScreen(e);

    // Check if any disk is being dragged
    let draggingDisk: InteractiveDiskState | null = null;
    if (this.leftDisk.dragging) draggingDisk = this.leftDisk;
    else if (this.rightDisk.dragging) draggingDisk = this.rightDisk;

    if (draggingDisk) {
      const ballPt = this.screenToBallFor(draggingDisk, pos);
      const r = Math.sqrt(ballPt.x * ballPt.x + ballPt.y * ballPt.y);
      const isJunction = (draggingDisk.dragArcIdx === 0 && draggingDisk.dragPtKey === 'p2');

      if (isJunction) {
        if (r > PI * 0.99) {
          const s = PI * 0.99 / r;
          ballPt.x *= s;
          ballPt.y *= s;
        }
        draggingDisk.upperBeziers[0].p2 = ballPt;
        this.updateJunctionFor(draggingDisk);
      } else {
        if (r > PI * 0.95) {
          const s = PI * 0.95 / r;
          ballPt.x *= s;
          ballPt.y *= s;
        }
        draggingDisk.upperBeziers[draggingDisk.dragArcIdx][draggingDisk.dragPtKey] = ballPt;
      }

      this.syncLowerBeziersFor(draggingDisk);

      const dp = draggingDisk.upperBeziers[draggingDisk.dragArcIdx][draggingDisk.dragPtKey];
      draggingDisk.highlightedAntipodal = { x: -dp.x, y: -dp.y };

      this.draw();
      return;
    }

    // Hover: check if near a control point
    let nearCP = false;
    let nearBtn = false;

    for (const disk of [this.leftDisk, this.rightDisk]) {
      for (let i = 0; i < disk.upperBeziers.length; i++) {
        const arc = disk.upperBeziers[i];
        for (const key of ['p0', 'p1', 'p2'] as const) {
          const isFixedStart = (i === 0 && key === 'p0');
          const isFixedEnd = (i === disk.upperBeziers.length - 1 && key === 'p2');
          if (isFixedStart || isFixedEnd) continue;

          const pt = (i === 1 && key === 'p0') ? arc.p0 : arc[key];
          const sp = this.ballToScreenFor(disk, pt);
          const d = Math.sqrt((pos.x - sp.x) ** 2 + (pos.y - sp.y) ** 2);
          if (d < 14) { nearCP = true; break; }
        }
        if (nearCP) break;
      }
      if (nearCP) break;

      for (const region of disk.clickRegions) {
        if (pos.x >= region.x && pos.x <= region.x + region.w &&
            pos.y >= region.y && pos.y <= region.y + region.h) {
          nearBtn = true;
          break;
        }
      }
      if (nearBtn) break;
    }

    this.canvas.style.cursor = nearCP ? 'grab' : nearBtn ? 'pointer' : 'crosshair';
  }

  // ─── COMPARISON STAGES: 2π vs 4π ───

  private drawComparisonStages(): void {
    const { ctx, width, height } = this;

    ctx.fillStyle = '#88bbff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('4π: contráctil (los arcos se separan y colapsan)', width / 2, 14);

    const cols = 4;
    const rowH = (height - 30) / 2;
    const cellW = width / cols;
    const diskR = Math.min(cellW, rowH) / 2 - 10;

    const stages4pi = [0, 0.3, 0.6, 0.95];
    for (let i = 0; i < cols; i++) {
      const ccx = cellW * i + cellW / 2;
      const ccy = 28 + rowH / 2;
      const s = stages4pi[i];
      this.drawDisk(ccx, ccy, diskR, 0.5);
      const upper = this.gen2PiArc(s, +1, 100);
      const lower = this.gen2PiArc(s, -1, 100);
      this.drawPath2D(ccx, ccy, diskR, upper, '#ff6644', 2, false);
      this.drawPath2D(ccx, ccy, diskR, lower, '#44aaff', 2, false);
      this.drawArrowOnPath(ccx, ccy, diskR, upper, '#ff6644');
      this.drawArrowOnPath(ccx, ccy, diskR, lower, '#44aaff');
      ctx.fillStyle = '#8899aa'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`s = ${s.toFixed(1)}`, ccx, ccy + diskR + 14);
      if (i === cols - 1) {
        ctx.fillStyle = '#44ff88'; ctx.font = 'bold 9px sans-serif';
        ctx.fillText('✓ contráctil', ccx, ccy + diskR + 26);
      }
    }

    ctx.fillStyle = '#ff6644'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('2π: NO contráctil (el cruce de frontera persiste)', width / 2, 28 + rowH + 4);

    const stages2pi = [0, 0.3, 0.6, 0.9];
    for (let i = 0; i < cols; i++) {
      const ccx = cellW * i + cellW / 2;
      const ccy = 28 + rowH + 10 + rowH / 2;
      const s = stages2pi[i];
      this.drawDisk(ccx, ccy, diskR, 0.5);
      const path = this.gen2PiStuck(s, 100);
      this.drawPath2D(ccx, ccy, diskR, path, '#ff6644', 2, true);
      this.drawArrowOnPath(ccx, ccy, diskR, path, '#ff6644');
      ctx.fillStyle = '#8899aa'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`intento ${i + 1}`, ccx, ccy + diskR + 14);
      if (i === cols - 1) {
        ctx.fillStyle = '#ff4444'; ctx.font = 'bold 9px sans-serif';
        ctx.fillText('✗ no contráctil', ccx, ccy + diskR + 26);
      }
    }
  }

  // ──────────────────────── PRIMITIVES ────────────────────────

  private drawDisk(cx: number, cy: number, r: number, opacity = 1): void {
    const { ctx } = this;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(10, 15, 30, ${0.8 * opacity})`; ctx.fill();

    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = `rgba(100, 150, 220, ${0.5 * opacity})`; ctx.lineWidth = 2; ctx.stroke();

    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * opacity})`; ctx.fill();

    ctx.strokeStyle = `rgba(60, 80, 120, ${0.15 * opacity})`; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();

    this.drawAntipodalPairs(cx, cy, r, opacity);
  }

  private drawAntipodalPairs(cx: number, cy: number, r: number, opacity: number): void {
    const { ctx } = this;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI;
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx - r * Math.cos(angle), y2 = cy - r * Math.sin(angle);
      const color = `hsla(${(i / n) * 360}, 55%, 55%, ${0.4 * opacity})`;
      ctx.beginPath(); ctx.arc(x1, y1, 2.5, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, 2.5, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
    }
  }

  private drawPath2D(
    cx: number, cy: number, diskR: number, pts: Pt[],
    color: string, lineWidth: number, showJumps: boolean,
  ): void {
    if (pts.length < 2) return;
    const { ctx } = this;
    const scale = diskR / PI;
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i++) {
      const px = cx + pts[i].x * scale;
      const py = cy - pts[i].y * scale;
      if (i > 0) {
        const prevPx = cx + pts[i - 1].x * scale;
        const prevPy = cy - pts[i - 1].y * scale;
        const dist = Math.sqrt((px - prevPx) ** 2 + (py - prevPy) ** 2);
        if (dist > diskR * 0.4) {
          ctx.stroke();
          if (showJumps) {
            ctx.save(); ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(prevPx, prevPy); ctx.lineTo(px, py); ctx.stroke();
            ctx.restore();
          }
          ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
          ctx.beginPath(); ctx.moveTo(px, py); started = true; continue;
        }
      }
      if (!started) { ctx.moveTo(px, py); started = true; }
      else { ctx.lineTo(px, py); }
    }
    ctx.stroke();
  }

  private drawBezierCurve(
    cx: number, cy: number, diskR: number, pts: Pt[],
    color: string, lineWidth: number,
  ): void {
    if (pts.length < 2) return;
    const { ctx } = this;
    const scale = diskR / PI;
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + pts[0].x * scale, cy - pts[0].y * scale);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(cx + pts[i].x * scale, cy - pts[i].y * scale);
    }
    ctx.stroke();
  }

  private drawControlScaffold(
    cx: number, cy: number, scale: number, arc: BezierArc, color: string,
  ): void {
    const { ctx } = this;
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + arc.p0.x * scale, cy - arc.p0.y * scale);
    ctx.lineTo(cx + arc.p1.x * scale, cy - arc.p1.y * scale);
    ctx.lineTo(cx + arc.p2.x * scale, cy - arc.p2.y * scale);
    ctx.stroke();
    ctx.restore();
  }

  private drawControlPoint(
    cx: number, cy: number, scale: number,
    pt: Pt, color: string, draggable: boolean,
  ): void {
    const { ctx } = this;
    const sx = cx + pt.x * scale;
    const sy = cy - pt.y * scale;

    if (draggable) {
      ctx.beginPath(); ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
      ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  private drawArrowOnPath(
    cx: number, cy: number, diskR: number, pts: Pt[], color: string,
  ): void {
    if (pts.length < 10) return;
    const { ctx } = this;
    const scale = diskR / PI;
    const midIdx = Math.floor(pts.length * 0.3);
    const p = pts[midIdx];
    const pNext = pts[Math.min(midIdx + 3, pts.length - 1)];
    const px = cx + p.x * scale, py = cy - p.y * scale;
    const dx = (pNext.x - p.x) * scale, dy = -(pNext.y - p.y) * scale;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const nx = dx / len, ny = dy / len, sz = 5;
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(px + nx * sz, py + ny * sz);
    ctx.lineTo(px - ny * sz * 0.6, py + nx * sz * 0.6);
    ctx.lineTo(px + ny * sz * 0.6, py - nx * sz * 0.6);
    ctx.closePath(); ctx.fill();
  }

  private drawHead(x: number, y: number, color: string): void {
    const { ctx } = this;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  private drawDiskLabels(cx: number, cy: number, r: number): void {
    const { ctx } = this;
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left'; ctx.fillText('I', cx + 5, cy - 5);
    ctx.fillStyle = '#556677'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('θ=π', cx, cy - r - 4);
    ctx.fillText('puntos opuestos = mismo punto', cx, cy + r + 12);
  }
}
