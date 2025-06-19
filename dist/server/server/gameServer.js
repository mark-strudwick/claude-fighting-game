"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameServer = void 0;
const gameEngine_1 = require("./gameEngine");
const matchmaking_1 = require("./matchmaking");
class GameServer {
    constructor(io) {
        this.playerInputs = new Map();
        this.activeGames = new Map(); // lobbyId -> GameEngine
        this.playerStates = new Map();
        this.io = io;
        this.gameEngine = new gameEngine_1.GameEngine(); // Legacy - will be replaced by per-lobby games
        this.matchmaking = new matchmaking_1.MatchmakingSystem();
        // Set up matchmaking callbacks
        this.matchmaking.onLobbyCreated = (lobby) => {
            this.broadcastLobbyUpdate(lobby);
        };
        this.setupSocketListeners();
        this.startGameLoop();
    }
    setupSocketListeners() {
        this.io.on('connection', (socket) => {
            console.log(`Player connected: ${socket.id}`);
            // Initialize player with menu state
            const initialState = { screen: 'menu' };
            this.playerStates.set(socket.id, initialState);
            socket.emit('clientStateUpdate', initialState);
            socket.on('joinQueue', (request) => {
                if (this.matchmaking.joinQueue(socket.id, request)) {
                    const queueInfo = this.matchmaking.getQueueInfo(request.gameMode);
                    const queueData = {
                        gameMode: request.gameMode,
                        estimatedWait: queueInfo.estimatedWait,
                        playersInQueue: queueInfo.playersInQueue
                    };
                    socket.emit('queueJoined', queueData);
                    const newState = {
                        screen: 'queue',
                        queueData: queueData
                    };
                    this.playerStates.set(socket.id, newState);
                    socket.emit('clientStateUpdate', newState);
                    this.broadcastQueueUpdates(request.gameMode);
                }
                else {
                    socket.emit('error', 'Unable to join queue. You may already be in a queue or lobby.');
                }
            });
            socket.on('leaveQueue', () => {
                if (this.matchmaking.leaveQueue(socket.id)) {
                    socket.emit('queueLeft');
                    const newState = { screen: 'menu' };
                    this.playerStates.set(socket.id, newState);
                    socket.emit('clientStateUpdate', newState);
                }
            });
            socket.on('readyUp', () => {
                const lobby = this.matchmaking.setPlayerReady(socket.id, true);
                if (lobby) {
                    this.broadcastLobbyUpdate(lobby);
                    if (lobby.status === 'starting') {
                        this.startGameFromLobby(lobby);
                    }
                }
            });
            socket.on('leaveLobby', () => {
                const lobby = this.matchmaking.removePlayerFromLobby(socket.id);
                if (lobby) {
                    this.broadcastLobbyUpdate(lobby);
                }
                const newState = { screen: 'menu' };
                this.playerStates.set(socket.id, newState);
                socket.emit('clientStateUpdate', newState);
            });
            socket.on('playerInput', (input) => {
                this.playerInputs.set(socket.id, input);
            });
            socket.on('disconnect', () => {
                console.log(`Player disconnected: ${socket.id}`);
                // Clean up from queue
                this.matchmaking.leaveQueue(socket.id);
                // Clean up from lobby
                const lobby = this.matchmaking.removePlayerFromLobby(socket.id);
                if (lobby) {
                    this.broadcastLobbyUpdate(lobby);
                }
                // Clean up from active game
                this.playerInputs.delete(socket.id);
                this.playerStates.delete(socket.id);
                // Legacy cleanup
                this.gameEngine.removePlayer(socket.id);
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
    broadcastQueueUpdates(gameMode) {
        // Update all players in the same queue about the new queue status
        for (const [playerId, state] of this.playerStates) {
            if (state.screen === 'queue' && state.queueData?.gameMode === gameMode) {
                const queueInfo = this.matchmaking.getQueueInfo(gameMode);
                const socket = this.io.sockets.sockets.get(playerId);
                if (socket) {
                    socket.emit('queueUpdate', {
                        estimatedWait: queueInfo.estimatedWait,
                        playersInQueue: queueInfo.playersInQueue
                    });
                }
            }
        }
    }
    broadcastLobbyUpdate(lobby) {
        for (const player of lobby.players) {
            const socket = this.io.sockets.sockets.get(player.id);
            if (socket) {
                const newState = {
                    screen: 'lobby',
                    lobbyData: lobby
                };
                this.playerStates.set(player.id, newState);
                socket.emit('clientStateUpdate', newState);
                socket.emit('lobbyUpdate', lobby);
            }
        }
    }
    async startGameFromLobby(lobby) {
        // Notify players that game is starting
        for (const player of lobby.players) {
            const socket = this.io.sockets.sockets.get(player.id);
            if (socket) {
                socket.emit('gameStarting', 5); // 5 second countdown
            }
        }
        // Wait for countdown
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Create new game engine for this lobby
        const gameEngine = new gameEngine_1.GameEngine();
        this.activeGames.set(lobby.id, gameEngine);
        // Add players to the game
        for (const player of lobby.players) {
            gameEngine.addPlayer(player.id, player.name);
            const newState = {
                screen: 'game',
                gameData: gameEngine.getGameState()
            };
            this.playerStates.set(player.id, newState);
            const socket = this.io.sockets.sockets.get(player.id);
            if (socket) {
                socket.emit('clientStateUpdate', newState);
            }
        }
        // Start the game loop for this lobby
        this.startLobbyGameLoop(lobby.id, gameEngine);
        // Mark lobby as in_game
        lobby.status = 'in_game';
    }
    startLobbyGameLoop(lobbyId, gameEngine) {
        const TICK_RATE = 60;
        const TICK_INTERVAL = 1000 / TICK_RATE;
        const gameLoop = setInterval(() => {
            const lobby = this.matchmaking.getLobby(lobbyId);
            if (!lobby || lobby.status !== 'in_game') {
                clearInterval(gameLoop);
                this.activeGames.delete(lobbyId);
                return;
            }
            // Get inputs from players in this lobby
            const lobbyInputs = new Map();
            for (const player of lobby.players) {
                const input = this.playerInputs.get(player.id);
                if (input) {
                    lobbyInputs.set(player.id, input);
                }
            }
            // Update game
            gameEngine.update(TICK_INTERVAL, lobbyInputs);
            const gameState = gameEngine.getGameState();
            // Broadcast to players in this lobby only
            for (const player of lobby.players) {
                const socket = this.io.sockets.sockets.get(player.id);
                if (socket) {
                    socket.emit('gameState', gameState);
                }
            }
        }, TICK_INTERVAL);
    }
}
exports.GameServer = GameServer;
//# sourceMappingURL=gameServer.js.map