import { join } from 'path';
import { DEFAULT_MOCKS_DIR } from '../constants/mocks-path.constant';

export const resolveMocksDir = (pathOption?: string): string => {
  const relative = pathOption && pathOption.length > 0 ? pathOption : DEFAULT_MOCKS_DIR;

  return join(process.cwd(), relative);
};
