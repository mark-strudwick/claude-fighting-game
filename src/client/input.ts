import { InputState } from '../shared/types';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    ability1: false,
    ability2: false,
    ultimate: false,
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
      this.updateInputState();
    });

    document.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
      this.updateInputState();
    });

    document.addEventListener('blur', () => {
      this.keys = {};
      this.updateInputState();
    });
  }

  private updateInputState(): void {
    this.inputState.up = this.keys['KeyW'] || this.keys['ArrowUp'] || false;
    this.inputState.down = this.keys['KeyS'] || this.keys['ArrowDown'] || false;
    this.inputState.left = this.keys['KeyA'] || this.keys['ArrowLeft'] || false;
    this.inputState.right = this.keys['KeyD'] || this.keys['ArrowRight'] || false;
    this.inputState.attack = this.keys['Space'] || this.keys['KeyJ'] || false;
    this.inputState.ability1 = this.keys['KeyQ'] || this.keys['KeyU'] || false;
    this.inputState.ability2 = this.keys['KeyE'] || this.keys['KeyI'] || false;
    this.inputState.ultimate = this.keys['KeyR'] || this.keys['KeyO'] || false;
  }

  getInputState(): InputState {
    return { ...this.inputState };
  }
}