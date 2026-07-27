'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/34-store-hr',
  description: 'HR employee directory mocks start cleanly',
  run: () => runUseCase({
    name: 'success/34-store-hr',
    description: 'HR employee directory mocks start cleanly',
    mockRelativePath: 'mocks/34-store-hr.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/orgs/:orgId/employees',
        '[POST] /api/orgs/:orgId/employees',
        '[GET] /api/orgs/:orgId/employees/:id',
        '[PATCH] /api/orgs/:orgId/employees/:id'
      ],
      stdoutExcludes: [
        '✖ Error:',
        'The "body" property is ignored when "action" is set'
      ]
    }
  })
};
