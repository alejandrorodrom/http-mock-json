import { MockConfig } from '../types/mock-config.type';
import { RecordGroupMatch } from '../types/recordings.type';
import { getKeys } from './objects.script';
import { stripPrefixFromPath, trimPathSlashes } from './record-path.script';

export const resolveRecordGroup = (
  pathname: string,
  config: MockConfig | null
): RecordGroupMatch => {
  if (!config?.folders) {
    return {
      folderName: null,
      prefix: null,
      relativeEndpoint: trimPathSlashes(pathname)
    };
  }

  let best: { folderName: string; prefix: string } | null = null;

  for (const folderName of getKeys(config.folders)) {
    const folder = config.folders[folderName];

    if (folder.enabled === false || !folder.prefix) {
      continue;
    }

    const normalizedPrefix = trimPathSlashes(folder.prefix);
    const normalizedPath = trimPathSlashes(pathname);

    if (
      normalizedPath === normalizedPrefix
      || normalizedPath.startsWith(`${ normalizedPrefix }/`)
    ) {
      if (!best || normalizedPrefix.length > best.prefix.length) {
        best = { folderName, prefix: normalizedPrefix };
      }
    }
  }

  if (!best) {
    return {
      folderName: null,
      prefix: null,
      relativeEndpoint: trimPathSlashes(pathname)
    };
  }

  return {
    folderName: best.folderName,
    prefix: best.prefix,
    relativeEndpoint: stripPrefixFromPath(pathname, best.prefix)
  };
};
