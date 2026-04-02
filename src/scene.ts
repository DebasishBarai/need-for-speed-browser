import {
  Scene,
  Engine,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  Mesh,
  ShadowGenerator,
  GlowLayer,
  DynamicTexture,
} from '@babylonjs/core';
import { TRACK_CONFIG } from './track';

export function createScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.01, 0.01, 0.04, 1);
  scene.ambientColor = new Color3(0.2, 0.2, 0.25);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0012;
  scene.fogColor = new Color3(0.01, 0.01, 0.04);

  const glow = new GlowLayer('glow', scene);
  glow.intensity = 0.4;

  return scene;
}

export function createCamera(scene: Scene, _canvas: HTMLCanvasElement): ArcRotateCamera {
  const camera = new ArcRotateCamera(
    'followCam',
    Math.PI,
    Math.PI / 5,
    16,
    Vector3.Zero(),
    scene
  );
  camera.lowerRadiusLimit = 8;
  camera.upperRadiusLimit = 30;
  camera.lowerBetaLimit = 0.15;
  camera.upperBetaLimit = Math.PI / 2.5;
  camera.inputs.clear();
  return camera;
}

export function createLights(scene: Scene): ShadowGenerator {
  const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.6;
  hemiLight.diffuse = new Color3(0.5, 0.5, 0.7);
  hemiLight.groundColor = new Color3(0.15, 0.15, 0.25);

  const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -3, 1), scene);
  dirLight.intensity = 0.7;
  dirLight.diffuse = new Color3(0.6, 0.65, 0.9);
  dirLight.position = new Vector3(50, 80, -50);

  const shadowGen = new ShadowGenerator(2048, dirLight);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurScale = 2;
  shadowGen.darkness = 0.4;

  return shadowGen;
}

export function createEnvironment(scene: Scene, shadowGen: ShadowGenerator): void {
  buildGround(scene);
  buildTrack(scene, shadowGen);
  buildCityscape(scene, shadowGen);
  buildTrackLamps(scene);
  createStarfield(scene);
}

