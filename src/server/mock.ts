import express, { Express, Request, Response } from 'express';
import { getMocksData } from '../core/files';
import { logApi } from '../scripts/log';
import { join } from "path";
import * as fs from 'fs';
import { Server } from "node:net";
import { Connection } from "../types/connection";

export const executeMock = (port: number, folderPath: string) => {
  if (isNaN(port)) {
    throw Error('Invalid port assigned');
  }

  const mocks = join(process.cwd(), folderPath, 'mocks');

  const server = startMock(port, mocks);

  watchMock(server, port, folderPath, mocks);
};

const startMock = (port: number, folderPath: string) => {
  const app: Express = express();

  const data = getMocksData(folderPath);

  app.get('/', (req: Request, res: Response) => {
    res.send(`
        <style>
          body {
            height: auto
          }
          .container {
            margin: 25px 0 0 15px;
            font-family: monospace;
          }
          .title {
            font-weight: bold;
            margin: 0;
          }
        </style>
        <div class="container">
          <h1 class="title">Mock Server</h1>
          <p class="paragraph">Developed for <a href="https://www.linkedin.com/in/alejandro-rodriguez-romero/">Alejandro Rodriguez Romero</a></p>
        </div>
    `);
  });

  data.forEach(value => {
    logApi(value);
    app[value.method](value.route, (req: Request, res: Response) => {
      res.status(value.status).json(value.response);
    });
  });

  return app.listen(port, () => {
    console.log(`Mock server is running in http://localhost:${ port } 🚀`);
  });
}

const watchMock = (
  server: Server,
  port: number,
  folderPath: string,
  mocks: string
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
        executeMock(port, folderPath);
        itChanged = true;

      })
    }
    watcher.close();
  });
}
