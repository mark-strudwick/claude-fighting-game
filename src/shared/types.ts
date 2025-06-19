export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Vector2;
  velocity: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  color: string;
  team: number;
}

export interface GameState {
  players: { [id: string]: Player };
  arena: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    radius: number;
  };
  gameMode: '1v1' | '2v2' | '3v3';
  roundTimer: number;
  gamePhase: 'waiting' | 'countdown' | 'playing' | 'ended';
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  ability1: boolean;
  ability2: boolean;
  ultimate: boolean;
}

export interface ClientToServerEvents {
  playerInput: (input: InputState) => void;
  joinGame: (playerName: string) => void;
}

export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  playerJoined: (playerId: string) => void;
  playerLeft: (playerId: string) => void;
  gameStarted: () => void;
  gameEnded: (winner: string) => void;
}