import { rooms } from '../store.js';
import { broadcast } from '../broadcast.js';

export function handleJoin(ws, msg) {
  if (ws.documentId) rooms.get(ws.documentId)?.delete(ws);
  ws.documentId = msg.documentId;
  if (!rooms.has(msg.documentId)) rooms.set(msg.documentId, new Set());
  rooms.get(msg.documentId).add(ws);
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
