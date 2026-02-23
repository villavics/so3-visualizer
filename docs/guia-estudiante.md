# Guia del Estudiante
## SO(3) Topology Visualizer

---

## 1. Bienvenida

Esta herramienta te ayudara a entender uno de los resultados mas sorprendentes de las matematicas y la fisica: **por que una rotacion de 360 grados no es "topologicamente" lo mismo que no rotar, pero una rotacion de 720 grados si lo es**.

Esto no es solo un hecho abstracto: tiene consecuencias reales en la fisica cuantica. Los electrones y otras particulas fundamentales "recuerdan" si fueron rotados 360 grados, y necesitan 720 grados para volver a su estado original.

---

## 2. Que vas a aprender

Al terminar de usar este visualizador, podras:

1. **Identificar** los elementos de SO(3) en su representacion como bola de radio pi
2. **Explicar** por que el grupo fundamental de SO(3) es Z/2
3. **Demostrar** la contractibilidad del lazo 4pi arrastrando puntos interactivamente
4. **Relacionar** esta topologia con la existencia de espinores en mecanica cuantica

---

## 3. Como usar el visualizador

### 3.1 Vista general

La interfaz tiene tres areas principales:

- **Area 3D** (arriba a la izquierda): La bola de radio pi que representa SO(3). Puedes rotarla arrastrando con el mouse.
- **Panel 2D** (abajo a la izquierda): Una seccion transversal que muestra los lazos como curvas en un disco.
- **Sidebar** (derecha): Controles, explicaciones, tutor IA y quiz.

### 3.2 Controles basicos

- **Eje**: Selecciona el eje de rotacion (X, Y, Z o personalizado)
- **Angulo total**: 2pi (360 grados) o 4pi (720 grados)
- **Play/Pausa**: Anima el lazo
- **Velocidad**: Controla la velocidad de animacion
- **Modo**: Lazo, Contraccion o Comparacion

### 3.3 Presets

Usa los botones de presets para configuraciones rapidas:
- "2pi en X": Lazo de 360 grados alrededor del eje X
- "4pi en X": Lazo de 720 grados
- "Contraccion 4pi": Animacion de la contraccion
- "Comparacion": Vista lado a lado de 2pi vs 4pi

---

## 4. Conceptos clave

### 4.1 SO(3) como bola

Imagina todas las rotaciones posibles en 3D. Cada rotacion se describe con:
- Un **eje** (la direccion alrededor de la cual giras)
- Un **angulo** (cuanto giras, de 0 a 180 grados = pi radianes)

Si representas cada rotacion como un punto en el espacio (la direccion es el eje, la distancia al centro es el angulo), obtienes una bola de radio pi:

- **Centro** = sin rotacion (identidad)
- **Borde** = rotaciones de 180 grados (pi radianes)
- **Interior** = rotaciones intermedias

### 4.2 Identificacion antipodal

Aqui esta la parte crucial: en el borde de la bola, los puntos **opuestos** representan la **misma** rotacion. Girar 180 grados alrededor de un eje es lo mismo que girar 180 grados alrededor del eje opuesto.

En el visualizador, veras pares de puntos de colores en el borde que estan conectados — son el mismo punto en SO(3).

### 4.3 Lazos

Un "lazo" es un camino que empieza y termina en el centro (la identidad). Representa una secuencia de rotaciones que regresa al estado original.

### 4.4 Contractibilidad

Un lazo es **contractil** si puedes "encogirlo" continuamente hasta que desaparezca (se reduzca a un punto). Piensa en un elastico: si puedes contraerlo sin cortarlo, es contractil.

---

## 5. Actividades guiadas

### Actividad 1: Explorar la bola SO(3)

1. Abre el visualizador
2. Arrastra la vista 3D para rotar la camara
3. Identifica:
   - El punto blanco en el centro (identidad)
   - Los ejes RGB (X=rojo, Y=verde, Z=azul)
   - Los marcadores antipodales en la frontera
4. Pregunta al tutor: "que es SO(3)?"

### Actividad 2: Observar el lazo 2pi

1. Asegurate de que el angulo es 2pi
2. Presiona "Play"
3. Observa en la vista 3D como el punto viajero:
   - Sale del centro hacia la frontera
   - Llega al borde y "salta" al punto opuesto
   - Regresa al centro
4. Observa en el panel 2D el mismo recorrido
5. Pregunta al tutor: "por que hay un salto?"

### Actividad 3: Comparar 2pi vs 4pi

1. Selecciona el preset "Comparacion"
2. A la izquierda: lazo 2pi (naranja). A la derecha: lazo 4pi (azul)
3. Observa que el 4pi hace dos recorridos completos
4. Pregunta al tutor: "por que 2pi es diferente de 4pi?"

### Actividad 4: Contraer el lazo 4pi (interactivo)

Esta es la actividad mas importante:

