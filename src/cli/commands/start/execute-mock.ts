import { join } from 'path';
import { ExecuteMock } from '../../../interfaces/mock.interface';
import { startMock } from './start-mock';
import { watchMock } from './watch-mock';
import { loadMockConfig, resolveMockPort } from '../../../scripts/mock-config.script';

export const executeMock = async (
  { port, folderPath, proxy, resetStore }: ExecuteMock
): Promise<void> => {
  const mocks = join(process.cwd(), folderPath, 'mocks');
  const loadedConfig = loadMockConfig(mocks);
  const resolvedPort = resolveMockPort(port, loadedConfig.config);

  const { server, persistWatchIgnored } = await startMock({
    port: resolvedPort,
    folderPath: mocks,
    proxy,
    resetStore,
    loadedConfig
  });

  watchMock({
    server: server,
    port: resolvedPort,
    folderPath: folderPath,
    mocks: mocks,
    proxy,
    persistWatchIgnored
  });
};
