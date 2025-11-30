import { join } from 'path';
import * as fs from 'fs';
import { Api } from '../../../models/api.model';
import { RawMockFile } from '../../../types/mock.type';
import { LocalIssue } from '../../../types/validation.type';
import { isEmpty, isObject } from '../../../scripts/guards.script';
import { addIssues } from '../../../scripts/issues.script';
import { getKeys, iterateEntries } from '../../../scripts/objects.script';
import { validateEndpoint } from '../../../validators/endpoint.validator';
import { validateMethod } from '../../../validators/method.validator';
import { validateResponse } from '../../../validators/response.validator';
import { JsonValue } from '../../../types/json.type';

export const processFile = (
  file: string,
  folderPath: string,
  errorsByFile: Record<string, LocalIssue[]>,
  warningsByFile: Record<string, LocalIssue[]>,
  apis: Api[]
): void => {
  try {
    const filePath = join(folderPath, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent) as RawMockFile;

    if (!isObject(data)) {
      addIssues(errorsByFile, file, [{
        message: 'The file must contain a valid JSON object'
      }]);
      return;
    }

    const endpoints = getKeys(data);
    if (isEmpty(endpoints)) {
      addIssues(errorsByFile, file, [{
        message: 'The file does not contain any endpoints'
      }]);
      return;
    }

    for (const [route, endpointData] of iterateEntries(data)) {
      const endpointResult = validateEndpoint(route, endpointData);

      addIssues(errorsByFile, file, endpointResult.errors);
      addIssues(warningsByFile, file, endpointResult.warnings);

      if (isObject(endpointData) && !isEmpty(getKeys(endpointData))) {
        for (const [method, methodData] of iterateEntries(endpointData)) {
          const methodResult = validateMethod(route, method, methodData);

          addIssues(errorsByFile, file, methodResult.errors);
          addIssues(warningsByFile, file, methodResult.warnings);

          if (isObject(methodData) && methodData.responses) {
            for (const response of methodData.responses) {
              const responseResult = validateResponse(route, method, response);

              addIssues(errorsByFile, file, responseResult.errors);
              addIssues(warningsByFile, file, responseResult.warnings);
            }

            if (isEmpty(methodResult.errors)) {
              const selectedResponse = methodData.responses.find(
                response => response.name === methodData.nameResponse
              );

              if (selectedResponse) {
                apis.push(
                  new Api({
                    route: route,
                    method: method,
                    status: selectedResponse.statusCode,
                    headers: selectedResponse.headers ?? {},
                    response: selectedResponse.body as JsonValue
                  })
                );
              }
            }
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      addIssues(errorsByFile, file, [{
        message: `JSON syntax error: ${ error.message }`
      }]);
    } else {
      addIssues(errorsByFile, file, [{
        message: `Error processing file: ${ error instanceof Error ? error.message : String(error) }`
      }]);
    }
  }
};
