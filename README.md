# SO(3) Topology Visualizer

Extension de Chrome (Manifest V3) para la visualizacion pedagogica e interactiva de rotaciones en SO(3), con enfasis en la topologia del grupo de rotaciones y la diferencia entre lazos de 2pi y 4pi.

**Nombre sugerido del repositorio:** `so3-topology-visualizer`

## Contexto matematico

### SO(3) como bola de radio pi

El grupo SO(3) de rotaciones en 3D puede representarse como una bola cerrada de radio pi en R^3, donde:

- **Direccion** del vector desde el centro = eje de rotacion (unitario).
- **Magnitud** del vector = angulo de rotacion theta, con 0 <= theta <= pi.
- **Centro** (origen) = rotacion identidad.
- **Frontera** (||v|| = pi) tiene **identificacion antipodal**: los puntos v y -v en la frontera representan la misma rotacion, porque R(n, pi) = R(-n, pi).

Topologicamente, SO(3) es homeomorfo al espacio proyectivo real RP^3.

### Grupo fundamental y lazos

El grupo fundamental pi_1(SO(3)) = Z/2. Esto significa:

- **Lazo de 2pi** (rotacion de 360 grados): traza un diametro de la bola (centro -> frontera -> salto antipodal -> centro). Este lazo es el **generador** del grupo fundamental y es **no contractil**. No puede deformarse continuamente a un punto.

- **Lazo de 4pi** (rotacion de 720 grados): traza el diametro **dos veces**. Dado que 2 = 0 en Z/2, este lazo **si es contractil**. Los dos cruces de la frontera pueden emparejarse y cancelarse.

### Doble cubierta SU(2) -> SO(3)

SU(2) (el grupo de cuaterniones unitarios) es topologicamente S^3 (la 3-esfera). El mapa SU(2) -> SO(3) envia q a la rotacion correspondiente, con nucleo {+I, -I}.

- Un lazo de 2pi en SO(3) se levanta a un **camino abierto** en SU(2): va de +I a -I. No es un lazo cerrado, por lo tanto no es contractil.
- Un lazo de 4pi en SO(3) se levanta a un **lazo cerrado** en SU(2) = S^3. Como S^3 es simplemente conexo, es contractil.

### Precision matematica

- Los cuaterniones se usan internamente para composicion e interpolacion de rotaciones.
- La conversion axis-angle <-> cuaternion se implementa correctamente, incluyendo el caso theta = pi y la identificacion antipodal.
- La contraccion del lazo 4pi se realiza mediante homotopia en SU(2), proyectada de vuelta a SO(3).

## Tecnologia

- **TypeScript** con modulos ES
- **Three.js** para la visualizacion 3D (WebGL)
- **Vite** para bundling y desarrollo
- **Vitest** para pruebas unitarias
- **Chrome Extension Manifest V3**

## Estructura del proyecto

```
so3-visualizer/
  src/
    math/           # Capa matematica pura (sin DOM)
      vec3.ts       # Tipo Vec3 y operaciones
      quaternion.ts # Clase Quaternion completa
      so3.ts        # Parametrizacion SO(3) como bola
      loops.ts      # Generacion de lazos 2pi/4pi y homotopia
      su2.ts        # Doble cubierta SU(2), proyeccion estereografica
    scene/          # Renderizado Three.js
      SceneManager.ts
      SO3Ball.ts          # Esfera translucida de radio pi
      TrajectoryRenderer.ts # Trayectorias animadas
      AntipodalMarkers.ts   # Marcadores de identificacion antipodal
    animation/      # Control de animacion
      AnimationController.ts
      LoopAnimator.ts
      ContractionAnimator.ts
    ui/             # Interfaz de usuario DOM
      ControlPanel.ts
      ExplanationPanel.ts
      ComparisonMode.ts
      PresetManager.ts
    styles/
      main.css
    main.ts         # Punto de entrada
  tests/
    quaternion.test.ts
    so3.test.ts
    loops.test.ts
    su2.test.ts
  public/
    manifest.json   # Chrome MV3
    background.js   # Service worker
    icons/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
```

