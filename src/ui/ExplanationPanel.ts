export type ExplanationContext =
  | 'intro'
  | 'loop2pi'
  | 'loop4pi'
  | 'contraction'
  | 'comparison';

const EXPLANATIONS: Record<ExplanationContext, { title: string; paragraphs: string[] }> = {
  intro: {
    title: '¿Qué es esta bola?',
    paragraphs: [
      'SO(3) es el grupo de todas las rotaciones en 3D. Cada rotación tiene un <strong>eje</strong> y un <strong>ángulo</strong>.',
      'Representamos cada rotación como un punto dentro de una bola de radio π: la <strong>dirección</strong> desde el centro indica el eje de rotación, y la <strong>distancia</strong> al centro indica el ángulo (de 0 a π radianes).',
      'El <strong>centro</strong> de la bola = identidad (sin rotación).',
      'La <strong>frontera</strong> (radio = π) es especial: puntos diametralmente opuestos representan la <strong>misma</strong> rotación. Esto se llama <em>identificación antipodal</em>.',
      'Matemáticamente: R(n̂, π) = R(-n̂, π). Rotar π radianes alrededor de un eje es lo mismo que rotar π alrededor del eje opuesto.',
    ],
  },
  loop2pi: {
    title: 'Lazo de 2π — NO contráctil',
    paragraphs: [
      'Un lazo de 2π (rotación de 360°) traza un <strong>diámetro</strong> de la bola: va del centro a la frontera, "salta" al punto antipodal, y regresa al centro.',
      'Este salto NO es una discontinuidad en SO(3) — los dos puntos en la frontera son el <strong>mismo</strong> punto. El camino es continuo.',
      'Sin embargo, este lazo <strong>NO puede contraerse</strong> a un punto. No importa cómo lo deformes, siempre tendrá que cruzar la frontera un número impar de veces.',
      'Este lazo genera el grupo fundamental π₁(SO(3)) = ℤ/2. Representa el elemento no trivial.',
      'Intuitivamente: el lazo "envuelve" el espacio de una forma que no se puede deshacer.',
    ],
  },
  loop4pi: {
    title: 'Lazo de 4π — SÍ contráctil',
    paragraphs: [
      'Un lazo de 4π (rotación de 720°) recorre el diámetro <strong>dos veces</strong>: tiene dos saltos antipodales.',
      'A diferencia del lazo de 2π, este <strong>SÍ puede contraerse</strong> continuamente hasta reducirse a un punto.',
      '¿Por qué? Porque π₁(SO(3)) = ℤ/2, y en ℤ/2: 1 + 1 = 0. El doble del generador es el elemento trivial.',
      'Los dos cruces de la frontera pueden "emparejarse" y anularse entre sí durante la contracción.',
      'Este es el principio detrás del "truco de la correa de Dirac" y el "truco del plato".',
    ],
  },
  contraction: {
    title: 'Contracción del lazo 4π',
    paragraphs: [
      'Observa la homotopía: el lazo de 4π se deforma continuamente hasta el punto identidad.',
      'Las curvas fantasma (ghost trails) muestran etapas intermedias de la contracción.',
      'La contracción se realiza en la cubierta universal SU(2) ≅ S³: el lazo de 4π se levanta a un lazo cerrado en S³, y como S³ es simplemente conexo, se puede contraer allí.',
      'Al proyectar de vuelta a SO(3), el lazo se encoge progresivamente. Cuando el radio máximo baja de π, los saltos antipodales desaparecen.',
      'Usa el deslizador de contracción para explorar manualmente cada etapa de la homotopía.',
    ],
  },
  comparison: {
    title: 'Comparación: 2π vs 4π',
    paragraphs: [
      '<strong>Izquierda (rojo)</strong>: lazo de 2π — no contráctil. Cruza la frontera 1 vez.',
      '<strong>Derecha (azul)</strong>: lazo de 4π — contráctil. Cruza la frontera 2 veces.',
      'Ambos lazos empiezan y terminan en la identidad (centro de la bola). Ambos son lazos continuos en SO(3). Pero tienen propiedades topológicas distintas.',
      'La diferencia es que el número de cruces antipodales importa módulo 2: impar = no contráctil, par = contráctil.',
      'Esto refleja que SO(3) ≅ RP³ tiene grupo fundamental ℤ/2.',
    ],
  },
};

/**
 * Panel that shows context-dependent pedagogical explanations.
 */
export class ExplanationPanel {
  private container: HTMLElement;
  private currentContext: ExplanationContext = 'intro';

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setContext(context: ExplanationContext): void {
    if (context === this.currentContext) return;
    this.currentContext = context;
    this.render();
  }

  private render(): void {
    const data = EXPLANATIONS[this.currentContext];
    this.container.innerHTML = `
      <div class="explanation-content">
        <h3>${data.title}</h3>
        ${data.paragraphs.map(p => `<p>${p}</p>`).join('')}
      </div>
    `;
  }

  /**
   * Show a dynamic progress indicator during animation.
   */
  updateProgressInfo(t: number, totalAngle: number): void {
    const angleDeg = Math.round(t * totalAngle * 180 / Math.PI);
    const angleRad = (t * totalAngle).toFixed(2);
    const existing = this.container.querySelector('.progress-info');
    const html = `
      <div class="progress-info">
        <span>Ángulo actual: ${angleDeg}° (${angleRad} rad)</span>
        <div class="progress-bar-mini">
          <div class="progress-bar-fill" style="width: ${t * 100}%"></div>
        </div>
      </div>
    `;
    if (existing) {
      existing.outerHTML = html;
    } else {
      this.container.insertAdjacentHTML('beforeend', html);
    }
  }
}
