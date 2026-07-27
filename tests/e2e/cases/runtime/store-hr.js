'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual, expectHeader } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-hr',
  description: 'HTTP: HR directory permutes eq/ne/gt/gte/lt/lte/in/or/nested/search',
  run: () => runHttpUseCase({
    name: 'runtime/store-hr',
    description: 'HTTP: HR directory permutes eq/ne/gt/gte/lt/lte/in/or/nested/search',
    mockRelativePath: 'mocks/34-store-hr.json',
    timeoutMs: 30000,
    async assert({ baseUrl }) {
      const failures = [];
      const acme = `${ baseUrl }/api/orgs/acme/employees`;

      const forbidden = await request(`${ baseUrl }/api/orgs/blocked/employees`);
      failures.push(...expectStatus(forbidden.status, 403, 'blocked org'));

      const page1 = await request(acme);
      failures.push(...expectStatus(page1.status, 200, 'directory page1'));
      failures.push(...expectHeader(page1.headers, 'x-total-count', '6', 'acme total'));
      failures.push(...expectEqual(page1.body.total, 6, 'acme employees'));
      failures.push(...expectEqual(page1.body.employees.length, 3, 'default page size'));

      const engineers = await request(
        `${ acme }?role=engineer&excludeStatus=terminated&pageSize=20`
      );
      failures.push(...expectStatus(engineers.status, 200, 'eq role + ne'));
      failures.push(...expectEqual(engineers.body.total, 3, 'engineer count'));
      failures.push(...expectEqual(
        engineers.body.employees.map(item => item.id).sort((a, b) => a - b),
        [1, 3, 5],
        'engineer ids'
      ));

      const salaryBand = await request(
        `${ acme }?minSalary=60000&maxSalary=85000&status=active&pageSize=20`
      );
      failures.push(...expectStatus(salaryBand.status, 200, 'salary gte/lte'));
      failures.push(...expectEqual(
        salaryBand.body.employees.map(item => item.id).sort((a, b) => a - b),
        [1, 5],
        'salary band ids'
      ));

      const levels = await request(
        `${ acme }?minLevel=2&maxLevel=5&dept=platform&pageSize=20`
      );
      failures.push(...expectStatus(levels.status, 200, 'nested level gt/lt + dept'));
      failures.push(...expectEqual(
        levels.body.employees.map(item => item.id).sort((a, b) => a - b),
        [1, 3],
        'platform mid/senior ids'
      ));

      const rolesIn = await request(
        `${ acme }?roles=designer,manager&city=Barcelona&pageSize=20`
      );
      failures.push(...expectStatus(rolesIn.status, 200, 'in roles + nested city'));
      // city=Barcelona AND role in designer,manager → only Bruno
      failures.push(...expectEqual(rolesIn.body.total, 1, 'barcelona designer'));
      failures.push(...expectEqual(rolesIn.body.employees[0]?.id, 2, 'bruno id'));

      const hired = await request(
        `${ acme }?hiredAfter=1600000000&hiredBefore=1650000000&pageSize=20`
      );
      failures.push(...expectStatus(hired.status, 200, 'hiredAt range'));
      failures.push(...expectEqual(
        hired.body.employees.map(item => item.id).sort((a, b) => a - b),
        [1, 2],
        'hired window ids'
      ));

      const orGroup = await request(
        `${ acme }?anyDept=people&anyCity=Berlin&anyRole=support&pageSize=20`
      );
      failures.push(...expectStatus(orGroup.status, 200, 'or dept/city/role'));
      failures.push(...expectEqual(
        orGroup.body.employees.map(item => item.id).sort((a, b) => a - b),
        [4, 5, 6],
        'or employee ids'
      ));

      const searched = await request(`${ acme }?q=madrid&pageSize=20`);
      failures.push(...expectStatus(searched.status, 200, 'search nested city'));
      failures.push(...expectEqual(searched.body.total, 2, 'madrid search total'));

      const combined = await request(
        `${ acme }?status=active&minSalary=50000&roles=engineer,designer&q=a&sort=salary:desc&pageSize=20`
      );
      failures.push(...expectStatus(combined.status, 200, 'combined filters'));
      failures.push(...expectEqual(
        combined.body.employees.map(item => item.id),
        [1, 5, 2],
        'combined sorted ids'
      ));

      const badSalary = await request(`${ acme }?minSalary=abc`);
      failures.push(...expectStatus(badSalary.status, 400, 'bad gte'));
      failures.push(...expectEqual(
        badSalary.body,
        { message: 'Query "minSalary" must be a number' },
        'bad salary message'
      ));

      const created = await request(acme, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hugo Lima',
          email: 'hugo@acme.com',
          role: 'engineer',
          salary: 70000,
          hiredAt: 1700000000,
          profile: { dept: 'platform', level: 2, city: 'Lisbon' }
        })
      });
      failures.push(...expectStatus(created.status, 201, 'create employee'));
      failures.push(...expectEqual(created.body.orgId, 'acme', 'created org'));

      const globex = await request(`${ baseUrl }/api/orgs/globex/employees?pageSize=20`);
      failures.push(...expectStatus(globex.status, 200, 'globex directory'));
      failures.push(...expectEqual(globex.body.total, 1, 'globex total'));

      return failures;
    }
  })
};
