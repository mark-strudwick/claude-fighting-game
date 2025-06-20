import { GameState, Player, Projectile } from '../shared/types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(gameState: GameState, currentPlayerId?: string | null): void {
    // Save initial canvas state
    this.ctx.save();
    
    // Reset canvas state to prevent flashing
    this.ctx.globalAlpha = 1.0;
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    
    this.renderArena(gameState.arena);
    this.renderHoldingAreas(gameState);
    this.renderPlayers(gameState.players, currentPlayerId);
    this.renderProjectiles(gameState.projectiles);
    this.renderUI(gameState);
    this.renderControls();
    
    if (currentPlayerId && gameState.players[currentPlayerId]) {
      this.renderPlayerHotbar(gameState.players[currentPlayerId]);
    }
    
    // Restore initial canvas state
    this.ctx.restore();
  }

  renderWaitingScreen(): void {
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Waiting for game state...', this.width / 2, this.height / 2);
  }

  private renderArena(arena: { width: number; height: number; centerX: number; centerY: number; radius: number }): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, arena.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, arena.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderHoldingAreas(gameState: GameState): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Team 1 holding area (left side)
    const team1X = centerX + gameState.holdingAreas.team1.x;
    const team1Y = centerY + gameState.holdingAreas.team1.y;
    
    this.ctx.strokeStyle = '#FF6B6B';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.arc(team1X, team1Y, gameState.holdingAreas.team1.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Team 2 holding area (right side)
    const team2X = centerX + gameState.holdingAreas.team2.x;
    const team2Y = centerY + gameState.holdingAreas.team2.y;
    
    this.ctx.strokeStyle = '#4ECDC4';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.arc(team2X, team2Y, gameState.holdingAreas.team2.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Reset line dash
    this.ctx.setLineDash([]);
    
    // Team labels
    this.ctx.fillStyle = '#FF6B6B';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Team 1', team1X, team1Y - gameState.holdingAreas.team1.radius - 10);
    
    this.ctx.fillStyle = '#4ECDC4';
    this.ctx.fillText('Team 2', team2X, team2Y - gameState.holdingAreas.team2.radius - 10);
  }

  private renderPlayers(players: { [id: string]: Player }, currentPlayerId?: string | null): void {
    Object.values(players).forEach(player => {
      this.renderPlayer(player, player.id === currentPlayerId);
    });
  }

  private renderPlayer(player: Player, isCurrentPlayer: boolean = false): void {
    const screenX = this.width / 2 + player.position.x;
    const screenY = this.height / 2 + player.position.y;
    
    // Render shield effect
    if (player.abilities.shield.active) {
      this.ctx.strokeStyle = '#00BFFF';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, player.radius + 8, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    this.ctx.fillStyle = player.color;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.renderHealthBar(player, screenX, screenY);
    
    // Only render ability cooldowns for other players (not current player)
    if (!isCurrentPlayer) {
      this.renderAbilityCooldowns(player, screenX, screenY);
    }
  }

  private renderHealthBar(player: Player, x: number, y: number): void {
    const barWidth = 40;
    const barHeight = 6;
    const barY = y - player.radius - 15;
    
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);
    
    const healthPercent = player.health / player.maxHealth;
    const healthColor = healthPercent > 0.6 ? '#4CAF50' : healthPercent > 0.3 ? '#FFC107' : '#F44336';
    
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - barWidth / 2, barY, barWidth, barHeight);
  }

  private renderProjectiles(projectiles: Projectile[]): void {
    projectiles.forEach(projectile => {
      this.ctx.save();
      
      const screenX = this.width / 2 + projectile.position.x;
      const screenY = this.height / 2 + projectile.position.y;
      
      if (projectile.type === 'fireball') {
        // Render fireball with glow effect
        this.ctx.shadowColor = '#FF4500';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#FF6347';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner flame
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (projectile.type === 'grenade') {
        // Render grenade
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Grenade highlight
        this.ctx.fillStyle = '#666';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 2, screenY - 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Explosion warning circle when about to explode
        if (projectile.explosionTimer !== undefined && projectile.explosionTimer < 500) {
          const alpha = Math.sin((500 - projectile.explosionTimer) / 100) * 0.5 + 0.5;
          this.ctx.globalAlpha = alpha;
          this.ctx.strokeStyle = '#FF0000';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(screenX, screenY, projectile.explosionRadius || 60, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
      
      this.ctx.restore();
    });
  }

  private renderAbilityCooldowns(player: Player, x: number, y: number): void {
    const cooldownY = y + player.radius + 25;
    const iconSize = 12;
    const spacing = 16;
    
    // Q - Fireball
    this.renderAbilityIcon(x - spacing * 1.5, cooldownY, iconSize, '#FF4500', 'Q', 
      player.abilities.fireball.cooldown, player.abilities.fireball.maxCooldown);
    
    // E - Shield
    this.renderAbilityIcon(x - spacing * 0.5, cooldownY, iconSize, '#00BFFF', 'E', 
      player.abilities.shield.cooldown, player.abilities.shield.maxCooldown);
    
    // R - Grenade
    this.renderAbilityIcon(x + spacing * 0.5, cooldownY, iconSize, '#4a4a4a', 'R', 
      player.abilities.grenade.cooldown, player.abilities.grenade.maxCooldown);
    
    // Space - Dash
    this.renderAbilityIcon(x + spacing * 1.5, cooldownY, iconSize, '#32CD32', '↑', 
      player.abilities.dash.cooldown, player.abilities.dash.maxCooldown);
  }

  private renderAbilityIcon(x: number, y: number, size: number, color: string, text: string, 
                          cooldown: number, maxCooldown: number): void {
    this.ctx.save();
    
    const isOnCooldown = cooldown > 0;
    const alpha = isOnCooldown ? 0.3 : 1.0;
    
    // Background circle
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Cooldown overlay
    if (isOnCooldown) {
      const cooldownPercent = cooldown / maxCooldown;
      this.ctx.globalAlpha = 0.7;
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.arc(x, y, size / 2, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    // Text
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
  }

  private renderControls(): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'right';
    
    const controlsX = this.width - 10;
    let controlsY = 30;
    
    this.ctx.fillText('Controls:', controlsX, controlsY);
    controlsY += 20;
    this.ctx.fillText('WASD - Move', controlsX, controlsY);
    controlsY += 15;
    this.ctx.fillText('Q - Fireball', controlsX, controlsY);
    controlsY += 15;
    this.ctx.fillText('E - Shield', controlsX, controlsY);
    controlsY += 15;
    this.ctx.fillText('R - Grenade', controlsX, controlsY);
    controlsY += 15;
    this.ctx.fillText('Space - Dash', controlsX, controlsY);
  }

  private renderUI(gameState: GameState): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    
    this.ctx.fillText(`Game Mode: ${gameState.gameMode}`, 10, 30);
    this.ctx.fillText(`Round: ${gameState.currentRound}`, 10, 50);
    
    if (gameState.gamePhase === 'playing') {
      this.ctx.fillText(`Time: ${Math.ceil(gameState.roundTimer / 1000)}s`, 10, 70);
    }
    
    // Render countdown
    if (gameState.gamePhase === 'countdown') {
      const countdownSeconds = Math.ceil(gameState.countdownTimer / 1000);
      this.ctx.save();
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 72px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(countdownSeconds.toString(), this.width / 2, this.height / 2);
      
      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillText('GET READY!', this.width / 2, this.height / 2 + 80);
      this.ctx.restore();
    }
    
    // Render scores
    this.renderScores(gameState);
  }

  private renderScores(gameState: GameState): void {
    const scoreX = this.width / 2;
    const scoreY = 30;
    
    this.ctx.save();
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    
    // Team 1 score
    this.ctx.fillStyle = '#FF6B6B';
    this.ctx.fillText(gameState.teamScores[1].toString(), scoreX - 50, scoreY);
    
    // VS
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText('VS', scoreX, scoreY);
    
    // Team 2 score
    this.ctx.fillStyle = '#4ECDC4';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText(gameState.teamScores[2].toString(), scoreX + 50, scoreY);
    
    // First to 3 indicator
    this.ctx.fillStyle = '#888';
    this.ctx.font = '12px Arial';
    this.ctx.fillText('First to 3', scoreX, scoreY + 20);
    
    this.ctx.restore();
  }

  private renderPlayerHotbar(player: Player): void {
    const hotbarHeight = 60;
    const hotbarY = this.height - hotbarHeight;
    const iconSize = 24;
    const spacing = 60;
    const centerX = this.width / 2;
    
    // Background for hotbar
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, hotbarY, this.width, hotbarHeight);
    
    // Hotbar border
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, hotbarY, this.width, hotbarHeight);
    
    const iconY = hotbarY + hotbarHeight / 2;
    
    // Q - Fireball
    this.renderHotbarAbility(centerX - spacing * 1.5, iconY, iconSize, '#FF4500', 'Q', 
      player.abilities.fireball.cooldown, player.abilities.fireball.maxCooldown);
    
    // E - Shield
    this.renderHotbarAbility(centerX - spacing * 0.5, iconY, iconSize, '#00BFFF', 'E', 
      player.abilities.shield.cooldown, player.abilities.shield.maxCooldown);
    
    // R - Grenade
    this.renderHotbarAbility(centerX + spacing * 0.5, iconY, iconSize, '#4a4a4a', 'R', 
      player.abilities.grenade.cooldown, player.abilities.grenade.maxCooldown);
    
    // Space - Dash
    this.renderHotbarAbility(centerX + spacing * 1.5, iconY, iconSize, '#32CD32', 'SPACE', 
      player.abilities.dash.cooldown, player.abilities.dash.maxCooldown);
  }

  private renderHotbarAbility(x: number, y: number, size: number, color: string, text: string, 
                             cooldown: number, maxCooldown: number): void {
    this.ctx.save();
    
    const isOnCooldown = cooldown > 0;
    const alpha = isOnCooldown ? 0.4 : 1.0;
    
    // Background circle
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // White border for ability slot
    this.ctx.globalAlpha = 1.0;
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Cooldown overlay (pie chart style)
    if (isOnCooldown) {
      const cooldownPercent = cooldown / maxCooldown;
      this.ctx.globalAlpha = 0.8;
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.arc(x, y, size / 2, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
      this.ctx.closePath();
      this.ctx.fill();
      
      // Cooldown timer text
      this.ctx.globalAlpha = 1.0;
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(Math.ceil(cooldown / 1000).toString(), x, y);
    } else {
      // Key binding text
      this.ctx.globalAlpha = 1.0;
      this.ctx.fillStyle = '#fff';
      this.ctx.font = text === 'SPACE' ? 'bold 8px Arial' : 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, x, y);
    }
    
    this.ctx.restore();
  }
}