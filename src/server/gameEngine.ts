import { GameState, Player, InputState, Vector2 } from '../shared/types';

export class GameEngine {
  private gameState: GameState;
  private readonly ARENA_RADIUS = 300;
  private readonly PLAYER_SPEED = 200;
  private readonly PLAYER_RADIUS = 20;

  constructor() {
    this.gameState = {
      players: {},
      arena: {
        width: 600,
        height: 600,
        centerX: 0,
        centerY: 0,
        radius: this.ARENA_RADIUS,
      },
      gameMode: '1v1',
      roundTimer: 90000,
      gamePhase: 'waiting',
    };
  }

  addPlayer(id: string, name: string): void {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const playerCount = Object.keys(this.gameState.players).length;
    
    const angle = (playerCount * Math.PI * 2) / 6;
    const spawnRadius = this.ARENA_RADIUS * 0.7;
    
    const player: Player = {
      id,
      position: {
        x: Math.cos(angle) * spawnRadius,
        y: Math.sin(angle) * spawnRadius,
      },
      velocity: { x: 0, y: 0 },
      health: 100,
      maxHealth: 100,
      radius: this.PLAYER_RADIUS,
      color: colors[playerCount % colors.length],
      team: playerCount < 3 ? 1 : 2,
    };

    this.gameState.players[id] = player;
    
    if (Object.keys(this.gameState.players).length >= 2) {
      this.gameState.gamePhase = 'playing';
    }
  }

  removePlayer(id: string): void {
    delete this.gameState.players[id];
    
    if (Object.keys(this.gameState.players).length < 2) {
      this.gameState.gamePhase = 'waiting';
    }
  }

  update(deltaTime: number, playerInputs: Map<string, InputState>): void {
    if (this.gameState.gamePhase !== 'playing') {
      return;
    }

    this.updatePlayers(deltaTime, playerInputs);
    this.updateTimer(deltaTime);
  }

  private updatePlayers(deltaTime: number, playerInputs: Map<string, InputState>): void {
    Object.values(this.gameState.players).forEach(player => {
      const input = playerInputs.get(player.id);
      if (!input) return;

      this.updatePlayerMovement(player, input, deltaTime);
      this.constrainPlayerToArena(player);
    });
  }

  private updatePlayerMovement(player: Player, input: InputState, deltaTime: number): void {
    const speed = this.PLAYER_SPEED * (deltaTime / 1000);
    
    player.velocity.x = 0;
    player.velocity.y = 0;

    if (input.left) player.velocity.x -= speed;
    if (input.right) player.velocity.x += speed;
    if (input.up) player.velocity.y -= speed;
    if (input.down) player.velocity.y += speed;

    if (player.velocity.x !== 0 && player.velocity.y !== 0) {
      const normalizer = Math.sqrt(2) / 2;
      player.velocity.x *= normalizer;
      player.velocity.y *= normalizer;
    }

    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;
  }

  private constrainPlayerToArena(player: Player): void {
    const distanceFromCenter = Math.sqrt(
      player.position.x * player.position.x + 
      player.position.y * player.position.y
    );

    const maxDistance = this.ARENA_RADIUS - player.radius;
    
    if (distanceFromCenter > maxDistance) {
      const angle = Math.atan2(player.position.y, player.position.x);
      player.position.x = Math.cos(angle) * maxDistance;
      player.position.y = Math.sin(angle) * maxDistance;
    }
  }

  private updateTimer(deltaTime: number): void {
    if (this.gameState.roundTimer > 0) {
      this.gameState.roundTimer -= deltaTime;
    } else {
      this.gameState.gamePhase = 'ended';
    }
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }
}