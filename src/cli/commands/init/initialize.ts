import { InitOptions } from '../../../types/options.type';
import { addScriptToPackageJson } from './add-script';
import { addMocksFolder } from './add-mocks-folder';
import { addMock } from "../add/add-mock";
import { resolveMocksDir } from '../../../scripts/mocks-path.script';

export const initialize = async (
  { path, mock, script }: InitOptions
) => {
  const mocks = resolveMocksDir(path);

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
