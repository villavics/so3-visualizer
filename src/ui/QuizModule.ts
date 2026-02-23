/**
 * QuizModule — Evaluación formativa integrada
 *
 * Provides a built-in formative assessment with multiple-choice questions
 * about SO(3) topology, aligned with Bloom's taxonomy levels.
 *
 * Features:
 * - Progressive difficulty (remember → understand → analyze → evaluate)
 * - Immediate feedback with explanations
 * - Score tracking with progress bar
 * - Contextual hints linking to visualization features
 * - Results summary for teacher review
 */

interface QuizQuestion {
  id: number;
  level: 'recordar' | 'comprender' | 'aplicar' | 'analizar';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
}

interface QuizState {
  currentIndex: number;
  answers: (number | null)[];
  revealed: boolean[];
  completed: boolean;
}

export class QuizModule {
  private container: HTMLElement;
  private questions: QuizQuestion[];
  private state: QuizState;
  private onComplete?: (score: number, total: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.questions = this.buildQuestions();
    this.state = {
      currentIndex: 0,
      answers: new Array(this.questions.length).fill(null),
      revealed: new Array(this.questions.length).fill(false),
      completed: false,
    };
    this.render();
  }

  setOnComplete(cb: (score: number, total: number) => void): void {
    this.onComplete = cb;
  }

  /**
   * Get quiz results with per-level Bloom breakdown.
   * Returns null if quiz hasn't been completed.
   */
  getResults(): { score: number; total: number; breakdown: { level: string; correct: number; total: number }[] } | null {
    if (!this.state.completed) return null;
    const s = this.getScore();
    const levels = ['recordar', 'comprender', 'aplicar', 'analizar'] as const;
    const breakdown = levels.map(level => {
      const qs = this.questions.filter(q => q.level === level);
      let correct = 0;
      for (const q of qs) {
        const idx = this.questions.indexOf(q);
        if (this.state.answers[idx] === q.correctIndex) correct++;
      }
      return { level, correct, total: qs.length };
    });
    return { score: s.correct, total: s.total, breakdown };
  }

  reset(): void {
    this.state = {
      currentIndex: 0,
      answers: new Array(this.questions.length).fill(null),
      revealed: new Array(this.questions.length).fill(false),
      completed: false,
    };
    this.render();
  }

  // ─── Rendering ───

