import { GameState, Player, InputState, Vector2, Projectile, GameEvents } from '../shared/types';

export class GameEngine {
  private gameState: GameState;
  private readonly ARENA_RADIUS = 300;
  private readonly PLAYER_SPEED = 200;
  private readonly PLAYER_RADIUS = 20;
  private readonly DASH_SPEED = 400;
  private readonly DASH_DISTANCE = 100;
  private readonly TELEPORT_DISTANCE = 150;
  private projectiles: Projectile[] = [];

  constructor() {
    this.gameState = {
      players: {},
      projectiles: [],
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
      countdownTimer: 3000,
      currentRound: 1,
      teamScores: { 1: 0, 2: 0 },
      holdingAreas: {
        team1: { x: -200, y: 0, radius: 80 },
        team2: { x: 200, y: 0, radius: 80 }
      }
    };
  }

  addPlayer(id: string, name: string): void {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const playerCount = Object.keys(this.gameState.players).length;
    
    // Assign teams alternately: first player to team 1, second to team 2, etc.
    const team = (playerCount % 2) + 1;
    const holdingArea = team === 1 ? this.gameState.holdingAreas.team1 : this.gameState.holdingAreas.team2;
    
    // Spawn players in holding areas initially
    const teamPlayerCount = Object.values(this.gameState.players).filter(p => p.team === team).length;
    const angle = (teamPlayerCount * Math.PI * 2) / 3; // Max 3 players per team
    const spawnRadius = holdingArea.radius * 0.5; // Further from center to avoid overlap
    
    const player: Player = {
      id,
      position: {
        x: holdingArea.x + Math.cos(angle) * spawnRadius,
        y: holdingArea.y + Math.sin(angle) * spawnRadius,
      },
      velocity: { x: 0, y: 0 },
      facingDirection: { x: team === 1 ? 1 : -1, y: 0 },
      health: 100,
      maxHealth: 100,
      radius: this.PLAYER_RADIUS,
      color: colors[playerCount % colors.length],
      team: team,
      abilities: {
        fireball: { cooldown: 0, maxCooldown: 1000 },
        shield: { cooldown: 0, maxCooldown: 5000, active: false, duration: 0 },
        grenade: { cooldown: 0, maxCooldown: 4000 },
        dash: { cooldown: 0, maxCooldown: 1500 },
      },
    };

    this.gameState.players[id] = player;
    
    if (Object.keys(this.gameState.players).length >= 2) {
      this.gameState.gamePhase = 'countdown';
      this.gameState.countdownTimer = 3000;
    }
  }

  removePlayer(id: string): void {
    delete this.gameState.players[id];
    
    if (Object.keys(this.gameState.players).length < 2) {
      this.gameState.gamePhase = 'waiting';
    }
  }

  update(deltaTime: number, playerInputs: Map<string, InputState>): GameEvents {
    const events: GameEvents = {
      roundEnded: null,
      gameEnded: null
    };

    if (this.gameState.gamePhase === 'countdown') {
      this.updateCountdown(deltaTime);
    } else if (this.gameState.gamePhase === 'playing') {
      this.updatePlayers(deltaTime, playerInputs);
      this.updateProjectiles(deltaTime);
      this.updateAbilityCooldowns(deltaTime);
      this.updateTimer(deltaTime);
      
      // Check for round end conditions
      const roundResult = this.checkRoundEnd();
      if (roundResult) {
        events.roundEnded = roundResult;
        
        // Check if game should end
        const gameResult = this.checkGameEnd();
        if (gameResult) {
          events.gameEnded = gameResult;
        }
      }
    }
    
    // Update game state projectiles
    this.gameState.projectiles = [...this.projectiles];
    
    return events;
  }

  private updatePlayers(deltaTime: number, playerInputs: Map<string, InputState>): void {
    Object.values(this.gameState.players).forEach(player => {
      const input = playerInputs.get(player.id);
      if (!input) return;

      this.updatePlayerMovement(player, input, deltaTime);
      this.handlePlayerAbilities(player, input, deltaTime);
      
      if (this.gameState.gamePhase === 'countdown') {
        this.constrainPlayerToHoldingArea(player);
      } else {
        this.constrainPlayerToArena(player);
      }
    });
  }

  private updateCountdown(deltaTime: number): void {
    this.gameState.countdownTimer -= deltaTime;
    
    if (this.gameState.countdownTimer <= 0) {
      this.gameState.gamePhase = 'playing';
      this.gameState.roundTimer = 90000; // Reset round timer
    }
  }

  private constrainPlayerToHoldingArea(player: Player): void {
    const holdingArea = player.team === 1 ? this.gameState.holdingAreas.team1 : this.gameState.holdingAreas.team2;
    
    const dx = player.position.x - holdingArea.x;
    const dy = player.position.y - holdingArea.y;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    
    const maxDistance = holdingArea.radius - player.radius;
    
    if (distanceFromCenter > maxDistance) {
      const angle = Math.atan2(dy, dx);
      player.position.x = holdingArea.x + Math.cos(angle) * maxDistance;
      player.position.y = holdingArea.y + Math.sin(angle) * maxDistance;
    }
  }

