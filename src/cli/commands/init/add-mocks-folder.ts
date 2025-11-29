import fs from "fs";
import { logError, logSuccess } from "../../../scripts/log.script";

export const addMocksFolder = (mocks: string) => {
  if (fs.existsSync(mocks)) {
    logSuccess('The directory named mocks already exists');
  } else {
    try {
      fs.mkdirSync(mocks, { recursive: true });
      logSuccess('The directory named mocks was created successfully');
    } catch (e) {
      logError(e);
    }
  }
}
