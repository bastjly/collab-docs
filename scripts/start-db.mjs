import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const hasPodman = spawnSync('podman', ['--version'], { stdio: 'ignore', shell: true }).status === 0;

const env = { ...process.env };

if (hasPodman) {
  spawnSync('podman', ['machine', 'start'], { stdio: 'ignore', shell: true });

  for (let i = 0; i < 60; i++) {
    const r = spawnSync(
      'podman',
      ['machine', 'inspect', '--format', '{{.ConnectionInfo.PodmanSocket.Path}}'],
      { encoding: 'utf8', shell: true }
    );
    if (r.status === 0 && r.stdout && r.stdout.includes('sock')) {
      env.DOCKER_HOST = `unix://${r.stdout.trim()}`;
      break;
    }
    await sleep(1000);
  }
}

const child = spawn('docker', ['compose', 'up', 'postgres'], {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => process.exit(code ?? 0));
