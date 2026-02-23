# Guia del Docente
## SO(3) Topology Visualizer

---

## 1. Introduccion

Esta guia esta dirigida al docente que utiliza el SO(3) Topology Visualizer como herramienta pedagogica en cursos de Fisica Matematica, Mecanica Cuantica, Topologia o Algebra Moderna.

El visualizador permite demostrar interactivamente por que el grupo de rotaciones SO(3) tiene grupo fundamental Z/2, y como esto se relaciona con la existencia de espinores en fisica cuantica.

---

## 2. Requisitos previos

### Del docente
- Familiaridad con la parametrizacion axis-angle de rotaciones
- Conocimiento basico de topologia: lazos, contractibilidad, grupo fundamental
- Recomendado: lectura de Lancaster & Blundell, "Quantum Field Theory for the Gifted Amateur", Cap. 15

### Del estudiante
- Algebra lineal: matrices de rotacion, valores propios
- Calculo en varias variables (deseable)
- No se requiere experiencia previa en topologia

### Tecnicos
- Google Chrome actualizado (version 99 o superior)
- La extension se carga como "extension descomprimida" desde la carpeta `dist/`

---

## 3. Instalacion

```
1. Descargue o clone el repositorio
2. Ejecute: npm install && npm run build
3. Abra Chrome -> chrome://extensions/
4. Active "Modo de desarrollador"
5. Haga clic en "Cargar descomprimida"
6. Seleccione la carpeta dist/
7. Haga clic en el icono de la extension
```

Para desarrollo rapido: `npm run dev` y abra `http://localhost:5173`

---

## 4. Navegacion de la interfaz

### 4.1 Area principal (izquierda)

- **Vista 3D superior**: Bola translucida de radio pi con ejes RGB (X=rojo, Y=verde, Z=azul). Arrastre para rotar la camara con OrbitControls.
- **Panel 2D inferior**: Seccion transversal estilo Fig. 15.6. Muestra el disco como seccion de la bola.
  - Boton **Interactivo**: Activa el modo de manipulacion directa con curvas Bezier
  - Boton **Etapas 4pi**: Muestra snapshots de la contraccion

### 4.2 Sidebar (derecha)

- **Panel de Controles** (superior): Eje de rotacion, angulo total, velocidad, modo, presets
- **Pestanas inferiores** (3 tabs):
  - **Explicacion**: Textos pedagogicos contextuales que cambian segun el modo
  - **Tutor IA**: Chat interactivo con sistema experto pedagogico
  - **Quiz**: Evaluacion formativa de 10 preguntas

---

## 5. Modos de visualizacion

### 5.1 Modo Lazo (Loop)

**Uso pedagogico**: Demostrar como se ve un lazo de 2pi o 4pi en la bola SO(3).

**Procedimiento**:
1. Seleccione el eje (X, Y, Z o personalizado)
2. Seleccione el angulo total: 2pi o 4pi
3. Presione "Play" para animar

**Puntos a destacar**:
- En 2pi: el punto viajero va del centro a la frontera, "salta" al punto antipodal, y regresa
- En 4pi: el recorrido es doble — dos travesias del diametro
- Los marcadores antipodales muestran que los puntos opuestos son el mismo

### 5.2 Modo Contraccion

**Uso pedagogico**: Mostrar como el lazo 4pi se puede deformar continuamente hasta desaparecer.

**Procedimiento**:
1. Seleccione modo "Contraccion"
2. Presione "Play" o use el slider de contraccion
3. El parametro s controla la homotopia: s=0 es el lazo original, s=1 es el punto

**Puntos a destacar**:
- La contraccion se realiza via SU(2): se levanta el lazo, se contrae en S^3, se proyecta de vuelta
- Los arcos se separan gradualmente y dejan de tocar la frontera

### 5.3 Modo Comparacion

**Uso pedagogico**: Vision lado a lado de 2pi (no contractil) vs 4pi (contractil).

**Procedimiento**:
1. Seleccione modo "Comparacion" o use el preset correspondiente
2. Las animaciones estan sincronizadas

**Puntos a destacar**:
- Ideal para la primera exposicion: el estudiante ve la diferencia sin necesidad de cambiar parametros

### 5.4 Modo Interactivo

**Uso pedagogico**: El estudiante experimenta directamente la (no-)contractibilidad.

**Procedimiento para 4pi**:
1. Asegurese de que el angulo es 4pi
2. Active el modo "Interactivo"
3. Pida al estudiante que arrastre el punto naranja del borde hacia el centro
4. Observen como los cruces amarillos desaparecen
5. Cuando no haya cruces, aparece "Contraer a I"
6. Haga clic para ver la contraccion

**Procedimiento para 2pi**:
1. Cambie a 2pi
2. Observe que el punto del borde NO se puede mover hacia adentro
3. Siempre hay al menos un cruce — el lazo es no contractil

**Puntos clave**:
- El invariante es el numero de cruces mod 2
- Par (0, 2, 4...) → contractil
- Impar (1, 3, 5...) → NO contractil

### 5.5 Etapas 4pi

**Uso pedagogico**: Vista estatica de 4 etapas de la contraccion exitosa, comparada con el fallo para 2pi.

---

## 6. Uso del Tutor IA

### 6.1 Descripcion

El tutor es un sistema experto con base de conocimiento sobre topologia de SO(3). Responde preguntas en lenguaje natural (espanol) y genera preguntas socraticas de seguimiento.

