/**
 * ObjetivosModule — Módulo de Objetivos de Aprendizaje para SO(3)
 *
 * Displays structured pedagogical content following CIAD evaluation criteria:
 * learning objectives, competencies, suggested sequence, and achievement criteria.
 */

export class ObjetivosModule {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="objetivos-header">
        <span class="objetivos-icon">🎯</span>
        <span class="objetivos-title">Objetivos de Aprendizaje</span>
      </div>

      <div class="objetivos-content">

        <div class="objetivos-section">
          <h3 class="objetivos-section-title">Objetivo de aprendizaje</h3>
          <p class="objetivos-main-goal">
            Comprender la topología del grupo de rotaciones SO(3), su representación
            como bola cerrada B³(π) con identificación antipodal, y demostrar por qué
            <em>π₁(SO(3)) = ℤ/2</em> — es decir, por qué una rotación de 360° no es
            topológicamente trivial pero una de 720° sí lo es.
          </p>
        </div>

        <div class="objetivos-section">
          <h3 class="objetivos-section-title">Qué aprenderás</h3>
          <ul class="objetivos-list">
            <li>Representar rotaciones 3D como puntos en una bola de radio π (eje × ángulo).</li>
            <li>Explicar la identificación antipodal en la frontera: R(n̂, π) = R(−n̂, π).</li>
            <li>Distinguir lazos contráctiles de no contráctiles usando la paridad de cruces de frontera.</li>
            <li>Demostrar interactivamente que el lazo 4π se contrae a un punto y el lazo 2π no.</li>
            <li>Conectar π₁(SO(3)) = ℤ/2 con la cubierta doble SU(2) ≅ S³ y la existencia de espinores.</li>
            <li>Relacionar el "truco del cinturón" (belt trick) con la topología de SO(3).</li>
          </ul>
        </div>

        <div class="objetivos-section">
          <h3 class="objetivos-section-title">Secuencia sugerida (antes / durante / después)</h3>
          <div class="objetivos-sequence">
            <div class="objetivos-phase">
              <span class="objetivos-phase-num">1</span>
              <div class="objetivos-phase-body">
                <span class="objetivos-phase-label">Antes</span>
                <ul>
                  <li>Revisar conceptos: rotación, eje, ángulo, grupo.</li>
                  <li>Leer la pestaña <strong>Explicación</strong> con el modo lazo 2π activo.</li>
                  <li>Formular una predicción: ¿será igual girar 360° que 720°?</li>
                </ul>
              </div>
            </div>
            <div class="objetivos-phase">
              <span class="objetivos-phase-num">2</span>
              <div class="objetivos-phase-body">
                <span class="objetivos-phase-label">Durante</span>
                <ul>
                  <li>Observar la animación de lazos 2π y 4π en la bola 3D.</li>
                  <li>Usar el modo <strong>2π vs 4π Interactivo</strong> para manipular ambos lazos.</li>
                  <li>Intentar eliminar los cruces de frontera en cada caso.</li>
                  <li>Ver las <strong>Etapas 4π</strong> para entender paso a paso la contracción.</li>
                  <li>Comparar con el modo <strong>Comparación</strong> (lado a lado 3D).</li>
                </ul>
              </div>
            </div>
            <div class="objetivos-phase">
              <span class="objetivos-phase-num">3</span>
              <div class="objetivos-phase-body">
                <span class="objetivos-phase-label">Después</span>
                <ul>
                  <li>Completar el <strong>Quiz</strong> de evaluación formativa (meta: ≥ 70%).</li>
                  <li>Discutir con el <strong>Tutor IA</strong> las dudas pendientes.</li>
                  <li>Registrar evidencia: capturas + explicación escrita.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="objetivos-section">
          <h3 class="objetivos-section-title">Criterios de logro</h3>
          <ul class="objetivos-criteria">
            <li><span class="criterio-check">✓</span> Obtener al menos 70% en el Quiz formativo.</li>
            <li><span class="criterio-check">✓</span> Poder contraer el lazo 4π en modo interactivo sin ayuda.</li>
            <li><span class="criterio-check">✓</span> Explicar verbalmente por qué el lazo 2π no es contráctil.</li>
            <li><span class="criterio-check">✓</span> Relacionar la paridad de cruces de frontera (mod 2) con la contractibilidad.</li>
            <li><span class="criterio-check">✓</span> Describir la relación entre SO(3) y SU(2) como cubierta doble.</li>
          </ul>
        </div>

      </div>
    `;
  }
}
