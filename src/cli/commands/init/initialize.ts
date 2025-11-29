import { InitOptions } from '../../../types/options.type';
import { join } from 'path';
import { addScriptToPackageJson } from './add-script';
import { addMocksFolder } from './add-mocks-folder';
import { addMock } from "../add/add-mock";

export const initialize = async (
  { path, mock, script }: InitOptions
) => {
  const mocks = join(process.cwd(), path, 'mocks');

  addMocksFolder(mocks);

  if (script) {
    addScriptToPackageJson();
  }

  if (mock) {
    await addMock({
      path: path
    });
  }
}
