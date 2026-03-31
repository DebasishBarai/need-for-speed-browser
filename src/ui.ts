import { CarState } from './types';
import { getSpeedKmh } from './car';

function formatTime(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return '--:--.---';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function getPositionSuffix(pos: number): string {
  if (pos === 1) return 'st';
  if (pos === 2) return 'nd';
  if (pos === 3) return 'rd';
  return 'th';
}

export function updateUI(
  car: CarState,
  position: number,
  totalRacers: number,
  totalLaps: number,
): void {
  // Speedometer
  const speedEl = document.getElementById('speed-value');
  if (speedEl) {
    const kmh = Math.round(getSpeedKmh(car));
    speedEl.textContent = String(kmh);

    // Color based on speed
    if (car.isNitroActive) {
      speedEl.style.textShadow = '0 0 30px rgba(0, 255, 200, 1), 0 0 60px rgba(0, 200, 255, 0.5)';
    } else if (kmh > 180) {
      speedEl.style.textShadow = '0 0 20px rgba(255, 50, 50, 0.8)';
    } else {
      speedEl.style.textShadow = '0 0 20px rgba(0, 200, 255, 0.8)';
    }
  }

  // Nitro bar
  const nitroBar = document.getElementById('nitro-bar');
  if (nitroBar) {
    const pct = car.nitroAmount;
    nitroBar.style.height = `${pct}%`;
    if (car.isNitroActive) {
      nitroBar.style.background = 'linear-gradient(to top, #00ffcc, #fff)';
    } else {
      nitroBar.style.background = 'linear-gradient(to top, #00aaff, #00ffcc)';
    }
  }

  // Lap info
  const lapCounter = document.getElementById('lap-counter');
  if (lapCounter) {
    lapCounter.textContent = `LAP ${Math.min(car.lap, totalLaps)}/${totalLaps}`;
  }

  const lapTime = document.getElementById('lap-time');
  if (lapTime) {
    lapTime.textContent = formatTime(car.lapTime);
  }

  const bestTime = document.getElementById('best-time');
  if (bestTime) {
    bestTime.textContent = `BEST ${formatTime(car.bestLapTime)}`;
  }

  // Position
  const posEl = document.getElementById('race-position');
  if (posEl) {
    const suffix = getPositionSuffix(position);
    posEl.innerHTML = `${position}<span id="position-suffix">${suffix}</span>`;
  }

  const totalEl = document.getElementById('total-racers');
  if (totalEl) {
    totalEl.textContent = `/ ${totalRacers}`;
  }
}

export function showCountdown(text: string): void {
  const el = document.getElementById('countdown');
  if (el) {
    el.style.display = 'block';
    el.textContent = text;
    if (text === 'GO!') {
      el.style.color = '#0f0';
      el.style.textShadow = '0 0 40px rgba(0, 255, 0, 0.8)';
    } else {
      el.style.color = '#fff';
      el.style.textShadow = '0 0 40px rgba(255, 0, 0, 0.8)';
    }
  }
}

export function hideCountdown(): void {
  const el = document.getElementById('countdown');
  if (el) {
    el.style.display = 'none';
  }
}

export function showFinishMessage(position: number): void {
  const el = document.getElementById('countdown');
  if (el) {
    el.style.display = 'block';
    const suffix = getPositionSuffix(position);
    if (position === 1) {
      el.textContent = '1st PLACE!';
      el.style.color = '#ffd700';
      el.style.textShadow = '0 0 40px rgba(255, 215, 0, 0.8)';
      el.style.fontSize = '80px';
    } else {
      el.textContent = `${position}${suffix} PLACE`;
      el.style.color = '#ccc';
      el.style.textShadow = '0 0 40px rgba(200, 200, 200, 0.5)';
      el.style.fontSize = '80px';
    }
  }
}
