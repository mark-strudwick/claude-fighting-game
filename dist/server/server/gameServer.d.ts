import { Server as SocketIOServer } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types';
export declare class GameServer {
    private io;
    private gameEngine;
    private playerInputs;
    constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>);
    private setupSocketListeners;
    private startGameLoop;
    private broadcastGameState;
}
//# sourceMappingURL=gameServer.d.ts.map