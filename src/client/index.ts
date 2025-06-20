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
    
    this.setupCanvasSize();
    this.renderer = new GameRenderer(this.ctx, this.canvas.width, this.canvas.height);
    this.inputManager = new InputManager();
    
    this.socket = io('http://localhost:3001');
    this.setupSocketListeners();
    this.setupUIListeners();
    this.startGameLoop();
    
    window.addEventListener('resize', () => this.handleResize());
  }

  private setupCanvasSize(): void {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight * 0.9;
    
    const aspectRatio = 1200 / 800;
    let canvasWidth = Math.min(maxWidth, maxHeight * aspectRatio);
    let canvasHeight = canvasWidth / aspectRatio;
    
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = canvasHeight * aspectRatio;
    }
    
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
  }

  private handleResize(): void {
    this.setupCanvasSize();
    if (this.renderer) {
      this.renderer.updateDimensions(this.canvas.width, this.canvas.height);
    }
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

    this.socket.on('roundEnded', (winningTeam: number, scores: { [team: number]: number }) => {
      this.showRoundEndMessage(winningTeam, scores);
    });

    this.socket.on('gameEnded', (winningTeam: number, finalScores: { [team: number]: number }) => {
      this.showGameEndMessage(winningTeam, finalScores);
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

  private showRoundEndMessage(winningTeam: number, scores: { [team: number]: number }): void {
    const teamColor = winningTeam === 1 ? '#FF6B6B' : '#4ECDC4';
    const message = `Team ${winningTeam} wins the round! Score: ${scores[1]} - ${scores[2]}`;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      color: ${teamColor};
      font-size: 48px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    `;
    
    overlay.innerHTML = `
      <div>ROUND OVER</div>
      <div style="font-size: 32px; margin: 20px 0;">${message}</div>
      <div style="font-size: 24px; color: #fff;">Next round starting soon...</div>
    `;
    
    document.body.appendChild(overlay);
    
    // Remove overlay after 3 seconds
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 3000);
  }

  private showGameEndMessage(winningTeam: number, finalScores: { [team: number]: number }): void {
    const teamColor = winningTeam === 1 ? '#FF6B6B' : '#4ECDC4';
    const message = `Team ${winningTeam} wins the game!`;
    const finalScore = `Final Score: ${finalScores[1]} - ${finalScores[2]}`;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      color: ${teamColor};
      font-size: 64px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    `;
    
    overlay.innerHTML = `
      <div>🏆 VICTORY! 🏆</div>
      <div style="font-size: 48px; margin: 20px 0; color: ${teamColor};">${message}</div>
      <div style="font-size: 32px; color: #fff; margin: 10px 0;">${finalScore}</div>
      <div style="font-size: 24px; color: #888; margin-top: 40px;">Returning to menu...</div>
    `;
    
    document.body.appendChild(overlay);
    
    // Remove overlay after 5 seconds (client should already be back at menu by then)
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 5000);
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