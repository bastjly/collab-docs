import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

const HOST = 'localhost';
const PORT = 5432;
const MAX_RETRIES = 60;

for (let i = 0; i < MAX_RETRIES; i++) {
  const available = await new Promise(resolve => {
    const socket = net.connect(PORT, HOST, () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
  });
  if (available) process.exit(0);
  await sleep(250);
}

console.error(`La base de données n'est pas disponible après ${MAX_RETRIES * 0.25}s`);
process.exit(1);
