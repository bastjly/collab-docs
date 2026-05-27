import { rooms } from './store.js';

export function broadcast(documentId, message, exclude) {
  rooms.get(documentId)?.forEach(client => {
    if (client !== exclude && client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

export function sendToUser(documentId, targetUserId, message) {
  const raw = JSON.stringify(message);
  rooms.get(documentId)?.forEach(client => {
    if (client.user?.id === targetUserId && client.readyState === 1) {
      client.send(raw);
    }
  });
}

export function broadcastAll(clients, message) {
  const raw = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) client.send(raw);
  }
}
