import { Mesh } from '@babylonjs/core';

export interface CarState {
  mesh: Mesh;
  speed: number;
  rotation: number;
  nitroAmount: number;
  isNitroActive: boolean;
  lap: number;
  lastCheckpoint: number;
  lapTime: number;
  bestLapTime: number;
  totalTime: number;
  finished: boolean;
}

export interface Checkpoint {
  index: number;
  x: number;
  z: number;
  radius: number;
}

export interface TrackConfig {
  checkpoints: Checkpoint[];
  totalLaps: number;
  aiWaypoints: { x: number; z: number }[];
}
