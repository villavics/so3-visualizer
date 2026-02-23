export type AnimationMode = 'loop' | 'contraction' | 'comparison';

/**
 * Controls playback of the loop animation.
 * Manages progress t ∈ [0, 1] and contraction parameter s ∈ [0, 1].
 */
export class AnimationController {
  private _playing = false;
  private _speed = 0.3; // revolutions per second (slow for pedagogy)
  private _progress = 0; // t ∈ [0, 1]
  private _mode: AnimationMode = 'loop';
  private _contractionParam = 0; // s ∈ [0, 1], only used in contraction mode
  private _contracting = false;

  onProgressChange: ((t: number) => void) | null = null;
  onContractionChange: ((s: number) => void) | null = null;
  onLoopComplete: (() => void) | null = null;

  get playing(): boolean { return this._playing; }
  get speed(): number { return this._speed; }
  get progress(): number { return this._progress; }
  get mode(): AnimationMode { return this._mode; }
  get contractionParam(): number { return this._contractionParam; }

  play(): void { this._playing = true; }
  pause(): void { this._playing = false; }

  toggle(): void {
    this._playing = !this._playing;
  }

  reset(): void {
    this._progress = 0;
    this._contractionParam = 0;
    this._contracting = false;
    this.onProgressChange?.(0);
    this.onContractionChange?.(0);
  }

  setSpeed(speed: number): void {
    this._speed = Math.max(0.05, Math.min(2, speed));
  }

  setProgress(t: number): void {
    this._progress = Math.max(0, Math.min(1, t));
    this.onProgressChange?.(this._progress);
  }

  setMode(mode: AnimationMode): void {
    this._mode = mode;
    this.reset();
  }

  setContractionParam(s: number): void {
    this._contractionParam = Math.max(0, Math.min(1, s));
    this.onContractionChange?.(this._contractionParam);
  }

  startContraction(): void {
    this._contracting = true;
    this._contractionParam = 0;
  }

  update(dt: number): void {
    if (!this._playing) return;

    // Advance progress
    this._progress += dt * this._speed;

    if (this._progress >= 1) {
      this._progress = 0;
      this.onLoopComplete?.();

      // In contraction mode: after each loop cycle, advance contraction
      if (this._mode === 'contraction' && this._contracting) {
        this._contractionParam += 0.08;
        if (this._contractionParam >= 1) {
          this._contractionParam = 1;
          this._contracting = false;
        }
        this.onContractionChange?.(this._contractionParam);
      }
    }

    this.onProgressChange?.(this._progress);
  }
}
