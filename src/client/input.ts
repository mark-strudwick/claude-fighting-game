import { InputState } from '../shared/types';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private previousKeys: { [key: string]: boolean } = {};
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    ability1: false,
    ability2: false,
    ultimate: false,
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      // Prevent default behavior for game keys to stop page scrolling
      if (this.isGameKey(event.code)) {
        event.preventDefault();
      }
      this.keys[event.code] = true;
      this.updateInputState();
    });

    document.addEventListener('keyup', (event) => {
      // Prevent default behavior for game keys to stop page scrolling
      if (this.isGameKey(event.code)) {
        event.preventDefault();
      }
      this.keys[event.code] = false;
      this.updateInputState();
    });

    document.addEventListener('blur', () => {
      this.keys = {};
      this.updateInputState();
    });
  }

  private updateInputState(): void {
    // Movement: WASD only (continuous input)
    this.inputState.up = this.keys['KeyW'] || false;
    this.inputState.down = this.keys['KeyS'] || false;
    this.inputState.left = this.keys['KeyA'] || false;
    this.inputState.right = this.keys['KeyD'] || false;
    
    // Abilities: Q, E, R (trigger only on key press, not hold)
    this.inputState.ability1 = this.isKeyPressed('KeyQ');
    this.inputState.ability2 = this.isKeyPressed('KeyE');
    this.inputState.ultimate = this.isKeyPressed('KeyR');
    
    // Dash: Space (trigger only on key press)
    this.inputState.dash = this.isKeyPressed('Space');
  }

  private isKeyPressed(keyCode: string): boolean {
    return (this.keys[keyCode] || false) && !(this.previousKeys[keyCode] || false);
  }

  private isGameKey(code: string): boolean {
    const gameKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD', // Movement
      'KeyQ', 'KeyE', 'KeyR',         // Abilities
      'Space',                        // Dash
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight' // Prevent arrow key scrolling
    ];
    return gameKeys.includes(code);
  }

  getInputState(): InputState {
    const currentInputState = { ...this.inputState };
    
    // Update previous keys state after getting current input
    this.previousKeys = { ...this.keys };
    
    return currentInputState;
  }
}