export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Vector2;
  velocity: Vector2;
  facingDirection: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  color: string;
  team: number;
  abilities: {
    fireball: { cooldown: number; maxCooldown: number };
    shield: { cooldown: number; maxCooldown: number; active: boolean; duration: number };
    grenade: { cooldown: number; maxCooldown: number };
    dash: { cooldown: number; maxCooldown: number };
  };
}

export interface Projectile {
  id: string;
  playerId: string;
  position: Vector2;
  velocity: Vector2;
  lifetime: number;
  type: 'fireball' | 'grenade';
  explosionTimer?: number; // For grenades
  explosionRadius?: number; // For grenades
}

export interface GameState {
  players: { [id: string]: Player };
  projectiles: Projectile[];
  arena: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    radius: number;
  };
  gameMode: '1v1' | '2v2' | '3v3';
  roundTimer: number;
  gamePhase: 'waiting' | 'countdown' | 'playing' | 'round_ended' | 'game_ended';
  countdownTimer: number;
  currentRound: number;
  teamScores: { [team: number]: number };
  holdingAreas: {
    team1: { x: number; y: number; radius: number };
    team2: { x: number; y: number; radius: number };
  };
}

export type GameMode = '1v1' | '2v2' | '3v3';

export interface QueueRequest {
  gameMode: GameMode;
  playerName: string;
}

export interface Lobby {
  id: string;
  gameMode: GameMode;
  players: LobbyPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'full' | 'starting' | 'in_game';
  createdAt: number;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export interface ClientState {
  screen: 'menu' | 'queue' | 'lobby' | 'game';
  queueData?: {
    gameMode: GameMode;
    estimatedWait: number;
    playersInQueue: number;
  };
  lobbyData?: Lobby;
  gameData?: GameState;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;      // Space - dash ability
  ability1: boolean;  // Q - fireball
  ability2: boolean;  // E - shield
  ultimate: boolean;  // R - grenade
}

export interface ClientToServerEvents {
  playerInput: (input: InputState) => void;
  joinQueue: (request: QueueRequest) => void;
  leaveQueue: () => void;
  readyUp: () => void;
  leaveLobby: () => void;
}

export interface GameEvents {
  roundEnded: { winningTeam: number; scores: { [team: number]: number } } | null;
  gameEnded: { winningTeam: number; finalScores: { [team: number]: number } } | null;
}

export interface ServerToClientEvents {
  clientStateUpdate: (state: ClientState) => void;
  queueJoined: (queueData: { gameMode: GameMode; estimatedWait: number; playersInQueue: number }) => void;
  queueLeft: () => void;
  queueUpdate: (queueData: { gameMode: GameMode; estimatedWait: number; playersInQueue: number }) => void;
  lobbyJoined: (lobby: Lobby) => void;
  lobbyUpdate: (lobby: Lobby) => void;
  gameStarting: (countdown: number) => void;
  gameState: (state: GameState) => void;
  roundEnded: (winningTeam: number, scores: { [team: number]: number }) => void;
  gameEnded: (winningTeam: number, finalScores: { [team: number]: number }) => void;
  error: (message: string) => void;
}