import { TrackConfig } from './types';

// Oval-style track with checkpoints around the circuit
// The track is laid out as a rounded rectangle approximately 200x100 units
export const TRACK_CONFIG: TrackConfig = {
  totalLaps: 3,
  checkpoints: [
    { index: 0, x: 0, z: 80, radius: 20 },     // North straight (start/finish)
    { index: 1, x: 60, z: 60, radius: 20 },     // NE corner
    { index: 2, x: 80, z: 0, radius: 20 },      // East straight
    { index: 3, x: 60, z: -60, radius: 20 },    // SE corner
    { index: 4, x: 0, z: -80, radius: 20 },     // South straight
    { index: 5, x: -60, z: -60, radius: 20 },   // SW corner
    { index: 6, x: -80, z: 0, radius: 20 },     // West straight
    { index: 7, x: -60, z: 60, radius: 20 },    // NW corner
  ],
  aiWaypoints: [
    { x: 0, z: 80 },
    { x: 30, z: 75 },
    { x: 55, z: 60 },
    { x: 72, z: 40 },
    { x: 80, z: 15 },
    { x: 80, z: -15 },
    { x: 72, z: -40 },
    { x: 55, z: -60 },
    { x: 30, z: -75 },
    { x: 0, z: -80 },
    { x: -30, z: -75 },
    { x: -55, z: -60 },
    { x: -72, z: -40 },
    { x: -80, z: -15 },
    { x: -80, z: 15 },
    { x: -72, z: 40 },
    { x: -55, z: 60 },
    { x: -30, z: 75 },
  ],
};