  private checkRoundEnd(): { winningTeam: number; scores: { [team: number]: number } } | null {
    const team1Players = Object.values(this.gameState.players).filter(p => p.team === 1);
    const team2Players = Object.values(this.gameState.players).filter(p => p.team === 2);
    
    // Only check for round end if we have players from both teams
    if (team1Players.length === 0 || team2Players.length === 0) {
      return null;
    }
    
    const team1Alive = team1Players.some(p => p.health > 0);
    const team2Alive = team2Players.some(p => p.health > 0);
    
    // Only end round if one team is completely eliminated
    if (!team1Alive && team2Alive) {
      this.gameState.teamScores[2]++;
      this.startNewRound();
      return { winningTeam: 2, scores: { ...this.gameState.teamScores } };
    } else if (!team2Alive && team1Alive) {
      this.gameState.teamScores[1]++;
      this.startNewRound();
      return { winningTeam: 1, scores: { ...this.gameState.teamScores } };
    } else if (!team1Alive && !team2Alive) {
      // Tie round, restart without scoring
      this.startNewRound();
      return null;
    }
    
    // Round continues if both teams have living players
    return null;
  }

  private checkGameEnd(): { winningTeam: number; finalScores: { [team: number]: number } } | null {
    if (this.gameState.teamScores[1] >= 3) {
      this.gameState.gamePhase = 'game_ended';
      return { winningTeam: 1, finalScores: { ...this.gameState.teamScores } };
    } else if (this.gameState.teamScores[2] >= 3) {
      this.gameState.gamePhase = 'game_ended';
      return { winningTeam: 2, finalScores: { ...this.gameState.teamScores } };
    }
    
    return null;
  }

