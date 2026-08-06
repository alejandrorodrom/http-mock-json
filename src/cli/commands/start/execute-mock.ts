import { ExecuteMock } from '../../../interfaces/mock.interface';
import { startMock } from './start-mock';
import { watchMock } from './watch-mock';
import { loadMockConfig, resolveMockPort } from '../../../scripts/mock-config.script';
import { resolveMocksDir } from '../../../scripts/mocks-path.script';
import { logRecordSummary } from '../../../scripts/log.script';

let activeRecordShutdown: (() => void) | null = null;

const clearRecordShutdown = (): void => {
  if (!activeRecordShutdown) {
    return;
  }

  process.off('SIGINT', activeRecordShutdown);
  process.off('SIGTERM', activeRecordShutdown);
  activeRecordShutdown = null;
};

export const executeMock = async (
  {
    port,
    folderPath,
    proxy,
    resetStore,
    record = false,
    recordingsMode = 'include'
  }: ExecuteMock
): Promise<void> => {
  const mocks = resolveMocksDir(folderPath);
  const loadedConfig = loadMockConfig(mocks);
  const resolvedPort = resolveMockPort(port, loadedConfig.config);

  const { server, persistWatchIgnored, recordStats } = await startMock({
    port: resolvedPort,
    folderPath: mocks,
    proxy,
    resetStore,
    record,
    recordingsMode,
    loadedConfig
  });

  clearRecordShutdown();

  if (record && recordStats) {
    const summarizeAndExit = () => {
      clearRecordShutdown();
      logRecordSummary(recordStats);
      server.close(() => process.exit(0));
    };

    activeRecordShutdown = summarizeAndExit;
    process.on('SIGINT', summarizeAndExit);
    process.on('SIGTERM', summarizeAndExit);
  }

  watchMock({
    server: server,
    port: resolvedPort,
    folderPath: folderPath,
    mocks: mocks,
    proxy,
    record,
    recordingsMode,
    persistWatchIgnored
  });
};
