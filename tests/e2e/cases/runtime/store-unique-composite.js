'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-unique-composite',
  description: 'HTTP: composite unique constraints independent from key',
  run: () => runHttpUseCase({
    name: 'runtime/store-unique-composite',
    description: 'HTTP: composite unique constraints independent from key',
    mockRelativePath: 'mocks/35-store-unique-composite.json',
    timeoutMs: 25000,
    async assert({ baseUrl }) {
      const failures = [];

      const sameEmailOtherTenant = await request(`${ baseUrl }/api/beta/members`, {
        method: 'POST',
        json: {
          email: 'juan@acme.com',
          username: 'nuevo'
        }
      });
      failures.push(...expectStatus(
        sameEmailOtherTenant.status,
        201,
        'same email different tenant allowed'
      ));
      failures.push(...expectEqual(
        sameEmailOtherTenant.body.tenantId,
        'beta',
        'tenant from params'
      ));

      const compositeClash = await request(`${ baseUrl }/api/acme/members`, {
        method: 'POST',
        json: {
          email: 'juan@acme.com',
          username: 'otro'
        }
      });
      failures.push(...expectStatus(compositeClash.status, 409, 'composite unique clash'));
      failures.push(...expectEqual(
        compositeClash.body.code,
        'DUPLICATE_TENANT_EMAIL',
        'composite conflict response'
      ));
      failures.push(...expectEqual(
        compositeClash.body.errores,
        [
          {
            campo: 'tenantId+email',
            campos: '["tenantId","email"]',
            valor: '["acme","juan@acme.com"]'
          }
        ],
        'composite conflict detail'
      ));

      const usernameClash = await request(`${ baseUrl }/api/acme/members`, {
        method: 'POST',
        json: {
          email: 'nuevo@acme.com',
          username: 'juan'
        }
      });
      failures.push(...expectStatus(usernameClash.status, 409, 'simple unique clash'));
      failures.push(...expectEqual(usernameClash.body.code, 'DUPLICATE', 'simple unique code'));

      const multiClash = await request(`${ baseUrl }/api/acme/members`, {
        method: 'POST',
        json: {
          email: 'juan@acme.com',
          username: 'juan'
        }
      });
      failures.push(...expectStatus(multiClash.status, 409, 'multi unique clash'));
      failures.push(...expectEqual(
        multiClash.body.code,
        'DUPLICATE',
        'multi clash uses global unique conflict response'
      ));
      failures.push(...expectEqual(
        multiClash.body.errores,
        [
          { campo: 'username', valor: 'juan' },
          { campo: 'tenantId+email', valor: '["acme","juan@acme.com"]' }
        ],
        'multi clash lists simple + composite conflicts'
      ));

      const created = await request(`${ baseUrl }/api/acme/members`, {
        method: 'POST',
        json: {
          email: 'ana@acme.com',
          username: 'ana'
        }
      });
      failures.push(...expectStatus(created.status, 201, 'create ok'));

      const patchClash = await request(
        `${ baseUrl }/api/acme/members/${ created.body.id }`,
        {
          method: 'PATCH',
          json: { email: 'juan@acme.com' }
        }
      );
      failures.push(...expectStatus(patchClash.status, 409, 'patch composite clash'));
      failures.push(...expectEqual(
        patchClash.body.code,
        'DUPLICATE_TENANT_EMAIL',
        'patch composite response'
      ));

      const putClash = await request(
        `${ baseUrl }/api/acme/members/${ created.body.id }`,
        {
          method: 'PUT',
          json: {
            email: 'juan@acme.com',
            username: 'ana-put'
          }
        }
      );
      failures.push(...expectStatus(putClash.status, 409, 'put composite clash'));
      failures.push(...expectEqual(
        putClash.body.code,
        'DUPLICATE_TENANT_EMAIL',
        'put composite response'
      ));

      const skipMissingField = await request(`${ baseUrl }/api/slots`, {
        method: 'POST',
        json: { code: 'A' }
      });
      failures.push(...expectStatus(
        skipMissingField.status,
        201,
        'composite unique skipped when region missing'
      ));

      const defaultCompositeClash = await request(`${ baseUrl }/api/slots`, {
        method: 'POST',
        json: { code: 'A', region: 'us' }
      });
      failures.push(...expectStatus(
        defaultCompositeClash.status,
        409,
        'default 409 without conflict.response'
      ));
      failures.push(...expectEqual(
        defaultCompositeClash.body.message,
        'Duplicate value(s)',
        'default conflict message'
      ));
      failures.push(...expectEqual(
        defaultCompositeClash.body.conflicts?.length,
        1,
        'default conflict count'
      ));
      failures.push(...expectEqual(
        defaultCompositeClash.body.conflicts?.[0]?.field,
        'code+region',
        'default conflict field label'
      ));
      failures.push(...expectEqual(
        defaultCompositeClash.body.conflicts?.[0]?.fields,
        ['code', 'region'],
        'default body includes fields for composite'
      ));
      failures.push(...expectEqual(
        defaultCompositeClash.body.conflicts?.[0]?.value,
        ['A', 'us'],
        'default conflict value tuple'
      ));
      failures.push(...expectEqual(
        defaultCompositeClash.body.conflicts?.[0]?.message,
        'Duplicate value for unique fields "code+region"',
        'default conflict item message'
      ));

      const putSlotOk = await request(`${ baseUrl }/api/slots/2`, {
        method: 'PUT',
        json: { code: 'B', region: 'eu' }
      });
      failures.push(...expectStatus(putSlotOk.status, 200, 'put slot ok'));

      const putSlotClash = await request(`${ baseUrl }/api/slots/2`, {
        method: 'PUT',
        json: { code: 'A', region: 'us' }
      });
      failures.push(...expectStatus(putSlotClash.status, 409, 'put slot composite clash'));
      failures.push(...expectEqual(
        putSlotClash.body.conflicts?.[0]?.fields,
        ['code', 'region'],
        'put default conflict includes fields'
      ));

      return failures;
    }
  })
};
