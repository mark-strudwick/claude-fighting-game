"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
class GameEngine {
    constructor() {
        this.ARENA_RADIUS = 300;
        this.PLAYER_SPEED = 200;
        this.PLAYER_RADIUS = 20;
        this.DASH_SPEED = 400;
        this.DASH_DISTANCE = 100;
        this.TELEPORT_DISTANCE = 150;
        this.projectiles = [];
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
        };
    }
    addPlayer(id, name) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
        const playerCount = Object.keys(this.gameState.players).length;
        const angle = (playerCount * Math.PI * 2) / 6;
        const spawnRadius = this.ARENA_RADIUS * 0.7;
        const player = {
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
            abilities: {
                fireball: { cooldown: 0, maxCooldown: 1000 },
                shield: { cooldown: 0, maxCooldown: 5000, active: false, duration: 0 },
                grenade: { cooldown: 0, maxCooldown: 4000 },
                dash: { cooldown: 0, maxCooldown: 1500 },
            },
        };
        this.gameState.players[id] = player;
        if (Object.keys(this.gameState.players).length >= 2) {
            this.gameState.gamePhase = 'playing';
        }
    }
    removePlayer(id) {
        delete this.gameState.players[id];
        if (Object.keys(this.gameState.players).length < 2) {
            this.gameState.gamePhase = 'waiting';
        }
    }
    update(deltaTime, playerInputs) {
        if (this.gameState.gamePhase !== 'playing') {
            return;
        }
        this.updatePlayers(deltaTime, playerInputs);
        this.updateProjectiles(deltaTime);
        this.updateAbilityCooldowns(deltaTime);
        this.updateTimer(deltaTime);
        // Update game state projectiles
        this.gameState.projectiles = [...this.projectiles];
    }
    updatePlayers(deltaTime, playerInputs) {
        Object.values(this.gameState.players).forEach(player => {
            const input = playerInputs.get(player.id);
            if (!input)
                return;
            this.updatePlayerMovement(player, input, deltaTime);
            this.handlePlayerAbilities(player, input, deltaTime);
            this.constrainPlayerToArena(player);
        });
    }
    updatePlayerMovement(player, input, deltaTime) {
        const speed = this.PLAYER_SPEED * (deltaTime / 1000);
        player.velocity.x = 0;
        player.velocity.y = 0;
        if (input.left)
            player.velocity.x -= speed;
        if (input.right)
            player.velocity.x += speed;
        if (input.up)
            player.velocity.y -= speed;
        if (input.down)
            player.velocity.y += speed;
        if (player.velocity.x !== 0 && player.velocity.y !== 0) {
            const normalizer = Math.sqrt(2) / 2;
            player.velocity.x *= normalizer;
            player.velocity.y *= normalizer;
        }
        player.position.x += player.velocity.x;
        player.position.y += player.velocity.y;
    }
    constrainPlayerToArena(player) {
        const distanceFromCenter = Math.sqrt(player.position.x * player.position.x +
            player.position.y * player.position.y);
        const maxDistance = this.ARENA_RADIUS - player.radius;
        if (distanceFromCenter > maxDistance) {
            const angle = Math.atan2(player.position.y, player.position.x);
            player.position.x = Math.cos(angle) * maxDistance;
            player.position.y = Math.sin(angle) * maxDistance;
        }
    }
    updateTimer(deltaTime) {
        if (this.gameState.roundTimer > 0) {
            this.gameState.roundTimer -= deltaTime;
        }
        else {
            this.gameState.gamePhase = 'ended';
        }
    }
    handlePlayerAbilities(player, input, deltaTime) {
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
    castFireball(player) {
        // Calculate direction based on movement or default forward
        let direction = { x: 1, y: 0 };
        if (player.velocity.x !== 0 || player.velocity.y !== 0) {
            const magnitude = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
            direction.x = player.velocity.x / magnitude;
            direction.y = player.velocity.y / magnitude;
        }
        const fireball = {
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
    activateShield(player) {
        player.abilities.shield.active = true;
        player.abilities.shield.duration = 3000; // 3 seconds
    }
    throwGrenade(player, input) {
        // Calculate direction based on movement input or default forward
        let direction = { x: 0, y: 0 };
        if (input.up)
            direction.y -= 1;
        if (input.down)
            direction.y += 1;
        if (input.left)
            direction.x -= 1;
        if (input.right)
            direction.x += 1;
        // If no direction, throw forward
        if (direction.x === 0 && direction.y === 0) {
            direction.x = 1;
        }
        // Normalize direction
        const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);
        if (magnitude > 0) {
            direction.x /= magnitude;
            direction.y /= magnitude;
        }
        const grenade = {
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
    dashPlayer(player, input) {
        let direction = { x: 0, y: 0 };
        if (input.up)
            direction.y -= 1;
        if (input.down)
            direction.y += 1;
        if (input.left)
            direction.x -= 1;
        if (input.right)
            direction.x += 1;
        // If no direction, dash forward
        if (direction.x === 0 && direction.y === 0) {
            direction.x = 1;
        }
        // Normalize direction
        const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);
        if (magnitude > 0) {
            direction.x /= magnitude;
            direction.y /= magnitude;
        }
        const newPosition = {
            x: player.position.x + direction.x * this.DASH_DISTANCE,
            y: player.position.y + direction.y * this.DASH_DISTANCE,
        };
        // Check if new position is within arena
        const distanceFromCenter = Math.sqrt(newPosition.x ** 2 + newPosition.y ** 2);
        const maxDistance = this.ARENA_RADIUS - player.radius;
        if (distanceFromCenter <= maxDistance) {
            player.position = newPosition;
        }
        else {
            // Dash to the edge of the arena in that direction
            const angle = Math.atan2(newPosition.y, newPosition.x);
            player.position.x = Math.cos(angle) * maxDistance;
            player.position.y = Math.sin(angle) * maxDistance;
        }
    }
    updateProjectiles(deltaTime) {
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
                    const distance = Math.sqrt((player.position.x - projectile.position.x) ** 2 +
                        (player.position.y - projectile.position.y) ** 2);
                    if (projectile.type === 'fireball' && distance < player.radius + 10) {
                        // Fireball direct hit
                        if (!player.abilities.shield.active) {
                            player.health -= 20;
                            if (player.health < 0)
                                player.health = 0;
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
    explodeGrenade(grenade) {
        if (!grenade.explosionRadius)
            return;
        // Damage all players within explosion radius
        Object.values(this.gameState.players).forEach(player => {
            if (player.id !== grenade.playerId) {
                const distance = Math.sqrt((player.position.x - grenade.position.x) ** 2 +
                    (player.position.y - grenade.position.y) ** 2);
                if (distance <= grenade.explosionRadius) {
                    if (!player.abilities.shield.active) {
                        // Damage decreases with distance from explosion center
                        const damageMultiplier = 1 - (distance / grenade.explosionRadius);
                        const damage = Math.ceil(35 * damageMultiplier); // Max 35 damage at center
                        player.health -= damage;
                        if (player.health < 0)
                            player.health = 0;
                    }
                }
            }
        });
    }
    updateAbilityCooldowns(deltaTime) {
        Object.values(this.gameState.players).forEach(player => {
            player.abilities.fireball.cooldown = Math.max(0, player.abilities.fireball.cooldown - deltaTime);
            player.abilities.shield.cooldown = Math.max(0, player.abilities.shield.cooldown - deltaTime);
            player.abilities.grenade.cooldown = Math.max(0, player.abilities.grenade.cooldown - deltaTime);
            player.abilities.dash.cooldown = Math.max(0, player.abilities.dash.cooldown - deltaTime);
        });
    }
    getGameState() {
        return { ...this.gameState };
    }
}
exports.GameEngine = GameEngine;
//# sourceMappingURL=gameEngine.js.map