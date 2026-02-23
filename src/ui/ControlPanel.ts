import { Vec3, vec3Normalize, vec3Norm, PI } from '../math/vec3';
import { AnimationMode } from '../animation/AnimationController';
import { PRESETS, Preset } from './PresetManager';

export interface ControlState {
  axis: Vec3;
  totalAngle: number;
  speed: number;
  mode: AnimationMode;
  showAntipodalGrid: boolean;
}

type ChangeCallback = (state: ControlState) => void;
type PresetCallback = (preset: Preset) => void;
type ActionCallback = () => void;

/**
 * Control panel for the SO(3) visualizer.
 * Includes pedagogical S² axis visualizer with antipodal identification.
 */
export class ControlPanel {
  private container: HTMLElement;
  private callbacks: {
    onChange: ChangeCallback[];
    onPreset: PresetCallback[];
    onPlayPause: ActionCallback[];
    onReset: ActionCallback[];
    onStartContraction: ActionCallback[];
  } = {
    onChange: [],
    onPreset: [],
    onPlayPause: [],
    onReset: [],
    onStartContraction: [],
  };

  private axisX = 1;
  private axisY = 0;
  private axisZ = 0;
  private totalAngle = 2 * PI;
  private speed = 0.3;
  private mode: AnimationMode = 'loop';
  private showAntipodalGrid = true;

  // DOM refs
  private progressSlider!: HTMLInputElement;
  private contractionSlider!: HTMLInputElement;
  private contractionGroup!: HTMLElement;
  private playPauseBtn!: HTMLButtonElement;
  private angleSlider!: HTMLInputElement;

