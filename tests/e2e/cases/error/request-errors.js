'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/request-errors',
  description: 'All request config validation errors at startup',
  run: () => runUseCase({
    name: 'error/request-errors',
    description: 'All request config validation errors at startup',
    mockRelativePath: 'mocks/invalid/request-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: request-errors.json',
        'The "request" property must be an object',
        'The "request" property must include "body" and/or "query"',
        'The "request.body" property must be an object',
        'The "request.body" property must not be empty',
        'The "request.query" property must be an object',
        'The "request.query" property must not be empty',
        'The "request.body.email" field must be a type string or a rule object with "type"',
        'The "request.body" contains an invalid field name',
        'The "request.body.email.type" must be one of: string, number, boolean, object, array',
        'The "request.body.age" string rules (minLength, maxLength, pattern, format) require type "string"',
        'The "request.body.name" range rules (min, max) require type "number"',
        'The "request.body.name" array rules (minItems, maxItems, items) require type "array"',
        'The "request.body.name.properties" requires type "object"',
        'The "request.body.address.properties" must be a non-empty object',
        'The "request.body.name.minLength" must be a non-negative number',
        'The "request.body.code.pattern" is not a valid regular expression',
        'The "request.body.code.pattern" must be a non-empty string',
        'The "request.body.email.format" must be one of: email, uuid, url, date',
        'The "request.body.role.enum" must be a non-empty array',
        'The "request.body.role.enum" values must be strings or numbers',
        'The "request.body.email.message" must be a string',
        'The "request.invalidResponse" "missing-error" does not exist in responses',
        'The "request.invalidResponse" must be a non-empty string',
        'The "request.errorFormat" must be one of: array, map',
        'The "request.errorDetail" object values must be strings',
        'The "request.errorDetail" must be a non-empty string or object',
        'The "request.errorDetailsKey" must be a non-empty string'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
