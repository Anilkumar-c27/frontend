import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createRooms } from './rooms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

const server = http.createServer(app);
const io = new Server(server, {
cors: { origin: '*' },
pingInterval: 25000,
pingTimeout: 20000
});

const rooms = createRooms();

// Serve index
app.get('/', (_, res) => {
res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Health
app.get('/health', (_, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  // Join a room (default "lobby")
socket.on('join', ({ roomId = 'lobby', username }) => {
    const room = rooms.get(roomId);
    room.join(socket, username);

    // Send bootstrap state to new client
    socket.emit('bootstrap', {
    roomId,
    you: room.peers.get(socket.id),
    users: room.usersPublic(),
      ops: room.ops // Full op-log to reconstruct canvas
    });

    // Broadcast presence
    socket.to(roomId).emit('user:join', room.peers.get(socket.id));
});

  // Cursor broadcast (throttled client-side)
socket.on('cursor', ({ roomId, x, y }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.updateCursor(socket.id, { x, y });
    socket.to(roomId).emit('cursor', { userId: socket.id, x, y });
});

  // Stroke event (batched points)
socket.on('op:stroke', ({ roomId, op }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const acceptedOp = room.acceptStroke(socket.id, op);
    io.to(roomId).emit('op:append', acceptedOp);
});

  // Global undo (last applied op wins)
socket.on('op:undo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const tombstoned = room.globalUndo();
    if (tombstoned) {
    io.to(roomId).emit('op:tombstone', tombstoned);
    }
});

  // Global redo
socket.on('op:redo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const restored = room.globalRedo();
    if (restored) {
    io.to(roomId).emit('op:restore', restored);
    }
});

socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
    const room = rooms.get(roomId);
    if (room) {
        room.leave(socket.id);
        socket.to(roomId).emit('user:leave', { userId: socket.id });
    }
    }
});
});

const PORT = process.env.PORT || 3001; // change to 3001
server.listen(PORT, () => {
console.log(`✅ Server listening on http://localhost:${PORT}`);
});
