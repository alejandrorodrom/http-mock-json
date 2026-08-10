import { HttpVerbs } from "../../../constants/http-verbs.constant";
import { normalizeEndpoint } from "./normalize-endpoint";

interface StructureMock {
  nameResponse: string;
  responses: Array<{
    name: string;
    statusCode: number;
    body: object;
  }>
}

export const structureMock = (endpoint: string, httpVerbs: HttpVerbs[]) => {
  const httpMap = new Map<string, StructureMock>;

  httpVerbs.forEach((httpVerb) => {
    httpMap.set(httpVerb.toUpperCase(), structureHttpVerb());
  });

  const endpointMap = new Map<string, object>();
  endpointMap.set(normalizeEndpoint(endpoint), Object.fromEntries(httpMap.entries()));

  return Object.fromEntries(endpointMap.entries());
}

const structureHttpVerb = (): StructureMock => {
  return {
    nameResponse: 'success',
    responses: [
      {
        name: 'success',
        statusCode: 200,
        body: { message: 'ok' },
      },
      {
        name: 'error',
        statusCode: 404,
        body: { message: 'Not found' },
      }
    ]
  };
}


