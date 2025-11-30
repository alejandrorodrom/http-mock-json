import { join } from 'path';
import fs from 'fs';
import { logError, logSuccess } from '../../../scripts/log.script';

export const addScriptToPackageJson = () => {
  const packageJson = join(process.cwd(), 'package.json');

  try {
    if (!fs.existsSync(packageJson)) {
      logError('The file "package.json" was not found');
      return;
    }

    const data = fs.readFileSync(packageJson, 'utf-8');
    const structure = JSON.parse(data);

    if (!structure.scripts) {
      structure.scripts = {};
    }

    structure.scripts = {
      ...structure.scripts,
      'mock:start': 'mock-server start -p 3001'
    };

    try {
      fs.writeFileSync(packageJson, JSON.stringify(structure, null, 2));
      logSuccess('The script was added successfully');
    } catch (e) {
      logError(e);
    }

  } catch (e) {
    logError(e);
  }
}
