import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';
import { RECORDINGS_DIR, RECORDINGS_FILES_DIR } from '../constants/recordings.constant';
import { MockConfig } from '../types/mock-config.type';
import { getKeys } from './objects.script';

const isRecordingJson = (fileName: string): boolean => {
  return extname(fileName) === '.json';
};

const listRecordingJsonFiles = (recordingsDir: string, prefix: string): string[] => {
  if (!existsSync(recordingsDir) || !statSync(recordingsDir).isDirectory()) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(recordingsDir)) {
    if (entry === RECORDINGS_FILES_DIR) {
      continue;
    }

    const absolutePath = join(recordingsDir, entry);

    if (!statSync(absolutePath).isFile() || !isRecordingJson(entry)) {
      continue;
    }

    files.push(prefix ? `${ prefix }/${ entry }` : entry);
  }

  return files;
};

export const discoverRecordingFiles = (
  mocksDir: string,
  config: MockConfig | null
): string[] => {
  const files: string[] = [];

  files.push(
    ...listRecordingJsonFiles(join(mocksDir, RECORDINGS_DIR), RECORDINGS_DIR)
  );

  if (!config?.folders) {
    return files;
  }

  for (const folderName of getKeys(config.folders)) {
    const folder = config.folders[folderName];

    if (folder.enabled === false) {
      continue;
    }

    files.push(
      ...listRecordingJsonFiles(
        join(mocksDir, folderName, RECORDINGS_DIR),
        `${ folderName }/${ RECORDINGS_DIR }`
      )
    );
  }

  return files;
};
