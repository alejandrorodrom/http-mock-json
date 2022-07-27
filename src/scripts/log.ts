import { Api } from '../models/api';
import { green, red, yellow } from 'colorette';

export const logApi = (api: Api) => {
  console.log(`${yellow(`[${api.method.toUpperCase()}]`)} ${green(`${api.route}`)}`);
}


export const logError = (e: unknown) => {
  console.log(red(String(e)));
}
