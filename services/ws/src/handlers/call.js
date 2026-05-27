import { activeCalls } from '../store.js';
import { broadcast, broadcastAll } from '../broadcast.js';

export function handleCallOffer(ws, msg, clients) {
  if (!ws.documentId) return;
  activeCalls.add(ws.documentId);
  broadcastAll(clients, { type: 'call_started', documentId: ws.documentId });
  broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
}

export function handleCallEnd(ws, msg, clients) {
  if (!ws.documentId) return;
  activeCalls.delete(ws.documentId);
  broadcastAll(clients, { type: 'call_ended', documentId: ws.documentId });
  broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
}

export function handleCallRejected(ws, msg, clients) {
  if (!ws.documentId) return;
  if (activeCalls.delete(ws.documentId)) {
    broadcastAll(clients, { type: 'call_ended', documentId: ws.documentId });
  }
  broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
}

export function handleCallSignaling(ws, msg) {
  if (!ws.documentId) return;
  broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
}
