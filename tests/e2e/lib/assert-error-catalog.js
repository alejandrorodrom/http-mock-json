'use strict';

const { green, red, dim, bold } = require('colorette');
const { ERROR_CATALOG } = require('../error-catalog');

/**
 * Runner preflight: verifies error-catalog.js mappings against registered e2e cases.
 * This is a test-inventory guard, not a product scenario.
 *
 * @param {string[]} registeredCaseNames
 * @returns {{ ok: boolean, failures: string[] }}
 */
function assertErrorCatalog(registeredCaseNames) {
  const failures = [];
  const names = new Set(registeredCaseNames);

  for (const entry of ERROR_CATALOG) {
    if (!entry.caseName) {
      failures.push(`${ entry.id }: missing caseName in catalog`);
      continue;
    }

    if (!names.has(entry.caseName)) {
      failures.push(
        `${ entry.id }: case "${ entry.caseName }" is not registered (message: ${ entry.message })`
      );
    }
  }

  const duplicateIds = ERROR_CATALOG
    .map((entry) => entry.id)
    .filter((id, index, all) => all.indexOf(id) !== index);

  if (duplicateIds.length > 0) {
    failures.push(`Duplicate catalog ids: ${ [...new Set(duplicateIds)].join(', ') }`);
  }

  return { ok: failures.length === 0, failures };
}

/**
 * @param {{ ok: boolean, failures: string[] }} result
 */
function printCatalogPreflight(result) {
  const label = `Error catalog preflight (${ ERROR_CATALOG.length } messages)`;

  if (result.ok) {
    console.log(`${ green('✔') } ${ label }`);
    console.log(`  ${ dim('All catalog entries map to a registered e2e case') }`);
    console.log('');
    return;
  }

  console.log(`${ red('✖') } ${ bold(label) }`);
  for (const failure of result.failures) {
    console.log(`  ${ red('›') } ${ failure }`);
  }
  console.log('');
}

module.exports = {
  assertErrorCatalog,
  printCatalogPreflight,
  ERROR_CATALOG
};
