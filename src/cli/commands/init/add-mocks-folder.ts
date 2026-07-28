import fs from "fs";
import { logError, logSuccess } from "../../../scripts/log.script";

export const addMocksFolder = (mocks: string) => {
  if (fs.existsSync(mocks)) {
    logSuccess('The mocks directory already exists');
  } else {
    try {
      fs.mkdirSync(mocks, { recursive: true });
      logSuccess('The mocks directory was created successfully');
    } catch (e) {
      logError(e);
    }
  }
}