1. Selecciona angulo = 4pi
2. Haz clic en el boton "Interactivo" en el panel 2D
3. Veras curvas con puntos naranjas arrastrables
4. **Arrastra el punto naranja del borde hacia el centro del disco**
5. Observa como los marcadores amarillos (cruces de frontera) desaparecen
6. Cuando no haya cruces, aparece el boton "Contraer a I"
7. Haz clic y observa como el lazo se encoge hasta desaparecer

### Actividad 5: Intentar contraer el lazo 2pi (falla)

1. Cambia el angulo a 2pi
2. En modo interactivo, intenta arrastrar los puntos de control
3. Observa que el punto del borde esta **fijo** — no se puede mover hacia adentro
4. Siempre queda al menos un cruce de frontera
5. Conclusion: el lazo 2pi es NO contractil

### Actividad 6: La regla mod 2

1. En modo interactivo con 4pi, experimenta diferentes configuraciones
2. Cuenta los cruces de frontera (marcadores amarillos)
3. La regla: si el numero de cruces es **par** (0, 2, 4...) → contractil
4. Si es **impar** (1, 3, 5...) → NO contractil
5. Pregunta al tutor: "que significa mod 2?"

---

## 6. El tutor IA

En la pestana "Tutor IA" tienes un asistente inteligente que:

- Responde tus preguntas sobre topologia de SO(3)
- Genera preguntas de seguimiento para profundizar
- Se adapta al modo de visualizacion que estas usando
- Ofrece sugerencias de preguntas relevantes

### Sugerencias de preguntas para empezar:
- "que es SO(3)?"
- "por que 2pi no se contrae?"
- "que es la identificacion antipodal?"
- "que es SU(2)?"
- "que son los espinores?"
- "como funciona el modo interactivo?"

---

## 7. Quiz

En la pestana "Quiz" encontraras 10 preguntas que evaluan tu comprension en 4 niveles:

- **Recordar**: Datos basicos sobre SO(3)
- **Comprender**: Explicacion de conceptos como grupo fundamental
- **Aplicar**: Uso del modo interactivo y calculo mod 2
- **Analizar**: Conexiones con SU(2) y fisica cuantica

### Consejos para el quiz:
- Usa el boton de pista (bombilla) si no estas seguro
- Lee la explicacion despues de verificar tu respuesta
- Puedes navegar entre preguntas (Anterior/Siguiente)
- Al final veras tu porcentaje y desglose por nivel
- Necesitas >= 70% para aprobar
- Puedes reintentar las veces que quieras

---

## 8. Glosario

| Termino | Definicion |
|---------|-----------|
| **SO(3)** | Grupo de rotaciones en 3D. "S" = special (det=1), "O" = orthogonal |
| **Lazo (loop)** | Camino cerrado que empieza y termina en la identidad |
| **Contractil** | Un lazo que se puede encoger hasta desaparecer |
| **Identificacion antipodal** | Dos puntos opuestos en la frontera representan la misma rotacion |
| **Grupo fundamental (pi_1)** | Clasificacion de lazos segun si se pueden deformar unos en otros |
| **Z/2** | Grupo con dos elementos {0, 1} donde 1+1=0. El grupo fundamental de SO(3) |
| **SU(2)** | Grupo de cuaterniones unitarios. Topologicamente es S^3 (3-esfera). Es la cubierta doble de SO(3) |
| **Espinor** | Objeto matematico que cambia de signo bajo rotaciones de 2pi. Los fermiones son espinores |
| **Homotopia** | Deformacion continua de un camino a otro |
| **RP^3** | Espacio proyectivo real de dimension 3. SO(3) es homeomorfo a RP^3 |
| **Belt trick** | Demostracion fisica de pi_1(SO(3)) = Z/2 usando un cinturon |

---

## 9. Para profundizar

Si quieres aprender mas sobre estos temas:

1. **Sobre SO(3) y topologia**: Lancaster & Blundell, "Quantum Field Theory for the Gifted Amateur", Capitulo 15
2. **Sobre cuaterniones**: Visualizaciones de 3Blue1Brown en YouTube
3. **Sobre espinores**: Penrose, "The Road to Reality", Capitulos 11-12
4. **Sobre el belt trick**: Busca "Dirac belt trick" en YouTube para videos demostrativos

---

## 10. Resolucion de problemas

**La visualizacion 3D no aparece**: Asegurate de usar Google Chrome. Otros navegadores pueden tener problemas con WebGL.

**No puedo arrastrar los puntos en modo interactivo**: Asegurate de hacer clic directamente sobre los puntos naranjas y arrastrar.

**El tutor no entiende mi pregunta**: Intenta reformular la pregunta de forma mas corta y directa. Usa las sugerencias predefinidas.

**Quiero reiniciar el quiz**: Al final de los resultados hay un boton "Reintentar" que reinicia todas las preguntas.
