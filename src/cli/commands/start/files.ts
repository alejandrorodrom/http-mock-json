import path, { join } from 'path';
import * as fs from 'fs';
import { Api } from '../../../models/api';
import { ResponseHttp } from '../../../interfaces/data';

export const getMocksData = (folderPath: string): Api[] => {
  const mockData: Api[] = [];

  if (!fs.existsSync(folderPath)) {
    throw Error('The directory named mocks does not exist');
  }

  const files = fs.readdirSync(folderPath).filter(file => path.extname(file) === '.json');

  files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(join(folderPath, file), 'utf-8'));
    const routes = Object.keys(data);
    routes.forEach(route => {
      const methods = Object.keys(data[route]);
      methods.forEach(method => {
        const nameResponse = data[route][method].nameResponse;
        const responses = data[route][method].responses;
        const response: ResponseHttp = responses.find((response: ResponseHttp) => response.name === nameResponse)

        if (response) {
          const api = new Api({
            route: route,
            method: method,
            status: response.statusCode,
            response: response.body
          });

          mockData.push(api);
        }
      });
    });
  });

  if (!files.length) {
    throw Error('No files found');
  }

  return mockData;
}
