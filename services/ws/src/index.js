import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

function handleMessage(ws, data) {
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
      broadcast(ws.documentId, { type: 'cursor', position: msg.position, name: msg.name, userId: ws.user.id }, ws);
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
    case 'chat_message': {
      if (!ws.documentId) return;
      broadcast(ws.documentId, {
        type: 'chat_message',
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        author: { id: ws.user.id, name: ws.user.name || ws.user.email },
      }, ws);
      break;
    }
  }
}

wss.on('connection', async (ws, req) => {
  const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    ws.close(1008, 'Unauthorized');
    return;
  }

  ws.documentId = null;
  
  let ready = false;
  const pending = [];
  ws.on('message', (data) => {
    if (!ready) { pending.push(data); return; }
    handleMessage(ws, data);
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

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, role: true, isBlocked: true }
  });

  if (!dbUser || dbUser.isBlocked) {
    ws.close(1008, 'Forbidden');
    return;
  }

  ws.user = dbUser;

  ws.send(JSON.stringify({ type: 'active_calls', documentIds: [...activeCalls] }));

  ready = true;
  for (const data of pending) handleMessage(ws, data);
});

server.listen(PORT, () => console.log(`WS server on port ${PORT}`));
