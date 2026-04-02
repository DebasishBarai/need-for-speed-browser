import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  Color4,
  DynamicTexture,
  ParticleSystem,
} from '@babylonjs/core';
import { InputState } from './input';
import { CarState, Checkpoint } from './types';
import { TRACK_CONFIG } from './track';

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
const TRACK_HALF_WIDTH = 8.5; // Keep cars within track boundaries

// Returns closest point on the track centerline and distance to it
function getTrackInfo(px: number, pz: number): { nearestX: number; nearestZ: number; dist: number; trackAngle: number } {
  const wps = TRACK_CONFIG.aiWaypoints;
  let bestDist = Infinity;
  let nearestX = 0;
  let nearestZ = 0;
  let trackAngle = 0;

  for (let i = 0; i < wps.length; i++) {
    const a = wps[i];
    const b = wps[(i + 1) % wps.length];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const len2 = abx * abx + abz * abz;
    let t = ((px - a.x) * abx + (pz - a.z) * abz) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * abx;
    const cz = a.z + t * abz;
    const dx = px - cx;
    const dz = pz - cz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestDist) {
      bestDist = d;
      nearestX = cx;
      nearestZ = cz;
      trackAngle = Math.atan2(abx, abz);
    }
  }
  return { nearestX, nearestZ, dist: bestDist, trackAngle };
}

function createParticleTex(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture('pTex', 64, scene, true);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,180,80,0.6)');
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  tex.update();
  return tex;
}

