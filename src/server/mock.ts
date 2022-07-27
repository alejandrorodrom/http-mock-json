import express, { Express, Request, Response } from 'express';
import { getMocksData } from '../core/files';
import { logApi } from '../scripts/log';

export const executeMock = (port: number) => {
  const app: Express = express();

  if (isNaN(port)) {
    throw Error('Invalid port assigned');
  }

  const data = getMocksData();

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


  app.listen(port, () => {
    console.log(`Mock server is running in http://localhost:${port} 🚀`);
  });
};

