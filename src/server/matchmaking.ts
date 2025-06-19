import { GameMode, QueueRequest, Lobby, LobbyPlayer } from '../shared/types';

interface QueuedPlayer {
  id: string;
  name: string;
  gameMode: GameMode;
  queueTime: number;
}

export class MatchmakingSystem {
  private queues: Map<GameMode, QueuedPlayer[]> = new Map();
  private lobbies: Map<string, Lobby> = new Map();
  private playerToLobby: Map<string, string> = new Map();
  private playerToQueue: Map<string, GameMode> = new Map();
  
  public onLobbyCreated?: (lobby: Lobby) => void;

  constructor() {
    this.queues.set('1v1', []);
    this.queues.set('2v2', []);
    this.queues.set('3v3', []);
    
    setInterval(() => this.processQueues(), 1000);
  }

  joinQueue(playerId: string, request: QueueRequest): boolean {
    if (this.playerToQueue.has(playerId) || this.playerToLobby.has(playerId)) {
      return false;
    }

    const queue = this.queues.get(request.gameMode);
    if (!queue) return false;

    const queuedPlayer: QueuedPlayer = {
      id: playerId,
      name: request.playerName,
      gameMode: request.gameMode,
      queueTime: Date.now()
    };

    queue.push(queuedPlayer);
    this.playerToQueue.set(playerId, request.gameMode);
    return true;
  }

  leaveQueue(playerId: string): boolean {
    const gameMode = this.playerToQueue.get(playerId);
    if (!gameMode) return false;

    const queue = this.queues.get(gameMode);
    if (!queue) return false;

    const index = queue.findIndex(p => p.id === playerId);
    if (index !== -1) {
      queue.splice(index, 1);
      this.playerToQueue.delete(playerId);
      return true;
    }
    return false;
  }

  getQueueInfo(gameMode: GameMode): { playersInQueue: number; estimatedWait: number } {
    const queue = this.queues.get(gameMode);
    if (!queue) return { playersInQueue: 0, estimatedWait: 0 };

    const playersInQueue = queue.length;
    const maxPlayers = this.getMaxPlayersForMode(gameMode);
    const estimatedWait = Math.max(0, (maxPlayers - playersInQueue) * 10); // 10 seconds per missing player

    return { playersInQueue, estimatedWait };
  }

  private processQueues(): void {
    for (const [gameMode, queue] of this.queues) {
      if (queue.length >= this.getMaxPlayersForMode(gameMode)) {
        const lobby = this.createLobby(gameMode, queue);
        if (this.onLobbyCreated) {
          this.onLobbyCreated(lobby);
        }
      }
    }
  }

  private createLobby(gameMode: GameMode, queue: QueuedPlayer[]): Lobby {
    const maxPlayers = this.getMaxPlayersForMode(gameMode);
    const selectedPlayers = queue.splice(0, maxPlayers);
    
    const lobbyId = this.generateLobbyId();
    const lobbyPlayers: LobbyPlayer[] = selectedPlayers.map(p => ({
      id: p.id,
      name: p.name,
      ready: false
    }));

    const lobby: Lobby = {
      id: lobbyId,
      gameMode,
      players: lobbyPlayers,
      maxPlayers,
      status: 'waiting',
      createdAt: Date.now()
    };

    this.lobbies.set(lobbyId, lobby);
    
    selectedPlayers.forEach(player => {
      this.playerToQueue.delete(player.id);
      this.playerToLobby.set(player.id, lobbyId);
    });
    
    return lobby;
  }

  getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  getPlayerLobby(playerId: string): Lobby | undefined {
    const lobbyId = this.playerToLobby.get(playerId);
    return lobbyId ? this.lobbies.get(lobbyId) : undefined;
  }

  setPlayerReady(playerId: string, ready: boolean): Lobby | undefined {
    const lobbyId = this.playerToLobby.get(playerId);
    if (!lobbyId) return undefined;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    const player = lobby.players.find(p => p.id === playerId);
    if (!player) return undefined;

    player.ready = ready;

    if (lobby.players.every(p => p.ready)) {
      lobby.status = 'starting';
    }

    return lobby;
  }

  removeLobby(lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      lobby.players.forEach(player => {
        this.playerToLobby.delete(player.id);
      });
      this.lobbies.delete(lobbyId);
    }
  }

  removePlayerFromLobby(playerId: string): Lobby | undefined {
    const lobbyId = this.playerToLobby.get(playerId);
    if (!lobbyId) return undefined;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    const playerIndex = lobby.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      lobby.players.splice(playerIndex, 1);
      this.playerToLobby.delete(playerId);

      if (lobby.players.length === 0) {
        this.lobbies.delete(lobbyId);
        return undefined;
      }

      lobby.status = 'waiting';
      lobby.players.forEach(p => p.ready = false);
    }

    return lobby;
  }

  private getMaxPlayersForMode(gameMode: GameMode): number {
    switch (gameMode) {
      case '1v1': return 2;
      case '2v2': return 4;
      case '3v3': return 6;
      default: return 2;
    }
  }

  private generateLobbyId(): string {
    return `lobby_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values());
  }

  isPlayerInQueue(playerId: string): boolean {
    return this.playerToQueue.has(playerId);
  }

  isPlayerInLobby(playerId: string): boolean {
    return this.playerToLobby.has(playerId);
  }
}