function buildGround(scene: Scene): void {
  const ground = MeshBuilder.CreateGround('ground', { width: 500, height: 500, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.04, 0.04, 0.06);
  groundMat.specularColor = new Color3(0.01, 0.01, 0.01);
  ground.material = groundMat;
  ground.receiveShadows = true;
  ground.position.y = -0.01;
}

function buildTrack(scene: Scene, shadowGen: ShadowGenerator): void {
  const waypoints = TRACK_CONFIG.aiWaypoints;
  const trackWidth = 18;

  // Create road texture
  const roadTex = new DynamicTexture('roadTex', { width: 256, height: 512 }, scene, true);
  const rCtx = roadTex.getContext();
  // Asphalt
  rCtx.fillStyle = '#222228';
  rCtx.fillRect(0, 0, 256, 512);
  // Noise grain
  for (let i = 0; i < 2000; i++) {
    const v = 28 + Math.random() * 18;
    rCtx.fillStyle = `rgb(${v},${v},${v + 3})`;
    rCtx.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
  }
  // Center dashes
  rCtx.fillStyle = '#666';
  for (let y = 0; y < 512; y += 40) {
    rCtx.fillRect(123, y, 10, 22);
  }
  roadTex.update();

  for (let i = 0; i < waypoints.length; i++) {
    const curr = waypoints[i];
    const next = waypoints[(i + 1) % waypoints.length];

    const midX = (curr.x + next.x) / 2;
    const midZ = (curr.z + next.z) / 2;
    const dx = next.x - curr.x;
    const dz = next.z - curr.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    // Road surface - flat, slightly raised
    const road = MeshBuilder.CreateBox(`road${i}`, {
      width: trackWidth,
      height: 0.06,
      depth: length + trackWidth * 0.6,
    }, scene);
    road.position = new Vector3(midX, 0.03, midZ);
    road.rotation.y = angle;
    const roadMat = new StandardMaterial(`roadMat${i}`, scene);
    roadMat.diffuseTexture = roadTex.clone(`rt${i}`);
    roadMat.specularColor = new Color3(0.08, 0.08, 0.08);
    roadMat.specularPower = 16;
    road.material = roadMat;
    road.receiveShadows = true;

    // Curb / kerb strips (low flat colored strips at track edge)
    for (const side of [-1, 1]) {
      const curb = MeshBuilder.CreateBox(`curb${i}_${side}`, {
        width: 0.8,
        height: 0.04,
        depth: length + trackWidth * 0.6,
      }, scene);
      curb.position = new Vector3(
        midX + side * Math.cos(angle) * (trackWidth / 2),
        0.06,
        midZ - side * Math.sin(angle) * (trackWidth / 2)
      );
      curb.rotation.y = angle;
      const curbMat = new StandardMaterial(`curbMat${i}_${side}`, scene);
      if (side === -1) {
        curbMat.diffuseColor = new Color3(0.0, 0.25, 0.4);
        curbMat.emissiveColor = new Color3(0.0, 0.12, 0.22);
      } else {
        curbMat.diffuseColor = new Color3(0.4, 0.0, 0.2);
        curbMat.emissiveColor = new Color3(0.2, 0.0, 0.1);
      }
      curb.material = curbMat;
    }

    // Low guardrail (thin, subtle, not giant beams)
    for (const side of [-1, 1]) {
      const rail = MeshBuilder.CreateBox(`rail${i}_${side}`, {
        width: 0.12,
        height: 0.5,
        depth: length + trackWidth * 0.6,
      }, scene);
      rail.position = new Vector3(
        midX + side * Math.cos(angle) * (trackWidth / 2 + 0.5),
        0.25,
        midZ - side * Math.sin(angle) * (trackWidth / 2 + 0.5)
      );
      rail.rotation.y = angle;
      const railMat = new StandardMaterial(`railMat${i}_${side}`, scene);
      railMat.diffuseColor = new Color3(0.15, 0.15, 0.18);
      railMat.specularColor = new Color3(0.2, 0.2, 0.2);
      rail.material = railMat;
      shadowGen.addShadowCaster(rail);
    }
  }

  // Start/finish line - flat checkered strip on the road
  const startLine = MeshBuilder.CreateBox('startLine', { width: trackWidth, height: 0.07, depth: 2 }, scene);
  startLine.position = new Vector3(0, 0.07, 80);
  const checkTex = new DynamicTexture('checkTex', 256, scene, true);
  const cCtx = checkTex.getContext();
  const sq = 16;
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      cCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#222222';
      cCtx.fillRect(c * sq, r * sq, sq, sq);
    }
  }
  checkTex.update();
  const startMat = new StandardMaterial('startMat', scene);
  startMat.diffuseTexture = checkTex;
  startMat.emissiveColor = new Color3(0.15, 0.15, 0.15);
  startLine.material = startMat;

  // Start gate arch (lightweight, not blocking)
  const archMat = new StandardMaterial('archMat', scene);
  archMat.diffuseColor = new Color3(0.3, 0.3, 0.35);
  archMat.specularColor = new Color3(0.3, 0.3, 0.3);

  for (const side of [-1, 1]) {
    const post = MeshBuilder.CreateCylinder(`gatePost${side}`, { height: 7, diameter: 0.4 }, scene);
    post.position = new Vector3(side * (trackWidth / 2 + 1.5), 3.5, 80);
    post.material = archMat;
    shadowGen.addShadowCaster(post);
  }
  const crossbar = MeshBuilder.CreateBox('crossbar', { width: trackWidth + 3.4, height: 0.35, depth: 0.35 }, scene);
  crossbar.position = new Vector3(0, 7, 80);
  crossbar.material = archMat;
  shadowGen.addShadowCaster(crossbar);

  // Lights on the crossbar (like traffic lights for race start)
  const lightColors = [new Color3(1, 0, 0), new Color3(1, 0.5, 0), new Color3(0, 1, 0)];
  lightColors.forEach((col, idx) => {
    const bulb = MeshBuilder.CreateSphere(`gateBulb${idx}`, { diameter: 0.5 }, scene);
    bulb.position = new Vector3((idx - 1) * 1.5, 7.5, 80);
    const bulbMat = new StandardMaterial(`bulbMat${idx}`, scene);
    bulbMat.emissiveColor = col.scale(0.6);
    bulbMat.diffuseColor = new Color3(0, 0, 0);
    bulb.material = bulbMat;
  });
}

