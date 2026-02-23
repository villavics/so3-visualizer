import { SceneManager } from './scene/SceneManager';
import { SO3Ball } from './scene/SO3Ball';
import { TrajectoryRenderer } from './scene/TrajectoryRenderer';
import { AntipodalMarkers } from './scene/AntipodalMarkers';
import { AnimationController } from './animation/AnimationController';
import { LoopAnimator } from './animation/LoopAnimator';
import { ContractionAnimator } from './animation/ContractionAnimator';
import { ControlPanel, ControlState } from './ui/ControlPanel';
import { ExplanationPanel } from './ui/ExplanationPanel';
import { ComparisonMode } from './ui/ComparisonMode';
import { CrossSectionView } from './ui/CrossSectionView';
import { AITutor } from './ui/AITutor';
import { QuizModule } from './ui/QuizModule';
import { ObjetivosModule } from './ui/ObjetivosModule';
import { EvidenciasModule, SessionData } from './ui/EvidenciasModule';
import { Preset } from './ui/PresetManager';
import { vec3Normalize, PI } from './math/vec3';
import './styles/main.css';

function init() {
  const mainViewport = document.getElementById('main-viewport')!;
  const controlContainer = document.getElementById('control-panel')!;
  const explanationContainer = document.getElementById('explanation-panel')!;
  const comparisonSection = document.getElementById('comparison-section')!;
  const compLeftContainer = document.getElementById('comparison-left')!;
  const compRightContainer = document.getElementById('comparison-right')!;
  const mainSection = document.getElementById('viewport-section')!;
  const crossSectionCanvas = document.getElementById('cross-section-canvas')!;
  const showStagesBtn = document.getElementById('show-stages-btn')!;
  const crossSectionPanel = document.getElementById('cross-section-panel')!;
  const tutorContainer = document.getElementById('tutor-panel')!;
  const quizContainer = document.getElementById('quiz-panel')!;
  const objetivosContainer = document.getElementById('objetivos-panel')!;
  const evidenciasContainer = document.getElementById('evidencias-panel')!;
  const showInteractiveCompBtn = document.getElementById('show-interactive-comparison-btn')!;

  // Core 3D scene
  const sceneManager = new SceneManager(mainViewport);
  const ball = new SO3Ball();
  sceneManager.scene.add(ball.group);

  const trajectoryRenderer = new TrajectoryRenderer();
  sceneManager.scene.add(trajectoryRenderer.group);

  const antipodalMarkers = new AntipodalMarkers();
  antipodalMarkers.showIdentificationGrid();
  sceneManager.scene.add(antipodalMarkers.group);

  // 2D Cross-section view
  const crossSection = new CrossSectionView(crossSectionCanvas);

  // Animation
  const animController = new AnimationController();
  const loopAnimator = new LoopAnimator(trajectoryRenderer, antipodalMarkers);
  const contractionAnimator = new ContractionAnimator(trajectoryRenderer);

  // UI
  const controls = new ControlPanel(controlContainer);
  const explanation = new ExplanationPanel(explanationContainer);
  const comparison = new ComparisonMode(compLeftContainer, compRightContainer);

  // AI Tutor & Quiz & Modules
  const aiTutor = new AITutor(tutorContainer);
  const quizModule = new QuizModule(quizContainer);
  new ObjetivosModule(objetivosContainer);

  // ─── Session tracking ───
  const session: SessionData = {
    startTime: Date.now(),
    presetsUsed: [],
    modesVisited: [],
    contractionCompleted: false,
    quizResult: null,
  };

  const evidencias = new EvidenciasModule(evidenciasContainer, session, quizModule);

  quizModule.setOnComplete((score, total) => {
    const breakdown = quizModule.getResults();
    session.quizResult = {
      score,
      total,
      percentage: Math.round((score / total) * 100),
      date: new Date().toLocaleString('es-MX'),
      breakdown: breakdown ? breakdown.breakdown : [],
    };
    aiTutor.setContext({});
  });

  // ─── Sidebar Tab Navigation ───
  const sidebarTabs = document.querySelectorAll('.sidebar-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = (tab as HTMLElement).dataset.tab;
      // Update tab states
      sidebarTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      // Update panel visibility
      tabPanels.forEach(p => p.classList.remove('active'));
      const targetPanel = document.getElementById(`tab-panel-${targetTab}`);
      if (targetPanel) targetPanel.classList.add('active');
    });

    // Keyboard navigation for tabs
    tab.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      const tabArray = Array.from(sidebarTabs) as HTMLElement[];
      const currentIdx = tabArray.indexOf(tab as HTMLElement);
      let nextIdx = currentIdx;

      if (ke.key === 'ArrowRight' || ke.key === 'ArrowDown') {
        ke.preventDefault();
        nextIdx = (currentIdx + 1) % tabArray.length;
      } else if (ke.key === 'ArrowLeft' || ke.key === 'ArrowUp') {
        ke.preventDefault();
        nextIdx = (currentIdx - 1 + tabArray.length) % tabArray.length;
      } else if (ke.key === 'Home') {
        ke.preventDefault();
        nextIdx = 0;
      } else if (ke.key === 'End') {
        ke.preventDefault();
        nextIdx = tabArray.length - 1;
      }

      if (nextIdx !== currentIdx) {
        tabArray[nextIdx].click();
        tabArray[nextIdx].focus();
      }
    });
  });

  // Current state
  let currentAxis = { x: 1, y: 0, z: 0 };
  let currentTotalAngle = 2 * PI;
  let currentMode: 'loop' | 'contraction' | 'comparison' = 'loop';
  let showingStages = false;
  let showingInteractiveComp = false;

  // Helper to update AI tutor context
  function updateTutorContext(mode?: string) {
    const effectiveMode = showingInteractiveComp ? 'interactive-comparison'
      : showingStages ? 'stages'
      : mode || currentMode;
    aiTutor.setContext({
      mode: effectiveMode as any,
      totalAngle: currentTotalAngle,
      is4pi: Math.abs(currentTotalAngle - 4 * PI) < 1,
    });
  }

  // Stages button toggle
  showStagesBtn.addEventListener('click', () => {
    showingStages = !showingStages;
    showingInteractiveComp = false;
    showStagesBtn.classList.toggle('active', showingStages);
    showInteractiveCompBtn.classList.remove('active');
    crossSectionPanel.style.height = showingStages ? '280px' : '240px';
    if (showingStages) {
      crossSection.setTotalAngle(4 * PI);
      crossSection.showContractionStages();
    } else {
      crossSection.setMode(currentMode === 'contraction' ? 'contraction' : 'loop');
      crossSection.setTotalAngle(currentTotalAngle);
    }
    updateTutorContext();
  });

  // Interactive comparison 2π vs 4π button toggle
  showInteractiveCompBtn.addEventListener('click', () => {
    showingInteractiveComp = !showingInteractiveComp;
    showingStages = false;
    showInteractiveCompBtn.classList.toggle('active', showingInteractiveComp);
    showStagesBtn.classList.remove('active');
    crossSectionPanel.style.height = showingInteractiveComp ? '340px' : '240px';
    if (showingInteractiveComp) {
      crossSection.setMode('interactive-comparison');
    } else {
      crossSection.setMode(currentMode === 'contraction' ? 'contraction' : 'loop');
      crossSection.setTotalAngle(currentTotalAngle);
    }
    updateTutorContext();
  });

  // Initialize with default loop
  loopAnimator.setLoop(currentAxis, currentTotalAngle);
  crossSection.setAxis(currentAxis);
  crossSection.setTotalAngle(currentTotalAngle);
  updateTutorContext();

  function switchMode(state: ControlState) {
    // Clean up previous mode
    loopAnimator.reset();
    contractionAnimator.reset();
    comparison.deactivate();
    trajectoryRenderer.clear();
    showingStages = false;
    showingInteractiveComp = false;
    showStagesBtn.classList.remove('active');
    showInteractiveCompBtn.classList.remove('active');
    crossSectionPanel.style.height = '240px';

    currentAxis = state.axis;
    currentTotalAngle = state.totalAngle;
    currentMode = state.mode;

    // Track mode usage
    if (!session.modesVisited.includes(state.mode)) {
      session.modesVisited.push(state.mode);
    }

    // Update 2D view
    crossSection.setAxis(state.axis);
    crossSection.setTotalAngle(state.totalAngle);
    crossSection.setContractionParam(0);

    if (state.mode === 'comparison') {
      mainSection.style.display = 'none';
      comparisonSection.style.display = 'grid';
      comparison.activate(state.axis);
      explanation.setContext('comparison');
      crossSection.setMode('loop');
    } else {
      mainSection.style.display = 'flex';
      comparisonSection.style.display = 'none';

      if (state.mode === 'contraction') {
        currentTotalAngle = 4 * PI;
        crossSection.setTotalAngle(4 * PI);
        crossSection.setMode('contraction');
        contractionAnimator.setAxis(state.axis);
        contractionAnimator.update(0, 0);
        explanation.setContext('contraction');
      } else {
        crossSection.setMode('loop');
        loopAnimator.setLoop(state.axis, state.totalAngle);

        // Choose explanation based on angle
        if (Math.abs(state.totalAngle - 2 * PI) < 0.5) {
          explanation.setContext('loop2pi');
        } else if (Math.abs(state.totalAngle - 4 * PI) < 0.5) {
          explanation.setContext('loop4pi');
        } else if (state.totalAngle < 2 * PI) {
          explanation.setContext('intro');
        } else {
          explanation.setContext(state.totalAngle > 3 * PI ? 'loop4pi' : 'loop2pi');
        }
      }
    }

    // Show/hide antipodal markers
    if (state.showAntipodalGrid) {
      antipodalMarkers.showIdentificationGrid();
      antipodalMarkers.startPulse();
    } else {
      antipodalMarkers.clear();
    }

    // Show/hide position vector (main scene + comparison scenes)
    trajectoryRenderer.showPositionVector = state.showPositionVector;
    comparison.setShowPositionVector(state.showPositionVector);

    animController.reset();

    // Update AI tutor context
    updateTutorContext(state.mode);
  }

  // Wire up control events
  controls.onChange((state) => {
    animController.setSpeed(state.speed);
    switchMode(state);
  });

  controls.onPreset((preset: Preset) => {
    controls.applyPreset(preset);
    animController.setSpeed(preset.speed);
    // Track preset usage
    if (!session.presetsUsed.includes(preset.name)) {
      session.presetsUsed.push(preset.name);
    }
    switchMode({
      axis: vec3Normalize(preset.axis),
      totalAngle: preset.totalAngle,
      speed: preset.speed,
      mode: preset.mode,
      showAntipodalGrid: true,
      showPositionVector: controls.getState().showPositionVector,
    });
  });

  controls.onPlayPause(() => {
    animController.toggle();
    controls.setPlaying(animController.playing);
  });

  controls.onReset(() => {
    animController.reset();
    animController.pause();
    controls.setPlaying(false);
    controls.setProgress(0);
    controls.setContractionParam(0);
    crossSection.setProgress(0);
    crossSection.setContractionParam(0);

    if (currentMode === 'contraction') {
      contractionAnimator.reset();
      contractionAnimator.setAxis(currentAxis);
      contractionAnimator.update(0, 0);
    } else if (currentMode === 'loop') {
      loopAnimator.reset();
      loopAnimator.setLoop(currentAxis, currentTotalAngle);
    }
  });

  controls.onStartContraction(() => {
    animController.setMode('contraction');
    animController.startContraction();
    animController.play();
    controls.setPlaying(true);
  });

  // Animation callbacks
  animController.onProgressChange = (t) => {
    controls.setProgress(t);
    crossSection.setProgress(t);

    if (currentMode === 'loop') {
      loopAnimator.update(t);
      explanation.updateProgressInfo(t, currentTotalAngle);
    } else if (currentMode === 'contraction') {
      const s = animController.contractionParam;
      contractionAnimator.update(s, t);
      crossSection.setContractionParam(s);
      explanation.updateProgressInfo(t, 4 * PI);
    } else if (currentMode === 'comparison') {
      comparison.update(t);
    }
  };

  animController.onContractionChange = (s) => {
    controls.setContractionParam(s);
    crossSection.setContractionParam(s);
    aiTutor.setContext({ contractionParam: s });
    // Track contraction completion
    if (s >= 0.99) {
      session.contractionCompleted = true;
    }
  };

  // Render loop
  sceneManager.onUpdate((dt) => {
    animController.update(dt);
    trajectoryRenderer.update(dt);
    antipodalMarkers.update(dt);
  });

  // Start rendering
  sceneManager.start();
}

document.addEventListener('DOMContentLoaded', init);
