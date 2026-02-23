/**
 * EvidenciasModule — Portafolio de evidencias de aprendizaje
 *
 * Generates a session summary, quiz results, and student reflections
 * for CIAD evaluation. Follows the ObjetivosModule constructor pattern.
 */

import { QuizModule } from './QuizModule';

export interface SessionData {
  startTime: number;
  presetsUsed: string[];
  modesVisited: string[];
  contractionCompleted: boolean;
  quizResult: {
    score: number;
    total: number;
    percentage: number;
    date: string;
    breakdown: { level: string; correct: number; total: number }[];
  } | null;
}

const MODE_LABELS: Record<string, string> = {
  loop: 'Lazo',
  contraction: 'Contraccion',
  comparison: 'Comparacion',
};

const LEVEL_LABELS: Record<string, string> = {
  recordar: 'Recordar',
  comprender: 'Comprender',
  aplicar: 'Aplicar',
  analizar: 'Analizar',
};

export class EvidenciasModule {
  private container: HTMLElement;
  private session: SessionData;
  private quizModule: QuizModule;

  // Persist text field values across re-renders
  private savedFields: Record<string, string> = {};

  constructor(container: HTMLElement, session: SessionData, quizModule: QuizModule) {
    this.container = container;
    this.session = session;
    this.quizModule = quizModule;
    this.render();
  }

  private getElapsedMinutes(): string {
    const ms = Date.now() - this.session.startTime;
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return '< 1 min';
    return `${mins} min`;
  }