### 6.2 Sugerencias de uso en clase

- **Antes de la explicacion formal**: Pida a los estudiantes que hagan preguntas al tutor y discutan las respuestas en grupo.
- **Durante la exploracion**: El tutor genera mensajes automaticos cuando el estudiante cambia de modo — uselos como puntos de discusion.
- **Despues de la actividad interactiva**: "Preguntale al tutor: por que 2pi no se contrae?"

### 6.3 Temas cubiertos
- SO(3) como bola de radio pi
- Identificacion antipodal
- Lazos 2pi y 4pi
- Grupo fundamental Z/2
- Cruces de frontera y mod 2
- Doble cubierta SU(2) -> SO(3)
- Homotopia y contraccion
- Espinores y belt trick
- RP^3 (espacio proyectivo)

### 6.4 Limitaciones
- El tutor usa reconocimiento de patrones, no un modelo de lenguaje grande
- Preguntas muy fuera del dominio recibiran una respuesta generica
- Los estudiantes deben formular preguntas en espanol de forma razonablemente clara

---

## 7. Evaluacion formativa (Quiz)

### 7.1 Estructura

10 preguntas de opcion multiple distribuidas en 4 niveles de Bloom:
- Recordar (2 preguntas): identidad, identificacion antipodal
- Comprender (3 preguntas): grupo fundamental, cruces 2pi, contractibilidad 4pi
- Aplicar (2 preguntas): uso del modo interactivo, calculo mod 2
- Analizar (3 preguntas): SU(2) lifting, espinores, importancia antipodal

### 7.2 Uso recomendado

1. Asigne el quiz al final de la Sesion 3 (despues de cubrir todos los conceptos)
2. Los estudiantes disponen de pistas para cada pregunta
3. La verificacion es inmediata con explicaciones detalladas
4. Los resultados incluyen desglose por nivel de Bloom

### 7.3 Interpretacion de resultados

| Rango | Accion recomendada |
|-------|--------------------|
| >= 90% | El estudiante domina los conceptos; puede profundizar en temas avanzados |
| 70-89% | Comprension adecuada; reforzar los niveles donde fallo |
| 50-69% | Revisar conceptos con tutor IA; repetir actividades interactivas |
| < 50% | Sesion de refuerzo individual; comenzar desde fundamentos |

### 7.4 Registro de evidencias

Los resultados del quiz permanecen en la pantalla para que el docente pueda:
- Tomar capturas de pantalla como evidencia
- Discutir las preguntas erradas con el grupo
- Identificar patrones de comprension (que niveles de Bloom son mas debiles)

---

## 8. Secuencia didactica sugerida

### Sesion 1: Fundamentos (50 min)

**Objetivo**: El estudiante identifica los elementos de SO(3) como bola.

| Tiempo | Actividad |
|--------|-----------|
| 0-5 | Pregunta generadora: "si giras un plato 360 grados, vuelve al mismo estado?" |
| 5-20 | Demostracion: explorar la bola 3D, identificar centro, ejes, frontera |
| 20-35 | Animacion del lazo 2pi: observar el "salto" antipodal |
| 35-45 | Tutor IA: los estudiantes preguntan sobre identidad y frontera |
| 45-50 | Cierre: reflexion grupal |

### Sesion 2: Contractibilidad (50 min)

**Objetivo**: El estudiante demuestra la diferencia entre lazos 2pi y 4pi.

| Tiempo | Actividad |
|--------|-----------|
| 0-5 | Recapitulacion con tutor IA |
| 5-15 | Modo comparacion: 2pi vs 4pi |
| 15-30 | Modo interactivo: arrastrar puntos, observar cruces, contraer 4pi |
| 30-40 | Intento de contraccion de 2pi (falla): discusion |
| 40-45 | Etapas 4pi: vista estatica de la contraccion |
| 45-50 | Cierre: "por que la paridad de cruces lo determina todo?" |

### Sesion 3: SU(2) y evaluacion (50 min)

**Objetivo**: El estudiante analiza la relacion SU(2)-SO(3) y resuelve el quiz.

| Tiempo | Actividad |
|--------|-----------|
| 0-5 | Pregunta: "que necesita un electron para volver a su estado original?" |
| 5-20 | Discusion: SU(2) como doble cubierta, cuaterniones, espinores |
| 20-25 | Demostracion fisica: belt trick con un cinturon |
| 25-40 | Quiz formativo (15 min) |
| 40-50 | Revision de resultados y retroalimentacion |

---

## 9. Preguntas frecuentes

**P: El visualizador no carga o muestra pantalla negra.**
R: Verifique que esta usando Google Chrome y que WebGL esta habilitado (chrome://gpu).

**P: El tutor no entiende las preguntas de mis estudiantes.**
R: El tutor funciona mejor con preguntas cortas y directas en espanol. Use las sugerencias predefinidas como punto de partida.

**P: Puedo usar esto en otros cursos ademas de fisica?**
R: Si. Es aplicable en: Topologia (matematicas), Algebra Moderna (grupos), Robotica (representacion de rotaciones), Computacion Grafica (cuaterniones).

**P: Como puedo obtener evidencia de uso para CIAD?**
R: Tome capturas de pantalla de: (1) el tutor IA en accion, (2) resultados del quiz por estudiante, (3) la interaccion con el modo interactivo.
