import Koa from 'koa';
import cors from '@koa/cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { GameServer } from './gameServer';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types';

const app = new Koa();
const server = createServer(app.callback());

app.use(cors());

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const gameServer = new GameServer(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});