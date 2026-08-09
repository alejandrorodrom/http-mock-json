import fs from 'fs';
import { join } from 'path';
import { prompt } from 'prompts';
import { bold, dim, green } from 'colorette';
import { ImportOptions } from '../../../types/options.type';
import { MockConfig } from '../../../types/mock-config.type';
import { resolveMocksDir } from '../../../scripts/mocks-path.script';
import { logError, logMessage, logWarning } from '../../../scripts/log.script';
import { printDuration } from '../../../scripts/duration.script';
import { terminalPrompt } from '../../../scripts/unix.script';
import { assertSourceIsOpenApi3, loadOpenApiDocument } from './openapi-load';
import { openApiToMock } from './openapi-to-mock';

const ensureDir = (dir: string): void => {
  if (fs.existsSync(dir)) {
    if (!fs.statSync(dir).isDirectory()) {
      throw new Error(`Path exists and is not a directory: ${ dir }`);
    }
    return;
  }

  fs.mkdirSync(dir, { recursive: true });
};

const confirmOverwrite = async (
  filePath: string,
  force: boolean
): Promise<boolean> => {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  if (force) {
    return true;
  }

  const { overwrite } = await prompt({
    type: 'confirm',
    name: 'overwrite',
    message: `File "${ filePath }" already exists. Overwrite?`,
    initial: false
  });

  return overwrite === true;
};

const buildMockConfig = (folderNames: string[], routePrefix: string): MockConfig => {
  const folders: MockConfig['folders'] = {};
  for (const name of folderNames) {
    folders![name] = { prefix: routePrefix };
  }
  return { folders };
};

export const importOpenApi = async (options: ImportOptions): Promise<void> => {
  try {
    const source = options.openapi;
    if (!source || source.trim().length === 0) {
      throw new Error('Missing required option: --openapi <file|url>');
    }

    logMessage('Importing OpenAPI', true);

    assertSourceIsOpenApi3(source);
    const document = await loadOpenApiDocument(source);
    const mapped = openApiToMock(document, {
      splitTags: options.splitTags !== false,
      out: options.out,
      prefix: options.prefix,
      useServerPrefix: options.serverPrefix !== false,
      includeRequest: options.request !== false
    });

    if (mapped.bundles.length === 0 || mapped.endpointCount === 0) {
      throw new Error('No importable operations found in the OpenAPI document');
    }

    for (const warning of mapped.warnings) {
      logWarning(warning);
    }

    const mocksDir = resolveMocksDir(options.path);
    ensureDir(mocksDir);

    const startTime = Date.now();
    const written: string[] = [];
    const useFolders = Boolean(mapped.routePrefix);

    if (useFolders && mapped.routePrefix) {
      const folderNames = mapped.bundles
        .map((bundle) => bundle.folder)
        .filter((name): name is string => Boolean(name));

      const configPath = join(mocksDir, 'mock.config.json');
      const allowedConfig = await confirmOverwrite(configPath, options.overwrite === true);
      if (!allowedConfig) {
        console.log(`\n${ dim('☹️ Aborting...') }`);
        return;
      }

      fs.writeFileSync(
        configPath,
        JSON.stringify(buildMockConfig(folderNames, mapped.routePrefix), null, 2),
        { encoding: 'utf8' }
      );
      written.push('mock.config.json');
    }

    for (const bundle of mapped.bundles) {
      const dir = useFolders && bundle.folder
        ? join(mocksDir, bundle.folder)
        : mocksDir;

      ensureDir(dir);

      const mockFile = join(dir, `${ bundle.fileName }.json`);
      const allowed = await confirmOverwrite(mockFile, options.overwrite === true);

      if (!allowed) {
        console.log(`\n${ dim('☹️ Aborting...') }`);
        return;
      }

      fs.writeFileSync(
        mockFile,
        JSON.stringify(bundle.mock, null, 2),
        { encoding: 'utf8' }
      );
      written.push(
        useFolders && bundle.folder
          ? `${ bundle.folder }/${ bundle.fileName }.json`
          : `${ bundle.fileName }.json`
      );
    }

    const time = printDuration(Date.now() - startTime);
    console.log(
      `${ green(`✔ ${ bold('OpenAPI import ready') }`) } ${ dim(time) }`
    );
    console.log(
      dim(
        `! Imported ${ mapped.endpointCount } operations into ${ mapped.bundles.length } file(s)`
        + (mapped.warnings.length > 0 ? ` (${ mapped.warnings.length } warnings)` : '')
      )
    );
    if (mapped.routePrefix) {
      console.log(dim(`! mock.config folder prefix: ${ mapped.routePrefix }`));
    }
    console.log(dim(`! Files: ${ written.join(', ') }`));

    console.log(`\n${ dim('You may find the following commands will be helpful:') }\n`);
    console.log(`\t${ dim(terminalPrompt()) } ${ green('mock-server start') }`);
    console.log(`\tStart mock server.\n`);
    console.log('Happy coding! 🎈');
  } catch (e) {
    logError(e);
    process.exitCode = 1;
  }
};