## Instalacion y uso

### Requisitos previos

- Node.js >= 18
- npm >= 9
- Google Chrome

### Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (abre en navegador)
npm run dev

# Ejecutar pruebas unitarias
npm run test

# Verificacion de tipos
npm run lint
```

### Build para Chrome

```bash
# Compilar TypeScript y empaquetar con Vite
npm run build

# La carpeta dist/ contiene la extension lista
```

### Cargar en Chrome

1. Abre Chrome y navega a `chrome://extensions/`
2. Activa el **Modo de desarrollador** (esquina superior derecha)
3. Haz clic en **Cargar descomprimida** ("Load unpacked")
4. Selecciona la carpeta `dist/` del proyecto
5. Haz clic en el icono de la extension para abrir el visualizador

### Modo desarrollo rapido

En modo desarrollo (`npm run dev`), puedes abrir directamente `http://localhost:5173` en el navegador sin necesidad de cargar la extension.

## Funcionalidades

1. **Bola translucida de radio pi** con ejes RGB y capas de angulo constante
2. **Trayectorias animadas** para lazos de 2pi y 4pi
3. **Identificacion antipodal** visual con marcadores emparejados
4. **Controles**: eje (arbitrario), angulo total (2pi/4pi), velocidad, play/pausa
5. **Presets pedagogicos**: lazos 2pi, 4pi, contraccion, comparacion
6. **Modo contraccion**: visualizacion de la homotopia del lazo 4pi
7. **Modo comparacion**: vista lado a lado de 2pi vs 4pi
8. **Panel de explicacion** contextual con textos pedagogicos

## Respaldo en GitHub

### Crear repositorio local

```bash
cd so3-visualizer
git init
git add .
git commit -m "feat: initial SO(3) topology visualizer with 2pi/4pi loop visualization"
```

### Conectar con GitHub

```bash
# Crear el repositorio en GitHub (via web o gh CLI):
gh repo create so3-topology-visualizer --public --source=. --remote=origin

# O manualmente:
git remote add origin https://github.com/TU_USUARIO/so3-topology-visualizer.git
git branch -M main
git push -u origin main
```

### Estrategia de ramas

- `main`: rama principal, siempre estable
- `feature/nombre`: ramas de desarrollo para nuevas funcionalidades
- Ejemplo: `feature/su2-overlay`, `feature/belt-trick-animation`

```bash
# Crear rama de feature
git checkout -b feature/nueva-funcionalidad

# Desarrollar...
git add .
git commit -m "feat: descripcion de la funcionalidad"

# Merge a main
git checkout main
git merge feature/nueva-funcionalidad
git push origin main
```

## Pruebas

Las pruebas cubren la capa matematica critica:

- **quaternion.test.ts**: identidad, fromAxisAngle, multiplicacion, slerp, exp/log, doble cubierta
- **so3.test.ts**: parametrizacion axis-angle <-> punto, frontera, antipodales, composicion
- **loops.test.ts**: generacion de lazos 2pi/4pi, saltos antipodales, contraccion
- **su2.test.ts**: doble cubierta, proyeccion estereografica, levantamiento de caminos

```bash
npm run test
```

## TODOs (priorizados)

1. **[Alta]** Vista auxiliar SU(2)/S^3 — inset con proyeccion estereografica de la cubierta doble
2. **[Alta]** Visualizacion de la FALLA de contraccion del lazo 2pi
3. **[Media]** Animacion del "truco del plato" (plate trick) como conexion pedagogica
4. **[Media]** Responsive layout para pantallas pequenas
5. **[Baja]** Exportar capturas/GIFs de las animaciones
6. **[Baja]** Internacionalizacion (ES/EN toggle)

## Licencia

MIT
