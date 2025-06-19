import { GameState, InputState } from '../shared/types';
export declare class GameEngine {
    private gameState;
    private readonly ARENA_RADIUS;
    private readonly PLAYER_SPEED;
    private readonly PLAYER_RADIUS;
    private readonly DASH_SPEED;
    private readonly DASH_DISTANCE;
    private readonly TELEPORT_DISTANCE;
    private projectiles;
    constructor();
    addPlayer(id: string, name: string): void;
    removePlayer(id: string): void;
    update(deltaTime: number, playerInputs: Map<string, InputState>): void;
    private updatePlayers;
    private updatePlayerMovement;
    private constrainPlayerToArena;
    private updateTimer;
    private handlePlayerAbilities;
    private castFireball;
    private activateShield;
    private throwGrenade;
    private dashPlayer;
    private updateProjectiles;
    private explodeGrenade;
    private updateAbilityCooldowns;
    getGameState(): GameState;
}
//# sourceMappingURL=gameEngine.d.ts.map