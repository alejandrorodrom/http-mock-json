'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

const validRegister = {
  email: 'user@example.com',
  password: 'secret123',
  active: true,
  role: 'user',
  website: 'https://example.com',
  birthday: '1990-01-15',
  address: { city: 'Madrid', zip: '28001' }
};

module.exports = {
  name: 'runtime/request-validation',
  description: 'HTTP: every request rule, format, nested path, error shape and match after valid',
  run: () => runHttpUseCase({
    name: 'runtime/request-validation',
    description: 'HTTP: every request rule, format, nested path, error shape and match after valid',
    mockRelativePath: 'mocks/22-request.json',
    timeoutMs: 20000,
    async assert({ baseUrl }) {
      const failures = [];

      const created = await request(`${ baseUrl }/api/register`, {
        method: 'POST',
        json: validRegister
      });
      failures.push(...expectStatus(created.status, 201, 'register ok'));
      failures.push(...expectEqual(created.body, { id: 1, ok: true }, 'register body'));

      const optionalOk = await request(`${ baseUrl }/api/register`, {
        method: 'POST',
        json: {
          email: 'a@b.com',
          password: 'secret123',
          active: false,
          role: 'admin',
          address: { city: 'NY' }
        }
      });
      failures.push(...expectStatus(optionalOk.status, 201, 'register optional omitted'));

      const duplicate = await request(`${ baseUrl }/api/register`, {
        method: 'POST',
        json: { ...validRegister, email: 'taken@example.com' }
      });
      failures.push(...expectStatus(duplicate.status, 409, 'register match after valid request'));
      failures.push(...expectEqual(duplicate.body, { message: 'Email already exists' }, 'duplicate body'));

      const invalidMany = await request(`${ baseUrl }/api/register`, {
        method: 'POST',
        json: {
          email: 'bad',
          password: 'short',
          active: 'yes',
          role: 'guest',
          website: 'not-a-url',
          birthday: 'nope',
          age: 10,
          address: { city: 'A', zip: 'abc' }
        }
      });
      failures.push(...expectStatus(invalidMany.status, 422, 'register multi-error'));
      failures.push(...expectEqual(
        invalidMany.body,
        {
          message: 'Invalid request',
          errors: [
            { field: 'email', msg: 'Email inválido' },
            { field: 'password', msg: 'password must have minLength 8' },
            { field: 'age', msg: 'age must be >= 18' },
            { field: 'active', msg: 'active must be boolean' },
            { field: 'role', msg: 'role must be one of: admin, user' },
            { field: 'website', msg: 'website must be a valid url' },
            { field: 'birthday', msg: 'birthday must be a valid date' },
            { field: 'address.city', msg: 'address.city must have minLength 2' },
            { field: 'address.zip', msg: 'address.zip must match pattern ^\\d{5}$' }
          ]
        },
        'register custom errorDetail array'
      ));

      const maxPassword = await request(`${ baseUrl }/api/register`, {
        method: 'POST',
        json: { ...validRegister, password: 'x'.repeat(65) }
      });
      failures.push(...expectStatus(maxPassword.status, 422, 'register maxLength'));
      failures.push(...expectEqual(
        maxPassword.body.errors,
        [{ field: 'password', msg: 'password must have maxLength 64' }],
        'register maxLength body'
      ));

      const ageMax = await request(`${ baseUrl }/api/register`, {
        method: 'POST',
        json: { ...validRegister, age: 121 }
      });
      failures.push(...expectStatus(ageMax.status, 422, 'register age max'));
      failures.push(...expectEqual(
        ageMax.body.errors,
        [{ field: 'age', msg: 'age must be <= 120' }],
        'register age max body'
      ));

      const requiredMissing = await request(`${ baseUrl }/api/register`, {
        method: 'POST',
        json: { email: 'a@b.com' }
      });
      failures.push(...expectStatus(requiredMissing.status, 422, 'register required'));

      const searchOk = await request(`${ baseUrl }/api/search?q=ab&page=1&limit=10&strict=true`);
      failures.push(...expectStatus(searchOk.status, 200, 'search ok coercion'));
      failures.push(...expectEqual(searchOk.body, { results: [] }, 'search body'));

      const searchInvalid = await request(`${ baseUrl }/api/search?q=a&page=0&limit=999&strict=maybe`);
      failures.push(...expectStatus(searchInvalid.status, 400, 'search default 400 map'));
      failures.push(...expectEqual(searchInvalid.body.message, 'Invalid request', 'search message'));
      failures.push(...expectEqual(
        searchInvalid.body.errors,
        {
          'query.page': ['query.page must be >= 1'],
          'query.limit': ['query.limit must be <= 100'],
          'query.q': ['query.q must have minLength 2'],
          'query.strict': ['query.strict must be boolean']
        },
        'search map errors'
      ));

      const orderOk = await request(`${ baseUrl }/api/orders`, {
        method: 'POST',
        json: { customerId: 1, items: [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }] }
      });
      failures.push(...expectStatus(orderOk.status, 201, 'orders ok'));

      const orderEmpty = await request(`${ baseUrl }/api/orders`, {
        method: 'POST',
        json: { customerId: 1, items: [] }
      });
      failures.push(...expectStatus(orderEmpty.status, 400, 'orders minItems'));
      failures.push(...expectEqual(
        orderEmpty.body.errors[0].rule,
        'minItems',
        'orders minItems rule'
      ));

      const orderTooMany = await request(`${ baseUrl }/api/orders`, {
        method: 'POST',
        json: {
          customerId: 1,
          items: Array.from({ length: 11 }, (_, i) => ({ sku: `S${ i }`, qty: 1 }))
        }
      });
      failures.push(...expectStatus(orderTooMany.status, 400, 'orders maxItems'));
      failures.push(...expectEqual(
        orderTooMany.body.errors[0].rule,
        'maxItems',
        'orders maxItems rule'
      ));

      const orderNested = await request(`${ baseUrl }/api/orders`, {
        method: 'POST',
        json: { customerId: 1, items: [{ sku: 'A', qty: 0 }] }
      });
      failures.push(...expectStatus(orderNested.status, 400, 'orders nested min'));
      failures.push(...expectEqual(
        orderNested.body,
        {
          message: 'Invalid request',
          errors: [
            {
              path: 'items.0.qty',
              rule: 'min',
              expected: 1,
              received: 0,
              message: 'items.0.qty must be >= 1'
            }
          ]
        },
        'orders default array errors'
      ));

      const profileOk = await request(`${ baseUrl }/api/profiles`, {
        method: 'POST',
        json: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          address: { city: 'Madrid', zip: '28001' }
        }
      });
      failures.push(...expectStatus(profileOk.status, 201, 'profiles dot path ok'));

      const profileBad = await request(`${ baseUrl }/api/profiles`, {
        method: 'POST',
        json: { userId: 'not-uuid', address: { city: 'X', zip: '12' } }
      });
      failures.push(...expectStatus(profileBad.status, 400, 'profiles uuid/dot path fail'));
      failures.push(...expectEqual(
        profileBad.body.details,
        [
          'address.city must have minLength 2',
          'address.zip must match pattern ^\\d{5}$',
          'userId must be a valid uuid'
        ],
        'profiles details string array'
      ));

      const filtersOk = await request(`${ baseUrl }/api/filters?page=1&active=true`, {
        method: 'POST',
        json: { tags: ['a', 'b'] }
      });
      failures.push(...expectStatus(filtersOk.status, 200, 'filters body+query ok'));

      const filtersBad = await request(`${ baseUrl }/api/filters?page=0&active=no`, {
        method: 'POST',
        json: { tags: [] }
      });
      failures.push(...expectStatus(filtersBad.status, 400, 'filters invalidResponse'));
      failures.push(...expectEqual(filtersBad.body.message, 'Filter validation failed', 'filters message'));
      failures.push(...expectEqual(
        filtersBad.body.fields,
        {
          tags: ['tags: tags must have minItems 1'],
          'query.page': ['query.page: query.page must be >= 1'],
          'query.active': ['query.active: query.active must be boolean']
        },
        'filters map + template'
      ));

      return failures;
    }
  })
};
