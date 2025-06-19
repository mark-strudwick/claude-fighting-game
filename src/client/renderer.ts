import { GameState, Player } from '../shared/types';

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
    this.renderUI(gameState);
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
    
    this.ctx.fillStyle = player.color;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.renderHealthBar(player, screenX, screenY);
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