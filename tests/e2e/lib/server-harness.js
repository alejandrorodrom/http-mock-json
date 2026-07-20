'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { stripAnsi } = require('./strip-ansi');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CLI_PATH = path.join(PROJECT_ROOT, 'dist', 'index.js');

/**
 * @returns {Promise<number>}
 */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

/**
 * @param {string | string[] | null} mockRelativePaths
 * @param {{ emptyMocksDir?: boolean, skipMocksDir?: boolean }} [options]
 */
function createWorkspace(mockRelativePaths, options = {}) {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmj-e2e-'));

  if (!options.skipMocksDir) {
    const mocksDir = path.join(workspaceDir, 'mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    if (!options.emptyMocksDir && mockRelativePaths) {
      const paths = Array.isArray(mockRelativePaths) ? mockRelativePaths : [mockRelativePaths];

      for (const mockRelativePath of paths) {
        const absoluteMock = path.isAbsolute(mockRelativePath)
          ? mockRelativePath
          : path.join(PROJECT_ROOT, mockRelativePath);

        if (!fs.existsSync(absoluteMock)) {
          fs.rmSync(workspaceDir, { recursive: true, force: true });
          throw new Error(`Mock file not found: ${ absoluteMock }`);
        }

        fs.copyFileSync(absoluteMock, path.join(mocksDir, path.basename(absoluteMock)));
      }
    }
  }

  return {
    workspaceDir,
    cleanup: () => {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  };
}

/**
 * @param {import('child_process').ChildProcessWithoutNullStreams} child
 */
function killProcessTree(child) {
  if (!child.pid) {
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {
    // ignore
  }

  setTimeout(() => {
    try {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    } catch {
      // ignore
    }
  }, 500).unref?.();
}

/**
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {string[]} options.args
 * @param {number} [options.timeoutMs]
 * @param {(stdout: string) => boolean} [options.resolveWhen]
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number | null, timedOut: boolean, child: import('child_process').ChildProcessWithoutNullStreams | null }>}
 */
function runCli(options) {
  const timeoutMs = options.timeoutMs ?? 12000;
  let stdout = '';
  let stderr = '';

  if (!fs.existsSync(CLI_PATH)) {
    return Promise.resolve({
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: false,
      child: null,
      spawnError: `CLI not built. Run "npm run build" before tests (missing ${ CLI_PATH }).`
    });
  }

  const child = spawn(process.execPath, [CLI_PATH, ...options.args], {
    cwd: options.cwd ?? PROJECT_ROOT,
    env: {
      ...process.env,
      NO_COLOR: '1',
      FORCE_COLOR: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return new Promise((resolve) => {
    let settled = false;

    const finish = (payload) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        stdout: stripAnsi(stdout),
        stderr: stripAnsi(stderr),
        child,
        ...payload
      });
    };

    const timer = setTimeout(() => {
      killProcessTree(child);
      finish({ timedOut: true, exitCode: null });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      const plain = stripAnsi(stdout);

      if (options.resolveWhen && options.resolveWhen(plain)) {
        finish({ timedOut: false, exitCode: null, keepAlive: true });
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      finish({ timedOut: false, exitCode: null, spawnError: error.message });
    });

    child.on('close', (code) => {
      finish({ timedOut: false, exitCode: code, keepAlive: false });
    });
  }).then(async (result) => {
    if (result.spawnError) {
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        child: null,
        spawnError: result.spawnError
      };
    }

    if (result.keepAlive) {
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        child: result.child
      };
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      child: null
    };
  });
}

/**
 * Starts the mock server and keeps it alive for HTTP assertions.
 * @param {object} options
 * @param {string | string[]} options.mockRelativePath
 * @param {string} [options.proxy]
 * @param {number} [options.timeoutMs]
 */
async function startMockServer(options) {
  const port = await getFreePort();
  const { workspaceDir, cleanup } = createWorkspace(options.mockRelativePath);
  const mocksDir = path.join(workspaceDir, 'mocks');
  const args = ['start', '-p', String(port), '-f', ''];

  if (options.proxy) {
    args.push('--proxy', options.proxy);
  }

  if (!fs.existsSync(CLI_PATH)) {
    cleanup();
    throw new Error(`CLI not built. Run "npm run build" before tests (missing ${ CLI_PATH }).`);
  }

  const liveOutput = { stdout: '', stderr: '' };

  const child = spawn(process.execPath, [CLI_PATH, ...args], {
    cwd: workspaceDir,
    env: {
      ...process.env,
      NO_COLOR: '1',
      FORCE_COLOR: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const ready = await new Promise((resolve) => {
    let settled = false;
    const timeoutMs = options.timeoutMs ?? 12000;

    const finish = (payload) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(payload);
    };

    const timer = setTimeout(() => {
      killProcessTree(child);
      finish({ ok: false, reason: 'timeout' });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      liveOutput.stdout += stripAnsi(chunk.toString());
      if (liveOutput.stdout.includes('Mock server is running')) {
        finish({ ok: true });
      }
    });

    child.stderr.on('data', (chunk) => {
      liveOutput.stderr += stripAnsi(chunk.toString());
    });

    child.on('error', (error) => {
      finish({ ok: false, reason: error.message });
    });

    child.on('close', (code) => {
      finish({ ok: false, reason: `process exited with code ${ code }` });
    });
  });

  if (!ready.ok) {
    cleanup();
    throw new Error(
      `Server did not start (${ ready.reason }).\nstdout:\n${ liveOutput.stdout }\nstderr:\n${ liveOutput.stderr }`
    );
  }

  return {
    port,
    workspaceDir,
    mocksDir,
    getStdout: () => liveOutput.stdout,
    getStderr: () => liveOutput.stderr,
    stdout: liveOutput.stdout,
    stderr: liveOutput.stderr,
    baseUrl: `http://127.0.0.1:${ port }`,
    async stop() {
      killProcessTree(child);
      await new Promise((resolve) => setTimeout(resolve, 100));
      cleanup();
    }
  };
}

module.exports = {
  PROJECT_ROOT,
  CLI_PATH,
  getFreePort,
  createWorkspace,
  killProcessTree,
  runCli,
  startMockServer
};
