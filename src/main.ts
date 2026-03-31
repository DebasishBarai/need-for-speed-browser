import { Engine, Color3 } from '@babylonjs/core';
import { createScene, createCamera, createLights, createEnvironment, updateCamera } from './scene';
import { setupInput } from './input';
import { createCar, updateCar, checkCheckpoints, getSpeedKmh } from './car';
import { createAICars, updateAICar, getPositions } from './ai';
import { updateUI, showCountdown, hideCountdown, showFinishMessage } from './ui';
import { TRACK_CONFIG } from './track';

// Initialize engine
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { stencil: true });

// Create scene
const scene = createScene(engine, canvas);
const camera = createCamera(scene, canvas);
const shadowGen = createLights(scene);
createEnvironment(scene, shadowGen);

// Create player car (red, at start line)
const playerCar = createCar(scene, new Color3(0.9, 0.1, 0.1), -3, 80, 0);
shadowGen.addShadowCaster(playerCar.mesh);

// Create AI cars
const aiCars = createAICars(scene);
aiCars.forEach(ai => shadowGen.addShadowCaster(ai.state.mesh));

// Setup input
const input = setupInput();

// Game state
let raceStarted = false;
let countdownTimer = 0;
let countdownPhase = 0;
let raceFinished = false;

// Countdown sequence
const COUNTDOWN_DURATION = 4000; // 3-2-1-GO

function startCountdown(): void {
  countdownTimer = 0;
  countdownPhase = 0;
  showCountdown('3');
}

startCountdown();

// Main game loop
scene.onBeforeRenderObservable.add(() => {
  const deltaTime = engine.getDeltaTime();

  if (!raceStarted) {
    // Countdown phase
    countdownTimer += deltaTime;

    if (countdownTimer < 1000) {
      showCountdown('3');
    } else if (countdownTimer < 2000) {
      showCountdown('2');
    } else if (countdownTimer < 3000) {
      showCountdown('1');
    } else if (countdownTimer < 3500) {
      showCountdown('GO!');
    } else {
      hideCountdown();
      raceStarted = true;
    }

    // Update camera even during countdown
    updateCamera(camera, playerCar.mesh, 0);
    return;
  }

  if (raceFinished) {
    updateCamera(camera, playerCar.mesh, playerCar.speed);
    return;
  }

  // Update player car
  updateCar(playerCar, input, deltaTime);
  const playerFinished = checkCheckpoints(playerCar, TRACK_CONFIG.checkpoints, TRACK_CONFIG.totalLaps);

  // Update AI cars
  for (const ai of aiCars) {
    updateAICar(ai, deltaTime);
  }

  // Camera follow
  updateCamera(camera, playerCar.mesh, playerCar.speed);

  // Update UI
  const { position, total } = getPositions(playerCar, aiCars);
  updateUI(playerCar, position, total, TRACK_CONFIG.totalLaps);

  // Check for race finish
  if (playerFinished) {
    raceFinished = true;
    showFinishMessage(position);
  }
});

// Render loop
engine.runRenderLoop(() => {
  scene.render();
});

// Handle resize
window.addEventListener('resize', () => {
  engine.resize();
});
