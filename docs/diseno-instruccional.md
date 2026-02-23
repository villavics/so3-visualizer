# Ficha de Diseno Instruccional
## SO(3) Topology Visualizer

---

## 1. Datos generales

| Campo | Detalle |
|-------|---------|
| **Nombre del recurso** | SO(3) Topology Visualizer |
| **Tipo** | Extension de Chrome (Manifest V3) con visualizacion 3D interactiva |
| **Area de conocimiento** | Matematicas / Fisica / Topologia |
| **Nivel educativo** | Licenciatura y posgrado (Fisica, Matematicas, Ingenieria) |
| **Tecnologia emergente** | Inteligencia Artificial (tutor pedagogico basado en sistema experto con base de conocimiento y motor de inferencia) |
| **Duracion estimada** | 3 sesiones de 50 minutos |
| **Autor** | Jorge [Apellido] |
| **Institucion** | Universidad Autonoma de Baja California (UABC) |
| **Fecha** | Febrero 2026 |

---

## 2. Justificacion tecnologica

### 2.1 Problema educativo

La topologia del grupo de rotaciones SO(3) es un concepto abstracto que presenta dificultades significativas de comprension para estudiantes de fisica y matematicas. Los conceptos clave — grupo fundamental, contractibilidad de lazos, identificacion antipodal, doble cubierta SU(2) — carecen de representaciones visuales intuitivas en los libros de texto tradicionales.

Los estudiantes frecuentemente memorizan que pi_1(SO(3)) = Z/2 sin desarrollar una comprension geometrica profunda de por que una rotacion de 360 grados (2pi) no es topologicamente trivial, pero una de 720 grados (4pi) si lo es.

### 2.2 Solucion propuesta

SO(3) Topology Visualizer aborda este problema mediante:

1. **Visualizacion 3D interactiva** (Three.js/WebGL): Representacion de SO(3) como bola de radio pi con identificacion antipodal visible.

2. **Inteligencia Artificial pedagogica**: Sistema experto con base de conocimiento de 20+ entradas que responde preguntas del estudiante, genera preguntas socraticas de seguimiento, y adapta sus respuestas al contexto de visualizacion actual.

3. **Manipulacion directa**: Modo interactivo con curvas Bezier arrastrables que permite al estudiante experimentar la (no-)contractibilidad de lazos.

4. **Evaluacion formativa integrada**: Quiz de 10 preguntas alineadas con taxonomia de Bloom (recordar, comprender, aplicar, analizar).

### 2.3 Componente de IA

El Tutor Inteligente implementa un sistema experto basado en conocimiento:

- **Base de conocimiento**: 20+ entradas con patrones de lenguaje natural (expresiones regulares) y respuestas pedagogicas estructuradas.
- **Motor de inferencia**: Busqueda por patron con normalizacion de texto (remocion de acentos, puntuacion), seleccion de respuesta mas relevante.
- **Contexto adaptativo**: El tutor detecta cambios en el modo de visualizacion (lazo, contraccion, interactivo, comparacion) y genera mensajes contextuales automaticamente.
- **Scaffolding pedagogico**: Preguntas socraticas de seguimiento (followUp) que guian al estudiante hacia la comprension profunda.
- **Sugerencias dinamicas**: Se actualizan segun el estado actual de la visualizacion.

---

## 3. Objetivos de aprendizaje

### 3.1 Objetivo general

El estudiante comprendera la topologia del grupo de rotaciones SO(3), demostrando la diferencia entre lazos contractiles y no contractiles mediante la manipulacion interactiva de trayectorias en la representacion como bola de radio pi.

### 3.2 Objetivos especificos (Taxonomia de Bloom)

| Nivel | Objetivo | Evidencia |
|-------|----------|-----------|
| **Recordar** | Identificar la identidad, la frontera y la identificacion antipodal en la bola SO(3) | Preguntas 1-2 del quiz |
| **Comprender** | Explicar por que pi_1(SO(3)) = Z/2 y la diferencia entre lazos 2pi y 4pi | Preguntas 3-5 del quiz; interaccion con tutor |
| **Aplicar** | Manipular lazos en el modo interactivo para demostrar contractibilidad del lazo 4pi | Pregunta 6-7 del quiz; actividad practica |
| **Analizar** | Relacionar la doble cubierta SU(2) -> SO(3) con la existencia de espinores en fisica cuantica | Preguntas 8-10 del quiz; discusion guiada |

---

## 4. Secuencia didactica

### Sesion 1: Fundamentos de SO(3) (50 min)

| Fase | Duracion | Actividad | Recurso |
|------|----------|-----------|---------|
| Apertura | 5 min | Pregunta generadora: "Si giras un objeto 360 grados, vuelve al mismo estado?" | Discusion grupal |
| Desarrollo 1 | 15 min | Exploracion de la bola SO(3): centro, ejes, frontera | Visualizador 3D + panel Explicacion |
| Desarrollo 2 | 15 min | Animacion del lazo 2pi: observar trayectoria y salto antipodal | Preset "2pi alrededor de X" |
| Desarrollo 3 | 10 min | Interaccion con tutor IA: preguntas sobre identidad, frontera, antipodal | Tab "Tutor IA" |
| Cierre | 5 min | Reflexion: "que significa que dos puntos opuestos sean el mismo?" | Tutor IA + discusion |

### Sesion 2: 2pi vs 4pi y contractibilidad (50 min)

