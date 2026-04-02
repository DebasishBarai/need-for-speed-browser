import { Scene, Color3 } from '@babylonjs/core';
import { CarState } from './types';
import { createCar, checkCheckpoints, updateCar } from './car';
import { InputState } from './input';
import { TRACK_CONFIG } from './track';

export interface AICar {
  state: CarState;
  currentWaypoint: number;
  skillLevel: number;
  input: InputState;
}

const AI_COLORS = [
  new Color3(0.1, 0.4, 0.9),  // Blue
  new Color3(0.9, 0.6, 0.0),  // Orange
  new Color3(0.1, 0.8, 0.2),  // Green
];

export function createAICars(scene: Scene): AICar[] {
  const startZ = 80;

  return AI_COLORS.map((color, i) => {
    // Stagger AI cars behind the player on the track
    const offsetX = (i - 1) * 3;
    const state = createCar(scene, color, offsetX, startZ - 6 - i * 4, 0);
    return {
      state,
      currentWaypoint: 1,
      skillLevel: 0.6 + i * 0.12,
      input: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        nitro: false,
        handbrake: false,
      },
    };
  });
}

export function updateAICar(ai: AICar, deltaTime: number): void {
  if (ai.state.finished) return;

  const waypoints = TRACK_CONFIG.aiWaypoints;
  const target = waypoints[ai.currentWaypoint];

  const dx = target.x - ai.state.mesh.position.x;
  const dz = target.z - ai.state.mesh.position.z;
  const distToWaypoint = Math.sqrt(dx * dx + dz * dz);
  const targetAngle = Math.atan2(dx, dz);

  let angleDiff = targetAngle - ai.state.rotation;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  // Reset input
  ai.input.forward = false;
  ai.input.backward = false;
  ai.input.left = false;
  ai.input.right = false;
  ai.input.nitro = false;
  ai.input.handbrake = false;

  // Steering
  if (angleDiff < -0.05) ai.input.left = true;
  if (angleDiff > 0.05) ai.input.right = true;

  // Throttle
  const absAngleDiff = Math.abs(angleDiff);
  if (absAngleDiff < Math.PI / 3) {
    ai.input.forward = true;
  } else if (absAngleDiff < Math.PI / 2) {
    ai.input.forward = ai.state.speed < 0.4 * ai.skillLevel;
  } else {
    ai.input.backward = ai.state.speed > 0.1;
  }

  // Nitro on straights
  if (absAngleDiff < 0.1 && ai.state.speed > 0.5 && ai.state.nitroAmount > 30) {
    ai.input.nitro = Math.random() < ai.skillLevel * 0.3;
  }

  // Handbrake for sharp turns
  if (absAngleDiff > Math.PI / 4 && ai.state.speed > 0.5) {
    ai.input.handbrake = true;
  }

  // Advance waypoint
  if (distToWaypoint < 12) {
    ai.currentWaypoint = (ai.currentWaypoint + 1) % waypoints.length;
  }

  updateCar(ai.state, ai.input, deltaTime * ai.skillLevel);
  checkCheckpoints(ai.state, TRACK_CONFIG.checkpoints, TRACK_CONFIG.totalLaps);
}

export function getPositions(playerCar: CarState, aiCars: AICar[]): { position: number; total: number } {
  const total = aiCars.length + 1;

  function score(car: CarState): number {
    const lapScore = (car.lap - 1) * 10000;
    const cpScore = car.lastCheckpoint * 1000;
    const nextCp = (car.lastCheckpoint + 1) % TRACK_CONFIG.checkpoints.length;
    const cp = TRACK_CONFIG.checkpoints[nextCp];
    const dx = car.mesh.position.x - cp.x;
    const dz = car.mesh.position.z - cp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return lapScore + cpScore + (500 - dist);
  }

  const playerScore = score(playerCar);
  let position = 1;
  for (const ai of aiCars) {
    if (score(ai.state) > playerScore) position++;
  }

  return { position, total };
}
