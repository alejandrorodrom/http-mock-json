'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { stripAnsi } = require('./strip-ansi');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CLI_PATH = path.join(PROJECT_ROOT, 'dist', 'index.js');
const MOCK_CONFIG_FIXTURE = 'mocks/mock-config';

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
 * @param {string} source
 * @param {string} destination
 */
function copyDirSync(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * @param {string} filePath
 * @param {unknown} value
 */
function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
}

/**
 * @param {string | string[] | null} mockRelativePaths
 * @param {{
 *   emptyMocksDir?: boolean,
 *   skipMocksDir?: boolean,
 *   copyTree?: string,
 *   destPath?: string
 * }} [options]
 */
function createWorkspace(mockRelativePaths, options = {}) {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmj-e2e-'));
  /** @type {string | null} */
  let mocksDir = null;

  if (options.copyTree) {
    const source = path.isAbsolute(options.copyTree)
      ? options.copyTree
      : path.join(PROJECT_ROOT, options.copyTree);

    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
      throw new Error(`Fixture directory not found: ${ source }`);
    }

    const destRelative = options.destPath ?? options.copyTree;
    mocksDir = path.join(workspaceDir, destRelative);
    copyDirSync(source, mocksDir);
  } else if (!options.skipMocksDir) {
    mocksDir = path.join(workspaceDir, 'mocks');
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
    mocksDir,
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
 * @param {string} [options.input] stdin payload (enables pipe; use for non-prompt CLIs)
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
    stdio: [options.input !== undefined ? 'pipe' : 'ignore', 'pipe', 'pipe']
  });

  if (options.input !== undefined && child.stdin) {
    child.stdin.write(options.input);
    child.stdin.end();
  }

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
 * @param {string | string[]} [options.mockRelativePath]
 * @param {string} [options.workspaceDir]
 * @param {() => void} [options.cleanup]
 * @param {string} [options.cliPath] Value for `-f/--path` (mocks directory). Default `'mocks'`
 * @param {string} [options.proxy]
 * @param {boolean | string} [options.resetStore]
 * @param {boolean} [options.cleanupOnStop]
 * @param {number} [options.timeoutMs]
 */
async function startMockServer(options) {
  const omitCliPort = options.omitCliPort === true;
  const port = omitCliPort
    ? null
    : (options.cliPort ?? await getFreePort());
  let workspaceDir;
  let cleanup;

  if (options.workspaceDir) {
    workspaceDir = options.workspaceDir;
    cleanup = options.cleanup ?? (() => undefined);
  } else {
    ({ workspaceDir, cleanup } = createWorkspace(options.mockRelativePath));
  }

  const cliPath = options.cliPath && options.cliPath.length > 0 ? options.cliPath : 'mocks';
  const mocksDir = path.join(workspaceDir, cliPath);
  const args = ['start', '-f', cliPath];

  if (!omitCliPort) {
    args.splice(1, 0, '-p', String(port));
  }

  if (options.proxy) {
    args.push('--proxy', options.proxy);
  }

  if (options.record === true) {
    args.push('--record');
  }

  if (options.excludeRecordings === true) {
    args.push('--exclude-recordings');
  }

  if (options.recordingsOnly === true) {
    args.push('--recordings-only');
  }

  if (Array.isArray(options.extraArgs)) {
    args.push(...options.extraArgs);
  }

  if (options.resetStore === true) {
    args.push('--reset-store');
  } else if (typeof options.resetStore === 'string' && options.resetStore.length > 0) {
    args.push('--reset-store', options.resetStore);
  }

  const cleanupOnStop = options.cleanupOnStop !== false;

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

  const portMatch = liveOutput.stdout.match(/http:\/\/localhost:(\d+)/);
  const resolvedPort = portMatch ? Number(portMatch[1]) : port;

  if (!resolvedPort) {
    cleanup();
    killProcessTree(child);
    throw new Error(
      `Could not resolve listen port from server output.\nstdout:\n${ liveOutput.stdout }`
    );
  }

  return {
    port: resolvedPort,
    workspaceDir,
    mocksDir,
    getStdout: () => liveOutput.stdout,
    getStderr: () => liveOutput.stderr,
    stdout: liveOutput.stdout,
    stderr: liveOutput.stderr,
    baseUrl: `http://127.0.0.1:${ resolvedPort }`,
    async stop() {
      killProcessTree(child);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (cleanupOnStop) {
        cleanup();
      }
    }
  };
}

module.exports = {
  PROJECT_ROOT,
  CLI_PATH,
  MOCK_CONFIG_FIXTURE,
  getFreePort,
  copyDirSync,
  readJson,
  writeJson,
  createWorkspace,
  killProcessTree,
  runCli,
  startMockServer
};
