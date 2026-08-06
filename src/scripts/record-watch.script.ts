import { normalize } from 'path';
import { RECORDINGS_DIR_PATTERN } from '../constants/recordings.constant';

export const buildRecordingsWatchIgnored = (
  baseIgnored?: (watchPath: string) => boolean
): ((watchPath: string) => boolean) => {
  return (watchPath: string): boolean => {
    const normalized = normalize(watchPath);

    if (RECORDINGS_DIR_PATTERN.test(normalized)) {
      return true;
    }

    if (baseIgnored?.(watchPath)) {
      return true;
    }

    return false;
  };
};
