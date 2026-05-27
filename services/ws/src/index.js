import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { rooms, activeCalls } from './store.js';
import { broadcast, broadcastAll } from './broadcast.js';
import { handleJoin, handleDocumentChange, handleCursor } from './handlers/document.js';
import { handleCallOffer, handleCallEnd, handleCallRejected, handleCallSignaling } from './handlers/call.js';
import { handleChatMessage } from './handlers/chat.js';

const prisma = new PrismaClient();
const PORT = process.env.WS_PORT || 3002;
const server = createServer();
const wss = new WebSocketServer({ server });

function handleMessage(ws, data) {
  let msg;
  try { msg = JSON.parse(data); } catch { return; }

  switch (msg.type) {
    case 'join':               handleJoin(ws, msg); break;
    case 'document_change':    handleDocumentChange(ws, msg); break;
    case 'cursor':             handleCursor(ws, msg); break;
    case 'call_offer':         handleCallOffer(ws, msg, wss.clients); break;
    case 'call_end':           handleCallEnd(ws, msg, wss.clients); break;
    case 'call_rejected':      handleCallRejected(ws, msg, wss.clients); break;
    case 'call_join_request':
    case 'call_answer':
    case 'call_ice':           handleCallSignaling(ws, msg); break;
    case 'chat_message':       handleChatMessage(ws, msg); break;
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
        broadcastAll(wss.clients, { type: 'call_ended', documentId: ws.documentId });
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
