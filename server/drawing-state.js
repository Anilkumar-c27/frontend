import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

// Operation schema:
// { id, type: 'stroke', tool: 'brush'|'eraser', color, width, points:[{x,y,t}], ts, authorId, alive:true }
// Undo/Redo managed via alive (tombstone). Server assigns lamport-ish ts + sequential index.

export class DrawingState {
constructor(roomId) {
    this.roomId = roomId;
    this.ops = [];           // full ordered log
    this.undoStack = [];     // stack of op ids that were tombstoned
    this.redoStack = [];     // stack of op ids that were restored
    this.peers = new Map();  // socketId -> {userId, name, color}
    this.cursors = new Map();// socketId -> {x,y}
    this.counter = 0;        // server order for conflict resolution
}

join(socket, username) {
    const color = this.pickColor([...this.peers.values()].length);
    const user = { userId: socket.id, name: username || `User-${socket.id.slice(0,4)}`, color };
    this.peers.set(socket.id, user);
    socket.join(this.roomId);
}

leave(socketId) {
    this.peers.delete(socketId);
    this.cursors.delete(socketId);
}

usersPublic() {
    return [...this.peers.values()];
}

updateCursor(socketId, pos) {
    this.cursors.set(socketId, pos);
}

acceptStroke(socketId, op) {
    // sanitize + stamp
    const stamped = {
    ...op,
    id: op.id || nanoid(),
    type: 'stroke',
    tool: op.tool === 'eraser' ? 'eraser' : 'brush',
    color: op.color || '#000000',
    width: Math.max(1, Math.min(64, op.width || 2)),
    points: Array.isArray(op.points) ? op.points.slice(0, 2048) : [],
    authorId: socketId,
    alive: true,
    ts: Date.now(),
    order: this.counter++
    };
    this.ops.push(stamped);
    // new op invalidates redo history
    this.redoStack.length = 0;
    return stamped;
}

globalUndo() {
    // find the latest alive op
    for (let i = this.ops.length - 1; i >= 0; i--) {
    if (this.ops[i].alive) {
        this.ops[i].alive = false;
        this.undoStack.push(this.ops[i].id);
        return { id: this.ops[i].id };
    }
    }
    return null;
}

globalRedo() {
    if (this.undoStack.length === 0) return null;
    const id = this.undoStack.pop();
    const op = this.ops.find(o => o.id === id);
    if (op && !op.alive) {
    op.alive = true;
    this.redoStack.push(id);
    return { id };
    }
    return null;
}

pickColor(index) {
    const palette = [
    '#ff6b6b', '#6c5ce7', '#00b894', '#0984e3',
    '#e17055', '#fdcb6e', '#74b9ff', '#a29bfe',
    '#55efc4', '#ffa8a8'
    ];
    return palette[index % palette.length];
}
}
