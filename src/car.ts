import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';
import { InputState } from './input';
import { CarState, Checkpoint } from './types';

const MAX_SPEED = 1.2;
const ACCELERATION = 0.008;
const BRAKE_FORCE = 0.015;
const FRICTION = 0.003;
const TURN_SPEED = 0.03;
const HANDBRAKE_FRICTION = 0.01;
const NITRO_BOOST = 0.015;
const NITRO_DRAIN = 0.4;
const NITRO_REGEN = 0.08;
const MAX_NITRO = 100;
const DRIFT_FACTOR = 0.92;

export function createCar(
  scene: Scene,
  color: Color3,
  startX: number,
  startZ: number,
  startRotation: number,
): CarState {
  // Car body
  const body = MeshBuilder.CreateBox('carBody', { width: 2, height: 0.6, depth: 4 }, scene);
  const bodyMat = new StandardMaterial('carBodyMat', scene);
  bodyMat.diffuseColor = color;
  bodyMat.specularColor = new Color3(0.5, 0.5, 0.5);
  body.material = bodyMat;
  body.position = new Vector3(startX, 0.5, startZ);
  body.rotation.y = startRotation;

  // Roof / cabin
  const cabin = MeshBuilder.CreateBox('cabin', { width: 1.6, height: 0.5, depth: 2 }, scene);
  const cabinMat = new StandardMaterial('cabinMat', scene);
  cabinMat.diffuseColor = new Color3(0.15, 0.15, 0.2);
  cabinMat.alpha = 0.8;
  cabin.material = cabinMat;
  cabin.position = new Vector3(0, 0.55, -0.3);
  cabin.parent = body;

  // Wheels
  const wheelPositions = [
    new Vector3(-1, -0.3, 1.3),
    new Vector3(1, -0.3, 1.3),
    new Vector3(-1, -0.3, -1.3),
    new Vector3(1, -0.3, -1.3),
  ];

  const wheelMat = new StandardMaterial('wheelMat', scene);
  wheelMat.diffuseColor = new Color3(0.1, 0.1, 0.1);

  wheelPositions.forEach((pos, i) => {
    const wheel = MeshBuilder.CreateCylinder(`wheel${i}`, {
      height: 0.3,
      diameter: 0.6,
    }, scene);
    wheel.material = wheelMat;
    wheel.rotation.z = Math.PI / 2;
    wheel.position = pos;
    wheel.parent = body;
  });

  // Front spoiler
  const spoiler = MeshBuilder.CreateBox('spoiler', { width: 2.2, height: 0.1, depth: 0.3 }, scene);
  spoiler.material = bodyMat;
  spoiler.position = new Vector3(0, -0.15, 2.1);
  spoiler.parent = body;

  // Rear spoiler
  const rearSpoiler = MeshBuilder.CreateBox('rearSpoiler', { width: 2, height: 0.1, depth: 0.4 }, scene);
  rearSpoiler.material = bodyMat;
  rearSpoiler.position = new Vector3(0, 0.7, -1.8);
  rearSpoiler.parent = body;

  // Headlights
  const headlightMat = new StandardMaterial('headlightMat', scene);
  headlightMat.emissiveColor = new Color3(1, 1, 0.8);
  [-0.7, 0.7].forEach((xOff, i) => {
    const hl = MeshBuilder.CreateBox(`headlight${i}`, { width: 0.3, height: 0.15, depth: 0.05 }, scene);
    hl.material = headlightMat;
    hl.position = new Vector3(xOff, 0.1, 2.01);
    hl.parent = body;
  });

  // Tail lights
  const taillightMat = new StandardMaterial('taillightMat', scene);
  taillightMat.emissiveColor = new Color3(1, 0, 0);
  [-0.7, 0.7].forEach((xOff, i) => {
    const tl = MeshBuilder.CreateBox(`taillight${i}`, { width: 0.3, height: 0.15, depth: 0.05 }, scene);
    tl.material = taillightMat;
    tl.position = new Vector3(xOff, 0.1, -2.01);
    tl.parent = body;
  });

  return {
    mesh: body,
    speed: 0,
    rotation: startRotation,
    nitroAmount: MAX_NITRO,
    isNitroActive: false,
    lap: 1,
    lastCheckpoint: -1,
    lapTime: 0,
    bestLapTime: Infinity,
    totalTime: 0,
    finished: false,
  };
}