  // S² visualizer refs
  private s2Svg!: SVGSVGElement;
  private s2DotN!: SVGCircleElement;
  private s2DotNeg!: SVGCircleElement;
  private s2LabelN!: SVGTextElement;
  private s2LabelNeg!: SVGTextElement;
  private s2Line!: SVGLineElement;
  private rawVectorDisplay!: HTMLElement;
  private rawNormDisplay!: HTMLElement;
  private unitVectorDisplay!: HTMLElement;
  private unitNormDisplay!: HTMLElement;
  private zeroWarning!: HTMLElement;
  private antipodalNote!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildDOM();
  }

  onChange(cb: ChangeCallback): void { this.callbacks.onChange.push(cb); }
  onPreset(cb: PresetCallback): void { this.callbacks.onPreset.push(cb); }
  onPlayPause(cb: ActionCallback): void { this.callbacks.onPlayPause.push(cb); }
  onReset(cb: ActionCallback): void { this.callbacks.onReset.push(cb); }
  onStartContraction(cb: ActionCallback): void { this.callbacks.onStartContraction.push(cb); }

  getState(): ControlState {
    return {
      axis: vec3Normalize({ x: this.axisX, y: this.axisY, z: this.axisZ }),
      totalAngle: this.totalAngle,
      speed: this.speed,
      mode: this.mode,
      showAntipodalGrid: this.showAntipodalGrid,
    };
  }

  setProgress(t: number): void {
    if (this.progressSlider) {
      this.progressSlider.value = String(Math.round(t * 1000));
    }
  }

  setContractionParam(s: number): void {
    if (this.contractionSlider) {
      this.contractionSlider.value = String(Math.round(s * 100));
    }
  }

  setPlaying(playing: boolean): void {
    if (this.playPauseBtn) {
      this.playPauseBtn.textContent = playing ? '⏸ Pausar' : '▶ Reproducir';
    }
  }

  private emitChange(): void {
    const state = this.getState();
    for (const cb of this.callbacks.onChange) cb(state);
  }

  private formatAngle(rad: number): string {
    const piMultiple = rad / PI;
    const deg = Math.round(rad * 180 / PI);
    if (Math.abs(piMultiple - Math.round(piMultiple)) < 0.01) {
      return `${Math.round(piMultiple)}π (${deg}°)`;
    }
    return `${piMultiple.toFixed(2)}π (${deg}°)`;
  }

  private buildDOM(): void {
    this.container.innerHTML = `
      <div class="control-section">
        <h3>Presets pedagógicos</h3>
        <div class="preset-buttons" id="preset-buttons"></div>
      </div>

      <div class="control-section">
        <h3>Eje de rotación <span class="axis-hat">n̂ ∈ S²</span></h3>
        <div class="axis-row">
          <div class="axis-sliders">
            <div class="axis-controls">
              <label>X: <input type="range" id="axis-x" min="-100" max="100" value="100" step="1">
                <span id="axis-x-val">1.00</span></label>
              <label>Y: <input type="range" id="axis-y" min="-100" max="100" value="0" step="1">
                <span id="axis-y-val">0.00</span></label>
              <label>Z: <input type="range" id="axis-z" min="-100" max="100" value="0" step="1">
                <span id="axis-z-val">0.00</span></label>
            </div>
            <div class="axis-info">
              <div class="axis-info-row">
                <span class="axis-label-raw">n</span>=<span class="axis-display" id="raw-vector-display">(1, 0, 0)</span>
                <span class="axis-label-norm">‖n‖=<span class="norm-display" id="raw-norm-display">1.00</span></span>
              </div>
              <div class="axis-info-row axis-info-row-unit">
                <span class="axis-label-n">n̂</span>=<span class="axis-display" id="unit-vector-display">(1, 0, 0)</span>
                <span class="axis-label-norm">‖n̂‖=<span class="norm-display-unit" id="unit-norm-display">1.00</span></span>
              </div>
              <div class="axis-zero-warning" id="axis-zero-warning" style="display:none" role="alert">
                ⚠ vector≈0, eje=(1,0,0)
              </div>
            </div>
          </div>
          <div class="s2-visualizer">
            <svg id="s2-svg" viewBox="0 0 80 80" width="80" height="80" aria-label="Visualización de n̂ en S²">
              <!-- S² circle -->
              <circle cx="40" cy="40" r="34" fill="none" stroke="#253550" stroke-width="1.5"/>
              <!-- Equator line -->
              <ellipse cx="40" cy="40" rx="34" ry="10" fill="none" stroke="#1a2540" stroke-width="0.7" stroke-dasharray="3,3"/>
              <!-- Connecting line n to -n -->
              <line id="s2-line" x1="40" y1="6" x2="40" y2="74" stroke="#335577" stroke-width="0.8" stroke-dasharray="2,2"/>
              <!-- n dot -->
              <circle id="s2-dot-n" cx="74" cy="40" r="4.5" fill="#ff8844" stroke="#ffaa66" stroke-width="1"/>
              <!-- -n dot -->
              <circle id="s2-dot-neg" cx="6" cy="40" r="4.5" fill="#4488ff" stroke="#66aaff" stroke-width="1"/>
              <!-- Labels -->
              <text id="s2-label-n" x="74" y="30" text-anchor="middle" fill="#ffaa66" font-size="9" font-weight="bold">n̂</text>
              <text id="s2-label-neg" x="6" y="53" text-anchor="middle" fill="#66aaff" font-size="8" font-weight="bold">−n̂</text>
              <!-- Axis labels -->
              <text x="76" y="43" text-anchor="start" fill="#335577" font-size="6">x</text>
              <text x="40" y="5" text-anchor="middle" fill="#335577" font-size="6">z</text>
            </svg>
          </div>
        </div>
        <div class="antipodal-note" id="antipodal-note" style="display:none" role="alert">
          <span class="antipodal-icon">⚠️</span>
          En θ = π: <strong>R(n̂, π) = R(−n̂, π)</strong> — identificación antipodal en la frontera de la bola SO(3)
        </div>
      </div>

      <div class="control-section">
        <h3>Ángulo total de rotación</h3>
        <label class="angle-label">
          <input type="range" id="angle-slider" min="10" max="628" value="200" step="1">
          <span id="angle-val" class="angle-val-display">2π (360°)</span>
        </label>
        <div class="angle-presets">
          <button class="angle-quick-btn active" data-angle="2">2π</button>
          <button class="angle-quick-btn" data-angle="4">4π</button>
        </div>
      </div>

      <div class="control-section">
        <h3>Modo</h3>
        <div class="mode-select">
          <button class="mode-btn active" data-mode="loop">Lazo</button>
          <button class="mode-btn" data-mode="contraction">Contracción</button>
          <button class="mode-btn" data-mode="comparison">Comparar</button>
        </div>
      </div>

      <div class="control-section">
        <h3>Reproducción</h3>
        <div class="playback-controls">
          <button id="play-pause-btn" class="primary-btn">▶ Reproducir</button>
          <button id="reset-btn" class="secondary-btn">↺ Reset</button>
        </div>
        <label>Velocidad: <input type="range" id="speed-slider" min="5" max="100" value="30" step="1">
          <span id="speed-val">0.30</span></label>
        <label>Progreso: <input type="range" id="progress-slider" min="0" max="1000" value="0" step="1"></label>
      </div>

      <div class="control-section" id="contraction-group" style="display:none">
        <h3>Contracción (homotopía)</h3>
        <label>Parámetro s: <input type="range" id="contraction-slider" min="0" max="100" value="0" step="1">
          <span id="contraction-val">0.00</span></label>
        <button id="auto-contract-btn" class="secondary-btn">▶ Contraer automáticamente</button>
      </div>

      <div class="control-section">
        <h3>Opciones de visualización</h3>
        <label class="checkbox-label">
          <input type="checkbox" id="show-antipodal" checked> Marcadores antipodales
        </label>
      </div>
    `;

    // Cache S² visualizer DOM refs
    this.s2Svg = this.container.querySelector('#s2-svg') as unknown as SVGSVGElement;
    this.s2DotN = this.container.querySelector('#s2-dot-n') as unknown as SVGCircleElement;
    this.s2DotNeg = this.container.querySelector('#s2-dot-neg') as unknown as SVGCircleElement;
    this.s2LabelN = this.container.querySelector('#s2-label-n') as unknown as SVGTextElement;
    this.s2LabelNeg = this.container.querySelector('#s2-label-neg') as unknown as SVGTextElement;
    this.s2Line = this.container.querySelector('#s2-line') as unknown as SVGLineElement;
    this.rawVectorDisplay = this.container.querySelector('#raw-vector-display')!;
    this.rawNormDisplay = this.container.querySelector('#raw-norm-display')!;
    this.unitVectorDisplay = this.container.querySelector('#unit-vector-display')!;
    this.unitNormDisplay = this.container.querySelector('#unit-norm-display')!;
    this.zeroWarning = this.container.querySelector('#axis-zero-warning')!;
    this.antipodalNote = this.container.querySelector('#antipodal-note')!;

    this.wireEvents();
    this.updateS2Visualizer();
    this.updateAntipodalNote();
  }

  /**
   * Project a 3D unit vector onto the S² visualizer SVG.
   * Uses a simple orthographic projection: x → right, z → up.
   * The SVG viewBox is 0..80, center at (40, 40), radius 34.
   */
  private projectToS2(v: Vec3): { x: number; y: number } {
    const cx = 40, cy = 40, r = 34;
    // Orthographic: x maps to SVG-x, z maps to SVG-y (inverted)
    return {
      x: cx + v.x * r,
      y: cy - v.z * r,   // z-up → SVG y-down
    };
  }

  private updateS2Visualizer(): void {
    const raw = { x: this.axisX, y: this.axisY, z: this.axisZ };
    const norm = vec3Norm(raw);
    const isNearZero = norm < 1e-4;
    const n = isNearZero ? { x: 1, y: 0, z: 0 } : vec3Normalize(raw);

    // Row 1: Raw vector n and ‖n‖  (compact 2-decimal)
    this.rawVectorDisplay.textContent = `(${this.axisX.toFixed(2)},${this.axisY.toFixed(2)},${this.axisZ.toFixed(2)})`;
    this.rawNormDisplay.textContent = norm.toFixed(2);

    // Row 2: Unit vector n̂ and ‖n̂‖ = 1.00 always
    this.unitVectorDisplay.textContent = `(${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)})`;
    this.unitNormDisplay.textContent = '1.00';

    // Row 3: Near-zero warning (only when ‖n‖ ≈ 0)
    this.zeroWarning.style.display = isNearZero ? 'block' : 'none';

    // Project n̂ and −n̂ onto SVG
    const pn = this.projectToS2(n);
    const pneg = this.projectToS2({ x: -n.x, y: -n.y, z: -n.z });

    this.s2DotN.setAttribute('cx', String(pn.x));
    this.s2DotN.setAttribute('cy', String(pn.y));
    this.s2DotNeg.setAttribute('cx', String(pneg.x));
    this.s2DotNeg.setAttribute('cy', String(pneg.y));

    // Update labels near dots (offset slightly)
    const labelOffN = { x: pn.x, y: pn.y - 8 };
    const labelOffNeg = { x: pneg.x, y: pneg.y + 13 };

    // Keep labels inside SVG bounds
    labelOffN.x = Math.max(8, Math.min(72, labelOffN.x));
    labelOffN.y = Math.max(8, Math.min(76, labelOffN.y));
    labelOffNeg.x = Math.max(8, Math.min(72, labelOffNeg.x));
    labelOffNeg.y = Math.max(8, Math.min(76, labelOffNeg.y));

    this.s2LabelN.setAttribute('x', String(labelOffN.x));
    this.s2LabelN.setAttribute('y', String(labelOffN.y));
    this.s2LabelNeg.setAttribute('x', String(labelOffNeg.x));
    this.s2LabelNeg.setAttribute('y', String(labelOffNeg.y));

    // Update connecting line
    this.s2Line.setAttribute('x1', String(pn.x));
    this.s2Line.setAttribute('y1', String(pn.y));
    this.s2Line.setAttribute('x2', String(pneg.x));
    this.s2Line.setAttribute('y2', String(pneg.y));

    // Highlight dots when θ = π
    const isAtPi = Math.abs(this.totalAngle - PI) < 0.15;
    const nFill = isAtPi ? '#ffcc00' : '#ff8844';
    const nStroke = isAtPi ? '#ffee44' : '#ffaa66';
    const negFill = isAtPi ? '#ffcc00' : '#4488ff';
    const negStroke = isAtPi ? '#ffee44' : '#66aaff';
    const nRadius = isAtPi ? '6' : '4.5';

    this.s2DotN.setAttribute('fill', nFill);
    this.s2DotN.setAttribute('stroke', nStroke);
    this.s2DotN.setAttribute('r', nRadius);
    this.s2DotNeg.setAttribute('fill', negFill);
    this.s2DotNeg.setAttribute('stroke', negStroke);
    this.s2DotNeg.setAttribute('r', nRadius);

    // Line style changes at θ = π
    if (isAtPi) {
      this.s2Line.setAttribute('stroke', '#ffcc00');
      this.s2Line.setAttribute('stroke-width', '1.5');
      this.s2Line.setAttribute('stroke-dasharray', 'none');
    } else {
      this.s2Line.setAttribute('stroke', '#335577');
      this.s2Line.setAttribute('stroke-width', '0.8');
      this.s2Line.setAttribute('stroke-dasharray', '2,2');
    }
  }

  private updateAntipodalNote(): void {
    const isAtPi = Math.abs(this.totalAngle - PI) < 0.15;
    this.antipodalNote.style.display = isAtPi ? 'flex' : 'none';
  }

  private wireEvents(): void {
    // Preset buttons
    const presetContainer = this.container.querySelector('#preset-buttons')!;
    for (const preset of PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.name;
      btn.title = preset.description;
      btn.addEventListener('click', () => {
        for (const cb of this.callbacks.onPreset) cb(preset);
      });
      presetContainer.appendChild(btn);
    }

    // Axis sliders
    const axisXSlider = this.container.querySelector('#axis-x') as HTMLInputElement;
    const axisYSlider = this.container.querySelector('#axis-y') as HTMLInputElement;
    const axisZSlider = this.container.querySelector('#axis-z') as HTMLInputElement;

    const updateAxis = () => {
      this.axisX = parseInt(axisXSlider.value) / 100;
      this.axisY = parseInt(axisYSlider.value) / 100;
      this.axisZ = parseInt(axisZSlider.value) / 100;
      this.container.querySelector('#axis-x-val')!.textContent = this.axisX.toFixed(2);
      this.container.querySelector('#axis-y-val')!.textContent = this.axisY.toFixed(2);
      this.container.querySelector('#axis-z-val')!.textContent = this.axisZ.toFixed(2);
      this.updateS2Visualizer();
      this.emitChange();
    };
    axisXSlider.addEventListener('input', updateAxis);
    axisYSlider.addEventListener('input', updateAxis);
    axisZSlider.addEventListener('input', updateAxis);

    // Continuous angle slider (10 to 628 = 0.1π to ~6.28π ≈ 6π)
    this.angleSlider = this.container.querySelector('#angle-slider') as HTMLInputElement;
    this.angleSlider.addEventListener('input', () => {
      const val = parseInt(this.angleSlider.value);
      this.totalAngle = (val / 100) * PI;
      this.container.querySelector('#angle-val')!.textContent = this.formatAngle(this.totalAngle);
      // Update quick button highlights
      this.updateAngleQuickButtons();
      // Update S² highlights and antipodal note
      this.updateS2Visualizer();
      this.updateAntipodalNote();
      this.emitChange();
    });

    // Angle quick-select buttons
    const angleQuickBtns = this.container.querySelectorAll('.angle-quick-btn');
    angleQuickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mult = parseInt((btn as HTMLElement).dataset.angle!);
        this.totalAngle = mult * PI;
        this.angleSlider.value = String(mult * 100);
        this.container.querySelector('#angle-val')!.textContent = this.formatAngle(this.totalAngle);
        this.updateAngleQuickButtons();
        this.updateS2Visualizer();
        this.updateAntipodalNote();
        this.emitChange();
      });
    });

    // Mode buttons
    const modeBtns = this.container.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = (btn as HTMLElement).dataset.mode as AnimationMode;
        this.contractionGroup.style.display = this.mode === 'contraction' ? 'block' : 'none';
        this.emitChange();
      });
    });

    // Play/Pause
    this.playPauseBtn = this.container.querySelector('#play-pause-btn') as HTMLButtonElement;
    this.playPauseBtn.addEventListener('click', () => {
      for (const cb of this.callbacks.onPlayPause) cb();
    });

    // Reset
    const resetBtn = this.container.querySelector('#reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      for (const cb of this.callbacks.onReset) cb();
    });

    // Speed
    const speedSlider = this.container.querySelector('#speed-slider') as HTMLInputElement;
    speedSlider.addEventListener('input', () => {
      this.speed = parseInt(speedSlider.value) / 100;
      this.container.querySelector('#speed-val')!.textContent = this.speed.toFixed(2);
      this.emitChange();
    });

    // Progress
    this.progressSlider = this.container.querySelector('#progress-slider') as HTMLInputElement;

    // Contraction
    this.contractionGroup = this.container.querySelector('#contraction-group') as HTMLElement;
    this.contractionSlider = this.container.querySelector('#contraction-slider') as HTMLInputElement;
    this.contractionSlider.addEventListener('input', () => {
      const val = parseInt(this.contractionSlider.value) / 100;
      this.container.querySelector('#contraction-val')!.textContent = val.toFixed(2);
    });

    const autoContractBtn = this.container.querySelector('#auto-contract-btn') as HTMLButtonElement;
    autoContractBtn.addEventListener('click', () => {
      for (const cb of this.callbacks.onStartContraction) cb();
    });

    // Antipodal grid toggle
    const antipodalToggle = this.container.querySelector('#show-antipodal') as HTMLInputElement;
    antipodalToggle.addEventListener('change', () => {
      this.showAntipodalGrid = antipodalToggle.checked;
      this.emitChange();
    });
  }

  private updateAngleQuickButtons(): void {
    const piMult = this.totalAngle / PI;
    const btns = this.container.querySelectorAll('.angle-quick-btn');
    btns.forEach(b => {
      const val = parseInt((b as HTMLElement).dataset.angle!);
      b.classList.toggle('active', Math.abs(piMult - val) < 0.05);
    });
  }

  applyPreset(preset: Preset): void {
    this.axisX = preset.axis.x;
    this.axisY = preset.axis.y;
    this.axisZ = preset.axis.z;
    this.totalAngle = preset.totalAngle;
    this.speed = preset.speed;
    this.mode = preset.mode;

    // Update axis sliders
    (this.container.querySelector('#axis-x') as HTMLInputElement).value = String(Math.round(preset.axis.x * 100));
    (this.container.querySelector('#axis-y') as HTMLInputElement).value = String(Math.round(preset.axis.y * 100));
    (this.container.querySelector('#axis-z') as HTMLInputElement).value = String(Math.round(preset.axis.z * 100));
    this.container.querySelector('#axis-x-val')!.textContent = preset.axis.x.toFixed(2);
    this.container.querySelector('#axis-y-val')!.textContent = preset.axis.y.toFixed(2);
    this.container.querySelector('#axis-z-val')!.textContent = preset.axis.z.toFixed(2);

    // Update angle slider
    const piMult = preset.totalAngle / PI;
    this.angleSlider.value = String(Math.round(piMult * 100));
    this.container.querySelector('#angle-val')!.textContent = this.formatAngle(preset.totalAngle);
    this.updateAngleQuickButtons();

    // Update mode buttons
    const modeBtns = this.container.querySelectorAll('.mode-btn');
    modeBtns.forEach(b => b.classList.remove('active'));
    this.container.querySelector(`.mode-btn[data-mode="${preset.mode}"]`)?.classList.add('active');

    // Update speed
    (this.container.querySelector('#speed-slider') as HTMLInputElement).value = String(Math.round(preset.speed * 100));
    this.container.querySelector('#speed-val')!.textContent = preset.speed.toFixed(2);

    // Show/hide contraction controls
    this.contractionGroup.style.display = preset.mode === 'contraction' ? 'block' : 'none';

    // Update S² visualizer and antipodal note
    this.updateS2Visualizer();
    this.updateAntipodalNote();
  }
}
