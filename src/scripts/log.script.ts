import { Api } from '../models/api.model';
import { blue, bold, green, red, yellow, cyan, dim } from 'colorette';
import { LogOptions } from '../interfaces/log.interface';
import { RecordingsMode, RecordWriteStats } from '../types/recordings.type';
import { RECORDINGS_DIR } from '../constants/recordings.constant';

export const logMessage = (message: string, lineBreak = false) => {
  console.log(`${ lineBreak ? '\n' : '' }${ blue(`● ${ bold(`${ message }`) }`) }`);
}

export const logSuccess = (message: string) => {
  console.log(`${ green(`✔ ${ bold(`${ message }`) }`) }`);
}

const loadModeLabel = (mode: RecordingsMode): string => {
  if (mode === 'exclude') {
    return 'mocks only';
  }

  if (mode === 'only') {
    return 'recordings only';
  }

  return 'mocks + recordings';
};

const recordingGroupLabel = (sourceFile: string): string => {
  const marker = `/${ RECORDINGS_DIR }`;
  const index = sourceFile.indexOf(marker);

  if (index === -1) {
    if (sourceFile.startsWith(`${ RECORDINGS_DIR }/`)) {
      return '(root)';
    }

    return sourceFile;
  }

  const folder = sourceFile.slice(0, index);
  return folder.length > 0 ? `${ folder }/` : '(root)';
};

export const logApisGrouped = (
  apis: Api[],
  recordingsMode: RecordingsMode
): void => {
  console.log(dim(`  load: ${ loadModeLabel(recordingsMode) }`));

  const mocks = apis.filter((api) => api.source === 'mock');
  const recordings = apis.filter((api) => api.source === 'recording');

  if (mocks.length > 0) {
    console.log(`\n${ bold('── Mocks ──') }`);
    const byFile = new Map<string, Api[]>();

    for (const api of mocks) {
      const key = api.sourceFile || '(unknown)';
      const list = byFile.get(key) ?? [];
      list.push(api);
      byFile.set(key, list);
    }

    for (const [file, list] of byFile) {
      console.log(cyan(`  ${ file }`));
      for (const api of list) {
        console.log(
          `    ${ yellow(`[${ api.method.toUpperCase() }]`) } ${ green(`${ api.route }`) }`
        );
      }
    }
  }

  if (recordings.length > 0) {
    console.log(`\n${ bold('── Recordings ──') }`);
    const byGroup = new Map<string, Api[]>();

    for (const api of recordings) {
      const key = recordingGroupLabel(api.sourceFile);
      const list = byGroup.get(key) ?? [];
      list.push(api);
      byGroup.set(key, list);
    }

    for (const [group, list] of byGroup) {
      console.log(cyan(`  ${ group }`));
      for (const api of list) {
        console.log(
          `    ${ yellow(`[${ api.method.toUpperCase() }]`) } ${ green(`${ api.route }`) }`
        );
      }
    }
  }

  console.log(
    dim(
      `\n${ mocks.length } routes from mocks · ${ recordings.length } from recordings`
    )
  );
};

export const logRecordSummary = (stats: RecordWriteStats): void => {
  console.log(
    blue(
      `● ${ bold('Recording stopped') }\n`
      + `  wrote: ${ stats.wrote }\n`
      + `  skipped: ${ stats.skipped }\n`
      + `  proxy failures: ${ stats.proxyFailures }`
    )
  );
};

export const logError = (error: unknown, options: LogOptions = {}) => {
  const { showIcon = true, isBold = true, lineBreakStart = false, lineBreakEnd = false } = options;
  const message = String(error);
  const icon = showIcon ? '✖ ' : '';
  const formattedMessage = isBold ? bold(message) : message;
  console.log(`${ lineBreakStart ? '\n' : '' }${ red(`${ icon }${ formattedMessage }`) }${ lineBreakEnd ? '\n' : '' }`);
}

export const logWarning = (message: string, options: LogOptions = {}) => {
  const { showIcon = true, isBold = true, lineBreakStart = false, lineBreakEnd = false } = options;
  const icon = showIcon ? '⚠ ' : '';
  const formattedMessage = isBold ? bold(message) : message;
  console.log(`${ lineBreakStart ? '\n' : '' }${ yellow(`${ icon }${ formattedMessage }`) }${ lineBreakEnd ? '\n' : '' }`);
}
