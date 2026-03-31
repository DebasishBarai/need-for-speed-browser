import {
  Scene,
  Engine,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  Mesh,
  ShadowGenerator,
  GlowLayer,
} from '@babylonjs/core';
import { TRACK_CONFIG } from './track';

export function createScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.05, 0.15, 1);
  scene.ambientColor = new Color3(0.1, 0.1, 0.15);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.003;
  scene.fogColor = new Color3(0.05, 0.05, 0.15);

  // Glow layer for emissive effects (headlights, taillights, neon)
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 0.6;

  return scene;
}

export function createCamera(scene: Scene, canvas: HTMLCanvasElement): ArcRotateCamera {
  const camera = new ArcRotateCamera(
    'followCam',
    Math.PI,       // alpha (horizontal rotation)
    Math.PI / 4,   // beta (vertical angle)
    18,            // radius (distance from target)
    Vector3.Zero(),
    scene
  );
  camera.lowerRadiusLimit = 8;
  camera.upperRadiusLimit = 30;
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.5;
  camera.attachControl(canvas, true);
  return camera;
}

export function createLights(scene: Scene): ShadowGenerator {
  // Ambient light
  const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.4;
  hemiLight.diffuse = new Color3(0.6, 0.6, 0.8);
  hemiLight.groundColor = new Color3(0.1, 0.1, 0.2);

  // Directional "moon" light
  const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, 1), scene);
  dirLight.intensity = 0.8;
  dirLight.diffuse = new Color3(0.7, 0.75, 1);

  // Shadows
  const shadowGen = new ShadowGenerator(1024, dirLight);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurScale = 2;

  return shadowGen;
}