function buildTrackLamps(scene: Scene): void {
  const waypoints = TRACK_CONFIG.aiWaypoints;
  const trackWidth = 18;

  for (let i = 0; i < waypoints.length; i += 2) {
    const wp = waypoints[i];
    const next = waypoints[(i + 1) % waypoints.length];
    const angle = Math.atan2(next.x - wp.x, next.z - wp.z);

    // Alternate sides
    const side = i % 4 < 2 ? -1 : 1;
    const offsetDist = trackWidth / 2 + 3;
    const x = wp.x + side * Math.cos(angle) * offsetDist;
    const z = wp.z - side * Math.sin(angle) * offsetDist;

    const poleMat = new StandardMaterial(`lampPole${i}`, scene);
    poleMat.diffuseColor = new Color3(0.2, 0.2, 0.22);

    // Pole
    const pole = MeshBuilder.CreateCylinder(`pole${i}`, { height: 6, diameter: 0.2 }, scene);
    pole.position = new Vector3(x, 3, z);
    pole.material = poleMat;

    // Arm extending over the track
    const arm = MeshBuilder.CreateBox(`arm${i}`, { width: 0.12, height: 0.12, depth: 3 }, scene);
    arm.position = new Vector3(x - side * 1.2, 6, z);
    arm.rotation.y = angle;
    arm.material = poleMat;

    // Light head
    const head = MeshBuilder.CreateBox(`lHead${i}`, { width: 1.0, height: 0.2, depth: 0.6 }, scene);
    head.position = new Vector3(x - side * 2, 5.9, z);
    const headMat = new StandardMaterial(`headMat${i}`, scene);
    headMat.emissiveColor = new Color3(0.9, 0.8, 0.6);
    headMat.diffuseColor = new Color3(0.2, 0.18, 0.12);
    head.material = headMat;

    // Actual point light
    const pl = new PointLight(`tLight${i}`, new Vector3(x - side * 2, 5.5, z), scene);
    pl.intensity = 0.4;
    pl.diffuse = new Color3(1, 0.9, 0.7);
    pl.range = 25;
  }
}

function buildCityscape(scene: Scene, shadowGen: ShadowGenerator): void {
  interface BuildingDef { x: number; z: number; w: number; h: number; d: number }
  const buildings: BuildingDef[] = [];

  // Inner buildings (center of track oval)
  const inner: BuildingDef[] = [
    { x: 0, z: 0, w: 16, h: 25, d: 16 },
    { x: 18, z: 18, w: 10, h: 18, d: 10 },
    { x: -18, z: 18, w: 12, h: 12, d: 12 },
    { x: 18, z: -18, w: 12, h: 20, d: 10 },
    { x: -18, z: -18, w: 10, h: 28, d: 10 },
    { x: 0, z: 30, w: 8, h: 14, d: 8 },
    { x: 0, z: -30, w: 10, h: 10, d: 10 },
    { x: 30, z: 0, w: 8, h: 16, d: 8 },
    { x: -30, z: 0, w: 10, h: 9, d: 10 },
    { x: 12, z: -8, w: 6, h: 12, d: 6 },
    { x: -12, z: 8, w: 7, h: 15, d: 7 },
    { x: 8, z: 12, w: 5, h: 10, d: 5 },
    { x: -8, z: -12, w: 6, h: 8, d: 6 },
  ];
  buildings.push(...inner);

  // Outer ring
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    const dist = 108 + Math.random() * 25;
    buildings.push({
      x: Math.sin(a) * dist + (Math.random() - 0.5) * 10,
      z: Math.cos(a) * dist + (Math.random() - 0.5) * 10,
      w: 8 + Math.random() * 14,
      h: 10 + Math.random() * 30,
      d: 8 + Math.random() * 14,
    });
  }

  // Far skyline
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
    const dist = 155 + Math.random() * 40;
    buildings.push({
      x: Math.sin(a) * dist,
      z: Math.cos(a) * dist,
      w: 14 + Math.random() * 20,
      h: 20 + Math.random() * 50,
      d: 14 + Math.random() * 20,
    });
  }

  const baseCols = [
    new Color3(0.06, 0.06, 0.1),
    new Color3(0.05, 0.07, 0.1),
    new Color3(0.08, 0.06, 0.08),
    new Color3(0.07, 0.07, 0.12),
    new Color3(0.05, 0.05, 0.09),
  ];

  const winEmissive = [
    new Color3(1.0, 0.85, 0.4),
    new Color3(0.4, 0.7, 1.0),
    new Color3(1.0, 0.5, 0.2),
    new Color3(0.3, 0.9, 0.6),
    new Color3(0.8, 0.4, 1.0),
  ];

  buildings.forEach((b, i) => {
    const bldg = MeshBuilder.CreateBox(`bldg${i}`, { width: b.w, height: b.h, depth: b.d }, scene);
    bldg.position = new Vector3(b.x, b.h / 2, b.z);
    const mat = new StandardMaterial(`bm${i}`, scene);
    mat.diffuseColor = baseCols[i % baseCols.length];
    mat.specularColor = new Color3(0.02, 0.02, 0.02);
    bldg.material = mat;
    if (i < 25) shadowGen.addShadowCaster(bldg);

    // Window grid on two visible faces
    const wc = winEmissive[i % winEmissive.length];
    const wMat = new StandardMaterial(`wm${i}`, scene);
    wMat.emissiveColor = wc.scale(0.5);
    wMat.diffuseColor = new Color3(0, 0, 0);

    const rowCount = Math.min(Math.floor(b.h / 3), 12);
    const colCount = Math.min(Math.floor(Math.max(b.w, b.d) / 3), 5);

    // Front face (+z)
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        if (Math.random() > 0.55) continue;
        const win = MeshBuilder.CreatePlane(`w${i}_f_${row}_${col}`, { width: 1.0, height: 0.8 }, scene);
        win.material = wMat;
        const spacing = b.w / (colCount + 1);
        win.position = new Vector3(
          b.x + (col + 1) * spacing - b.w / 2,
          row * 3 + 2.5,
          b.z + b.d / 2 + 0.05
        );
      }
    }
    // Side face (+x)
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < Math.min(Math.floor(b.d / 3), 5); col++) {
        if (Math.random() > 0.55) continue;
        const win = MeshBuilder.CreatePlane(`w${i}_s_${row}_${col}`, { width: 1.0, height: 0.8 }, scene);
        win.material = wMat;
        win.rotation.y = Math.PI / 2;
        const spacing = b.d / (Math.min(Math.floor(b.d / 3), 5) + 1);
        win.position = new Vector3(
          b.x + b.w / 2 + 0.05,
          row * 3 + 2.5,
          b.z + (col + 1) * spacing - b.d / 2
        );
      }
    }

    // Rooftop beacon on tall buildings
    if (b.h > 18) {
      const beacon = MeshBuilder.CreateSphere(`bcn${i}`, { diameter: 0.6 }, scene);
      beacon.position = new Vector3(b.x, b.h + 0.3, b.z);
      const bMat = new StandardMaterial(`bcnM${i}`, scene);
      bMat.emissiveColor = i % 2 === 0 ? new Color3(1, 0.1, 0.1) : new Color3(0.1, 0.6, 1);
      bMat.diffuseColor = new Color3(0, 0, 0);
      beacon.material = bMat;
    }

    // Neon sign accent on some outer buildings
    if (i > 13 && i < 35 && Math.random() > 0.6) {
      const signW = 2 + Math.random() * 3;
      const sign = MeshBuilder.CreatePlane(`sign${i}`, { width: signW, height: 1.2 }, scene);
      sign.position = new Vector3(b.x, b.h * 0.6, b.z + b.d / 2 + 0.1);
      const sMat = new StandardMaterial(`signM${i}`, scene);
      const signColors = [
        new Color3(1, 0.1, 0.3),
        new Color3(0, 0.8, 1),
        new Color3(1, 0.6, 0),
        new Color3(0.5, 0, 1),
      ];
      sMat.emissiveColor = signColors[i % signColors.length].scale(0.7);
      sMat.diffuseColor = new Color3(0, 0, 0);
      sign.material = sMat;
    }
  });
}

