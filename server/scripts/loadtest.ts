import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { env } from '../src/config/env';

interface AutocannonOptions {
  url: string;
  connections: number;
  duration: number;
}

interface AutocannonResult {
  url: string;
  requests: {
    average: number;
    total: number;
  };
  latency: {
    p50: number;
    p90?: number;
    p95?: number;
    p97_5?: number;
    p99: number;
    average: number;
    max: number;
  };
  '2xx': number;
  non2xx: number;
  errors: number;
  timeouts: number;
}

interface AutocannonModule {
  (opts: AutocannonOptions): Promise<AutocannonResult>;
  printResult(result: AutocannonResult, opts?: { renderLatencyTable?: boolean }): string;
}

const autocannon = require('autocannon') as AutocannonModule;

async function waitForHealth(baseUrl: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // Server still starting.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server did not become healthy within 10 seconds');
}

async function runTarget(label: string, url: string): Promise<void> {
  const result = await autocannon({
    url,
    connections: 50,
    duration: 10,
  });

  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);
  console.log(autocannon.printResult(result, { renderLatencyTable: true }));
  console.log(
    `Summary: req/sec=${result.requests.average.toFixed(1)} total=${result.requests.total} ` +
      `p50=${result.latency.p50}ms p97_5=${result.latency.p97_5 ?? 'n/a'}ms p99=${result.latency.p99}ms ` +
      `2xx=${result['2xx']} non2xx=${result.non2xx} errors=${result.errors}`,
  );
}

async function main(): Promise<void> {
  const serverDir = path.resolve(__dirname, '..');
  const tsxCli = require.resolve('tsx/cli');
  const base = `http://localhost:${env.PORT}`;

  const child: ChildProcess = spawn(process.execPath, [tsxCli, 'src/server.ts'], {
    cwd: serverDir,
    env: { ...process.env, LOG_LEVEL: 'silent' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrBuf = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString();
  });

  try {
    await waitForHealth(base);
    // Brief warm-up to establish Mongoose pool connections before timed runs.
    await autocannon({ url: `${base}/api/products`, connections: 10, duration: 2 });

    await runTarget('List Default', `${base}/api/products`);
    await runTarget(
      'Category + Price Sort',
      `${base}/api/products?category=smartphones&sort=price_asc`,
    );
  } finally {
    if (!child.killed) {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 300));
      if (child.exitCode === null) child.kill('SIGKILL');
    }
    if (stderrBuf.trim()) {
      console.error('Server stderr:', stderrBuf);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
