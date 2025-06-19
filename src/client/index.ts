import { io, Socket } from 'socket.io-client';
import { GameState, InputState, ServerToClientEvents, ClientToServerEvents } from '../shared/types';
import { GameRenderer } from './renderer';
import { InputManager } from './input';

class GameClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private inputManager: InputManager;
  private gameState: GameState | null = null;
  private lastFrameTime = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.renderer = new GameRenderer(this.ctx, this.canvas.width, this.canvas.height);
    this.inputManager = new InputManager();
    
    this.socket = io('http://localhost:3001');
    this.setupSocketListeners();
    this.startGameLoop();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.updateStatus('Connected');
      this.socket.emit('joinGame', 'Player');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.updateStatus('Disconnected');
    });

    this.socket.on('gameState', (state: GameState) => {
      this.gameState = state;
      this.updatePlayerCount(Object.keys(state.players).length);
    });

    this.socket.on('playerJoined', (playerId: string) => {
      console.log(`Player ${playerId} joined`);
    });

    this.socket.on('playerLeft', (playerId: string) => {
      console.log(`Player ${playerId} left`);
    });
  }

  private startGameLoop(): void {
    const gameLoop = (currentTime: number): void => {
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      this.update(deltaTime);
      this.render();

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }

  private update(deltaTime: number): void {
    const input = this.inputManager.getInputState();
    this.socket.emit('playerInput', input);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.gameState) {
      this.renderer.render(this.gameState);
    } else {
      this.renderer.renderWaitingScreen();
    }
  }

  private updateStatus(status: string): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  private updatePlayerCount(count: number): void {
    const playerCountElement = document.getElementById('playerCount');
    if (playerCountElement) {
      playerCountElement.textContent = `Players: ${count}`;
    }
  }
}

new GameClient();