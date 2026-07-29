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
        'The "request" property must include "payload", "query" and/or "headers"',
        'The "request.payload" property must be an object',
        'The "request.payload" property must not be empty',
        'The "request.query" property must be an object',
        'The "request.query" property must not be empty',
        'The "request.payload.email" field must be a type string or a rule object with "type"',
        'The "request.payload" contains an invalid field name',
        'The "request.payload.email.type" must be one of: string, number, boolean, object, array, file',
        'The "request.payload.age" string rules (minLength, maxLength) require type "string"',
        'The "request.payload.name" range rules (min, max) require type "number"',
        'The "request.payload.name" rules (minItems, maxItems) require type "array" or "file"',
        'The "request.payload.name.properties" requires type "object"',
        'The "request.payload.address.properties" must be a non-empty object',
        'The "request.payload.name.minLength" must be a non-negative number',
        'The "request.payload.code.pattern" is not a valid regular expression',
        'The "request.payload.code.pattern" must be a non-empty string',
        'The "request.payload.avatar.items" requires type "array"',
        'The "request.payload.email.format" must be one of: email, uuid, url, date',
        'The "request.payload.role.enum" must be a non-empty array',
        'The "request.payload.role.enum" values must be strings or numbers',
        'The "request.payload.email.message" must be a string',
        'The "request.error.response" "missing-error" does not exist in responses',
        'The "request.error.response" must be a non-empty string',
        'The "request.error.format" must be one of: array, map',
        'The "request.error.detail" object values must be strings',
        'The "request.error.detail" must be a non-empty string or object',
        'The "request.error.key" must be a non-empty string',
        'The "request.as" must be one of: json, form, multipart, raw, text',
        'The "request.payload.avatar" file rules (maxSize, minSize, requireFilename) require type "file"',
        'The "request.payload.email.messages" must be a non-empty object',
        'The "request.body" property is not supported; use "payload"',
        'The "request.invalidResponse" property is not supported; use "error.response"',
        'The "request.payload.avatar.format" value "not-a-mime" must be a MIME type, wildcard (e.g. image/*), or known alias',
        'The "request.payload.format" value "not-a-mime" must be a MIME type, wildcard (e.g. image/*), or known alias',
        'The "request.payload" rule object requires "as": "text" or "as": "raw" (or use type "file")',
        'The "request.payload" must be a single rule object when "as" is "text" or "raw"',
        'The "request.payload" fields with type "file" require "as": "multipart"',
        'The "request.error.response" cannot reference a response with "encoding"'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
