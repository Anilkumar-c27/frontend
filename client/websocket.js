export function connectWS({ username, onBootstrap, onUserJoin, onUserLeave, onOpAppend, onTombstone, onRestore, onCursor, onLatency }) {
  const socket = io();

  // Simple latency ping
  setInterval(() => {
    const t = performance.now();
    socket.volatile.emit('ping:client', t);
  }, 2000);
  socket.on('ping:server', (t0) => {
    const dt = Math.round(performance.now() - t0);
    onLatency?.(dt);
  });

  socket.on('connect', () => {
    socket.emit('join', { roomId: 'lobby', username });
  });

  socket.on('bootstrap', (payload) => onBootstrap?.(payload));
  socket.on('user:join', (user) => onUserJoin?.(user));
  socket.on('user:leave', (p) => onUserLeave?.(p));
  socket.on('op:append', (op) => onOpAppend?.(op));
  socket.on('op:tombstone', (p) => onTombstone?.(p));
  socket.on('op:restore', (p) => onRestore?.(p));
  socket.on('cursor', (p) => onCursor?.(p));

  // Respond to latency pings
  socket.on('ping:client', (t0) => socket.emit('ping:server', t0));

  return {
    emit(event, payload) {
      if (event === 'cursor') {
        socket.volatile.emit('cursor', { roomId: 'lobby', ...payload });
      } else if (event === 'op:stroke') {
        socket.emit('op:stroke', { roomId: 'lobby', op: payload.op });
      } else if (event === 'op:undo' || event === 'op:redo') {
        socket.emit(event, { roomId: 'lobby' });
      }
    }
  };
}