export function createEnvironment(scene: Scene, shadowGen: ShadowGenerator): void {
  // Ground plane
  const ground = MeshBuilder.CreateGround('ground', { width: 300, height: 300, subdivisions: 4 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.08, 0.12, 0.08);
  groundMat.specularColor = new Color3(0, 0, 0);
  ground.material = groundMat;
  ground.receiveShadows = true;

  // Build oval track
  buildTrack(scene, shadowGen);

  // Scenery: buildings around the track
  buildScenery(scene, shadowGen);

  // Skybox-like distant markers (simple large box)
  createSkybox(scene);
}

function buildTrack(scene: Scene, shadowGen: ShadowGenerator): void {
  const waypoints = TRACK_CONFIG.aiWaypoints;
  const trackWidth = 16;

  // Create track surface segments
  for (let i = 0; i < waypoints.length; i++) {
    const curr = waypoints[i];
    const next = waypoints[(i + 1) % waypoints.length];

    const midX = (curr.x + next.x) / 2;
    const midZ = (curr.z + next.z) / 2;
    const dx = next.x - curr.x;
    const dz = next.z - curr.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    // Road segment
    const road = MeshBuilder.CreateBox(`road${i}`, {
      width: trackWidth,
      height: 0.05,
      depth: length + trackWidth * 0.5,
    }, scene);
    road.position = new Vector3(midX, 0.025, midZ);
    road.rotation.y = angle;
    const roadMat = new StandardMaterial(`roadMat${i}`, scene);
    roadMat.diffuseColor = new Color3(0.2, 0.2, 0.22);
    roadMat.specularColor = new Color3(0.1, 0.1, 0.1);
    road.material = roadMat;

    // Track edge / barrier (left)
    const barrierL = MeshBuilder.CreateBox(`barrierL${i}`, {
      width: 0.5,
      height: 1,
      depth: length + trackWidth * 0.5,
    }, scene);
    barrierL.position = new Vector3(
      midX - Math.cos(angle) * (trackWidth / 2 + 0.25),
      0.5,
      midZ + Math.sin(angle) * (trackWidth / 2 + 0.25)
    );
    barrierL.rotation.y = angle;
    const barrierMat = new StandardMaterial(`barrierMatL${i}`, scene);
    barrierMat.diffuseColor = new Color3(0.6, 0.15, 0.15);
    barrierMat.emissiveColor = new Color3(0.15, 0.03, 0.03);
    barrierL.material = barrierMat;
    shadowGen.addShadowCaster(barrierL);

    // Track edge / barrier (right)
    const barrierR = MeshBuilder.CreateBox(`barrierR${i}`, {
      width: 0.5,
      height: 1,
      depth: length + trackWidth * 0.5,
    }, scene);
    barrierR.position = new Vector3(
      midX + Math.cos(angle) * (trackWidth / 2 + 0.25),
      0.5,
      midZ - Math.sin(angle) * (trackWidth / 2 + 0.25)
    );
    barrierR.rotation.y = angle;
    const barrierMatR = new StandardMaterial(`barrierMatR${i}`, scene);
    barrierMatR.diffuseColor = new Color3(0.15, 0.15, 0.6);
    barrierMatR.emissiveColor = new Color3(0.03, 0.03, 0.15);
    barrierR.material = barrierMatR;
    shadowGen.addShadowCaster(barrierR);
  }

  // Start/finish line
  const startLine = MeshBuilder.CreateBox('startLine', { width: trackWidth, height: 0.06, depth: 1 }, scene);
  startLine.position = new Vector3(0, 0.06, 80);
  const startMat = new StandardMaterial('startMat', scene);
  startMat.diffuseColor = new Color3(1, 1, 1);
  startMat.emissiveColor = new Color3(0.3, 0.3, 0.3);
  startLine.material = startMat;
}

function buildScenery(scene: Scene, shadowGen: ShadowGenerator): void {
  const buildingPositions = [
    { x: 0, z: 0, w: 15, h: 8, d: 15 },
    { x: 25, z: 25, w: 8, h: 12, d: 8 },
    { x: -25, z: 25, w: 10, h: 6, d: 10 },
    { x: 25, z: -25, w: 12, h: 10, d: 8 },
    { x: -25, z: -25, w: 8, h: 14, d: 8 },
    { x: 0, z: 30, w: 6, h: 9, d: 6 },
    { x: 0, z: -30, w: 10, h: 7, d: 10 },
    { x: 35, z: 0, w: 7, h: 11, d: 7 },
    { x: -35, z: 0, w: 9, h: 5, d: 9 },
  ];

  const colors = [
    new Color3(0.2, 0.2, 0.3),
    new Color3(0.15, 0.2, 0.25),
    new Color3(0.25, 0.2, 0.2),
    new Color3(0.18, 0.22, 0.28),
  ];

  buildingPositions.forEach((b, i) => {
    const building = MeshBuilder.CreateBox(`building${i}`, {
      width: b.w,
      height: b.h,
      depth: b.d,
    }, scene);
    building.position = new Vector3(b.x, b.h / 2, b.z);
    const mat = new StandardMaterial(`buildMat${i}`, scene);
    mat.diffuseColor = colors[i % colors.length];
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    building.material = mat;
    shadowGen.addShadowCaster(building);

    // Window lights on buildings
    const windowMat = new StandardMaterial(`windowMat${i}`, scene);
    windowMat.emissiveColor = new Color3(1, 0.9, 0.5);
    for (let row = 0; row < Math.floor(b.h / 2); row++) {
      for (let col = 0; col < 3; col++) {
        if (Math.random() > 0.4) {
          const win = MeshBuilder.CreatePlane(`win${i}_${row}_${col}`, { width: 0.8, height: 0.8 }, scene);
          win.material = windowMat;
          win.position = new Vector3(
            b.x + (col - 1) * 2,
            row * 2 + 2,
            b.z + b.d / 2 + 0.01
          );
        }
      }
    }
  });
}

function createSkybox(scene: Scene): void {
  const skybox = MeshBuilder.CreateBox('skyBox', { size: 500 }, scene);
  const skyMat = new StandardMaterial('skyMat', scene);
  skyMat.backFaceCulling = false;
  skyMat.diffuseColor = new Color3(0, 0, 0);
  skyMat.emissiveColor = new Color3(0.02, 0.02, 0.06);
  skyMat.specularColor = new Color3(0, 0, 0);
  skyMat.disableLighting = true;
  skybox.material = skyMat;
  skybox.infiniteDistance = true;
}

export function updateCamera(camera: ArcRotateCamera, targetMesh: Mesh, speed: number): void {
  // Follow the car from behind
  const targetAngle = targetMesh.rotation.y + Math.PI;

  // Smooth camera follow
  let angleDiff = targetAngle - camera.alpha;
  // Normalize angle difference
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  camera.alpha += angleDiff * 0.05;
  camera.target.copyFrom(targetMesh.position);

  // Dynamic camera distance based on speed
  const targetRadius = 14 + Math.abs(speed) * 8;
  camera.radius += (targetRadius - camera.radius) * 0.05;

  // Lower angle at high speed
  const targetBeta = Math.PI / 4 - Math.abs(speed) * 0.15;
  camera.beta += (targetBeta - camera.beta) * 0.05;
}