function createStarfield(scene: Scene): void {
  const skybox = MeshBuilder.CreateBox('skyBox', { size: 500 }, scene);
  const skyMat = new StandardMaterial('skyMat', scene);
  skyMat.backFaceCulling = false;
  skyMat.diffuseColor = new Color3(0, 0, 0);
  skyMat.emissiveColor = new Color3(0.01, 0.01, 0.03);
  skyMat.specularColor = new Color3(0, 0, 0);
  skyMat.disableLighting = true;
  skybox.material = skyMat;
  skybox.infiniteDistance = true;

  // Stars
  const starMat = new StandardMaterial('starMat', scene);
  starMat.emissiveColor = new Color3(1, 1, 1);
  starMat.diffuseColor = new Color3(0, 0, 0);
  starMat.disableLighting = true;

  for (let i = 0; i < 250; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.35 + 0.05;
    const r = 240;
    const star = MeshBuilder.CreatePlane(`star${i}`, { size: 0.2 + Math.random() * 0.4 }, scene);
    star.position = new Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
    star.billboardMode = Mesh.BILLBOARDMODE_ALL;
    star.material = starMat;
  }

  // Moon
  const moon = MeshBuilder.CreateSphere('moon', { diameter: 8 }, scene);
  moon.position = new Vector3(120, 180, 100);
  const moonMat = new StandardMaterial('moonMat', scene);
  moonMat.emissiveColor = new Color3(0.7, 0.7, 0.9);
  moonMat.diffuseColor = new Color3(0, 0, 0);
  moonMat.disableLighting = true;
  moon.material = moonMat;
}

export function updateCamera(camera: ArcRotateCamera, targetMesh: Mesh, speed: number): void {
  const targetAngle = targetMesh.rotation.y + Math.PI;

  let angleDiff = targetAngle - camera.alpha;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  camera.alpha += angleDiff * 0.07;
  camera.target.copyFrom(targetMesh.position);

  const targetRadius = 13 + Math.abs(speed) * 8;
  camera.radius += (targetRadius - camera.radius) * 0.06;

  const targetBeta = Math.PI / 5 - Math.abs(speed) * 0.08;
  camera.beta += (targetBeta - camera.beta) * 0.06;
}
