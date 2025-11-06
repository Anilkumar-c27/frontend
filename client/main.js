import { initCanvas } from './canvas.js';
import { connectWS } from './websocket.js';

const canvasEl = document.getElementById('canvas');
const ui = {
  tool: document.getElementById('tool'),
  color: document.getElementById('color'),
  width: document.getElementById('width'),
  undo: document.getElementById('undo'),
  redo: document.getElementById('redo'),
  users: document.getElementById('users'),
  latency: document.getElementById('latency'),
  cursorTpl: document.getElementById('cursor-template')
};

const username = localStorage.getItem('cc-username') || `Guest-${Math.random().toString(36).slice(2,6)}`;
localStorage.setItem('cc-username', username);

const canvas = initCanvas(canvasEl);

const socket = connectWS({
  username,
  onBootstrap({ you, users, ops, roomId }) {
    canvas.setUser(you);
    renderUsers(users);
    canvas.loadOps(ops);
    // Resize after load
    canvas.resize();
  },
  onUserJoin(user) { addUser(user); },
  onUserLeave({ userId }) { removeUser(userId); },
  onOpAppend(op) { canvas.applyOp(op); },
  onTombstone({ id }) { canvas.tombstone(id); },
  onRestore({ id }) { canvas.restore(id); },
  onCursor({ userId, x, y }) { canvas.updateRemoteCursor(userId, x, y); },
  onLatency(ms) { ui.latency.textContent = `${ms} ms`; }
});

function sendCursorThrottled(x, y) {
  const now = performance.now();
  if (!sendCursorThrottled._t || now - sendCursorThrottled._t > 50) {
    sendCursorThrottled._t = now;
    socket.emit('cursor', { x, y });
  }
}

canvas.onLocalStrokeBatch((opBatch) => {
  socket.emit('op:stroke', opBatch);
});

canvas.onLocalCursor((x, y) => {
  sendCursorThrottled(x, y);
});

ui.tool.addEventListener('change', () => canvas.setTool(ui.tool.value));
ui.color.addEventListener('input', () => canvas.setColor(ui.color.value));
ui.width.addEventListener('input', () => canvas.setWidth(parseInt(ui.width.value, 10)));

ui.undo.addEventListener('click', () => socket.emit('op:undo'));
ui.redo.addEventListener('click', () => socket.emit('op:redo'));

window.addEventListener('resize', () => canvas.resize());

// Users UI
function renderUsers(users) {
  ui.users.innerHTML = '';
  users.forEach(addUser);
}
function addUser(user) {
  const pill = document.createElement('div');
  pill.className = 'user-pill';
  pill.id = `user-${user.userId}`;
  const dot = document.createElement('span');
  dot.className = 'user-dot';
  dot.style.background = user.color;
  const label = document.createElement('span');
  label.textContent = user.name;
  pill.append(dot, label);
  ui.users.appendChild(pill);
}
function removeUser(userId) {
  const el = document.getElementById(`user-${userId}`);
  if (el) el.remove();
}
