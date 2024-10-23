import { Api } from '../models/api';
import { blue, bold, green, red, yellow } from 'colorette';

export const logMessage = (message: string, lineBreak = false) => {
  console.log(`${ lineBreak ? '\n' : '' }${ blue(`● ${ bold(`${ message }`) }`) }`);
}

export const logSuccess = (message: string) => {
  console.log(`${ green(`✔ ${ bold(`${ message }`) }`) }`);
}

export const logApi = (api: Api) => {
  console.log(`${ yellow(`[${ api.method.toUpperCase() }]`) } ${ green(`${ api.route }`) }`);
}

export const logError = (e: unknown) => {
  console.log(`${ red(`✖ ${ bold(String(e)) }`) }`);
}
