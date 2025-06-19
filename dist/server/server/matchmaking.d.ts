import { GameMode, QueueRequest, Lobby } from '../shared/types';
export declare class MatchmakingSystem {
    private queues;
    private lobbies;
    private playerToLobby;
    private playerToQueue;
    onLobbyCreated?: (lobby: Lobby) => void;
    constructor();
    joinQueue(playerId: string, request: QueueRequest): boolean;
    leaveQueue(playerId: string): boolean;
    getQueueInfo(gameMode: GameMode): {
        playersInQueue: number;
        estimatedWait: number;
    };
    private processQueues;
    private createLobby;
    getLobby(lobbyId: string): Lobby | undefined;
    getPlayerLobby(playerId: string): Lobby | undefined;
    setPlayerReady(playerId: string, ready: boolean): Lobby | undefined;
    removeLobby(lobbyId: string): void;
    removePlayerFromLobby(playerId: string): Lobby | undefined;
    private getMaxPlayersForMode;
    private generateLobbyId;
    getAllLobbies(): Lobby[];
    isPlayerInQueue(playerId: string): boolean;
    isPlayerInLobby(playerId: string): boolean;
}
//# sourceMappingURL=matchmaking.d.ts.map