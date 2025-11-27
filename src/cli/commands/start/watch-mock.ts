import chokidar from 'chokidar';
import { WatchMock } from '../../../interfaces/mock';
import { Connection } from '../../../types/connection';
import { Watcher } from '../../../types/watcher';
import {
  AWAIT_WRITE_FINISH_POLL_INTERVAL,
  AWAIT_WRITE_FINISH_STABILITY_THRESHOLD,
  WATCH_DEBOUNCE_MS
} from '../../../constants/watch';
import { executeMock } from './execute-mock';

export const watchMock = (
  { server, port, folderPath, mocks }: WatchMock
) => {
  const connections: Connection = new Map();
  let isRestarting = false;
  let restartTimer: NodeJS.Timeout | null = null;

  server.on('connection', (connection) => {
    const key = `${ connection.remoteAddress }:${ connection.remotePort }`;
    connections.set(key, connection);
  });

  server.on('close', () => {
    connections.clear();
  });

  const watcher = chokidar.watch(mocks, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: AWAIT_WRITE_FINISH_STABILITY_THRESHOLD,
      pollInterval: AWAIT_WRITE_FINISH_POLL_INTERVAL
    }
  }) as unknown as Watcher;

  const triggerRestart = () => {
    if (isRestarting) {
      return;
    }

    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    restartTimer = setTimeout(() => {
      restartTimer = null;
      isRestarting = true;
      connections.forEach(connection => connection.destroy());
      connections.clear();

      watcher.close().catch(() => undefined);

      server.close(() => {
        console.log('Mock server is restarting ⏳');
        executeMock({
          port: port,
          folderPath: folderPath
        });
      });
    }, WATCH_DEBOUNCE_MS);
  };

  watcher
    .on('add', triggerRestart)
    .on('change', triggerRestart)
    .on('unlink', triggerRestart);
};
