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

  render(gameState: GameState): void {
    this.renderArena(gameState.arena);
    this.renderPlayers(gameState.players);
    this.renderProjectiles(gameState.projectiles);
    this.renderUI(gameState);
    this.renderControls();
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

  private renderPlayers(players: { [id: string]: Player }): void {
    Object.values(players).forEach(player => {
      this.renderPlayer(player);
    });
  }

  private renderPlayer(player: Player): void {
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
    this.renderAbilityCooldowns(player, screenX, screenY);
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
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
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
          this.ctx.globalAlpha = 1.0;
        }
      }
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
    this.ctx.fillText(`Phase: ${gameState.gamePhase}`, 10, 50);
    
    if (gameState.gamePhase === 'playing') {
      this.ctx.fillText(`Time: ${Math.ceil(gameState.roundTimer / 1000)}s`, 10, 70);
    }
  }
}