  /** Save current text input values before re-render */
  private saveFields(): void {
    const ids = ['ev-nombre', 'ev-matricula', 'ev-curso', 'ev-hipotesis', 'ev-observado', 'ev-conclusion'];
    for (const id of ids) {
      const el = this.container.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) this.savedFields[id] = el.value;
    }
  }

  /** Restore text input values after re-render */
  private restoreFields(): void {
    for (const [id, val] of Object.entries(this.savedFields)) {
      const el = this.container.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) el.value = val;
    }
  }

  private render(): void {
    // Preserve user input before re-rendering
    this.saveFields();

    const s = this.session;
    const qr = s.quizResult;

    this.container.innerHTML = `
      <div class="evidencias-header">
        <span class="evidencias-icon">📋</span>
        <span class="evidencias-title">Evidencias de Aprendizaje</span>
        <div class="evidencias-actions">
          <button class="evidencias-btn evidencias-btn-refresh" title="Actualizar datos">Actualizar</button>
          <button class="evidencias-btn evidencias-btn-export" title="Exportar resumen como PDF">Exportar PDF</button>
        </div>
      </div>

      <div class="evidencias-content">

        <!-- Student info -->
        <div class="evidencias-card evidencias-card-full evidencias-student-info">
          <h3 class="evidencias-card-title">Datos del estudiante</h3>
          <div class="evidencias-student-grid">
            <div class="evidencias-field">
              <label class="evidencias-field-label" for="ev-nombre">Nombre del estudiante</label>
              <input type="text" class="evidencias-input" id="ev-nombre" placeholder="Nombre(s) y apellidos">
            </div>
            <div class="evidencias-field">
              <label class="evidencias-field-label" for="ev-matricula">Matricula</label>
              <input type="text" class="evidencias-input" id="ev-matricula" placeholder="Ej. A01234567">
            </div>
            <div class="evidencias-field">
              <label class="evidencias-field-label" for="ev-curso">Curso</label>
              <input type="text" class="evidencias-input" id="ev-curso" placeholder="Nombre del curso o asignatura">
            </div>
          </div>
        </div>

        <div class="evidencias-grid">

          <!-- Left: session summary -->
          <div class="evidencias-card">
            <h3 class="evidencias-card-title">Resumen de sesion</h3>
            <div class="evidencias-stats">
              <div class="evidencias-stat">
                <span class="evidencias-stat-label">Tiempo en sesion:</span>
                <span class="evidencias-stat-value" id="ev-time">${this.getElapsedMinutes()}</span>
              </div>
              <div class="evidencias-stat">
                <span class="evidencias-stat-label">Presets utilizados:</span>
                <span class="evidencias-stat-value">${s.presetsUsed.length > 0 ? s.presetsUsed.length : 'Ninguno'}</span>
              </div>
              ${s.presetsUsed.length > 0 ? `
              <div class="evidencias-preset-list">
                ${s.presetsUsed.map(p => `<span class="evidencias-preset-tag">${p}</span>`).join('')}
              </div>` : ''}
              <div class="evidencias-stat">
                <span class="evidencias-stat-label">Modos explorados:</span>
                <span class="evidencias-stat-value">${s.modesVisited.length > 0
                  ? s.modesVisited.map(m => MODE_LABELS[m] || m).join(', ')
                  : 'Ninguno'}</span>
              </div>
              <div class="evidencias-stat">
                <span class="evidencias-stat-label">Contraccion completada:</span>
                <span class="evidencias-stat-value ${s.contractionCompleted ? 'ev-pass' : 'ev-pending'}">
                  ${s.contractionCompleted ? '✓ Si' : '✗ No'}
                </span>
              </div>
            </div>
          </div>

          <!-- Right: quiz result -->
          <div class="evidencias-card">
            <h3 class="evidencias-card-title">Ultimo resultado del quiz</h3>
            ${qr ? `
              <div class="evidencias-quiz-score">
                <span class="evidencias-score-num ${qr.percentage >= 70 ? 'ev-pass' : 'ev-fail'}">
                  ${qr.score}/${qr.total} (${qr.percentage}%)
                </span>
                <span class="evidencias-score-verdict ${qr.percentage >= 70 ? 'ev-pass' : 'ev-fail'}">
                  ${qr.percentage >= 70 ? '✓ Aprobado' : '✗ No aprobado'}
                </span>
              </div>
              <div class="evidencias-stat">
                <span class="evidencias-stat-label">Fecha:</span>
                <span class="evidencias-stat-value">${qr.date}</span>
              </div>
              ${qr.breakdown.length > 0 ? `
              <div class="evidencias-bloom">
                <span class="evidencias-stat-label">Desglose por nivel de Bloom:</span>
                <div class="evidencias-bloom-grid">
                  ${qr.breakdown.map(b => `
                    <div class="evidencias-bloom-row">
                      <span class="evidencias-bloom-level">${LEVEL_LABELS[b.level] || b.level}</span>
                      <span class="evidencias-bloom-score ${b.correct === b.total ? 'ev-pass' : ''}">${b.correct}/${b.total}</span>
                    </div>
                  `).join('')}
                </div>
              </div>` : ''}
            ` : `
              <p class="evidencias-empty">Aun no se ha completado el quiz.</p>
            `}
          </div>

        </div>

        <!-- Reflections -->
        <div class="evidencias-card evidencias-card-full">
          <h3 class="evidencias-card-title">Reflexion del estudiante</h3>

          <div class="evidencias-reflection">
            <label class="evidencias-reflection-label">Hipotesis inicial</label>
            <textarea class="evidencias-textarea" id="ev-hipotesis"
              placeholder="¿Que crees que pasa topologicamente con una rotacion de 360°? ¿Sera equivalente a no rotar?"></textarea>
          </div>

          <div class="evidencias-reflection">
            <label class="evidencias-reflection-label">Resultado observado</label>
            <textarea class="evidencias-textarea" id="ev-observado"
              placeholder="¿Que observaste al usar el visualizador? ¿Pudiste contraer el lazo 2π? ¿Y el 4π?"></textarea>
          </div>

          <div class="evidencias-reflection">
            <label class="evidencias-reflection-label">Conclusion</label>
            <textarea class="evidencias-textarea" id="ev-conclusion"
              placeholder="¿Por que 2π no es contractil y 4π si? ¿Que significa esto fisicamente (espinores, belt trick)?"></textarea>
          </div>
        </div>

      </div>
    `;

    // Restore user input after re-render
    this.restoreFields();

    // Wire buttons
    const refreshBtn = this.container.querySelector('.evidencias-btn-refresh');
    const exportBtn = this.container.querySelector('.evidencias-btn-export');

    refreshBtn?.addEventListener('click', () => this.render());
    exportBtn?.addEventListener('click', () => this.exportPDF());
  }

  private exportPDF(): void {
    // Read all field values
    const nombre = (this.container.querySelector('#ev-nombre') as HTMLInputElement)?.value || '';
    const matricula = (this.container.querySelector('#ev-matricula') as HTMLInputElement)?.value || '';
    const curso = (this.container.querySelector('#ev-curso') as HTMLInputElement)?.value || '';
    const hipotesis = (this.container.querySelector('#ev-hipotesis') as HTMLTextAreaElement)?.value || '';
    const observado = (this.container.querySelector('#ev-observado') as HTMLTextAreaElement)?.value || '';
    const conclusion = (this.container.querySelector('#ev-conclusion') as HTMLTextAreaElement)?.value || '';

    const s = this.session;
    const qr = s.quizResult;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Evidencias — Visualizador SO(3)</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #222; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 16px; color: #444; margin-top: 24px; }
    .student-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; background: #f0f4f8; border-radius: 8px; padding: 16px; margin-bottom: 8px; }
    .student-field-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .student-field-value { font-size: 15px; font-weight: 600; margin-top: 2px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .card { background: #f5f5f5; border-radius: 8px; padding: 16px; }
    .stat { margin: 6px 0; }
    .stat-label { font-weight: bold; }
    .pass { color: #2a8e2a; font-weight: bold; }
    .fail { color: #cc3333; font-weight: bold; }
    .tag { display: inline-block; background: #ddd; border-radius: 4px; padding: 2px 8px; margin: 2px; font-size: 12px; }
    .bloom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 8px; }
    .reflection { margin: 16px 0; }
    .reflection-label { font-weight: bold; display: block; margin-bottom: 4px; }
    .reflection-text { background: #f5f5f5; border: 1px solid #ccc; border-radius: 6px; padding: 12px; min-height: 40px; white-space: pre-wrap; }
    .footer { margin-top: 32px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>📋 Evidencias de Aprendizaje — Visualizador SO(3)</h1>

  <div class="student-info">
    <div>
      <div class="student-field-label">Estudiante</div>
      <div class="student-field-value">${nombre || '—'}</div>
    </div>
    <div>
      <div class="student-field-label">Matricula</div>
      <div class="student-field-value">${matricula || '—'}</div>
    </div>
    <div>
      <div class="student-field-label">Curso</div>
      <div class="student-field-value">${curso || '—'}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Resumen de sesion</h2>
      <p class="stat"><span class="stat-label">Tiempo:</span> ${this.getElapsedMinutes()}</p>
      <p class="stat"><span class="stat-label">Presets usados:</span> ${s.presetsUsed.length > 0 ? s.presetsUsed.map(p => `<span class="tag">${p}</span>`).join(' ') : 'Ninguno'}</p>
      <p class="stat"><span class="stat-label">Modos explorados:</span> ${s.modesVisited.length > 0 ? s.modesVisited.map(m => MODE_LABELS[m] || m).join(', ') : 'Ninguno'}</p>
      <p class="stat"><span class="stat-label">Contraccion completada:</span> <span class="${s.contractionCompleted ? 'pass' : 'fail'}">${s.contractionCompleted ? 'Si' : 'No'}</span></p>
    </div>
    <div class="card">
      <h2>Resultado del quiz</h2>
      ${qr ? `
        <p class="stat"><span class="stat-label">Puntaje:</span> <span class="${qr.percentage >= 70 ? 'pass' : 'fail'}">${qr.score}/${qr.total} (${qr.percentage}%)</span></p>
        <p class="stat"><span class="stat-label">Fecha:</span> ${qr.date}</p>
        ${qr.breakdown.length > 0 ? `
        <p class="stat-label">Desglose Bloom:</p>
        <div class="bloom-grid">
          ${qr.breakdown.map(b => `<span>${LEVEL_LABELS[b.level] || b.level}: ${b.correct}/${b.total}</span>`).join('')}
        </div>` : ''}
      ` : '<p>Quiz no completado.</p>'}
    </div>
  </div>

  <h2>Reflexion del estudiante</h2>
  <div class="reflection">
    <span class="reflection-label">Hipotesis inicial:</span>
    <div class="reflection-text">${hipotesis || '(Sin respuesta)'}</div>
  </div>
  <div class="reflection">
    <span class="reflection-label">Resultado observado:</span>
    <div class="reflection-text">${observado || '(Sin respuesta)'}</div>
  </div>
  <div class="reflection">
    <span class="reflection-label">Conclusion:</span>
    <div class="reflection-text">${conclusion || '(Sin respuesta)'}</div>
  </div>

  <div class="footer">
    Generado por Visualizador SO(3) — ${new Date().toLocaleString('es-MX')}
  </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }
}