  private render(): void {
    if (this.state.completed) {
      this.renderResults();
      return;
    }

    const q = this.questions[this.state.currentIndex];
    const answered = this.state.answers[this.state.currentIndex] !== null;
    const revealed = this.state.revealed[this.state.currentIndex];
    const selectedIdx = this.state.answers[this.state.currentIndex];
    const isCorrect = selectedIdx === q.correctIndex;
    const score = this.getScore();
    const total = this.questions.length;
    const current = this.state.currentIndex + 1;

    const levelColors: Record<string, string> = {
      recordar: '#44aaff',
      comprender: '#44ff88',
      aplicar: '#ffaa44',
      analizar: '#ff6688',
    };
    const levelLabels: Record<string, string> = {
      recordar: 'Recordar',
      comprender: 'Comprender',
      aplicar: 'Aplicar',
      analizar: 'Analizar',
    };

    const progressPct = (current / total) * 100;

    this.container.innerHTML = `
      <div class="quiz-header">
        <span class="quiz-icon">📝</span>
        <span class="quiz-title">Evaluación Formativa</span>
      </div>

      <div class="quiz-progress">
        <div class="quiz-progress-text">
          <span>Pregunta ${current} / ${total}</span>
          <span class="quiz-score">Correctas: ${score.correct}/${score.answered}</span>
        </div>
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width: ${progressPct}%"></div>
        </div>
      </div>

      <div class="quiz-level" style="color: ${levelColors[q.level]}">
        Nivel: ${levelLabels[q.level]}
      </div>

      <div class="quiz-question">${this.escapeHtml(q.question)}</div>

      <div class="quiz-options">
        ${q.options.map((opt, i) => {
          let cls = 'quiz-option';
          if (revealed) {
            if (i === q.correctIndex) cls += ' quiz-option-correct';
            else if (i === selectedIdx && !isCorrect) cls += ' quiz-option-wrong';
          } else if (i === selectedIdx) {
            cls += ' quiz-option-selected';
          }
          const disabled = revealed ? 'disabled' : '';
          return `<button class="${cls}" data-idx="${i}" ${disabled}>
            <span class="quiz-option-letter">${String.fromCharCode(65 + i)}</span>
            ${this.escapeHtml(opt)}
          </button>`;
        }).join('')}
      </div>

      ${!answered ? `
        <div class="quiz-hint-area">
          ${q.hint ? `<button class="quiz-hint-btn">💡 Pista</button>` : ''}
        </div>
      ` : ''}

      ${answered && !revealed ? `
        <button class="quiz-verify-btn">Verificar respuesta</button>
      ` : ''}

      ${revealed ? `
        <div class="quiz-feedback ${isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}">
          <div class="quiz-feedback-header">
            ${isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto'}
          </div>
          <div class="quiz-feedback-text">${this.escapeHtml(q.explanation)}</div>
        </div>
        <div class="quiz-nav">
          ${this.state.currentIndex > 0 ? '<button class="quiz-nav-btn quiz-prev">← Anterior</button>' : ''}
          ${this.state.currentIndex < total - 1
            ? '<button class="quiz-nav-btn quiz-next">Siguiente →</button>'
            : '<button class="quiz-nav-btn quiz-finish">Ver resultados 📊</button>'
          }
        </div>
      ` : ''}
    `;

    // Wire events
    this.container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.state.revealed[this.state.currentIndex]) return;
        const idx = parseInt((btn as HTMLElement).dataset.idx || '0');
        this.state.answers[this.state.currentIndex] = idx;
        this.render();
      });
    });

    const verifyBtn = this.container.querySelector('.quiz-verify-btn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        this.state.revealed[this.state.currentIndex] = true;
        this.render();
      });
    }

    const hintBtn = this.container.querySelector('.quiz-hint-btn');
    if (hintBtn && q.hint) {
      hintBtn.addEventListener('click', () => {
        const area = this.container.querySelector('.quiz-hint-area')!;
        area.innerHTML = `<div class="quiz-hint-text">💡 ${this.escapeHtml(q.hint!)}</div>`;
      });
    }

    const prevBtn = this.container.querySelector('.quiz-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.state.currentIndex = Math.max(0, this.state.currentIndex - 1);
        this.render();
      });
    }

    const nextBtn = this.container.querySelector('.quiz-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.state.currentIndex = Math.min(this.questions.length - 1, this.state.currentIndex + 1);
        this.render();
      });
    }

    const finishBtn = this.container.querySelector('.quiz-finish');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        this.state.completed = true;
        const s = this.getScore();
        if (this.onComplete) this.onComplete(s.correct, s.total);
        this.render();
      });
    }
  }

  private renderResults(): void {
    const score = this.getScore();
    const pct = Math.round((score.correct / score.total) * 100);
    const passed = pct >= 70;

    // Per-level breakdown
    const levels = ['recordar', 'comprender', 'aplicar', 'analizar'] as const;
    const levelStats = levels.map(level => {
      const qs = this.questions.filter(q => q.level === level);
      const correct = qs.filter((q, _) => {
        const idx = this.questions.indexOf(q);
        return this.state.answers[idx] === q.correctIndex;
      }).length;
      return { level, total: qs.length, correct };
    }).filter(s => s.total > 0);

    this.container.innerHTML = `
      <div class="quiz-header">
        <span class="quiz-icon">📊</span>
        <span class="quiz-title">Resultados</span>
      </div>

      <div class="quiz-results-score ${passed ? 'quiz-results-pass' : 'quiz-results-fail'}">
        <div class="quiz-results-pct">${pct}%</div>
        <div class="quiz-results-fraction">${score.correct} / ${score.total} correctas</div>
        <div class="quiz-results-verdict">${passed ? '✅ APROBADO' : '❌ Necesita refuerzo'}</div>
      </div>

      <div class="quiz-results-breakdown">
        <div class="quiz-results-breakdown-title">Desglose por nivel (Bloom)</div>
        ${levelStats.map(s => {
          const levelPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          return `
            <div class="quiz-level-row">
              <span class="quiz-level-name">${s.level}</span>
              <span class="quiz-level-bar">
                <span class="quiz-level-fill" style="width: ${levelPct}%"></span>
              </span>
              <span class="quiz-level-score">${s.correct}/${s.total}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="quiz-results-review">
        <div class="quiz-results-breakdown-title">Revisa tus respuestas</div>
        ${this.questions.map((q, i) => {
          const userAns = this.state.answers[i];
          const correct = userAns === q.correctIndex;
          return `
            <div class="quiz-review-item ${correct ? 'quiz-review-correct' : 'quiz-review-wrong'}">
              <span class="quiz-review-icon">${correct ? '✅' : '❌'}</span>
              <span class="quiz-review-num">${i + 1}.</span>
              <span class="quiz-review-text">${this.escapeHtml(q.question).substring(0, 60)}...</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="quiz-nav">
        <button class="quiz-nav-btn quiz-retry">↺ Reintentar</button>
      </div>
    `;

    const retryBtn = this.container.querySelector('.quiz-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.reset());
    }
  }

  // ─── Helpers ───

  private getScore(): { correct: number; answered: number; total: number } {
    let correct = 0;
    let answered = 0;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.state.answers[i] !== null) {
        answered++;
        if (this.state.answers[i] === this.questions[i].correctIndex) correct++;
      }
    }
    return { correct, answered, total: this.questions.length };
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Question Bank ───

  private buildQuestions(): QuizQuestion[] {
    return [
      {
        id: 1,
        level: 'recordar',
        question: '¿Qué representa el centro (origen) de la bola SO(3)?',
        options: [
          'La rotación de 180° alrededor del eje X',
          'La rotación identidad (sin rotación)',
          'La rotación de 360° alrededor de cualquier eje',
          'Un punto singular sin significado geométrico',
        ],
        correctIndex: 1,
        explanation: 'El centro de la bola corresponde al vector nulo (θ=0), que representa la rotación identidad: sin rotación en absoluto. Todos los lazos empiezan y terminan aquí.',
      },
      {
        id: 2,
        level: 'recordar',
        question: '¿Qué propiedad especial tiene la frontera (superficie) de la bola SO(3)?',
        options: [
          'Es impenetrable: ningún camino puede cruzarla',
          'Cada punto se identifica con su punto diametralmente opuesto',
          'Solo existen 6 puntos especiales en ella',
          'Representa rotaciones de ángulo cero',
        ],
        correctIndex: 1,
        explanation: 'La frontera tiene identificación antipodal: cada punto p se identifica con −p. Esto es porque R(n̂, π) = R(−n̂, π) — una rotación de π alrededor de un eje es igual a la rotación de π alrededor del eje opuesto.',
        hint: 'Piensa: ¿qué pasa si giras 180° alrededor de un eje, y luego giras 180° alrededor del eje opuesto?',
      },
      {
        id: 3,
        level: 'comprender',
        question: '¿Cuál es el grupo fundamental π₁(SO(3))?',
        options: [
          'ℤ (los enteros)',
          'ℤ/2 (el grupo cíclico de orden 2)',
          '{0} (el grupo trivial)',
          'ℤ/4 (el grupo cíclico de orden 4)',
        ],
        correctIndex: 1,
        explanation: 'π₁(SO(3)) = ℤ/2 = {0, 1}. Esto significa que hay exactamente dos tipos de lazos: los contráctiles (clase 0) y los no contráctiles (clase 1). La "suma" es mod 2: 1+1=0.',
        hint: 'Solo hay DOS clases de equivalencia de lazos en SO(3). ¿Qué grupo tiene exactamente 2 elementos?',
      },
      {
        id: 4,
        level: 'comprender',
        question: 'Un lazo de 2π (360°) en SO(3) cruza la frontera de la bola:',
        options: [
          'Cero veces',
          'Una vez (número impar)',
          'Dos veces (número par)',
          'Depende del eje de rotación',
        ],
        correctIndex: 1,
        explanation: 'Un lazo de 2π cruza la frontera exactamente una vez: va del centro al borde (ángulo 0→π) y "salta" al punto antipodal para regresar (ángulo π→2π). Un número impar de cruces implica que NO es contráctil.',
        hint: 'Observa la animación del lazo 2π: ¿cuántas veces ves el "salto" antipodal?',
      },
      {
        id: 5,
        level: 'comprender',
        question: '¿Por qué el lazo de 4π (720°) SÍ es contráctil?',
        options: [
          'Porque es más largo y tiene más espacio para moverse',
          'Porque cruza la frontera un número PAR de veces, y los cruces se cancelan',
          'Porque 4π = 0 en cualquier grupo',
          'Porque no cruza la frontera nunca',
        ],
        correctIndex: 1,
        explanation: 'El lazo 4π cruza la frontera DOS veces (par). Los dos cruces se "emparejan" y pueden cancelarse durante la contracción: al separar los arcos, dejan de tocar la frontera y el lazo se convierte en un lazo interior que se contrae a un punto.',
      },
      {
        id: 6,
        level: 'aplicar',
        question: 'En el modo interactivo, ¿qué debes hacer para contraer el lazo 4π?',
        options: [
          'Arrastrar todos los puntos hacia la frontera',
          'Arrastrar el punto de cruce (borde) hacia el INTERIOR del disco',
          'Hacer doble clic en el centro',
          'Cambiar el eje de rotación a Z',
        ],
        correctIndex: 1,
        explanation: 'Para contraer el lazo 4π, debes arrastrar el punto naranja que está en el borde hacia el interior del disco. Esto elimina el cruce de frontera. Cuando los cruces desaparecen, el lazo puede contraerse a un punto.',
        hint: 'Busca el punto naranja con anillo en el borde del disco y arrástralo hacia el centro.',
      },
      {
        id: 7,
        level: 'aplicar',
        question: 'Si un lazo cruza la frontera 5 veces, ¿es contráctil?',
        options: [
          'Sí, porque 5 es mayor que 2',
          'No, porque 5 mod 2 = 1 (impar)',
          'Sí, porque 5 > 4',
          'No se puede determinar sin más información',
        ],
        correctIndex: 1,
        explanation: 'La contractibilidad depende de la paridad de los cruces: cruces mod 2. Como 5 mod 2 = 1 (impar), el lazo NO es contráctil. Siempre queda al menos un cruce que no se puede cancelar.',
      },
      {
        id: 8,
        level: 'analizar',
        question: 'Un lazo de 2π en SO(3), levantado a SU(2) ≅ S³, se convierte en:',
        options: [
          'Un lazo cerrado en S³ (empieza y termina en el mismo punto)',
          'Un camino abierto de +I a −I (NO es un lazo cerrado)',
          'Un punto fijo en S³',
          'Dos lazos cerrados independientes',
        ],
        correctIndex: 1,
        explanation: 'El mapa SU(2) → SO(3) es 2:1. Un lazo de 2π en SO(3) se levanta a un camino de +I a −I en SU(2). Como +I ≠ −I, no es un lazo cerrado, lo que refleja que es no contráctil. En cambio, un lazo de 4π va +I → −I → +I, que sí es cerrado.',
        hint: 'SU(2) es la "cubierta doble" de SO(3): cada rotación tiene DOS pre-imágenes (q y −q).',
      },
      {
        id: 9,
        level: 'analizar',
        question: '¿Cuál es la conexión entre π₁(SO(3)) = ℤ/2 y la existencia de espinores?',
        options: [
          'No hay conexión; son fenómenos independientes',
          'Los espinores son representaciones de SU(2), no de SO(3); existen porque SO(3) tiene cubierta doble no trivial',
          'Los espinores existen porque SO(3) es compacto',
          'Los espinores son rotaciones de 90°',
        ],
        correctIndex: 1,
        explanation: 'Como π₁(SO(3)) = ℤ/2 ≠ 0, SO(3) no es simplemente conexo y tiene una cubierta doble no trivial: SU(2). Los espinores son objetos que transforman bajo SU(2) (no SO(3)): cambian de signo bajo rotaciones de 2π. Los fermiones (electrón, quark) son espinores.',
      },
      {
        id: 10,
        level: 'analizar',
        question: '¿Por qué la identificación antipodal es crucial para la topología de SO(3)?',
        options: [
          'Solo es una convención de notación sin consecuencias topológicas',
          'Hace que la bola sea no orientable',
          'Convierte la bola B³ en RP³, creando un grupo fundamental no trivial y permitiendo lazos no contráctiles',
          'Duplica el volumen de SO(3)',
        ],
        correctIndex: 2,
        explanation: 'Sin la identificación antipodal, la bola B³ sería contráctil (π₁ = 0) y todos los lazos serían triviales. La identificación p ~ −p en la frontera crea el espacio RP³, que tiene π₁ = ℤ/2. Esta "pegadura" es lo que permite la existencia de lazos no contráctiles.',
        hint: 'Piensa: ¿qué pasaría si los puntos opuestos del borde fueran puntos DIFERENTES?',
      },
    ];
  }
}
