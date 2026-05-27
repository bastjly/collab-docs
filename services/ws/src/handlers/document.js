import { rooms } from '../store.js';
import { broadcast } from '../broadcast.js';

export function handleJoin(ws, msg) {
  if (ws.documentId) rooms.get(ws.documentId)?.delete(ws);
  ws.documentId = msg.documentId;
  if (!rooms.has(msg.documentId)) rooms.set(msg.documentId, new Set());

  const room = rooms.get(msg.documentId);
  const existingUsers = [...room].map(c => ({ id: c.user.id, name: c.user.email }));
  room.add(ws);

  ws.send(JSON.stringify({ type: 'room_users', users: existingUsers }));
  broadcast(msg.documentId, { type: 'user_joined', user: { id: ws.user.id, name: ws.user.email } }, ws);
}

export function handleDocumentChange(ws, msg) {
  if (!ws.documentId) return;
  broadcast(ws.documentId, { type: 'document_change', content: msg.content, userId: ws.user.id }, ws);
}

export function handleCursor(ws, msg) {
  if (!ws.documentId) return;
  broadcast(ws.documentId, { type: 'cursor', position: msg.position, name: msg.name, userId: ws.user.id }, ws);
}
