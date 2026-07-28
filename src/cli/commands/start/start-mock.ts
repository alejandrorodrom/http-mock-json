import express, { Express, Request, Response } from 'express';
import { getMocksData } from './files';
import { logApi, logError } from '../../../scripts/log.script';
import cors from 'cors';
import { validatePortAvailable } from './check-port';
import { resetCallCounters, selectResponse } from '../../../scripts/match.script';
import { resolveDelay, sleep } from '../../../scripts/delay.script';
import { proxyRequest, resolveProxy } from '../../../scripts/proxy.script';
import { checkRequest } from '../../../scripts/request-check.script';
import { buildRequestError } from '../../../scripts/request-error.script';
import { isEmpty, isExisting } from '../../../scripts/guards.script';
import { StoreRegistry } from '../../../scripts/store.script';
import { buildStoreConflictResponse } from '../../../scripts/store-conflict.script';
import { buildStoreNotFoundResponse } from '../../../scripts/store-not-found.script';
import {
  applyListHeaderTemplate,
  applyListTemplate
} from '../../../scripts/store-list.script';
import { buildPersistWatchIgnored } from '../../../scripts/store-persist.script';
import { MockResponseConfig } from '../../../interfaces/data.interface';
import { StartMock, StartMockResult } from '../../../interfaces/mock.interface';

export const startMock = async (
  { port, folderPath, proxy, resetStore }: StartMock
): Promise<StartMockResult> => {
  await validatePortAvailable(port);

  const app: Express = express();

  app.use(cors({
    exposedHeaders: '*'
  }));
  app.use(express.json({ strict: false }));
  app.use(express.urlencoded({ extended: true }));

  const { apis, stores } = getMocksData(folderPath);
  resetCallCounters();
  const registry = new StoreRegistry(stores, {
    mocksDir: folderPath,
    resetStore
  });

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

  apis.forEach(value => {
    logApi(value);
    app[value.method](value.route, async (req: Request, res: Response) => {
      let selectedResponse: MockResponseConfig | undefined;

      if (value.request) {
        const issues = checkRequest(value.request, req);

        if (!isEmpty(issues)) {
          selectedResponse = buildRequestError(
            value.request,
            issues,
            value.responses
          );
        }
      }

      if (!selectedResponse) {
        selectedResponse = selectResponse(
          value.responses,
          value.nameResponse,
          req,
          `${ value.method }:${ value.route }`
        );
      }

      const delay = resolveDelay(selectedResponse.delay, value.delay);

      if (delay > 0) {
        await sleep(delay);
      }

      if (selectedResponse.proxy !== undefined) {
        const resolvedProxy = resolveProxy(selectedResponse.proxy, value.proxy, proxy);

        if (!resolvedProxy) {
          res.status(502).json({
            message: 'Proxy is set to true but no method-level proxy or --proxy target is configured'
          });
          return;
        }

        await proxyRequest(resolvedProxy, req, res);
        return;
      }

      if (selectedResponse.action && value.storeId) {
        const result = registry.execute(value.storeId, selectedResponse.action, req);

        if (!result.ok) {
          if (result.kind === 'conflict') {
            const conflictResponse = buildStoreConflictResponse(
              result.conflicts,
              value.responses,
              result.responseName,
              result.detail
            );
            res.set(conflictResponse.headers)
              .status(conflictResponse.status)
              .json(conflictResponse.body);
            return;
          }

          if (result.kind === 'not_found') {
            const notFoundResponse = buildStoreNotFoundResponse(
              result.keyContext,
              value.responses,
              result.responseName
            );
            res.set(notFoundResponse.headers)
              .status(notFoundResponse.status)
              .json(notFoundResponse.body);
            return;
          }

          res.status(400).json({ message: result.message });
          return;
        }

        const status = result.status ?? selectedResponse.status;

        if (
          selectedResponse.action === 'list'
          && result.listResult
        ) {
          const headers = applyListHeaderTemplate(
            selectedResponse.headers,
            result.listResult
          );
          const body = isExisting(selectedResponse.body)
            ? applyListTemplate(selectedResponse.body, result.listResult)
            : result.body;
          res.set(headers).status(status).json(body);
          return;
        }

        res.set(selectedResponse.headers).status(status).json(result.body);
        return;
      }

      res.set(selectedResponse.headers).status(selectedResponse.status).json(selectedResponse.body);
    });
  });

  if (proxy) {
    app.use(async (req: Request, res: Response) => {
      await proxyRequest({ target: proxy }, req, res);
    });
  }

  const server = app.listen(port, () => {
    console.log(`Mock server is running in http://localhost:${ port } 🚀`);
    if (proxy) {
      console.log(`Global proxy target: ${ proxy }`);
    }
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    logError(error);
    process.exit(1);
  });

  return {
    server,
    persistWatchIgnored: buildPersistWatchIgnored(folderPath, stores)
  };
};