export function createCar(
  scene: Scene,
  color: Color3,
  startX: number,
  startZ: number,
  startRotation: number,
): CarState {
  // Root node
  const root = MeshBuilder.CreateBox('carRoot', { width: 0.01, height: 0.01, depth: 0.01 }, scene);
  root.isVisible = false;
  root.position = new Vector3(startX, 0.45, startZ);
  root.rotation.y = startRotation;

  const bodyMat = new StandardMaterial('bodyMat', scene);
  bodyMat.diffuseColor = color;
  bodyMat.specularColor = new Color3(1, 1, 1);
  bodyMat.specularPower = 64;

  const darkMat = new StandardMaterial('darkMat', scene);
  darkMat.diffuseColor = new Color3(0.04, 0.04, 0.06);
  darkMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const chromeMat = new StandardMaterial('chromeMat', scene);
  chromeMat.diffuseColor = new Color3(0.5, 0.5, 0.55);
  chromeMat.specularColor = new Color3(1, 1, 1);
  chromeMat.specularPower = 128;

  // --- LOWER CHASSIS (wide, flat) ---
  const chassis = MeshBuilder.CreateBox('chassis', { width: 2.1, height: 0.3, depth: 4.6 }, scene);
  chassis.material = darkMat;
  chassis.position.y = -0.1;
  chassis.parent = root;

  // --- MAIN BODY (sleek, tapered) ---
  const body = MeshBuilder.CreateBox('body', { width: 1.95, height: 0.5, depth: 4.3 }, scene);
  body.material = bodyMat;
  body.position.y = 0.15;
  body.parent = root;

  // --- HOOD (sloped front) ---
  const hood = MeshBuilder.CreateBox('hood', { width: 1.85, height: 0.15, depth: 1.4 }, scene);
  hood.material = bodyMat;
  hood.position = new Vector3(0, 0.45, 1.1);
  hood.rotation.x = -0.08;
  hood.parent = root;

  // --- CABIN (glass canopy) ---
  const glass = MeshBuilder.CreateBox('glass', { width: 1.55, height: 0.45, depth: 1.4 }, scene);
  const glassMat = new StandardMaterial('glassMat', scene);
  glassMat.diffuseColor = new Color3(0.08, 0.12, 0.2);
  glassMat.specularColor = new Color3(0.5, 0.6, 0.8);
  glassMat.specularPower = 128;
  glassMat.alpha = 0.55;
  glass.material = glassMat;
  glass.position = new Vector3(0, 0.58, -0.15);
  glass.parent = root;

  // --- TRUNK / rear deck ---
  const trunk = MeshBuilder.CreateBox('trunk', { width: 1.85, height: 0.2, depth: 1.0 }, scene);
  trunk.material = bodyMat;
  trunk.position = new Vector3(0, 0.42, -1.3);
  trunk.parent = root;

  // --- SIDE PANELS (give volume) ---
  for (const side of [-1, 1]) {
    const panel = MeshBuilder.CreateBox(`sidePanel${side}`, { width: 0.08, height: 0.35, depth: 4.0 }, scene);
    panel.material = bodyMat;
    panel.position = new Vector3(side * 0.98, 0.2, 0);
    panel.parent = root;
  }

  // --- WHEEL ARCHES (dark cutouts) ---
  const wheelData = [
    { x: -0.95, z: 1.35 },
    { x: 0.95, z: 1.35 },
    { x: -0.95, z: -1.35 },
    { x: 0.95, z: -1.35 },
  ];

  const tireMat = new StandardMaterial('tireMat', scene);
  tireMat.diffuseColor = new Color3(0.06, 0.06, 0.06);

  wheelData.forEach((wd, i) => {
    // Wheel arch cover
    const arch = MeshBuilder.CreateBox(`arch${i}`, { width: 0.25, height: 0.35, depth: 0.75 }, scene);
    arch.material = darkMat;
    arch.position = new Vector3(wd.x > 0 ? wd.x + 0.05 : wd.x - 0.05, -0.05, wd.z);
    arch.parent = root;

    // Tire
    const tire = MeshBuilder.CreateCylinder(`tire${i}`, { height: 0.28, diameter: 0.6, tessellation: 18 }, scene);
    tire.material = tireMat;
    tire.rotation.z = Math.PI / 2;
    tire.position = new Vector3(wd.x > 0 ? wd.x + 0.12 : wd.x - 0.12, -0.15, wd.z);
    tire.parent = root;

    // Rim
    const rim = MeshBuilder.CreateCylinder(`rim${i}`, { height: 0.29, diameter: 0.32, tessellation: 6 }, scene);
    rim.material = chromeMat;
    rim.rotation.z = Math.PI / 2;
    rim.position = tire.position.clone();
    rim.parent = root;
  });

  // --- FRONT SPLITTER ---
  const splitter = MeshBuilder.CreateBox('splitter', { width: 2.15, height: 0.05, depth: 0.25 }, scene);
  splitter.material = darkMat;
  splitter.position = new Vector3(0, -0.12, 2.3);
  splitter.parent = root;

  // --- REAR DIFFUSER ---
  const diffuser = MeshBuilder.CreateBox('diffuser', { width: 2.0, height: 0.06, depth: 0.35 }, scene);
  diffuser.material = darkMat;
  diffuser.position = new Vector3(0, -0.1, -2.3);
  diffuser.parent = root;

  // --- REAR WING ---
  for (const side of [-1, 1]) {
    const pylon = MeshBuilder.CreateBox(`wingPylon${side}`, { width: 0.06, height: 0.45, depth: 0.06 }, scene);
    pylon.material = chromeMat;
    pylon.position = new Vector3(side * 0.6, 0.6, -1.85);
    pylon.parent = root;
  }
  const wing = MeshBuilder.CreateBox('wing', { width: 1.9, height: 0.05, depth: 0.4 }, scene);
  wing.material = bodyMat;
  wing.position = new Vector3(0, 0.85, -1.85);
  wing.parent = root;

  // --- HEADLIGHTS ---
  const hlMat = new StandardMaterial('hlMat', scene);
  hlMat.emissiveColor = new Color3(1, 0.95, 0.8);
  hlMat.diffuseColor = new Color3(0, 0, 0);
  for (const xOff of [-0.65, 0.65]) {
    const hl = MeshBuilder.CreateBox('hl', { width: 0.4, height: 0.12, depth: 0.06 }, scene);
    hl.material = hlMat;
    hl.position = new Vector3(xOff, 0.28, 2.17);
    hl.parent = root;
  }

  // --- TAIL LIGHTS (full width LED bar) ---
  const tlMat = new StandardMaterial('tlMat', scene);
  tlMat.emissiveColor = new Color3(1, 0, 0);
  tlMat.diffuseColor = new Color3(0, 0, 0);
  const tailBar = MeshBuilder.CreateBox('tailBar', { width: 1.7, height: 0.06, depth: 0.05 }, scene);
  tailBar.material = tlMat;
  tailBar.position = new Vector3(0, 0.32, -2.17);
  tailBar.parent = root;

  // --- UNDERGLOW ---
  const ugMat = new StandardMaterial('ugMat', scene);
  ugMat.emissiveColor = color.scale(0.35);
  ugMat.diffuseColor = new Color3(0, 0, 0);
  ugMat.alpha = 0.5;
  const ug = MeshBuilder.CreatePlane('ug', { width: 2.2, height: 4.4 }, scene);
  ug.material = ugMat;
  ug.rotation.x = Math.PI / 2;
  ug.position.y = -0.22;
  ug.parent = root;

  // --- EXHAUST PARTICLES ---
  const pTex = createParticleTex(scene);
  const exhaust = new ParticleSystem('exhaust', 60, scene);
  exhaust.particleTexture = pTex;
  exhaust.emitter = root;
  exhaust.minEmitBox = new Vector3(-0.25, -0.1, -2.3);
  exhaust.maxEmitBox = new Vector3(0.25, 0.0, -2.3);
  exhaust.direction1 = new Vector3(-0.05, 0.05, -0.8);
  exhaust.direction2 = new Vector3(0.05, 0.15, -0.6);
  exhaust.minLifeTime = 0.08;
  exhaust.maxLifeTime = 0.2;
  exhaust.minSize = 0.04;
  exhaust.maxSize = 0.12;
  exhaust.emitRate = 20;
  exhaust.color1 = new Color4(0.5, 0.5, 0.5, 0.2);
  exhaust.color2 = new Color4(0.3, 0.3, 0.3, 0.1);
  exhaust.colorDead = new Color4(0, 0, 0, 0);
  exhaust.minEmitPower = 0.3;
  exhaust.maxEmitPower = 1.0;
  exhaust.updateSpeed = 0.02;
  exhaust.start();

  return {
    mesh: root,
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

  const dt = deltaTime / 16.67;

  if (input.forward) car.speed += ACCELERATION * dt;
  if (input.backward) car.speed -= BRAKE_FORCE * dt;

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

  if (input.handbrake) {
    car.speed *= (1 - HANDBRAKE_FRICTION * dt);
    if (Math.abs(car.speed) > 0.05) {
      if (input.left) car.rotation -= TURN_SPEED * 1.8 * dt;
      if (input.right) car.rotation += TURN_SPEED * 1.8 * dt;
    }
  } else {
    const turnFactor = Math.min(Math.abs(car.speed) / 0.5, 1);
    if (input.left) car.rotation -= TURN_SPEED * turnFactor * dt;
    if (input.right) car.rotation += TURN_SPEED * turnFactor * dt;
  }

  if (!input.forward && !input.backward) {
    if (car.speed > 0) {
      car.speed -= FRICTION * dt;
      if (car.speed < 0) car.speed = 0;
    } else if (car.speed < 0) {
      car.speed += FRICTION * dt;
      if (car.speed > 0) car.speed = 0;
    }
  }

  const maxSpd = car.isNitroActive ? MAX_SPEED * 1.3 : MAX_SPEED;
  car.speed = Math.max(-MAX_SPEED * 0.3, Math.min(car.speed, maxSpd));

  // Apply movement
  car.mesh.rotation.y = car.rotation;
  const newX = car.mesh.position.x + Math.sin(car.rotation) * car.speed * dt;
  const newZ = car.mesh.position.z + Math.cos(car.rotation) * car.speed * dt;

  // --- TRACK BOUNDARY ENFORCEMENT ---
  const info = getTrackInfo(newX, newZ);
  if (info.dist <= TRACK_HALF_WIDTH) {
    // Within track - allow movement
    car.mesh.position.x = newX;
    car.mesh.position.z = newZ;
  } else {
    // Outside track - push back to the edge
    const pushDist = TRACK_HALF_WIDTH - 0.5;
    const dirX = newX - info.nearestX;
    const dirZ = newZ - info.nearestZ;
    const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (dirLen > 0) {
      car.mesh.position.x = info.nearestX + (dirX / dirLen) * pushDist;
      car.mesh.position.z = info.nearestZ + (dirZ / dirLen) * pushDist;
    }
    car.speed *= 0.85; // Slow down on boundary hit
  }

  // Body roll & pitch
  if (input.left) car.mesh.rotation.z = 0.03;
  else if (input.right) car.mesh.rotation.z = -0.03;
  else car.mesh.rotation.z *= 0.9;

  if (input.forward && car.speed > 0.3) car.mesh.rotation.x = -0.015;
  else if (input.backward) car.mesh.rotation.x = 0.025;
  else car.mesh.rotation.x *= 0.9;

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

    if (nextCheckpoint === 0 && car.lapTime > 2000) {
      if (car.lapTime < car.bestLapTime) {
        car.bestLapTime = car.lapTime;
      }
      car.lapTime = 0;
      car.lap++;

      if (car.lap > totalLaps) {
        car.finished = true;
        car.lap = totalLaps;
        return true;
      }
    }
  }
  return false;
}

export function getSpeedKmh(car: CarState): number {
  return Math.abs(car.speed) * 200;
}
