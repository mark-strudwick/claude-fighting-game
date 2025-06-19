import { Server as SocketIOServer, Socket } from 'socket.io';
import { GameEngine } from './gameEngine';
import { MatchmakingSystem } from './matchmaking';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InputState, 
  ClientState,
  QueueRequest,
  Lobby 
} from '../shared/types';

export class GameServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private gameEngine: GameEngine;
  private matchmaking: MatchmakingSystem;
  private playerInputs: Map<string, InputState> = new Map();
  private activeGames: Map<string, GameEngine> = new Map(); // lobbyId -> GameEngine
  private playerStates: Map<string, ClientState> = new Map();

  constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
    this.gameEngine = new GameEngine(); // Legacy - will be replaced by per-lobby games
    this.matchmaking = new MatchmakingSystem();
    
    // Set up matchmaking callbacks
    this.matchmaking.onLobbyCreated = (lobby) => {
      this.broadcastLobbyUpdate(lobby);
    };
    
    this.setupSocketListeners();
    this.startGameLoop();
  }

  private setupSocketListeners(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log(`Player connected: ${socket.id}`);
      
      // Initialize player with menu state
      const initialState: ClientState = { screen: 'menu' };
      this.playerStates.set(socket.id, initialState);
      socket.emit('clientStateUpdate', initialState);

      socket.on('joinQueue', (request: QueueRequest) => {
        if (this.matchmaking.joinQueue(socket.id, request)) {
          const queueInfo = this.matchmaking.getQueueInfo(request.gameMode);
          const queueData = {
            gameMode: request.gameMode,
            estimatedWait: queueInfo.estimatedWait,
            playersInQueue: queueInfo.playersInQueue
          };
          
          socket.emit('queueJoined', queueData);
          
          const newState: ClientState = {
            screen: 'queue',
            queueData: queueData
          };
          this.playerStates.set(socket.id, newState);
          socket.emit('clientStateUpdate', newState);
          
          this.broadcastQueueUpdates(request.gameMode);
        } else {
          socket.emit('error', 'Unable to join queue. You may already be in a queue or lobby.');
        }
      });

      socket.on('leaveQueue', () => {
        if (this.matchmaking.leaveQueue(socket.id)) {
          socket.emit('queueLeft');
          const newState: ClientState = { screen: 'menu' };
          this.playerStates.set(socket.id, newState);
          socket.emit('clientStateUpdate', newState);
        }
      });

      socket.on('readyUp', () => {
        const lobby = this.matchmaking.setPlayerReady(socket.id, true);
        if (lobby) {
          this.broadcastLobbyUpdate(lobby);
          
          if (lobby.status === 'starting') {
            this.startGameFromLobby(lobby);
          }
        }
      });

      socket.on('leaveLobby', () => {
        const lobby = this.matchmaking.removePlayerFromLobby(socket.id);
        if (lobby) {
          this.broadcastLobbyUpdate(lobby);
        }
        
        const newState: ClientState = { screen: 'menu' };
        this.playerStates.set(socket.id, newState);
        socket.emit('clientStateUpdate', newState);
      });

      socket.on('playerInput', (input: InputState) => {
        this.playerInputs.set(socket.id, input);
      });

      socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        // Clean up from queue
        this.matchmaking.leaveQueue(socket.id);
        
        // Clean up from lobby
        const lobby = this.matchmaking.removePlayerFromLobby(socket.id);
        if (lobby) {
          this.broadcastLobbyUpdate(lobby);
        }
        
        // Clean up from active game
        this.playerInputs.delete(socket.id);
        this.playerStates.delete(socket.id);
        
        // Legacy cleanup
        this.gameEngine.removePlayer(socket.id);
      });
    });
  }

  private startGameLoop(): void {
    const TICK_RATE = 60;
    const TICK_INTERVAL = 1000 / TICK_RATE;
    
    setInterval(() => {
      this.gameEngine.update(TICK_INTERVAL, this.playerInputs);
      this.broadcastGameState();
    }, TICK_INTERVAL);
  }

  private broadcastGameState(): void {
    const gameState = this.gameEngine.getGameState();
    this.io.emit('gameState', gameState);
  }

  private broadcastQueueUpdates(gameMode: string): void {
    // Update all players in the same queue about the new queue status
    for (const [playerId, state] of this.playerStates) {
      if (state.screen === 'queue' && state.queueData?.gameMode === gameMode) {
        const queueInfo = this.matchmaking.getQueueInfo(gameMode as any);
        const socket = this.io.sockets.sockets.get(playerId);
        if (socket) {
          socket.emit('queueUpdate', {
            estimatedWait: queueInfo.estimatedWait,
            playersInQueue: queueInfo.playersInQueue
          });
        }
      }
    }
  }

  private broadcastLobbyUpdate(lobby: Lobby): void {
    for (const player of lobby.players) {
      const socket = this.io.sockets.sockets.get(player.id);
      if (socket) {
        const newState: ClientState = {
          screen: 'lobby',
          lobbyData: lobby
        };
        this.playerStates.set(player.id, newState);
        socket.emit('clientStateUpdate', newState);
        socket.emit('lobbyUpdate', lobby);
      }
    }
  }

  private async startGameFromLobby(lobby: Lobby): Promise<void> {
    // Notify players that game is starting
    for (const player of lobby.players) {
      const socket = this.io.sockets.sockets.get(player.id);
      if (socket) {
        socket.emit('gameStarting', 5); // 5 second countdown
      }
    }

    // Wait for countdown
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Create new game engine for this lobby
    const gameEngine = new GameEngine();
    this.activeGames.set(lobby.id, gameEngine);

    // Add players to the game
    for (const player of lobby.players) {
      gameEngine.addPlayer(player.id, player.name);
      
      const newState: ClientState = {
        screen: 'game',
        gameData: gameEngine.getGameState()
      };
      this.playerStates.set(player.id, newState);
      
      const socket = this.io.sockets.sockets.get(player.id);
      if (socket) {
        socket.emit('clientStateUpdate', newState);
      }
    }

    // Start the game loop for this lobby
    this.startLobbyGameLoop(lobby.id, gameEngine);

    // Mark lobby as in_game
    lobby.status = 'in_game';
  }

  private startLobbyGameLoop(lobbyId: string, gameEngine: GameEngine): void {
    const TICK_RATE = 60;
    const TICK_INTERVAL = 1000 / TICK_RATE;
    
    const gameLoop = setInterval(() => {
      const lobby = this.matchmaking.getLobby(lobbyId);
      if (!lobby || lobby.status !== 'in_game') {
        clearInterval(gameLoop);
        this.activeGames.delete(lobbyId);
        return;
      }

      // Get inputs from players in this lobby
      const lobbyInputs = new Map<string, InputState>();
      for (const player of lobby.players) {
        const input = this.playerInputs.get(player.id);
        if (input) {
          lobbyInputs.set(player.id, input);
        }
      }

      // Update game
      gameEngine.update(TICK_INTERVAL, lobbyInputs);
      const gameState = gameEngine.getGameState();

      // Broadcast to players in this lobby only
      for (const player of lobby.players) {
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
          socket.emit('gameState', gameState);
        }
      }
    }, TICK_INTERVAL);
  }
}