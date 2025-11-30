import { StartMock } from '../../../interfaces/mock.interface';
import express, { Express, Request, Response } from 'express';
import { getMocksData } from './files';
import { logApi, logError } from '../../../scripts/log.script';
import { Server } from 'node:net';
import cors from 'cors';
import { validatePortAvailable } from './check-port';

export const startMock = async (
  { port, folderPath }: StartMock
): Promise<Server> => {
  // Validate port availability BEFORE loading mocks (more efficient: uses socket connection)
  await validatePortAvailable(port);

  const app: Express = express();

  app.use(cors({
    exposedHeaders: '*'
  }));

  const data = getMocksData(folderPath);

  app.get('/', (_req: Request, res: Response) => {
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
    app[value.method](value.route, (_req: Request, res: Response) => {
      res.set(value.headers).status(value.status).json(value.response);
    });
  });

  const server = app.listen(port, () => {
    console.log(`Mock server is running in http://localhost:${ port } 🚀`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    // This should rarely happen since we check port availability first,
    // but keep it as a safety net for race conditions
    logError(error);
    process.exit(1);
  });

  return server;
};
