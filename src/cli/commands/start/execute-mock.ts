import { join } from 'path';
import { ExecuteMock } from '../../../interfaces/mock.interface';
import { startMock } from './start-mock';
import { watchMock } from './watch-mock';

export const executeMock = async (
  { port, folderPath, proxy, resetStore }: ExecuteMock
): Promise<void> => {
  const mocks = join(process.cwd(), folderPath, 'mocks');

  const { server, persistWatchIgnored } = await startMock({
    port: port,
    folderPath: mocks,
    proxy,
    resetStore
  });

  watchMock({
    server: server,
    port: port,
    folderPath: folderPath,
    mocks: mocks,
    proxy,
    persistWatchIgnored
  });
};
