import { Server as SocketIOServer, Socket } from 'socket.io';
import { GameEngine } from './gameEngine';
import { ClientToServerEvents, ServerToClientEvents, InputState } from '../shared/types';

export class GameServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private gameEngine: GameEngine;
  private playerInputs: Map<string, InputState> = new Map();

  constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
    this.gameEngine = new GameEngine();
    this.setupSocketListeners();
    this.startGameLoop();
  }

  private setupSocketListeners(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log(`Player connected: ${socket.id}`);

      socket.on('joinGame', (playerName: string) => {
        this.gameEngine.addPlayer(socket.id, playerName);
        socket.emit('playerJoined', socket.id);
        this.broadcastGameState();
      });

      socket.on('playerInput', (input: InputState) => {
        this.playerInputs.set(socket.id, input);
      });

      socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        this.gameEngine.removePlayer(socket.id);
        this.playerInputs.delete(socket.id);
        this.io.emit('playerLeft', socket.id);
        this.broadcastGameState();
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
}