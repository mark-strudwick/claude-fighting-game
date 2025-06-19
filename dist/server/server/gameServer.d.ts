import { Server as SocketIOServer } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types';
export declare class GameServer {
    private io;
    private gameEngine;
    private matchmaking;
    private playerInputs;
    private activeGames;
    private playerStates;
    constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>);
    private setupSocketListeners;
    private startGameLoop;
    private broadcastGameState;
    private broadcastQueueUpdates;
    private broadcastLobbyUpdate;
    private startGameFromLobby;
    private startLobbyGameLoop;
}
//# sourceMappingURL=gameServer.d.ts.map