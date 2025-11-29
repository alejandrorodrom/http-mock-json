import { Api } from '../models/api.model';
import { blue, bold, green, red, yellow } from 'colorette';
import { LogOptions } from '../interfaces/log.interface';

export const logMessage = (message: string, lineBreak = false) => {
  console.log(`${ lineBreak ? '\n' : '' }${ blue(`● ${ bold(`${ message }`) }`) }`);
}

export const logSuccess = (message: string) => {
  console.log(`${ green(`✔ ${ bold(`${ message }`) }`) }`);
}

export const logApi = (api: Api) => {
  console.log(`${ yellow(`[${ api.method.toUpperCase() }]`) } ${ green(`${ api.route }`) }`);
}

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
