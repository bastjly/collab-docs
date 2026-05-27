import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

const HOST = 'localhost';
const MAX_RETRIES = 240; // 60s at 250ms intervals

const ports = process.argv.slice(2).map(Number).filter(Boolean);
if (ports.length === 0) { console.error('Usage: wait-for-port.mjs <port> [port...]'); process.exit(1); }

const waitForPort = async (port) => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const available = await new Promise(resolve => {
      const socket = net.connect(port, HOST, () => { socket.destroy(); resolve(true); });
      socket.on('error', () => resolve(false));
    });
    if (available) return;
    await sleep(250);
  }
  console.error(`Port ${port} indisponible après 60s`);
  process.exit(1);
};

await Promise.all(ports.map(waitForPort));
process.exit(0);
