export function initCanvas(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const off = document.createElement('canvas'); // offscreen for redraw
  const offCtx = off.getContext('2d', { alpha: false });

  // Device pixel ratio for sharper drawing
  let dpi = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  let me = { userId: 'local', name: 'Me', color: '#222' };

  // Drawing state
  let tool = 'brush';
  let color = '#222222';
  let width = 4;
  let drawing = false;
  let currentPoints = [];
  let lastSentAt = 0;

  // Operations
  let ops = [];
  const index = new Map();

  // Remote cursors
  const cursorLayer = new Map();

  // Callbacks
  let strokeBatchCb = () => {};
  let cursorCb = () => {};

  // ----------- Canvas Setup -----------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpi);
    canvas.height = Math.floor(h * dpi);
    off.width = canvas.width;
    off.height = canvas.height;
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    offCtx.setTransform(dpi, 0, 0, dpi, 0, 0);
    redrawAll();
  }

  // 👇 Resize on startup and window resize
  window.addEventListener('resize', resize);
  resize();

  // ----------- API setters -----------
  function setUser(you) { me = you; }
  function setTool(t) { tool = t; }
  function setColor(c) { color = c; }
  function setWidth(w) { width = w; }

  // ----------- Operations -----------
  function loadOps(initialOps) {
    ops = [];
    index.clear();
    initialOps.sort((a, b) => (a.order - b.order));
    initialOps.forEach(op => { ops.push(op); index.set(op.id, op); });
    redrawAll();
  }

  function applyOp(op) {
    ops.push(op);
    index.set(op.id, op);
    drawOp(offCtx, op);
    blit();
  }

  function tombstone(id) {
    const op = index.get(id);
    if (op && op.alive !== false) {
      op.alive = false;
      redrawAll();
    }
  }

  function restore(id) {
    const op = index.get(id);
    if (op && op.alive === false) {
      op.alive = true;
      redrawAll();
    }
  }

  function drawOp(target, op) {
    if (!op.alive) return;
    if (op.type === 'stroke') {
      target.save();
      if (op.tool === 'eraser') {
        target.globalCompositeOperation = 'destination-out';
        target.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        target.globalCompositeOperation = 'source-over';
        target.strokeStyle = op.color;
      }
      target.lineCap = 'round';
      target.lineJoin = 'round';
      target.lineWidth = op.width;

      const pts = op.points;
      if (pts.length < 2) return;

      target.beginPath();
      target.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        target.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      target.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      target.stroke();
      target.restore();
    }
  }

  function redrawAll() {
    offCtx.clearRect(0, 0, off.width, off.height);
    const alive = ops.filter(o => o.alive !== false).sort((a,b)=>a.order-b.order);
    alive.forEach(op => drawOp(offCtx, op));
    blit();
  }

  function blit() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0);
  }

  // ----------- Drawing logic -----------
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top, t: performance.now() };
  }

  function begin(e) {
    e.preventDefault();
    drawing = true;
    currentPoints = [];
    const p = canvasPos(e);
    currentPoints.push(p);
    cursorCb(p.x, p.y);
  }

  function move(e) {
    const p = canvasPos(e);
    if (drawing) {
      currentPoints.push(p);

      const tempOp = {
        id: '__local__',
        type: 'stroke',
        tool,
        color,
        width,
        points: currentPoints.slice(-3),
        alive: true
      };
      drawOp(offCtx, tempOp);
      blit();

      const now = performance.now();
      if (now - lastSentAt > 40 && currentPoints.length > 3) {
        flushBatch(false);
      }
    }
    cursorCb(p.x, p.y);
  }

  function end() {
    if (!drawing) return;
    drawing = false;
    flushBatch(true);
  }

  function flushBatch(isEnd) {
    if (currentPoints.length < 2) return;
    const batch = {
      id: nanoid(),
      type: 'stroke',
      tool,
      color,
      width,
      points: currentPoints.slice(),
      end: isEnd
    };
    lastSentAt = performance.now();
    strokeBatchCb({ op: batch });
    currentPoints = [];
  }

  // ----------- Remote cursors -----------
  function updateRemoteCursor(userId, x, y) {
    let el = cursorLayer.get(userId);
    if (!el) {
      el = document.getElementById('cursor-template').content.firstElementChild.cloneNode(true);
      el.id = `cursor-${userId}`;
      el.querySelector('.label').textContent = userId.slice(0, 4);
      document.body.appendChild(el);
      cursorLayer.set(userId, el);
    }
    el.style.left = `${x + canvas.getBoundingClientRect().left}px`;
    el.style.top = `${y + canvas.getBoundingClientRect().top}px`;
  }

  // ----------- Event listeners -----------
  canvas.addEventListener('pointerdown', begin);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  canvas.addEventListener('touchstart', begin, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);

  // ----------- Return API -----------
  return {
    setUser, setTool, setColor, setWidth, resize, loadOps, applyOp, tombstone, restore,
    onLocalStrokeBatch(cb){ strokeBatchCb = ({ op }) => cb({ roomId: 'lobby', op }); },
    onLocalCursor(cb){ cursorCb = cb; },
    updateRemoteCursor
  };
}

// Minimal nanoid (no crypto) - ok for demo
export const nanoid = (() => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  return (size = 12) => {
    let id = '';
    for (let i = 0; i < size; i++) id += chars[(Math.random() * chars.length) | 0];
    return id;
  };
})();
