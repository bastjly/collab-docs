import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const PORT = process.env.WS_PORT || 3002;
const server = createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map();
const activeCalls = new Set();

function broadcast(documentId, message, exclude) {
  rooms.get(documentId)?.forEach(client => {
    if (client !== exclude && client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastAll(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
  try {
    ws.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    ws.close(1008, 'Unauthorized');
    return;
  }

  ws.documentId = null;

  ws.send(JSON.stringify({ type: 'active_calls', documentIds: [...activeCalls] }));

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case 'join': {
        if (ws.documentId) rooms.get(ws.documentId)?.delete(ws);
        ws.documentId = msg.documentId;
        if (!rooms.has(msg.documentId)) rooms.set(msg.documentId, new Set());
        rooms.get(msg.documentId).add(ws);
        broadcast(msg.documentId, { type: 'user_joined', user: { id: ws.user.id, name: ws.user.email } }, ws);
        break;
      }
      case 'document_change': {
        if (!ws.documentId) return;
        broadcast(ws.documentId, { type: 'document_change', content: msg.content, userId: ws.user.id }, ws);
        break;
      }
      case 'cursor': {
        if (!ws.documentId) return;
        broadcast(ws.documentId, { type: 'cursor', position: msg.position, userId: ws.user.id }, ws);
        break;
      }
      case 'call_offer': {
        if (!ws.documentId) return;
        activeCalls.add(ws.documentId);
        broadcastAll({ type: 'call_started', documentId: ws.documentId });
        broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
        break;
      }
      case 'call_end': {
        if (!ws.documentId) return;
        activeCalls.delete(ws.documentId);
        broadcastAll({ type: 'call_ended', documentId: ws.documentId });
        broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
        break;
      }
      case 'call_rejected': {
        if (!ws.documentId) return;
        if (activeCalls.delete(ws.documentId)) {
          broadcastAll({ type: 'call_ended', documentId: ws.documentId });
        }
        broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
        break;
      }
      case 'call_join_request':
      case 'call_answer':
      case 'call_ice': {
        if (!ws.documentId) return;
        broadcast(ws.documentId, { ...msg, userId: ws.user.id }, ws);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!ws.documentId) return;
    rooms.get(ws.documentId)?.delete(ws);
    broadcast(ws.documentId, { type: 'user_left', userId: ws.user.id }, ws);
    if (rooms.get(ws.documentId)?.size === 0) {
      rooms.delete(ws.documentId);
      if (activeCalls.delete(ws.documentId)) {
        broadcastAll({ type: 'call_ended', documentId: ws.documentId });
      }
    }
  });
});

server.listen(PORT, () => console.log(`WS server on port ${PORT}`));
