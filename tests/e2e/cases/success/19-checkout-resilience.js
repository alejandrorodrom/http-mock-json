'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '19-checkout-resilience',
  description:
    'Checkout resilience: payments, idempotency, inventory conflict, 429/503 with Retry-After',
  run: () => runUseCase({
    name: '19-checkout-resilience',
    description:
      'Checkout resilience: payments, idempotency, inventory conflict, 429/503 with Retry-After',
    mockRelativePath: 'mocks/19-checkout-resilience.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/v1/checkout/sessions',
        '[GET] /api/v1/checkout/sessions/:id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
