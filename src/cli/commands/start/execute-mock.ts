import { join } from 'path';
import { ExecuteMock } from '../../../interfaces/mock.interface';
import { startMock } from './start-mock';
import { watchMock } from './watch-mock';

export const executeMock = (
  { port, folderPath }: ExecuteMock
) => {
  if (isNaN(port)) {
    throw Error('Invalid port assigned');
  }

  const mocks = join(process.cwd(), folderPath, 'mocks');

  const server = startMock({
    port: port,
    folderPath: mocks,
  });

  watchMock({
    server: server,
    port: port,
    folderPath: folderPath,
    mocks: mocks
  });
};
