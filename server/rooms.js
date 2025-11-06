import { DrawingState } from './drawing-state.js';

export function createRooms() {
const map = new Map();

function ensure(roomId) {
    if (!map.has(roomId)) {
    map.set(roomId, new DrawingState(roomId));
    }
    return map.get(roomId);
}

return {
    get: (roomId) => ensure(roomId)
};
}
