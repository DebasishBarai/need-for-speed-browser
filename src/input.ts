export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  nitro: boolean;
  handbrake: boolean;
}

export function setupInput(): InputState {
  const input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    nitro: false,
    handbrake: false,
  };

  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup':    input.forward = true; break;
      case 's': case 'arrowdown':  input.backward = true; break;
      case 'a': case 'arrowleft':  input.left = true; break;
      case 'd': case 'arrowright': input.right = true; break;
      case 'shift':                input.nitro = true; break;
      case ' ':                    input.handbrake = true; break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup':    input.forward = false; break;
      case 's': case 'arrowdown':  input.backward = false; break;
      case 'a': case 'arrowleft':  input.left = false; break;
      case 'd': case 'arrowright': input.right = false; break;
      case 'shift':                input.nitro = false; break;
      case ' ':                    input.handbrake = false; break;
    }
  });

  return input;
}
