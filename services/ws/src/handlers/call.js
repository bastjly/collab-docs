import { CALL_MESSAGE_TYPE } from '@collab-docs/shared';
import { activeCalls } from '../store.js';
import { broadcastAll, sendToUser } from '../broadcast.js';

export function handleCallOffer(ws, msg, clients) {
  if (!ws.documentId) return;
  activeCalls.add(ws.documentId);
  broadcastAll(clients, { type: CALL_MESSAGE_TYPE.STARTED, documentId: ws.documentId });
  sendToUser(ws.documentId, msg.targetUserId, { ...msg, userId: ws.user.id });
}

export function handleCallEnd(ws, msg, clients) {
  if (!ws.documentId) return;
  activeCalls.delete(ws.documentId);
  broadcastAll(clients, { type: CALL_MESSAGE_TYPE.ENDED, documentId: ws.documentId });
  sendToUser(ws.documentId, msg.targetUserId, { ...msg, userId: ws.user.id });
}

export function handleCallRejected(ws, msg, clients) {
  if (!ws.documentId) return;
  if (activeCalls.delete(ws.documentId)) {
    broadcastAll(clients, { type: CALL_MESSAGE_TYPE.ENDED, documentId: ws.documentId });
  }
  sendToUser(ws.documentId, msg.targetUserId, { ...msg, userId: ws.user.id });
}

export function handleCallSignaling(ws, msg) {
  if (!ws.documentId) return;
  sendToUser(ws.documentId, msg.targetUserId, { ...msg, userId: ws.user.id });
}
