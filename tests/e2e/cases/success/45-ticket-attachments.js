'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '45-ticket-attachments',
  description: 'Ticket attachments: multi-file multipart + encoding file/base64 + tenant headers',
  run: () => runUseCase({
    name: '45-ticket-attachments',
    description: 'Ticket attachments: multi-file multipart + encoding file/base64 + tenant headers',
    mockRelativePath: 'mocks/45-ticket-attachments.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/tickets',
        '[POST] /api/tickets/:id/attachments',
        '[GET] /api/tickets/:id/attachments/:fileId'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
