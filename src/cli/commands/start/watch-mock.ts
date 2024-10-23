import { WatchMock } from '../../../interfaces/mock';
import { Connection } from '../../../types/connection';
import fs from 'fs';
import { executeMock } from './execute-mock';

export const watchMock = (
  { server, port, folderPath, mocks }: WatchMock
) => {
  const connections: Connection = new Map();

  server.on('connection', (connection) => {
    const key = `${ connection.remoteAddress }:${ connection.remotePort }`;
    connections.set(key, connection);

    server.on('close', () => {
      connections.delete(key);
    })
  });


  let itChanged = false;
  const watcher = fs.watch(mocks, () => {
    if (!itChanged) {
      connections.forEach(connection => {
        connection.destroy();
      })

      server.close(() => {
        console.log('Mock server is restarting ⏳')
        executeMock({
          port: port,
          folderPath: folderPath
        });
        itChanged = true;

      })
    }
    watcher.close();
  });
}
