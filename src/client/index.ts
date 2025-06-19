import { io, Socket } from 'socket.io-client';
import { 
  GameState, 
  InputState, 
  ServerToClientEvents, 
  ClientToServerEvents,
  ClientState,
  GameMode,
  Lobby 
} from '../shared/types';
import { GameRenderer } from './renderer';
import { InputManager } from './input';

class GameClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private inputManager: InputManager;
  private gameState: GameState | null = null;
  private clientState: ClientState | null = null;
  private lastFrameTime = 0;
  private currentScreen: string = 'menu';
  private currentPlayerId: string | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.renderer = new GameRenderer(this.ctx, this.canvas.width, this.canvas.height);
    this.inputManager = new InputManager();
    
    this.socket = io('http://localhost:3001');
    this.setupSocketListeners();
    this.setupUIListeners();
    this.startGameLoop();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.currentPlayerId = this.socket.id || null;
      this.updateConnectionStatus('Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.updateConnectionStatus('Disconnected');
    });

    this.socket.on('clientStateUpdate', (state: ClientState) => {
      this.clientState = state;
      this.switchScreen(state.screen);
      this.updateUIForState(state);
    });

    this.socket.on('queueJoined', (queueData) => {
      this.updateQueueUI(queueData);
    });

    this.socket.on('queueUpdate', (queueData) => {
      this.updateQueueUI(queueData);
    });

    this.socket.on('lobbyUpdate', (lobby: Lobby) => {
      this.updateLobbyUI(lobby);
    });

    this.socket.on('gameStarting', (countdown: number) => {
      this.showGameStartingCountdown(countdown);
    });

    this.socket.on('gameState', (state: GameState) => {
      this.gameState = state;
    });

    this.socket.on('gameEnded', (winner: string) => {
      console.log(`Game ended! Winner: ${winner}`);
      // TODO: Show game over screen
    });

    this.socket.on('error', (message: string) => {
      alert(`Error: ${message}`);
    });
  }

  private setupUIListeners(): void {
    // Game mode selection
    document.querySelectorAll('.game-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const gameMode = target.dataset.mode as GameMode;
        this.joinQueue(gameMode);
      });
    });

    // Queue controls
    document.getElementById('leaveQueueBtn')?.addEventListener('click', () => {
      this.leaveQueue();
    });

    // Lobby controls
    document.getElementById('readyBtn')?.addEventListener('click', () => {
      this.readyUp();
    });

    document.getElementById('leaveLobbyBtn')?.addEventListener('click', () => {
      this.leaveLobby();
    });

    // Player name input
    const nameInput = document.getElementById('playerNameInput') as HTMLInputElement;
    nameInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value.length > 20) {
        target.value = target.value.substring(0, 20);
      }
    });
  }

  private joinQueue(gameMode: GameMode): void {
    const nameInput = document.getElementById('playerNameInput') as HTMLInputElement;
    const playerName = nameInput.value.trim() || 'Player';
    
    this.socket.emit('joinQueue', { gameMode, playerName });
  }

  private leaveQueue(): void {
    this.socket.emit('leaveQueue');
  }

  private readyUp(): void {
    this.socket.emit('readyUp');
  }

  private leaveLobby(): void {
    this.socket.emit('leaveLobby');
  }

  private switchScreen(screenName: string): void {
    if (this.currentScreen === screenName) return;
    
    // Hide current screen
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show new screen
    const newScreen = document.getElementById(`${screenName}Screen`);
    if (newScreen) {
      newScreen.classList.add('active');
      this.currentScreen = screenName;
    }
  }

  private updateConnectionStatus(status: string): void {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  private updateUIForState(state: ClientState): void {
    switch (state.screen) {
      case 'queue':
        if (state.queueData) {
          this.updateQueueUI(state.queueData);
        }
        break;
      case 'lobby':
        if (state.lobbyData) {
          this.updateLobbyUI(state.lobbyData);
        }
        break;
    }
  }

  private updateQueueUI(queueData: any): void {
    const modeElement = document.getElementById('queueMode');
    const playersElement = document.getElementById('queuePlayers');
    const estimateElement = document.getElementById('queueEstimate');

    if (modeElement) modeElement.textContent = `Game Mode: ${queueData.gameMode}`;
    if (playersElement) playersElement.textContent = `Players in queue: ${queueData.playersInQueue}`;
    if (estimateElement) estimateElement.textContent = `Estimated wait: ${queueData.estimatedWait}s`;
  }

  private updateLobbyUI(lobby: Lobby): void {
    const modeElement = document.getElementById('lobbyMode');
    const playerListElement = document.getElementById('playerList');
    const statusElement = document.getElementById('lobbyStatus');

    if (modeElement) {
      modeElement.textContent = `Game Mode: ${lobby.gameMode}`;
    }

    if (playerListElement) {
      playerListElement.innerHTML = '';
      lobby.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = `player-card ${player.ready ? 'ready' : ''}`;
        playerCard.innerHTML = `
          <div>${player.name}</div>
          <div>${player.ready ? 'Ready' : 'Not Ready'}</div>
        `;
        playerListElement.appendChild(playerCard);
      });
    }

    if (statusElement) {
      const readyCount = lobby.players.filter(p => p.ready).length;
      const totalCount = lobby.players.length;
      
      if (lobby.status === 'starting') {
        statusElement.textContent = 'Game starting...';
      } else {
        statusElement.textContent = `${readyCount}/${totalCount} players ready`;
      }
    }
  }

  private showGameStartingCountdown(countdown: number): void {
    // TODO: Implement countdown overlay
    console.log(`Game starting in ${countdown} seconds`);
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
    if (this.currentScreen === 'game') {
      const input = this.inputManager.getInputState();
      this.socket.emit('playerInput', input);
    }
  }

  private render(): void {
    if (this.currentScreen === 'game') {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (this.gameState) {
        this.renderer.render(this.gameState, this.currentPlayerId);
      } else {
        this.renderer.renderWaitingScreen();
      }
    } else {
      // Clear canvas when not in game screen to prevent artifacts
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

new GameClient();