"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingSystem = void 0;
class MatchmakingSystem {
    constructor() {
        this.queues = new Map();
        this.lobbies = new Map();
        this.playerToLobby = new Map();
        this.playerToQueue = new Map();
        this.queues.set('1v1', []);
        this.queues.set('2v2', []);
        this.queues.set('3v3', []);
        setInterval(() => this.processQueues(), 1000);
    }
    joinQueue(playerId, request) {
        if (this.playerToQueue.has(playerId) || this.playerToLobby.has(playerId)) {
            return false;
        }
        const queue = this.queues.get(request.gameMode);
        if (!queue)
            return false;
        const queuedPlayer = {
            id: playerId,
            name: request.playerName,
            gameMode: request.gameMode,
            queueTime: Date.now()
        };
        queue.push(queuedPlayer);
        this.playerToQueue.set(playerId, request.gameMode);
        return true;
    }
    leaveQueue(playerId) {
        const gameMode = this.playerToQueue.get(playerId);
        if (!gameMode)
            return false;
        const queue = this.queues.get(gameMode);
        if (!queue)
            return false;
        const index = queue.findIndex(p => p.id === playerId);
        if (index !== -1) {
            queue.splice(index, 1);
            this.playerToQueue.delete(playerId);
            return true;
        }
        return false;
    }
    getQueueInfo(gameMode) {
        const queue = this.queues.get(gameMode);
        if (!queue)
            return { playersInQueue: 0, estimatedWait: 0 };
        const playersInQueue = queue.length;
        const maxPlayers = this.getMaxPlayersForMode(gameMode);
        const estimatedWait = Math.max(0, (maxPlayers - playersInQueue) * 10); // 10 seconds per missing player
        return { playersInQueue, estimatedWait };
    }
    processQueues() {
        for (const [gameMode, queue] of this.queues) {
            if (queue.length >= this.getMaxPlayersForMode(gameMode)) {
                const lobby = this.createLobby(gameMode, queue);
                if (this.onLobbyCreated) {
                    this.onLobbyCreated(lobby);
                }
            }
        }
    }
    createLobby(gameMode, queue) {
        const maxPlayers = this.getMaxPlayersForMode(gameMode);
        const selectedPlayers = queue.splice(0, maxPlayers);
        const lobbyId = this.generateLobbyId();
        const lobbyPlayers = selectedPlayers.map(p => ({
            id: p.id,
            name: p.name,
            ready: false
        }));
        const lobby = {
            id: lobbyId,
            gameMode,
            players: lobbyPlayers,
            maxPlayers,
            status: 'waiting',
            createdAt: Date.now()
        };
        this.lobbies.set(lobbyId, lobby);
        selectedPlayers.forEach(player => {
            this.playerToQueue.delete(player.id);
            this.playerToLobby.set(player.id, lobbyId);
        });
        return lobby;
    }
    getLobby(lobbyId) {
        return this.lobbies.get(lobbyId);
    }
    getPlayerLobby(playerId) {
        const lobbyId = this.playerToLobby.get(playerId);
        return lobbyId ? this.lobbies.get(lobbyId) : undefined;
    }
    setPlayerReady(playerId, ready) {
        const lobbyId = this.playerToLobby.get(playerId);
        if (!lobbyId)
            return undefined;
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby)
            return undefined;
        const player = lobby.players.find(p => p.id === playerId);
        if (!player)
            return undefined;
        player.ready = ready;
        if (lobby.players.every(p => p.ready)) {
            lobby.status = 'starting';
        }
        return lobby;
    }
    removeLobby(lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        if (lobby) {
            lobby.players.forEach(player => {
                this.playerToLobby.delete(player.id);
            });
            this.lobbies.delete(lobbyId);
        }
    }
    removePlayerFromLobby(playerId) {
        const lobbyId = this.playerToLobby.get(playerId);
        if (!lobbyId)
            return undefined;
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby)
            return undefined;
        const playerIndex = lobby.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            lobby.players.splice(playerIndex, 1);
            this.playerToLobby.delete(playerId);
            if (lobby.players.length === 0) {
                this.lobbies.delete(lobbyId);
                return undefined;
            }
            lobby.status = 'waiting';
            lobby.players.forEach(p => p.ready = false);
        }
        return lobby;
    }
    getMaxPlayersForMode(gameMode) {
        switch (gameMode) {
            case '1v1': return 2;
            case '2v2': return 4;
            case '3v3': return 6;
            default: return 2;
        }
    }
    generateLobbyId() {
        return `lobby_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    getAllLobbies() {
        return Array.from(this.lobbies.values());
    }
    isPlayerInQueue(playerId) {
        return this.playerToQueue.has(playerId);
    }
    isPlayerInLobby(playerId) {
        return this.playerToLobby.has(playerId);
    }
}
exports.MatchmakingSystem = MatchmakingSystem;
//# sourceMappingURL=matchmaking.js.map