export function updateCar(car: CarState, input: InputState, deltaTime: number): void {
  if (car.finished) return;

  const dt = deltaTime / 16.67; // normalize to ~60fps

  // Acceleration / braking
  if (input.forward) {
    car.speed += ACCELERATION * dt;
  }
  if (input.backward) {
    car.speed -= BRAKE_FORCE * dt;
  }

  // Nitro
  car.isNitroActive = false;
  if (input.nitro && car.nitroAmount > 0 && car.speed > 0.1) {
    car.speed += NITRO_BOOST * dt;
    car.nitroAmount -= NITRO_DRAIN * dt;
    car.isNitroActive = true;
    if (car.nitroAmount < 0) car.nitroAmount = 0;
  } else if (!input.nitro) {
    car.nitroAmount += NITRO_REGEN * dt;
    if (car.nitroAmount > MAX_NITRO) car.nitroAmount = MAX_NITRO;
  }

  // Handbrake
  if (input.handbrake) {
    car.speed *= (1 - HANDBRAKE_FRICTION * dt);
    // Drift: allow more turning while handbraking
    if (Math.abs(car.speed) > 0.05) {
      if (input.left) car.rotation -= TURN_SPEED * 1.8 * dt;
      if (input.right) car.rotation += TURN_SPEED * 1.8 * dt;
    }
  } else {
    // Normal steering (proportional to speed)
    const turnFactor = Math.min(Math.abs(car.speed) / 0.5, 1);
    if (input.left) car.rotation -= TURN_SPEED * turnFactor * dt;
    if (input.right) car.rotation += TURN_SPEED * turnFactor * dt;
  }

  // Friction
  if (!input.forward && !input.backward) {
    if (car.speed > 0) {
      car.speed -= FRICTION * dt;
      if (car.speed < 0) car.speed = 0;
    } else if (car.speed < 0) {
      car.speed += FRICTION * dt;
      if (car.speed > 0) car.speed = 0;
    }
  }

  // Clamp speed
  const maxSpd = car.isNitroActive ? MAX_SPEED * 1.3 : MAX_SPEED;
  car.speed = Math.max(-MAX_SPEED * 0.3, Math.min(car.speed, maxSpd));

  // Apply movement
  car.mesh.rotation.y = car.rotation;
  car.mesh.position.x += Math.sin(car.rotation) * car.speed * dt;
  car.mesh.position.z += Math.cos(car.rotation) * car.speed * dt;

  // Keep car on track (soft boundary)
  const dist = Math.sqrt(car.mesh.position.x ** 2 + car.mesh.position.z ** 2);
  if (dist > 110) {
    // Push back toward center and slow down
    const angle = Math.atan2(car.mesh.position.x, car.mesh.position.z);
    car.mesh.position.x = Math.sin(angle) * 110;
    car.mesh.position.z = Math.cos(angle) * 110;
    car.speed *= 0.8;
  }

  // Update time
  car.lapTime += deltaTime;
  car.totalTime += deltaTime;
}

export function checkCheckpoints(
  car: CarState,
  checkpoints: Checkpoint[],
  totalLaps: number,
): boolean {
  const nextCheckpoint = (car.lastCheckpoint + 1) % checkpoints.length;
  const cp = checkpoints[nextCheckpoint];

  const dx = car.mesh.position.x - cp.x;
  const dz = car.mesh.position.z - cp.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  if (distance < cp.radius) {
    car.lastCheckpoint = nextCheckpoint;

    // Completed a full lap
    if (nextCheckpoint === 0 && car.lapTime > 2000) {
      if (car.lapTime < car.bestLapTime) {
        car.bestLapTime = car.lapTime;
      }
      car.lapTime = 0;
      car.lap++;

      if (car.lap > totalLaps) {
        car.finished = true;
        car.lap = totalLaps;
        return true; // race finished
      }
    }
  }
  return false;
}

export function getSpeedKmh(car: CarState): number {
  return Math.abs(car.speed) * 200;
}
