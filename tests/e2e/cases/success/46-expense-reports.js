'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '46-expense-reports',
  description: 'Expense reports: store + softDelete + list + multipart + encoding + match.call + delay',
  run: () => runUseCase({
    name: '46-expense-reports',
    description: 'Expense reports: store + softDelete + list + multipart + encoding + match.call + delay',
    mockRelativePath: 'mocks/46-expense-reports.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/expenses',
        '[POST] /api/expenses',
        '[GET] /api/expenses/:id',
        '[PATCH] /api/expenses/:id',
        '[DELETE] /api/expenses/:id',
        '[POST] /api/expenses/:id',
        '[POST] /api/expenses/:id/receipts',
        '[GET] /api/expenses/:id/receipts/preview'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