  private startNewRound(): void {
    this.gameState.currentRound++;
    this.gameState.gamePhase = 'countdown';
    this.gameState.countdownTimer = 3000;
    this.gameState.roundTimer = 90000;
    
    // Reset all players to full health and move to holding areas
    Object.values(this.gameState.players).forEach(player => {
      player.health = player.maxHealth;
      
      const holdingArea = player.team === 1 ? this.gameState.holdingAreas.team1 : this.gameState.holdingAreas.team2;
      const teamPlayers = Object.values(this.gameState.players).filter(p => p.team === player.team);
      const playerIndex = teamPlayers.findIndex(p => p.id === player.id);
      const angle = (playerIndex * Math.PI * 2) / 3;
      const spawnRadius = holdingArea.radius * 0.5; // Further from center to avoid overlap
      
      player.position.x = holdingArea.x + Math.cos(angle) * spawnRadius;
      player.position.y = holdingArea.y + Math.sin(angle) * spawnRadius;
      player.velocity.x = 0;
      player.velocity.y = 0;
    });
    
    // Clear all projectiles
    this.projectiles = [];
    this.gameState.projectiles = [];
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

    // Update facing direction when moving
    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
      const magnitude = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
      player.facingDirection.x = player.velocity.x / magnitude;
      player.facingDirection.y = player.velocity.y / magnitude;
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
      
      // Check if timer just expired (avoid multiple calls)
      if (this.gameState.roundTimer <= 0) {
        this.gameState.roundTimer = 0;
        // Time expired, end the round as a tie
        this.startNewRound();
      }
    }
  }

  private handlePlayerAbilities(player: Player, input: InputState, deltaTime: number): void {
    // Q - Fireball
    if (input.ability1 && player.abilities.fireball.cooldown <= 0) {
      this.castFireball(player);
      player.abilities.fireball.cooldown = player.abilities.fireball.maxCooldown;
    }

    // E - Shield
    if (input.ability2 && player.abilities.shield.cooldown <= 0) {
      this.activateShield(player);
      player.abilities.shield.cooldown = player.abilities.shield.maxCooldown;
    }

    // R - Grenade
    if (input.ultimate && player.abilities.grenade.cooldown <= 0) {
      this.throwGrenade(player, input);
      player.abilities.grenade.cooldown = player.abilities.grenade.maxCooldown;
    }

    // Space - Dash
    if (input.dash && player.abilities.dash.cooldown <= 0) {
      this.dashPlayer(player, input);
      player.abilities.dash.cooldown = player.abilities.dash.maxCooldown;
    }

    // Update shield duration
    if (player.abilities.shield.active) {
      player.abilities.shield.duration -= deltaTime;
      if (player.abilities.shield.duration <= 0) {
        player.abilities.shield.active = false;
      }
    }
  }

  private castFireball(player: Player): void {
    // Use player's facing direction
    const direction = { x: player.facingDirection.x, y: player.facingDirection.y };

    const fireball: Projectile = {
      id: `fireball_${Date.now()}_${Math.random()}`,
      playerId: player.id,
      position: {
        x: player.position.x + direction.x * (player.radius + 5),
        y: player.position.y + direction.y * (player.radius + 5),
      },
      velocity: {
        x: direction.x * 300,
        y: direction.y * 300,
      },
      lifetime: 2000,
      type: 'fireball',
    };

    this.projectiles.push(fireball);
  }

  private activateShield(player: Player): void {
    player.abilities.shield.active = true;
    player.abilities.shield.duration = 3000; // 3 seconds
  }

  private throwGrenade(player: Player, input: InputState): void {
    // Use player's facing direction
    const direction = { x: player.facingDirection.x, y: player.facingDirection.y };

    const grenade: Projectile = {
      id: `grenade_${Date.now()}_${Math.random()}`,
      playerId: player.id,
      position: {
        x: player.position.x + direction.x * (player.radius + 5),
        y: player.position.y + direction.y * (player.radius + 5),
      },
      velocity: {
        x: direction.x * 150, // Slower than fireball
        y: direction.y * 150,
      },
      lifetime: 5000, // 5 seconds max lifetime
      type: 'grenade',
      explosionTimer: 2000, // 2 seconds until explosion
      explosionRadius: 60, // Explosion radius
    };

    this.projectiles.push(grenade);
  }

  private dashPlayer(player: Player, input: InputState): void {
    // Use player's facing direction
    const direction = { x: player.facingDirection.x, y: player.facingDirection.y };

    const newPosition = {
      x: player.position.x + direction.x * this.DASH_DISTANCE,
      y: player.position.y + direction.y * this.DASH_DISTANCE,
    };

    // Check if new position is within arena
    const distanceFromCenter = Math.sqrt(newPosition.x ** 2 + newPosition.y ** 2);
    const maxDistance = this.ARENA_RADIUS - player.radius;
    
    if (distanceFromCenter <= maxDistance) {
      player.position = newPosition;
    } else {
      // Dash to the edge of the arena in that direction
      const angle = Math.atan2(newPosition.y, newPosition.x);
      player.position.x = Math.cos(angle) * maxDistance;
      player.position.y = Math.sin(angle) * maxDistance;
    }
  }

  private updateProjectiles(deltaTime: number): void {
    this.projectiles = this.projectiles.filter(projectile => {
      // Update position
      projectile.position.x += projectile.velocity.x * (deltaTime / 1000);
      projectile.position.y += projectile.velocity.y * (deltaTime / 1000);
      
      // Update lifetime
      projectile.lifetime -= deltaTime;
      
      // Remove if expired or out of bounds
      const distanceFromCenter = Math.sqrt(projectile.position.x ** 2 + projectile.position.y ** 2);
      if (projectile.lifetime <= 0 || distanceFromCenter > this.ARENA_RADIUS) {
        return false;
      }

      // Check collision with players
      Object.values(this.gameState.players).forEach(player => {
        if (player.id !== projectile.playerId) {
          const distance = Math.sqrt(
            (player.position.x - projectile.position.x) ** 2 + 
            (player.position.y - projectile.position.y) ** 2
          );
          
          if (projectile.type === 'fireball' && distance < player.radius + 10) {
            // Fireball direct hit
            if (!player.abilities.shield.active) {
              player.health -= 20;
              if (player.health < 0) player.health = 0;
            }
            // Remove projectile
            projectile.lifetime = 0;
          }
          // Grenades don't do direct hit damage - they explode after timer
        }
      });

      // Handle grenade explosions
      if (projectile.type === 'grenade' && projectile.explosionTimer !== undefined) {
        projectile.explosionTimer -= deltaTime;
        
        if (projectile.explosionTimer <= 0) {
          // Explode!
          this.explodeGrenade(projectile);
          projectile.lifetime = 0; // Remove after explosion
        }
      }

      return projectile.lifetime > 0;
    });
  }

  private explodeGrenade(grenade: Projectile): void {
    if (!grenade.explosionRadius) return;
    
    // Damage all players within explosion radius
    Object.values(this.gameState.players).forEach(player => {
      if (player.id !== grenade.playerId) {
        const distance = Math.sqrt(
          (player.position.x - grenade.position.x) ** 2 + 
          (player.position.y - grenade.position.y) ** 2
        );
        
        if (distance <= grenade.explosionRadius!) {
          if (!player.abilities.shield.active) {
            // Damage decreases with distance from explosion center
            const damageMultiplier = 1 - (distance / grenade.explosionRadius!);
            const damage = Math.ceil(35 * damageMultiplier); // Max 35 damage at center
            player.health -= damage;
            if (player.health < 0) player.health = 0;
          }
        }
      }
    });
  }

  private updateAbilityCooldowns(deltaTime: number): void {
    Object.values(this.gameState.players).forEach(player => {
      player.abilities.fireball.cooldown = Math.max(0, player.abilities.fireball.cooldown - deltaTime);
      player.abilities.shield.cooldown = Math.max(0, player.abilities.shield.cooldown - deltaTime);
      player.abilities.grenade.cooldown = Math.max(0, player.abilities.grenade.cooldown - deltaTime);
      player.abilities.dash.cooldown = Math.max(0, player.abilities.dash.cooldown - deltaTime);
    });
  }


  getGameState(): GameState {
    return { ...this.gameState };
  }
}