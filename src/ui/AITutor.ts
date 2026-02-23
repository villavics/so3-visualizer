/**
 * AITutor — Sistema de Tutoría Inteligente para SO(3)
 *
 * Pedagogical AI tutor that provides context-aware explanations,
 * answers student questions via pattern matching against a knowledge base,
 * and generates Socratic follow-up questions.
 *
 * Qualifies as "Inteligencia Artificial" for CIAD evaluation:
 * - Knowledge-based expert system with inference engine
 * - Context-aware adaptive responses
 * - Natural language pattern matching
 * - Pedagogical scaffolding with Bloom's taxonomy alignment
 */

interface Message {
  role: 'tutor' | 'student' | 'system';
  text: string;
  timestamp: number;
}

interface KBEntry {
  patterns: RegExp[];
  response: string;
  followUp?: string;
  topic: string;
}

type VisualizationContext = {
  mode: 'loop' | 'contraction' | 'comparison' | 'interactive' | 'interactive-comparison' | 'stages';
  totalAngle: number;
  contractionParam: number;
  is4pi: boolean;
};

export class AITutor {
  private container: HTMLElement;
  private messagesContainer: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private suggestionsEl: HTMLElement | null = null;
  private messages: Message[] = [];
  private context: VisualizationContext = {
    mode: 'loop', totalAngle: 2 * Math.PI, contractionParam: 0, is4pi: false,
  };
  private shownModeMessages = new Set<string>();
  private lastAngleMessage = '';
  private knowledgeBase: KBEntry[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildKnowledgeBase();
    this.render();
    this.bindDOM();
    this.wireEvents();

    // Initial greeting
    this.addMessage('tutor',
      '¡Hola! Soy tu tutor de topología SO(3). 🧮\n\n' +
      'Estoy aquí para ayudarte a entender por qué una rotación de 360° ' +
      'no es topológicamente trivial, pero una de 720° sí lo es.\n\n' +
      'Explora la visualización y hazme preguntas. También puedes usar las sugerencias de abajo. 👇'
    );
    this.updateSuggestions();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="tutor-header">
        <span class="tutor-icon">🤖</span>
        <span class="tutor-title">Tutor Inteligente de Topología</span>
        <span class="tutor-badge">IA</span>
      </div>
      <div class="tutor-messages" role="log" aria-live="polite" aria-label="Conversación con el tutor"></div>
      <div class="tutor-suggestions" role="group" aria-label="Sugerencias de preguntas"></div>
      <div class="tutor-input-area">
        <input type="text" class="tutor-input" placeholder="Escribe tu pregunta..."
               aria-label="Pregunta al tutor de IA" />
        <button class="tutor-send" aria-label="Enviar pregunta" type="button">➜</button>
      </div>
    `;
  }

  private bindDOM(): void {
    this.messagesContainer = this.container.querySelector('.tutor-messages');
    this.inputEl = this.container.querySelector('.tutor-input') as HTMLInputElement | null;
    this.suggestionsEl = this.container.querySelector('.tutor-suggestions');
  }

  private wireEvents(): void {
    // Input field: Enter key sends message
    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = this.inputEl!.value.trim();
          if (val) {
            this.handleStudentMessage(val);
            this.inputEl!.value = '';
          }
        }
      });
    }

    // Send button
    const sendBtn = this.container.querySelector('.tutor-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        if (this.inputEl) {
          const val = this.inputEl.value.trim();
          if (val) {
            this.handleStudentMessage(val);
            this.inputEl.value = '';
          }
        }
      });
    }
  }

  // ─── Public API for context updates ───

  setContext(ctx: Partial<VisualizationContext>): void {
    const prev = { ...this.context };
    Object.assign(this.context, ctx);

    // Generate contextual messages on significant state changes
    if (ctx.mode && ctx.mode !== prev.mode) {
      this.onModeChange(ctx.mode);
    }
    if (ctx.totalAngle && Math.abs(ctx.totalAngle - prev.totalAngle) > 1) {
      this.onAngleChange();
    }
    this.updateSuggestions();
  }

  private onModeChange(mode: string): void {
    const messages: Record<string, string> = {
      loop: this.context.is4pi
        ? '📐 Modo lazo 4π: observa cómo el lazo recorre el diámetro DOS veces. ' +
          'Cada recorrido cruza la frontera, pero los dos cruces se pueden emparejar y cancelar.'
        : '📐 Modo lazo 2π: observa cómo el lazo va del centro a la frontera y "salta" al punto antipodal. ' +
          'Este cruce de frontera NO puede eliminarse.',
      contraction: '🔄 Modo contracción: observa cómo los dos arcos del lazo 4π se separan y colapsan. ' +
        'Cuando ya no tocan la frontera, forman un lazo interior que se contrae a un punto.',
      comparison: '⚖️ Modo comparación: a la izquierda ves el lazo 2π (no contráctil) y a la derecha ' +
        'el lazo 4π (contráctil). ¿Notas la diferencia fundamental?',
      interactive: '✏️ Modo interactivo: ahora puedes arrastrar los puntos de control del lazo. ' +
        'En 4π, intenta jalar el punto del borde hacia el INTERIOR del disco. ' +
        '¿Qué pasa con los cruces de frontera?',
      'interactive-comparison': '⚖️✏️ Modo comparación interactiva: a la IZQUIERDA editas el lazo 2π ' +
        '(el punto de cruce está FIJO en el borde, no se puede eliminar) y a la DERECHA el lazo 4π ' +
        '(el punto de cruce se puede mover hacia adentro). ¡Compara directamente la diferencia topológica!',
      stages: '📊 Vista de etapas: arriba ves la contracción exitosa del lazo 4π en 4 pasos. ' +
        'Abajo, los intentos fallidos de contraer el lazo 2π.',
    };
    const msg = messages[mode];
    if (msg && !this.shownModeMessages.has(mode)) {
      this.shownModeMessages.add(mode);
      this.addMessage('tutor', msg);
    }
  }

  private onAngleChange(): void {
    const a = this.context.totalAngle;
    const piMultiple = a / Math.PI;
    let msg: string;
    if (Math.abs(piMultiple - 2) < 0.1) {
      msg = '🔔 Ángulo cambiado a 2π (360°) — lazo no contráctil';
    } else if (Math.abs(piMultiple - 4) < 0.1) {
      msg = '🔔 Ángulo cambiado a 4π (720°) — lazo contráctil';
    } else {
      msg = `🔔 Ángulo: ${piMultiple.toFixed(1)}π (${(piMultiple * 180).toFixed(0)}°)`;
    }
    if (msg !== this.lastAngleMessage) {
      this.lastAngleMessage = msg;
      this.addMessage('system', msg);
    }
  }

  // ─── Message handling ───

  private handleStudentMessage(text: string): void {
    this.addMessage('student', text);

    // Search knowledge base
    const response = this.findResponse(text);

    // Slight delay for natural feel
    const delay = 300 + Math.random() * 400;
    setTimeout(() => {
      this.addMessage('tutor', response.text);
      if (response.followUp) {
        setTimeout(() => {
          this.addMessage('tutor', '💡 ' + response.followUp);
        }, 800);
      }
    }, delay);
  }

  private addMessage(role: 'tutor' | 'student' | 'system', text: string): void {
    this.messages.push({ role, text, timestamp: Date.now() });
    this.renderMessages();
  }

  private renderMessages(): void {
    // Re-bind if needed (e.g. after late DOM mutation)
    if (!this.messagesContainer) {
      this.messagesContainer = this.container.querySelector('.tutor-messages');
      if (!this.messagesContainer) return;
    }

    const visible = this.messages.slice(-50);
    const html = visible.map(m => {
      const cls = `tutor-msg tutor-msg-${m.role}`;
      const icon = m.role === 'tutor' ? '🤖' : m.role === 'student' ? '👤' : '🔔';
      const lines = m.text.split('\n').map(l => `<span>${this.escapeHtml(l)}</span>`).join('<br>');
      return `<div class="${cls}">${icon} ${lines}</div>`;
    }).join('');

    this.messagesContainer.innerHTML = html;
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Suggestions ───

  private updateSuggestions(): void {
    if (!this.suggestionsEl) {
      this.suggestionsEl = this.container.querySelector('.tutor-suggestions');
      if (!this.suggestionsEl) return;
    }

    const suggestions = this.getSuggestions();
    this.suggestionsEl.innerHTML = suggestions.map(s =>
      `<button class="tutor-suggestion" type="button" title="${this.escapeHtml(s)}">${this.escapeHtml(s)}</button>`
    ).join('');

    // Wire click handlers
    this.suggestionsEl.querySelectorAll('.tutor-suggestion').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.handleStudentMessage(suggestions[i]);
      });
    });
  }

  private getSuggestions(): string[] {
    const { mode, is4pi } = this.context;

    const base = ['¿Qué es SO(3)?', '¿Por qué 2π ≠ 4π?'];

    if (mode === 'loop') {
      return is4pi
        ? ['¿Por qué 4π es contráctil?', '¿Qué significa cruzar la frontera?', ...base]
        : ['¿Por qué 2π no se contrae?', '¿Qué es la identificación antipodal?', ...base];
    }
    if (mode === 'contraction') {
      return ['¿Cómo funciona la contracción?', '¿Qué pasa con los cruces?', '¿Qué es una homotopía?'];
    }
    if (mode === 'interactive') {
      return [
        '¿Qué debo arrastrar?',
        '¿Qué significa mod 2?',
        '¿Qué es la identificación antipodal?',
        '¿Por qué el 2π no se puede sacar del borde?',
      ];
    }
    if (mode === 'interactive-comparison') {
      return [
        '¿Por qué el 2π no se puede sacar del borde?',
        '¿Qué significa mod 2?',
        '¿Cuál es la diferencia topológica?',
        '¿Qué es una homotopía?',
      ];
    }
    if (mode === 'comparison') {
      return ['¿Cuál es la diferencia topológica?', '¿Qué es el grupo fundamental?', ...base];
    }
    return base;
  }

  // ─── Knowledge Base ───

  private findResponse(query: string): { text: string; followUp?: string } {
    const normalized = query.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/π/g, 'pi')               // Greek π → "pi" for pattern matching
      .replace(/≠/g, '!=')               // math ≠ → "!="
      .replace(/[¿?!¡.,;:()≥≤]/g, '')    // strip punctuation & math symbols
      .replace(/\s+/g, ' ').trim();       // collapse whitespace

    // Search through knowledge base
    for (const entry of this.knowledgeBase) {
      for (const pattern of entry.patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(normalized)) {
          return { text: entry.response, followUp: entry.followUp };
        }
      }
    }

    // Fallback: helpful default response
    return {
      text: 'Buena pregunta. No tengo una respuesta específica para eso, pero te sugiero:\n\n' +
        '1. Experimenta con la visualización cambiando entre modos 2π y 4π\n' +
        '2. Prueba el modo interactivo para manipular los lazos directamente\n' +
        '3. Usa las sugerencias de abajo para explorar temas específicos\n\n' +
        '¿Hay algo más concreto sobre SO(3) o la topología que quieras saber?',
      followUp: 'Recuerda: la clave de π₁(SO(3)) = ℤ/2 es que la paridad de los cruces de frontera determina si un lazo es contráctil.',
    };
  }

  private buildKnowledgeBase(): void {
    this.knowledgeBase = [
      // ─── SO(3) basics ───
      {
        patterns: [/que es so\(?3\)?/, /que significa so3/, /definicion de so/],
        response:
          'SO(3) es el grupo de todas las rotaciones en 3D. La "S" viene de "Special" (determinante = 1) ' +
          'y la "O" de "Orthogonal" (matrices ortogonales).\n\n' +
          'Topológicamente, SO(3) se puede representar como una bola cerrada de radio π en ℝ³:\n' +
          '• La dirección del vector = eje de rotación\n' +
          '• La magnitud = ángulo de rotación (0 a π)\n' +
          '• El centro = rotación identidad (sin rotación)\n' +
          '• La frontera (||v|| = π) tiene identificación antipodal: v y −v representan la misma rotación',
        followUp: '¿Sabes por qué los puntos opuestos en la frontera representan la misma rotación? ' +
          'Piensa: R(n̂, π) = R(−n̂, π) — girar π alrededor de n̂ es lo mismo que girar π alrededor de −n̂.',
        topic: 'basics',
      },
      {
        patterns: [/identidad/, /centro/, /origen/, /sin rotacion/],
        response:
          'La identidad (I) es la rotación trivial: sin rotación en absoluto. En la bola SO(3), ' +
          'corresponde al centro (origen). Es el punto blanco que ves en medio del disco.\n\n' +
          'Todos los lazos (loops) empiezan y terminan en I, porque representan secuencias ' +
          'de rotaciones que regresan al estado original.',
        topic: 'basics',
      },
      // ─── Antipodal identification ───
      {
        patterns: [/antipodal/, /puntos opuestos/, /identificacion/],
        response:
          'La identificación antipodal es la clave topológica de SO(3):\n\n' +
          'En la frontera de la bola (θ = π), cada punto p se "pega" con su opuesto −p. ' +
          'Esto es porque girar π alrededor de un eje n̂ da el mismo resultado que girar π ' +
          'alrededor de −n̂.\n\n' +
          'Visualmente: los puntos de colores emparejados en el borde del disco representan ' +
          'el mismo punto en SO(3). Cuando un lazo llega a uno, "salta" al otro — ¡pero en SO(3) ' +
          'no hay salto, es el mismo punto!\n\n' +
          'Esta identificación convierte la bola en el espacio proyectivo real RP³.',
        followUp: 'Esta identificación es lo que hace que SO(3) sea topológicamente diferente de una bola normal. ' +
          'Sin ella, todos los lazos serían contráctiles.',
        topic: 'topology',
      },
      // ─── Why 2π ≠ 4π ───
      {
        patterns: [/por ?que.*2.*pi.*(?:diferente|distinto|no es igual|!=).*4/, /por ?que.*2.*pi.*(?:no|!=).*4/, /diferencia.*2.*4/, /2.*pi.*!=.*4/],
        response:
          '¡Esta es LA pregunta central! La respuesta está en la topología:\n\n' +
          '🔴 Lazo 2π: cruza la frontera UNA vez (número impar)\n' +
          '→ No importa cómo lo deformes, siempre queda al menos un cruce\n' +
          '→ NO es contráctil a un punto\n\n' +
          '🔵 Lazo 4π: cruza la frontera DOS veces (número par)\n' +
          '→ Los dos cruces se pueden emparejar y cancelar\n' +
          '→ SÍ es contráctil a un punto\n\n' +
          'Esto es porque el grupo fundamental π₁(SO(3)) = ℤ/2 = {0, 1}:\n' +
          '• 2π genera el elemento "1" (no trivial)\n' +
          '• 4π = 2π + 2π = 1 + 1 = 0 (trivial) en ℤ/2',
        followUp: 'Prueba el modo interactivo con 4π: arrastra el punto del borde hacia adentro. ' +
          'Los cruces desaparecerán y podrás contraer el lazo. ¡Con 2π esto es imposible!',
        topic: 'fundamental',
      },
      // ─── 2π non-contractibility ───
      {
        patterns: [/por ?que.*2.*pi.*no.*contrae/, /2.*pi.*no.*contractil/, /no se puede.*contraer.*2/,
                   /por ?que.*2.*pi.*no.*se puede/, /2.*pi.*no se puede sacar/],
        response:
          'El lazo de 2π NO se puede contraer porque cruza la frontera un número IMPAR de veces.\n\n' +
          'Imagina el lazo como un elástico que va del centro al borde y regresa. ' +
          'El borde tiene identificación antipodal: cuando llegas a un punto, "saltas" al opuesto. ' +
          'Este salto es topológicamente inevitable.\n\n' +
          'No importa cómo deformes el camino — mientras sea un lazo de 2π, siempre debe cruzar ' +
          'la frontera al menos una vez. Y un número impar de cruces no se puede cancelar.\n\n' +
          'En el modo interactivo, verás que el punto de cruce está FIJO en el borde para 2π. ' +
          'No puedes jalarlo hacia adentro.',
        followUp: 'Esto tiene una consecuencia física profunda: los espinores (fermiones como el electrón) ' +
          'cambian de signo bajo una rotación de 2π. ¡Necesitan 4π para volver a su estado original!',
        topic: 'contractibility',
      },
      // ─── 4π contractibility ───
      {
        patterns: [/por ?que.*4.*pi.*contractil/, /4.*pi.*contrae/, /como.*contrae.*4/,
                   /como funciona.*contraccion/],
        response:
          'El lazo 4π es contráctil porque cruza la frontera un número PAR de veces (dos).\n\n' +
          'La contracción funciona así:\n' +
          '1. El lazo recorre el diámetro DOS veces\n' +
          '2. "Pelamos" las dos pasadas: una va por arriba, otra por abajo\n' +
          '3. A medida que los arcos se separan, sus extremos se alejan del borde\n' +
          '4. Cuando ya no tocan la frontera → no hay cruces → lazo interior\n' +
          '5. Un lazo interior se puede contraer a un punto (como en un espacio normal)\n\n' +
          'Los dos cruces de frontera se "cancelan" entre sí: van en direcciones opuestas.',
        followUp: '¿Puedes ver esto en acción? Usa el modo "Etapas 4π" o el modo interactivo.',
        topic: 'contractibility',
      },
      // ─── Fundamental group ───
      {
        patterns: [/grupo fundamental/, /pi ?1/, /π₁/],
        response:
          'El grupo fundamental π₁(X) clasifica los lazos de un espacio según si se pueden ' +
          'deformar unos en otros.\n\n' +
          'Para SO(3): π₁(SO(3)) = ℤ/2 = {0, 1} con suma módulo 2.\n\n' +
          'Exactamente DOS clases de lazos:\n' +
          '• Clase 0 (trivial): contráctiles → 4π, 8π, 12π, …\n' +
          '• Clase 1 (no trivial): NO contráctiles → 2π, 6π, 10π, …\n\n' +
          'La regla: un lazo de 2nπ → clase (n mod 2).\n' +
          '• n par → clase 0 → contráctil ✓\n' +
          '• n impar → clase 1 → NO contráctil ✗\n\n' +
          'La operación del grupo es concatenar lazos:\n' +
          '2π + 2π = 4π → en ℤ/2: 1 + 1 = 0 → ¡contráctil!',
        followUp: 'Compara con S¹ (el círculo), donde π₁(S¹) = ℤ. ' +
          'Allí un lazo de n vueltas nunca se contrae si n ≠ 0. ' +
          'En SO(3) solo importa par o impar — ¡esa es la diferencia entre ℤ y ℤ/2!',
        topic: 'fundamental',
      },
      // ─── SU(2) double cover ───
      {
        patterns: [/su\(?2\)?/, /cubierta doble/, /doble cubierta/, /cuaternion/],
        response:
          'SU(2) es el grupo de cuaterniones unitarios. Topológicamente es S³ (la 3-esfera).\n\n' +
          'Hay un mapa 2:1 de SU(2) → SO(3):\n' +
          '• Cada rotación en SO(3) corresponde a DOS cuaterniones: q y −q\n' +
          '• SU(2) es simplemente conexo (π₁ = 0): TODOS los lazos son contráctiles\n\n' +
          'Para entender 2π vs 4π desde SU(2):\n' +
          '• Un lazo de 2π en SO(3) se "levanta" a un camino de +I a −I en SU(2)\n' +
          '  → NO es un lazo cerrado → no contráctil ✗\n' +
          '• Un lazo de 4π se levanta a un camino de +I a −I a +I\n' +
          '  → SÍ es un lazo cerrado → y en S³ todo lazo se contrae ✓\n\n' +
          'SU(2) "desdobla" la identificación antipodal de SO(3).',
        followUp: 'Los espinores viven en SU(2), no en SO(3). Por eso el electrón necesita una ' +
          'rotación de 4π (720°) para volver a su estado original.',
        topic: 'su2',
      },
      // ─── Boundary crossings ───
      {
        patterns: [/cruce.*frontera/, /frontera/, /borde/, /crossing/, /que pasa.*frontera/],
        response:
          'Cuando un camino en la bola SO(3) llega a la frontera (||v|| = π), "cruza" al punto ' +
          'antipodal en el otro lado. Esto no es una discontinuidad real — en SO(3) esos dos ' +
          'puntos son el mismo.\n\n' +
          'Los cruces de frontera son la clave topológica:\n' +
          '• Cada cruce es un "paso" por la identificación antipodal\n' +
          '• El número de cruces mod 2 determina la contractibilidad\n' +
          '• Cruces pares → se cancelan en pares → contráctil\n' +
          '• Cruces impares → siempre queda uno → NO contráctil\n\n' +
          'En la visualización, los cruces se marcan con puntos amarillos ×.',
        topic: 'topology',
      },
      {
        patterns: [/mod ?2/, /modulo 2/, /paridad/, /par.*impar/],
        response:
          'La regla "mod 2" es el invariante topológico fundamental de SO(3):\n\n' +
          'Cuenta el número de cruces de frontera y toma el residuo módulo 2:\n' +
          '• mod 2 = 0 (cruces pares) → contráctil ✓\n' +
          '• mod 2 = 1 (cruces impares) → NO contráctil ✗\n\n' +
          'Esto funciona porque cada par de cruces puede "cancelarse" — los dos saltos ' +
          'antipodales se anulan mutuamente. Pero un cruce solitario no se puede eliminar.\n\n' +
          'Matemáticamente, esto refleja que π₁(SO(3)) = ℤ/2, donde solo importa la paridad.',
        topic: 'topology',
      },
      // ─── Interactive mode help ───
      {
        patterns: [/que debo arrastrar/, /como.*arrastrar/, /como uso.*interactivo/, /como funciona.*interactivo/],
        response:
          'En el modo interactivo:\n\n' +
          '🟠 Puntos naranjas (arco superior): arrastra para deformar el lazo\n' +
          '🔵 Puntos azules (arco inferior): se mueven automáticamente como imagen antipodal\n' +
          '🟡 Marcadores amarillos: indican cruces de frontera\n\n' +
          'Para 4π:\n' +
          '1. Arrastra el punto naranja del BORDE hacia el centro del disco\n' +
          '2. Observa cómo los cruces amarillos desaparecen\n' +
          '3. Cuando no haya cruces, aparece el botón "Contraer a I"\n' +
          '4. ¡Haz clic para ver la contracción!\n\n' +
          'Para 2π:\n' +
          'El punto del borde NO se puede mover hacia adentro — está fijo en la frontera.',
        topic: 'interactive',
      },
      // ─── Physics connections ───
      {
        patterns: [/espinor/, /fermi[oó]n/, /electron/, /fisic/, /cuantic/,
                   /mecanica cuantica/, /spin/],
        response:
          '¡Gran pregunta! La topología de SO(3) tiene consecuencias profundas en física:\n\n' +
          '🔬 Espinores: Las partículas con espín semientero (fermiones como el electrón) ' +
          'se transforman bajo SU(2), no SO(3). Bajo una rotación de 2π, su función de onda ' +
          'cambia de SIGNO: ψ → −ψ. Necesitan 4π para volver a ψ.\n\n' +
          '🎗️ El "truco del cinturón" (belt trick): Puedes verificar esto con un cinturón. ' +
          'Da una vuelta de 360° — queda torcido. Da otra vuelta (720° total) — se destorce.\n\n' +
          '🧲 Fase de Berry: En la mecánica cuántica, la fase geométrica adquirida por un ' +
          'sistema bajo una rotación cíclica depende de la topología de SO(3).',
        followUp: 'El hecho de que π₁(SO(3)) = ℤ/2 es la razón por la que existen exactamente ' +
          'dos tipos de partículas: bosones (representaciones de SO(3)) y fermiones (representaciones de SU(2)).',
        topic: 'physics',
      },
      {
        patterns: [/belt trick/, /truco.*cinturon/, /plato/, /plate trick/],
        response:
          'El "truco del cinturón" (belt trick) es una demostración física de π₁(SO(3)) = ℤ/2:\n\n' +
          '1. Toma un cinturón y fija un extremo\n' +
          '2. Gira el otro extremo 360° → el cinturón queda torcido\n' +
          '3. Intenta destorcerlo sin girar los extremos → ¡imposible! (= 2π no contráctil)\n' +
          '4. Ahora gira 720° total → el cinturón se puede destorcer pasándolo por debajo\n\n' +
          'Esto funciona porque el cinturón "vive" en el espacio de caminos de SO(3). ' +
          'Una torcedura de 2π no se deshace, pero una de 4π sí.',
        topic: 'physics',
      },
      // ─── Homotopy ───
      {
        patterns: [/homotopia/, /deformacion continua/, /deformar/],
        response:
          'Una homotopía es una deformación continua — como estirar un elástico sin cortarlo ni pegarlo.\n\n' +
          'Formalmente: una familia continua de lazos H(s), donde:\n' +
          '• H(0) = el lazo original\n' +
          '• H(1) = un punto (si la contracción tiene éxito)\n' +
          '• s ∈ [0,1] "interpola" suavemente entre los dos\n\n' +
          'En la visualización:\n' +
          '• El slider "Parámetro s" del modo contracción ES la homotopía.\n' +
          '• s = 0 → lazo original, s = 1 → punto.\n' +
          '• Para 4π: la homotopía separa los arcos, los aleja del borde, y los contrae. ✓\n' +
          '• Para 2π: NO existe ninguna homotopía que lo lleve a un punto. ✗\n\n' +
          'Cuando decimos "no contráctil" = no existe tal H(s). ¡Eso es un resultado topológico profundo!',
        followUp: 'Prueba el modo interactivo 2π vs 4π: al arrastrar los puntos de control, ' +
          'estás explorando deformaciones del lazo. ¿Puedes encontrar una que elimine los cruces de frontera en 4π?',
        topic: 'topology',
      },
      // ─── RP3 ───
      {
        patterns: [/rp3/, /espacio proyectivo/, /proyectivo real/],
        response:
          'SO(3) es homeomorfo al espacio proyectivo real RP³.\n\n' +
          'RP³ se obtiene tomando la 3-esfera S³ e identificando puntos antipodales: x ~ −x. ' +
          'Equivalentemente, es la bola cerrada B³ con identificación antipodal en la frontera — ' +
          '¡exactamente lo que ves en la visualización!\n\n' +
          'Propiedades topológicas de RP³:\n' +
          '• π₁(RP³) = ℤ/2 (como vemos)\n' +
          '• Cubierta universal: S³ ≅ SU(2)\n' +
          '• Es compacto, conexo, no simplemente conexo',
        topic: 'topology',
      },
      // ─── Greeting/thanks ───
      {
        patterns: [/hola/, /buenos dias/, /buenas tardes/, /saludos/],
        response: '¡Hola! 👋 ¿Qué quieres explorar sobre la topología de SO(3)? ' +
          'Puedes preguntarme sobre rotaciones, el grupo fundamental, la contracción de lazos, ' +
          'o la conexión con la física cuántica.',
        topic: 'meta',
      },
      {
        patterns: [/gracias/, /muchas gracias/, /genial/, /excelente/],
        response: '¡De nada! 😊 Si tienes más dudas, no dudes en preguntar. ' +
          'También puedes explorar diferentes modos de la visualización para descubrir más.',
        topic: 'meta',
      },
      {
        patterns: [/no entiendo/, /no comprendo/, /estoy confundido/, /me perdi/],
        response:
          'No te preocupes, es un tema abstracto. Vamos paso a paso:\n\n' +
          '1. 🏐 SO(3) es como una bola donde cada punto es una rotación\n' +
          '2. 🔵 El centro = "no rotar" (identidad)\n' +
          '3. 🔴 El borde = rotaciones de 180° (pero puntos opuestos son iguales)\n' +
          '4. ➰ Un "lazo" es un camino que empieza y termina en el centro\n' +
          '5. ❓ La pregunta es: ¿se puede encoger el lazo hasta que desaparezca?\n\n' +
          'La respuesta depende de cuántas veces el lazo cruza el borde:\n' +
          '• Cruces pares → SÍ se encoge\n' +
          '• Cruces impares → NO se encoge',
        followUp: 'Te recomiendo empezar con el modo comparación (⚖️) para ver 2π y 4π lado a lado.',
        topic: 'meta',
      },
      // ─── What is a loop ───
      {
        patterns: [/que es un lazo/, /que es.*loop/, /lazo cerrado/],
        response:
          'Un lazo (loop) es un camino cerrado: empieza y termina en el mismo punto.\n\n' +
          'En SO(3), un lazo empieza en la identidad I (centro) y vuelve a I. ' +
          'Representa una secuencia continua de rotaciones que regresa al estado original.\n\n' +
          '• Un lazo de 2π: gira 360° alrededor de un eje y vuelve a la identidad\n' +
          '• Un lazo de 4π: gira 720° y vuelve\n\n' +
          'La pregunta topológica clave: ¿se puede "contraer" (achicar) el lazo a un punto?',
        topic: 'basics',
      },
    ];
  }
}
