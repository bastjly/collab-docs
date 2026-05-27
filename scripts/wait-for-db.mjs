import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const HOST = 'localhost';
const PORT = 5432;
const MAX_RETRIES = 60;

for (let i = 0; i < MAX_RETRIES; i++) {
  const available = await new Promise(resolve => {
    const socket = net.connect(PORT, HOST, () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
  });
  if (available) process.exit(0);
  await sleep(1000);
}

console.error(`La base de données n'est pas disponible après ${MAX_RETRIES}s`);
process.exit(1);