| Fase | Duracion | Actividad | Recurso |
|------|----------|-----------|---------|
| Apertura | 5 min | Recapitulacion con tutor IA | Tab "Tutor IA" |
| Desarrollo 1 | 10 min | Comparacion 2pi vs 4pi lado a lado | Modo Comparacion |
| Desarrollo 2 | 15 min | Modo interactivo: arrastrar puntos de control, observar cruces de frontera | Boton "Interactivo" |
| Desarrollo 3 | 10 min | Contraccion del lazo 4pi: boton "Contraer a I" | Modo interactivo con 4pi |
| Desarrollo 4 | 5 min | Etapas de contraccion y fallo del 2pi | Boton "Etapas 4pi" |
| Cierre | 5 min | Preguntas al tutor: "por que 2pi no se contrae?" | Tab "Tutor IA" |

### Sesion 3: SU(2), espinores y evaluacion (50 min)

| Fase | Duracion | Actividad | Recurso |
|------|----------|-----------|---------|
| Apertura | 5 min | Pregunta: "que es un espinor y por que necesita 720 grados?" | Tutor IA |
| Desarrollo 1 | 15 min | Discusion sobre SU(2), doble cubierta, cuaterniones | Tutor IA + panel Explicacion |
| Desarrollo 2 | 10 min | Truco del cinturon (belt trick) como demostracion fisica | Actividad practica |
| Evaluacion | 15 min | Quiz formativo de 10 preguntas | Tab "Quiz" |
| Cierre | 5 min | Revision de resultados y retroalimentacion | Resultados del quiz |

---

## 5. Estrategias didacticas

### 5.1 Aprendizaje activo
- El estudiante manipula directamente los lazos en el modo interactivo
- Descubrimiento guiado: el estudiante observa los efectos de arrastrar puntos de control antes de recibir la explicacion formal

### 5.2 Scaffolding con IA
- El tutor genera preguntas socraticas en lugar de dar respuestas directas
- Las sugerencias se adaptan al contexto actual de la visualizacion
- Mensajes automaticos cuando el estudiante cambia de modo

### 5.3 Visualizacion multiple
- Vista 3D (bola SO(3) con trayectorias)
- Vista 2D (seccion transversal estilo Fig. 15.6 de Lancaster & Blundell)
- Modo comparacion (2pi vs 4pi lado a lado)
- Modo interactivo (Bezier arrastrable)
- Etapas de contraccion (multiples snapshots)

### 5.4 Evaluacion formativa
- Quiz integrado con retroalimentacion inmediata
- Pistas disponibles antes de responder
- Explicaciones detalladas despues de verificar
- Desglose por nivel de Bloom en resultados

---

## 6. Evaluacion del aprendizaje

### 6.1 Evaluacion formativa (integrada)

| Instrumento | Descripcion | Criterio de exito |
|-------------|-------------|-------------------|
| Quiz de 10 preguntas | Preguntas de opcion multiple alineadas con Bloom | >= 70% para aprobacion |
| Interaccion con tutor | Analisis de preguntas formuladas por el estudiante | Participacion activa |
| Actividad interactiva | Contraer exitosamente el lazo 4pi en modo interactivo | Completar contraccion |

### 6.2 Distribucion por nivel de Bloom

| Nivel | Preguntas | Porcentaje |
|-------|-----------|------------|
| Recordar | 2 | 20% |
| Comprender | 3 | 30% |
| Aplicar | 2 | 20% |
| Analizar | 3 | 30% |

### 6.3 Rubrica del quiz

| Rango | Clasificacion | Accion |
|-------|---------------|--------|
| 90-100% | Sobresaliente | El estudiante domina los conceptos |
| 70-89% | Aprobado | Comprension adecuada, reforzar analisis |
| 50-69% | En desarrollo | Revisar conceptos con tutor IA |
| < 50% | Insuficiente | Repetir sesiones 1-2 con acompanamiento |

---

## 7. Recursos tecnicos

### 7.1 Requisitos del sistema
- Google Chrome (version 99+)
- Conexion a internet (solo para instalacion inicial)
- Resolucion minima: 1024x768

### 7.2 Stack tecnologico
- TypeScript (tipado estatico)
- Three.js (visualizacion 3D WebGL)
- Vite (bundling y desarrollo)
- Vitest (pruebas unitarias, 69 tests)
- Chrome Extension Manifest V3

### 7.3 Accesibilidad
- Skip link para navegacion por teclado
- Roles ARIA en componentes interactivos
- Contraste WCAG AA en texto sobre fondo oscuro
- Focus visible en todos los controles interactivos
- Navegacion por teclado en tabs del sidebar

---

## 8. Impacto esperado

### 8.1 En el aprendizaje
- Reduccion del tiempo de comprension de la topologia SO(3) de ~3 semanas a ~3 sesiones
- Aumento en la retencion conceptual al pasar de representaciones abstractas a manipulacion directa
- Mejora en la conexion entre matematicas puras (topologia) y fisica (espinores, mecanica cuantica)

### 8.2 En la practica docente
- Herramienta de demostracion en clase con interaccion en vivo
- Evaluacion formativa integrada sin necesidad de plataformas externas
- Adaptabilidad: el docente puede usar presets para guiar la exploracion

### 8.3 Indicadores de exito
- >= 80% de estudiantes aprueban el quiz formativo (>= 70%)
- >= 90% de estudiantes interactuan con el tutor IA al menos 3 veces
- >= 70% de estudiantes completan exitosamente la contraccion interactiva del lazo 4pi
