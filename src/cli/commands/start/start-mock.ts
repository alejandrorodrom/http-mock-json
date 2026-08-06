import express, { Express, NextFunction, Request, Response } from 'express';
import { getMocksData } from './files';
import { logApisGrouped, logError, logWarning } from '../../../scripts/log.script';
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
import { buildRecordingsWatchIgnored } from '../../../scripts/record-watch.script';
import {
  captureUnhandledRawBody,
  stashRawBody
} from '../../../scripts/body-intake.script';
import { sendMockBody } from '../../../scripts/response-send.script';
import {
  multipartParseIssue,
  needsMultipartParse,
  parseMultipart
} from '../../../scripts/multipart.script';
import {
  isBodySizeLimitError,
  RAW_BODY_LIMIT
} from '../../../constants/body.constant';
import { MockResponseConfig } from '../../../interfaces/data.interface';
import { StartMock, StartMockResult } from '../../../interfaces/mock.interface';
import { getProxyUnmatchedMounts } from '../../../scripts/mock-config.script';
import {
  createRecordStats,
  recordProxiedResponse
} from '../../../scripts/record-write.script';
import { canonicalQuery } from '../../../scripts/record-path.script';
import { JsonValue } from '../../../types/json.type';
import { ProxiedCapture } from '../../../types/recordings.type';

export const startMock = async (
  {
    port,
    folderPath,
    proxy,
    resetStore,
    loadedConfig,
    record = false,
    recordingsMode = 'include'
  }: StartMock
): Promise<StartMockResult> => {
  await validatePortAvailable(port);

  const app: Express = express();
  const recordStats = createRecordStats();

  app.use(cors({
    exposedHeaders: '*'
  }));
  app.use(express.json({
    strict: false,
    limit: RAW_BODY_LIMIT,
    verify: stashRawBody
  }));
  app.use(express.urlencoded({
    extended: true,
    limit: RAW_BODY_LIMIT,
    verify: stashRawBody
  }));
  app.use(captureUnhandledRawBody);

  const { apis, stores, config } = getMocksData(
    folderPath,
    loadedConfig,
    recordingsMode
  );
  resetCallCounters();
  const registry = new StoreRegistry(stores, {
    mocksDir: folderPath,
    resetStore
  });

  const hasProxyTarget = Boolean(proxy)
    || getProxyUnmatchedMounts(config).length > 0
    || apis.some((api) => api.proxy !== undefined
      || api.responses.some((response) => response.proxy !== undefined));

  if (record && !hasProxyTarget) {
    logWarning(
      '--record is enabled but no proxy target is configured (CLI --proxy, folder proxy/proxyUnmatched, or response proxy)'
    );
  }

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

  logApisGrouped(apis, recordingsMode);

  const isMultipartRequest = (req: Request): boolean => {
    const contentType = req.headers['content-type'];
    return typeof contentType === 'string' && contentType.includes('multipart/form-data');
  };

  const ensureMultipartParsed = async (req: Request): Promise<string | null> => {
    if (req.multipart || !isMultipartRequest(req)) {
      return null;
    }

    try {
      req.multipart = await parseMultipart(req);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

  const buildRecordHooks = (req: Request) => {
    if (!record) {
      return {};
    }

    const pathname = req.originalUrl.split('?')[0] || '/';

    return {
      onProxied: (capture: ProxiedCapture) => {
        recordProxiedResponse(
          folderPath,
          config,
          {
            method: req.method,
            originalUrl: req.originalUrl,
            pathname,
            query: canonicalQuery(req.query as Record<string, unknown>),
            body: req.body as JsonValue | undefined,
            headers: req.headers as Record<string, string | string[] | undefined>,
            multipart: req.multipart
          },
          capture,
          recordStats
        );
      },
      onProxyError: () => {
        recordStats.proxyFailures += 1;
      }
    };
  };

  apis.forEach(value => {
    app[value.method](value.route, async (req: Request, res: Response) => {
      let selectedResponse: MockResponseConfig | undefined;

      if (needsMultipartParse(value) || (record && isMultipartRequest(req))) {
        try {
          if (!req.multipart) {
            req.multipart = await parseMultipart(req);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          if (isBodySizeLimitError(message)) {
            res.status(413).json({ message });
            return;
          }

          if (!needsMultipartParse(value) && record) {
            logWarning(
              `[record] multipart parse failed for ${ req.method.toUpperCase() } ${ req.originalUrl }: ${ message }`
            );
          } else if (value.request) {
            selectedResponse = buildRequestError(
              value.request,
              [multipartParseIssue(message)],
              value.responses
            );
          } else {
            res.status(400).json({ message });
            return;
          }
        }
      }

      if (!selectedResponse && value.request) {
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
            message: 'Proxy is set to true but no method, folder, root config, or --proxy target is configured'
          });
          return;
        }

        await proxyRequest(resolvedProxy, req, res, {
          stripPrefix: value.stripPrefix,
          ...buildRecordHooks(req)
        });
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

      sendMockBody(res, selectedResponse, folderPath);
    });
  });

  for (const mount of getProxyUnmatchedMounts(config)) {
    app.use(mount.prefix, async (req: Request, res: Response) => {
      if (record) {
        const parseError = await ensureMultipartParsed(req);
        if (parseError) {
          logWarning(
            `[record] multipart parse failed for ${ req.method.toUpperCase() } ${ req.originalUrl }: ${ parseError }`
          );
        }
      }

      await proxyRequest(
        { target: mount.target },
        req,
        res,
        {
          stripPrefix: mount.stripPrefix,
          ...buildRecordHooks(req)
        }
      );
    });
  }

  if (proxy) {
    app.use(async (req: Request, res: Response) => {
      if (record) {
        const parseError = await ensureMultipartParsed(req);
        if (parseError) {
          logWarning(
            `[record] multipart parse failed for ${ req.method.toUpperCase() } ${ req.originalUrl }: ${ parseError }`
          );
        }
      }

      await proxyRequest({ target: proxy }, req, res, buildRecordHooks(req));
    });
  }

  app.use((
    error: Error & { status?: number; type?: string },
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const message = error.message || 'Request body too large';

    if (
      error.status === 413
      || error.type === 'entity.too.large'
      || isBodySizeLimitError(message)
    ) {
      if (!res.headersSent) {
        res.status(413).json({ message });
      }
      return;
    }

    next(error);
  });

  if (record) {
    console.log('Recording ON → writing to .recordings/');
  }

  const server = app.listen(port, () => {
    console.log(`\nMock server is running in http://localhost:${ port } 🚀`);
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
    persistWatchIgnored: buildRecordingsWatchIgnored(
      buildPersistWatchIgnored(folderPath, stores)
    ),
    recordStats: record ? recordStats : undefined
  };
};
