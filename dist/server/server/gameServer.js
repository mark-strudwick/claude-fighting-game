"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameServer = void 0;
const gameEngine_1 = require("./gameEngine");
class GameServer {
    constructor(io) {
        this.playerInputs = new Map();
        this.io = io;
        this.gameEngine = new gameEngine_1.GameEngine();
        this.setupSocketListeners();
        this.startGameLoop();
    }
    setupSocketListeners() {
        this.io.on('connection', (socket) => {
            console.log(`Player connected: ${socket.id}`);
            socket.on('joinGame', (playerName) => {
                this.gameEngine.addPlayer(socket.id, playerName);
                socket.emit('playerJoined', socket.id);
                this.broadcastGameState();
            });
            socket.on('playerInput', (input) => {
                this.playerInputs.set(socket.id, input);
            });
            socket.on('disconnect', () => {
                console.log(`Player disconnected: ${socket.id}`);
                this.gameEngine.removePlayer(socket.id);
                this.playerInputs.delete(socket.id);
                this.io.emit('playerLeft', socket.id);
                this.broadcastGameState();
            });
        });
    }
    startGameLoop() {
        const TICK_RATE = 60;
        const TICK_INTERVAL = 1000 / TICK_RATE;
        setInterval(() => {
            this.gameEngine.update(TICK_INTERVAL, this.playerInputs);
            this.broadcastGameState();
        }, TICK_INTERVAL);
    }
    broadcastGameState() {
        const gameState = this.gameEngine.getGameState();
        this.io.emit('gameState', gameState);
    }
}
exports.GameServer = GameServer;
//# sourceMappingURL=gameServer.js.map