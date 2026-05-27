import { broadcast } from '../broadcast.js';

export function handleChatMessage(ws, msg) {
  if (!ws.documentId) return;
  broadcast(ws.documentId, {
    type: 'chat_message',
    id: msg.id,
    content: msg.content,
    createdAt: msg.createdAt,
    author: { id: ws.user.id, name: ws.user.name || ws.user.email },
  }, ws);
}
