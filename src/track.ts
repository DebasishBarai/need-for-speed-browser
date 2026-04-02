import { TrackConfig } from './types';

// Smooth oval circuit with more waypoints for smoother track geometry
export const TRACK_CONFIG: TrackConfig = {
  totalLaps: 3,
  checkpoints: [
    { index: 0, x: 0, z: 85, radius: 22 },
    { index: 1, x: 60, z: 60, radius: 22 },
    { index: 2, x: 85, z: 0, radius: 22 },
    { index: 3, x: 60, z: -60, radius: 22 },
    { index: 4, x: 0, z: -85, radius: 22 },
    { index: 5, x: -60, z: -60, radius: 22 },
    { index: 6, x: -85, z: 0, radius: 22 },
    { index: 7, x: -60, z: 60, radius: 22 },
  ],
  aiWaypoints: [
    // North straight
    { x: 0, z: 85 },
    { x: 15, z: 84 },
    { x: 30, z: 80 },
    // NE curve (smoother)
    { x: 45, z: 73 },
    { x: 57, z: 63 },
    { x: 67, z: 50 },
    { x: 75, z: 35 },
    // East straight
    { x: 80, z: 18 },
    { x: 83, z: 0 },
    { x: 80, z: -18 },
    // SE curve
    { x: 75, z: -35 },
    { x: 67, z: -50 },
    { x: 57, z: -63 },
    { x: 45, z: -73 },
    // South straight
    { x: 30, z: -80 },
    { x: 15, z: -84 },
    { x: 0, z: -85 },
    { x: -15, z: -84 },
    { x: -30, z: -80 },
    // SW curve
    { x: -45, z: -73 },
    { x: -57, z: -63 },
    { x: -67, z: -50 },
    { x: -75, z: -35 },
    // West straight
    { x: -80, z: -18 },
    { x: -83, z: 0 },
    { x: -80, z: 18 },
    // NW curve
    { x: -75, z: 35 },
    { x: -67, z: 50 },
    { x: -57, z: 63 },
    { x: -45, z: 73 },
    // Back to north
    { x: -30, z: 80 },
    { x: -15, z: 84 },
  ],
};
